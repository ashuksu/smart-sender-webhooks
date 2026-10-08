import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { DEMO_EMAIL, DEMO_PASSWORD } from '@/shared/api/constants';
import { applyServerErrors } from '@/shared/lib/applyServerErrors';
import { sanitizeReturnTo } from '@/shared/lib/sanitizeReturnTo';
import { useAuthStore } from '../model/useAuthStore';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginValues = z.infer<typeof loginSchema>;

const inputClass =
  'w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 aria-[invalid=true]:border-red-500';
const labelClass =
  'block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1';

export function LoginForm() {
  const login = useAuthStore((state) => state.login);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const returnTo = sanitizeReturnTo(searchParams.get('returnTo'));

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
  });

  if (isAuthenticated) {
    return <Navigate to={returnTo} replace />;
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      await login(values);
      navigate(returnTo, { replace: true });
    } catch (error) {
      applyServerErrors(error, setError, ['email', 'password']);
    }
  });

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md p-8 bg-slate-800 rounded-2xl shadow-2xl border border-slate-700">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-sky-400 mb-1">
            Smart Sender Webhooks
          </h1>
          <p className="text-slate-400 text-sm">
            Sign in to manage your webhook endpoints
          </p>
        </div>

        {errors.root?.message && (
          <div
            role="alert"
            className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm"
          >
            {errors.root.message}
          </div>
        )}

        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="email" className={labelClass}>
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              className={inputClass}
              aria-invalid={errors.email ? 'true' : 'false'}
              aria-describedby={errors.email ? 'email-error' : undefined}
              {...register('email')}
            />
            {errors.email && (
              <p
                id="email-error"
                role="alert"
                className="mt-1 text-xs text-red-400"
              >
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="password" className={labelClass}>
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className={inputClass}
              aria-invalid={errors.password ? 'true' : 'false'}
              aria-describedby={errors.password ? 'password-error' : undefined}
              {...register('password')}
            />
            {errors.password && (
              <p
                id="password-error"
                role="alert"
                className="mt-1 text-xs text-red-400"
              >
                {errors.password.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-sky-500 hover:bg-sky-400 text-white font-semibold rounded-lg shadow-md transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {isSubmitting ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-700/60 text-xs text-slate-400 text-center">
          <p>Demo credentials are pre-filled.</p>
        </div>
      </div>
    </div>
  );
}
