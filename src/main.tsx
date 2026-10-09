import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { QueryProvider } from '@/app/providers/QueryProvider';
import { router } from '@/app/router';
import './index.css';

async function enableMocking() {
  const mockMode = import.meta.env.VITE_ENABLE_MOCKS;
  const shouldEnableMocking =
    mockMode === 'true' || (mockMode !== 'false' && import.meta.env.DEV);

  if (!shouldEnableMocking) {
    return;
  }

  const [{ worker }, { db }] = await Promise.all([
    import('./mocks/browser'),
    import('./mocks/db'),
  ]);

  db.config.latencyMs = 250; // makes loading states visible in dev

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
