export type SafeResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number };

export async function safeFetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit & { timeoutMs?: number }
): Promise<SafeResult<T>> {
  const timeoutMs = init?.timeoutMs ?? 8000;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(input, { ...init, signal: controller.signal });
    const status = res.status;

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, status, error: text || `Request failed (${status})` };
    }

    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch (e: any) {
    const msg =
      e?.name === "AbortError"
        ? `Timeout after ${timeoutMs}ms`
        : e?.message || "Network error";
    return { ok: false, error: msg };
  } finally {
    clearTimeout(t);
  }
}