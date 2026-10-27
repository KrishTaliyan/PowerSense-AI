import { API_BASE } from "../constants.js";

const DEFAULT_TIMEOUT_MS = 20000;

// fetch() never times out on its own; a hung request would leave the console spinning forever.
export async function apiRequest(path, { method = "GET", body, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      signal: controller.signal,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
    return data;
  } catch (err) {
    if (err.name === "AbortError") throw new Error("Backend is not responding", { cause: err });
    if (err instanceof TypeError) throw new Error("Backend is not responding", { cause: err });
    throw err;
  } finally {
    window.clearTimeout(timer);
  }
}
