export function resolveApiUrl(path: string): string {
  const baseUrl =
    import.meta.env.VITE_API_BASE_URL ||
    (typeof window !== 'undefined'
      ? window.location.origin
      : 'http://localhost');

  return new URL(path, baseUrl).toString();
}
