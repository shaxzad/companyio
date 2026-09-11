const apiUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1').replace(/\/$/, '');

const authToken = () =>
  typeof localStorage === 'undefined' ? null : localStorage.getItem('auth_token');

/**
 * Shared HTTP client for fuel-web services.
 * UI components must not call `fetch` directly — go through a service.
 */
export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken() ? { Authorization: `Bearer ${authToken()}` } : {}),
      ...init.headers,
    },
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      typeof body?.message === 'string' ? body.message : 'The request could not be completed.'
    );
  }

  return body as T;
}
