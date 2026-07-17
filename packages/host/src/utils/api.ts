const BASE_URL = process.env.API_URL || 'http://localhost:4000/api';

export async function apiRequest(path: string, options: RequestInit = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  } as any;

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const message = Array.isArray(err.message)
      ? err.message.join('; ')
      : (err.message || 'Request failed');
    throw new Error(message);
  }

  return response.json();
}
