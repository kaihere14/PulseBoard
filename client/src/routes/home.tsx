import { UserButton, useAuth, useUser } from "@clerk/react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  anonymousExchange,
  clearAnonymousFromStorage,
  type GuestUser,
  persistAnonymousToStorage,
  readStoredAnonymousId,
} from "../lib/anonymousAuth";

export const Route = createFileRoute("/home")({
  component: Home,
});

function Home() {
  const navigate = useNavigate({ from: "/home" });
  const { isLoaded, isSignedIn } = useAuth();
  const { user, isLoaded: userLoaded } = useUser();

  const [guestUser, setGuestUser] = useState<GuestUser | null>(null);
  const [guestLoading, setGuestLoading] = useState(() => Boolean(readStoredAnonymousId()));
  const [guestError, setGuestError] = useState<string | null>(null);

  const authRef = useRef({ isSignedIn: false });
  useEffect(() => {
    authRef.current = { isSignedIn: isSignedIn ?? false };
  }, [isSignedIn]);

  useEffect(() => {
    if (!isLoaded || isSignedIn) return;

    const id = readStoredAnonymousId();
    if (!id) {
      void navigate({ to: "/", replace: true });
      return;
    }

    const ac = new AbortController();

    void (async () => {
      try {
        const result = await anonymousExchange({ id }, ac.signal);
        if (authRef.current.isSignedIn) return;

        if (result.ok) {
          persistAnonymousToStorage(result.user);
          setGuestUser(result.user);
        } else if (result.status === 404) {
          clearAnonymousFromStorage();
          void navigate({ to: "/", replace: true });
        } else {
          setGuestError(result.message ?? `Could not load session (${result.status}).`);
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError" && !authRef.current.isSignedIn) {
          setGuestError(
            "Could not reach the API. Start the server and check VITE_API_URL (usually http://localhost:3000).",
          );
        }
      } finally {
        if (!authRef.current.isSignedIn) {
          setGuestLoading(false);
        }
      }
    })();

    return () => ac.abort();
  }, [isLoaded, isSignedIn, navigate]);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-sm text-zinc-600 dark:bg-zinc-950 dark:text-zinc-400">
        Loading…
      </div>
    );
  }

  if (isSignedIn) {
    if (!userLoaded || !user) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-sm text-zinc-600 dark:bg-zinc-950 dark:text-zinc-400">
          Loading your profile…
        </div>
      );
    }

    const primaryEmail = user.primaryEmailAddress?.emailAddress;
    const name =
      user.fullName ||
      [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      user.username ||
      "Account";

    return (
      <div className="min-h-screen bg-zinc-50 px-8 py-12 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
        <header className="mx-auto mb-12 flex max-w-3xl flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-zinc-500 dark:text-zinc-500">PulseBoard</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">Home</h1>
            <p className="mt-3 max-w-xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
              You&apos;re signed in. Manage your account below or jump back to the landing page anytime.
            </p>
            <Link
              to="/"
              className="mt-8 inline-flex w-fit rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              ← Back to landing
            </Link>
          </div>
          <UserButton />
        </header>

        <section className="mx-auto max-w-3xl rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 md:p-8">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-500">Your profile</h2>
          <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-start">
            {user.imageUrl ? (
              <img
                src={user.imageUrl}
                alt=""
                className="h-20 w-20 shrink-0 rounded-full border border-zinc-200 object-cover dark:border-zinc-700"
              />
            ) : null}
            <dl className="grid min-w-0 flex-1 gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-zinc-500 dark:text-zinc-500">Name</dt>
                <dd className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">{name}</dd>
              </div>
              {user.username ? (
                <div>
                  <dt className="text-zinc-500 dark:text-zinc-500">Username</dt>
                  <dd className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">{user.username}</dd>
                </div>
              ) : null}
              {primaryEmail ? (
                <div className="sm:col-span-2">
                  <dt className="text-zinc-500 dark:text-zinc-500">Email</dt>
                  <dd className="mt-1 break-all font-medium text-zinc-900 dark:text-zinc-100">{primaryEmail}</dd>
                </div>
              ) : null}
              <div className="sm:col-span-2">
                <dt className="text-zinc-500 dark:text-zinc-500">Clerk user ID</dt>
                <dd className="mt-1 break-all font-mono text-xs text-zinc-800 dark:text-zinc-200">{user.id}</dd>
              </div>
              <div>
                <dt className="text-zinc-500 dark:text-zinc-500">Created</dt>
                <dd className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">
                  {user.createdAt ? new Date(user.createdAt).toLocaleString() : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500 dark:text-zinc-500">Last sign-in</dt>
                <dd className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">
                  {user.lastSignInAt ? new Date(user.lastSignInAt).toLocaleString() : "—"}
                </dd>
              </div>
            </dl>
          </div>
        </section>
      </div>
    );
  }

  if (!readStoredAnonymousId()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Taking you back…</p>
      </div>
    );
  }

  if (guestLoading && !guestError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-sm text-zinc-600 dark:bg-zinc-950 dark:text-zinc-400">
        Loading your guest session…
      </div>
    );
  }

  if (guestError && !guestUser) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 px-6 dark:bg-zinc-950">
        <p className="max-w-md text-center text-sm text-red-600 dark:text-red-400" role="alert">
          {guestError}
        </p>
        <Link
          to="/"
          className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          Back to landing
        </Link>
      </div>
    );
  }

  if (guestUser) {
    const leaveGuest = () => {
      clearAnonymousFromStorage();
      void navigate({ to: "/", replace: true });
    };

    return (
      <div className="min-h-screen bg-zinc-50 px-8 py-12 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
        <header className="mx-auto mb-12 flex max-w-3xl flex-col gap-4">
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-500 dark:text-zinc-500">PulseBoard</p>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Home</h1>
          <p className="max-w-xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
            You&apos;re continuing as a guest. Sign in anytime from the landing page for a full account.
          </p>
          <Link
            to="/"
            className="mt-4 inline-flex w-fit rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            ← Back to landing
          </Link>
        </header>

        <section className="mx-auto max-w-3xl rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 md:p-8">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-500">Guest session</h2>
          <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
            <div className="sm:col-span-2">
              <dt className="text-zinc-500 dark:text-zinc-500">Display name</dt>
              <dd className="mt-1 font-medium text-emerald-700 dark:text-emerald-400">{guestUser.name}</dd>
            </div>
            {guestUser.anonymousId ? (
              <div className="sm:col-span-2">
                <dt className="text-zinc-500 dark:text-zinc-500">Anonymous ID</dt>
                <dd className="mt-1 break-all font-mono text-xs text-zinc-800 dark:text-zinc-200">
                  {guestUser.anonymousId}
                </dd>
              </div>
            ) : null}
            <div className="sm:col-span-2">
              <dt className="text-zinc-500 dark:text-zinc-500">User record ID</dt>
              <dd className="mt-1 break-all font-mono text-xs text-zinc-800 dark:text-zinc-200">{guestUser.userId}</dd>
            </div>
          </dl>
          <button
            type="button"
            className="mt-8 w-full rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 sm:w-auto dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800"
            onClick={leaveGuest}
          >
            Leave guest session
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-sm text-zinc-600 dark:bg-zinc-950 dark:text-zinc-400">
      Loading your guest session…
    </div>
  );
}
