import { ApiError, parseApiErrorBody } from '../types/apiError';

const apiUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1').replace(/\/$/, '');

const authToken = () =>
  typeof localStorage === 'undefined' ? null : localStorage.getItem('auth_token');

/**
 * Shared HTTP client for fuel-web services.
 * UI components must not call `fetch` directly — go through a service.
 * Failed responses throw `ApiError` with status, message, and optional field map.
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

  const raw = await response.text();
  const body = raw ? (() => {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  })() : null;

  if (!response.ok) {
    throw new ApiError(response.status, parseApiErrorBody(body));
  }

  return body as T;
}
