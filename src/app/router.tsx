import { createBrowserRouter, Navigate } from 'react-router';
import { LoginForm } from '@/features/auth/ui/LoginForm';
import { RequireAuth } from '@/features/auth/ui/RequireAuth';
import App from '@/App';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginForm />,
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <App />
      </RequireAuth>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/webhooks" replace />,
      },
      {
        path: 'webhooks',
        element: <div>Webhooks List Placeholder</div>,
      },
      {
        path: 'webhooks/:id',
        element: <div>Webhook Edit Placeholder</div>,
      },
    ],
  },
  {
    path: '*',
    element: (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-sky-400 mb-2">404</h1>
          <p className="text-slate-400 mb-4">Page not found</p>
          <a href="/webhooks" className="text-sky-400 hover:underline">
            Go to Webhooks
          </a>
        </div>
      </div>
    ),
  },
]);
