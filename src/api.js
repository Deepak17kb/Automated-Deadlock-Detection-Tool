import { io } from 'socket.io-client';

export const socket = io({ autoConnect: false });

export async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`);
  return payload;
}

export const post = (path, body = {}) => api(path, {
  method: 'POST',
  body: JSON.stringify(body)
});
