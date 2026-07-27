export const API_BASE: string = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

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
