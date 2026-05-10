import { useCallback, useEffect, useRef, useState } from "react";
import { Show, SignIn, useAuth } from "@clerk/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  anonymousExchange,
  clearAnonymousFromStorage,
  persistAnonymousToStorage,
  readStoredAnonymousId,
} from "../lib/anonymousAuth";

function randomGuestName() {
  return `Guest-${Math.floor(Math.random() * 1000000)}`;
}

function SigningInNotice() {
  return (
    <p className="text-sm text-zinc-600 dark:text-zinc-400" aria-live="polite">
      Signing you in…
    </p>
  );
}

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const navigate = useNavigate({ from: "/" });
  const { isLoaded, isSignedIn } = useAuth();
  const authRef = useRef({ isLoaded: false, isSignedIn: false });
  useEffect(() => {
    authRef.current = { isLoaded: isLoaded ?? false, isSignedIn: isSignedIn ?? false };
  }, [isLoaded, isSignedIn]);

  const [guestName, setGuestName] = useState("");
  const [guestLoading, setGuestLoading] = useState(false);
  const [guestRestoring, setGuestRestoring] = useState(() => Boolean(readStoredAnonymousId()));
  const [guestError, setGuestError] = useState<string | null>(null);

  const goHome = useCallback(() => {
    void navigate({ to: "/home", replace: true });
  }, [navigate]);

  const continueAnonymously = async () => {
    setGuestError(null);
    setGuestLoading(true);
    try {
      const storedId = readStoredAnonymousId();
      if (storedId) {
        const result = await anonymousExchange({ id: storedId });
        if (result.ok) {
          persistAnonymousToStorage(result.user);
          goHome();
          return;
        }
        if (result.status === 404) {
          clearAnonymousFromStorage();
        } else {
          setGuestError(result.message ?? `Request failed (${result.status})`);
          return;
        }
      }

      const name = guestName.trim() || randomGuestName();
      const created = await anonymousExchange({ name });
      if (!created.ok) {
        setGuestError(created.message ?? `Request failed (${created.status})`);
        return;
      }
      persistAnonymousToStorage(created.user);
      goHome();
    } catch (e) {
      setGuestError(e instanceof Error ? e.message : "Network error");
    } finally {
      setGuestLoading(false);
      setGuestRestoring(false);
    }
  };

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    queueMicrotask(() => {
      clearAnonymousFromStorage();
      setGuestRestoring(false);
      setGuestError(null);
      void navigate({ to: "/home", replace: true });
    });
  }, [isLoaded, isSignedIn, navigate]);

  useEffect(() => {
    const id = readStoredAnonymousId();
    if (!id) return;

    const ac = new AbortController();
    queueMicrotask(() => setGuestRestoring(true));

    void (async () => {
      try {
        const result = await anonymousExchange({ id }, ac.signal);

        const { isLoaded: loaded, isSignedIn: signed } = authRef.current;
        if (loaded && signed) return;

        if (result.ok) {
          persistAnonymousToStorage(result.user);
          setGuestError(null);
          void navigate({ to: "/home", replace: true });
        } else if (result.status === 404) {
          clearAnonymousFromStorage();
          setGuestError(null);
        } else {
          setGuestError(`Could not restore session (${result.status}).`);
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setGuestError(
            "Could not reach the API. Start the server and check VITE_API_URL (usually http://localhost:3000).",
          );
        }
      } finally {
        queueMicrotask(() => setGuestRestoring(false));
      }
    })();

    return () => ac.abort();
  }, [navigate]);

  const clerkStillLoading = !isLoaded && !guestRestoring && !guestError;

  const sidebarWhileClerkLoads =
    guestError ? (
      <p className="max-w-xs text-center text-xs text-red-600 dark:text-red-400" role="alert">
        {guestError}
      </p>
    ) : guestRestoring ? (
      <SigningInNotice />
    ) : clerkStillLoading ? (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
    ) : null;

  const signedOutPanel = guestRestoring ? (
    <SigningInNotice />
  ) : (
    <>
      <SignIn forceRedirectUrl="/home" signUpFallbackRedirectUrl="/home" />
      <div className="relative py-1 text-center text-xs text-zinc-400 before:absolute before:inset-x-0 before:top-1/2 before:-z-10 before:border-t before:border-zinc-200 dark:before:border-zinc-700">
        <span className="bg-white px-2 dark:bg-zinc-900">or</span>
      </div>
      <label className="w-full">
        <span className="sr-only">Display name</span>
        <input
          type="text"
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          placeholder="Display name (optional, defaults to Guest)"
          disabled={guestLoading}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
        />
      </label>
      {guestError ? (
        <p className="w-full text-center text-xs text-red-600 dark:text-red-400" role="alert">
          {guestError}
        </p>
      ) : null}
      <button
        type="button"
        disabled={guestLoading}
        className="w-full rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 shadow-sm hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
        onClick={continueAnonymously}
      >
        {guestLoading ? "Working…" : "Continue anonymously"}
      </button>
    </>
  );

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="flex min-h-screen w-full flex-col md:flex-row">
        <section className="flex flex-1 flex-col justify-center px-8 py-12 md:px-16 md:py-20">
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-500 dark:text-zinc-500">
            Full-stack polling
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">PulseBoard</h1>
          <p className="mt-4 max-w-lg text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
            Create polls, share a public link, and collect feedback—then dig into analytics and publish results when
            you&apos;re ready.
          </p>
          <ul className="mt-10 max-w-lg space-y-4 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            <li className="flex gap-3">
              <span className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden>
                ●
              </span>
              <span>
                <strong className="font-medium text-zinc-900 dark:text-zinc-100">Build</strong> polls with multiple
                questions—mark each as mandatory or optional, and choose anonymous or authenticated responses.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden>
                ●
              </span>
              <span>
                <strong className="font-medium text-zinc-900 dark:text-zinc-100">Share</strong> one link; respondents
                answer with smooth single-choice flows. Set an expiry so the poll closes on time.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden>
                ●
              </span>
              <span>
                <strong className="font-medium text-zinc-900 dark:text-zinc-100">Analyze & publish</strong> totals,
                per-question summaries, and option counts—then publish so anyone with the link sees final outcomes.
              </span>
            </li>
          </ul>
          <p className="mt-10 max-w-lg text-xs text-zinc-500 dark:text-zinc-500">
            Hackathon scope: single-select questions · protected creator tools · public respond flow · live updates via
            WebSockets.
          </p>
        </section>
        <aside className="flex flex-1 items-center justify-center border-b border-zinc-200 bg-white px-6 py-10 md:border-b-0 md:border-l md:border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="w-full max-w-md">
            {!isLoaded ? (
              <div className="flex flex-col items-center justify-center gap-4">{sidebarWhileClerkLoads}</div>
            ) : (
              <>
                <Show when="signed-out">
                  <div className="flex flex-col items-center justify-center gap-4">{signedOutPanel}</div>
                </Show>
                <Show when="signed-in">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <p className="text-sm text-zinc-600 dark:text-zinc-400" aria-live="polite">
                      Redirecting…
                    </p>
                    <p className="max-w-xs text-xs text-zinc-500 dark:text-zinc-500">Taking you to your home…</p>
                  </div>
                </Show>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
