export const ANON_STORAGE_KEY = "pulseboard_anonymous_id";

export type GuestUser = {
  anonymousId?: string;
  userId: string;
  name: string;
};

export function apiOrigin() {
  const url = import.meta.env.VITE_API_URL?.replace(/\/$/, "");
  return url && url.length > 0 ? url : "http://localhost:3000";
}

async function postAnonymous(body: { id?: string; name?: string }, signal?: AbortSignal) {
  const base = apiOrigin();
  return fetch(`${base}/api/auth/anonymous`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
}

export async function anonymousExchange(
  body: { id?: string; name?: string },
  signal?: AbortSignal,
): Promise<
  | { ok: true; user: GuestUser }
  | { ok: false; status: number; message: string | undefined }
> {
  const res = await postAnonymous(body, signal);
  if (res.ok) {
    const data = (await res.json()) as { user: GuestUser };
    return { ok: true, user: data.user };
  }
  const errPayload = (await res.json().catch(() => ({}))) as { error?: string };
  return { ok: false, status: res.status, message: errPayload.error };
}

export function readStoredAnonymousId(): string | undefined {
  try {
    const id = localStorage.getItem(ANON_STORAGE_KEY)?.trim();
    return id && id.length > 0 ? id : undefined;
  } catch {
    return undefined;
  }
}

export function persistAnonymousToStorage(user: GuestUser) {
  if (user.anonymousId) {
    localStorage.setItem(ANON_STORAGE_KEY, user.anonymousId);
  }
}

export function clearAnonymousFromStorage() {
  try {
    localStorage.removeItem(ANON_STORAGE_KEY);
  } catch {
    /* noop */
  }
}
