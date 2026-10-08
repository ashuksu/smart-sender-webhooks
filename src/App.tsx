import { useAuthStore } from '@/features/auth/model/useAuthStore';
import { LoginForm } from '@/features/auth/ui/LoginForm';

export default function App() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-sky-400" />
            <h1 className="font-bold text-lg text-white">
              Smart Sender Webhooks
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-white">{user?.name}</p>
              <p className="text-xs text-slate-400">{user?.email}</p>
            </div>
            <button
              onClick={() => logout()}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-sm border border-slate-700 transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area Placeholder */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6">
        <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-8 text-center text-slate-400">
          <h2 className="text-xl font-semibold text-slate-200 mb-2">
            Welcome back, {user?.first_name}!
          </h2>
          <p className="text-sm max-w-md mx-auto">
            Session active. Stage 3 (State Management & Auth Flow) completed.
            Ready for Stage 4 (Webhook List & URL Sync).
          </p>
        </div>
      </main>
    </div>
  );
}
