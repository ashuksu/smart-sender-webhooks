import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { QueryProvider } from '@/app/providers/QueryProvider';
import { router } from '@/app/router';
import './index.css';

async function enableMocking() {
  if (import.meta.env.VITE_ENABLE_MOCKS === 'false') {
    return;
  }
  const { worker } = await import('./mocks/browser');
  return worker.start();
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryProvider>
        <RouterProvider router={router} />
      </QueryProvider>
    </StrictMode>
  );
});
