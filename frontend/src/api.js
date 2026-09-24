// Backend URL: set VITE_API_URL in frontend/.env to change it (e.g. your deployed API).
const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8081";

export async function api(path, { method = "GET", body, token } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const fields = data.fields && Object.entries(data.fields).map(([k, v]) => `${k} ${v}`).join(", ");
    const msg = res.status === 401 && token ? "Your session expired. Log in again."
      : data.message || fields || data.error || `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data;
}
