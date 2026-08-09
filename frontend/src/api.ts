// Relative in production so the browser sees a same-origin request (yyparfum.com/api/...),
// proxied to the Railway backend by vercel.json - calling the railway.app domain directly
// is exactly the cross-site pattern Safari content blockers (AdGuard, 1Blocker, etc.) block,
// which silently emptied every product/pack listing for affected visitors.
export const API_BASE: string = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? '/api' : 'http://localhost:4000/api');

export async function apiFetch<T = unknown>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    // no JSON body
  }

  if (!res.ok) {
    const message = (json as { error?: string } | null)?.error ?? `Request failed (${res.status})`;
    throw new Error(message);
  }

  return json as T;
}
