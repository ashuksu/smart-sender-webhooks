import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/api/errors';
import { WebhookEditPage } from './WebhookEditPage';

const mocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
}));

vi.mock('@/features/webhooks/model/useWebhooksQuery', () => ({
  useUpdateWebhook: () => ({
    mutateAsync: mocks.mutateAsync,
  }),
  useWebhookDetailQuery: () => ({
    data: {
      id: 1,
      name: 'Existing endpoint',
      url: 'https://example.com/hook',
      active: true,
      created_at: '2026-01-01T00:00:00.000Z',
    },
    isLoading: false,
    error: undefined,
  }),
}));

(
  globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
  }
).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

async function renderEditPage() {
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={['/webhooks/1']}>
        <Routes>
          <Route path="/webhooks/:id" element={<WebhookEditPage />} />
          <Route path="/webhooks" element={<div>Webhook list</div>} />
        </Routes>
      </MemoryRouter>
    );
  });
}

async function changeInput(id: string, value: string) {
  const input = container.querySelector<HTMLInputElement>(`#${id}`);

  if (!input) {
    throw new Error(`Input #${id} was not found`);
  }

  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value'
    )?.set;

    setter?.call(input, value);

    input.dispatchEvent(new Event('input', { bubbles: true }));

    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

async function submitForm() {
  const form = container.querySelector<HTMLFormElement>('form');

  if (!form) {
    throw new Error('Edit form was not found');
  }

  await act(async () => {
    form.dispatchEvent(
      new Event('submit', {
        bubbles: true,
        cancelable: true,
      })
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe('WebhookEditPage', () => {
  beforeEach(() => {
    mocks.mutateAsync.mockReset();

    mocks.mutateAsync.mockResolvedValue({
      id: 1,
      name: 'Saved endpoint',
      url: 'http://localhost:3000/hook',
      active: true,
      created_at: '2026-01-01T00:00:00.000Z',
    });

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });

    container.remove();
  });

  it('rejects a whitespace-only name and a non-HTTP URL', async () => {
    await renderEditPage();

    await changeInput('name', '   ');
    await changeInput('url', 'ftp://example.com/hook');
    await submitForm();

    expect(container.querySelector('#name-error')?.textContent).toBe(
      'Name is required'
    );

    expect(container.querySelector('#url-error')?.textContent).toBe(
      'URL must be a valid HTTP or HTTPS address'
    );

    expect(mocks.mutateAsync).not.toHaveBeenCalled();
  });

  it('displays server 422 errors next to the corresponding fields', async () => {
    mocks.mutateAsync.mockRejectedValueOnce(
      new ApiError(422, 'ValidationException', 'The given data was invalid.', {
        name: ['This name is already taken.'],
        url: ['This URL is not allowed.'],
      })
    );

    await renderEditPage();
    await submitForm();

    expect(container.querySelector('#name-error')?.textContent).toBe(
      'This name is already taken.'
    );

    expect(container.querySelector('#url-error')?.textContent).toBe(
      'This URL is not allowed.'
    );
  });

  it('trims the name and accepts a valid HTTP URL', async () => {
    await renderEditPage();

    await changeInput('name', '  New endpoint  ');
    await changeInput('url', 'http://localhost:3000/webhook');
    await submitForm();

    expect(mocks.mutateAsync).toHaveBeenCalledWith({
      name: 'New endpoint',
      url: 'http://localhost:3000/webhook',
    });

    expect(container.textContent).toContain('Webhook list');
  });
});
