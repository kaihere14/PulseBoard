import { UserButton, useAuth, useUser } from "@clerk/react";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/home")({
  component: Home,
});

type SyncState = "idle" | "syncing" | "done" | "error";

function apiOrigin() {
  const url = import.meta.env.VITE_API_URL?.replace(/\/$/, "");
  return url && url.length > 0 ? url : "http://localhost:3000";
}

function Home() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user, isLoaded: userLoaded } = useUser();
  const [joinCode, setJoinCode] = useState("");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<SyncState>("idle");

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    let cancelled = false;
    void (async () => {
      try {
        setSyncState("syncing");
        const token = await getToken();
        const response = await fetch(`${apiOrigin()}/api/auth`, {
          method: "GET",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!response.ok) {
          throw new Error(`Failed to sync user (${response.status})`);
        }
        if (!cancelled) {
          setSyncState("done");
        }
      } catch (error) {
        if (!cancelled) {
          setSyncState("error");
          setActionMessage(error instanceof Error ? error.message : "Failed to sync account.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [getToken, isLoaded, isSignedIn]);

  if (!isLoaded || !userLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-sm text-zinc-600 dark:bg-zinc-950 dark:text-zinc-400">
        Loading…
      </div>
    );
  }

  if (!isSignedIn || !user) {
    return <Navigate to="/" replace />;
  }

  const primaryEmail = user.primaryEmailAddress?.emailAddress;
  const name = user.fullName || [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "Account";

  const startCreateQuiz = () => {
    setActionMessage("Quiz creation flow will be connected next.");
  };

  const joinWithCode = () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      setActionMessage("Enter a quiz code before joining.");
      return;
    }
    setActionMessage(`Joining with code ${code} will be connected next.`);
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <nav className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-500">
              PulseBoard
            </p>
            <h1 className="text-xl font-semibold tracking-tight">Home</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{name}</p>
              {primaryEmail ? <p className="text-xs text-zinc-500 dark:text-zinc-400">{primaryEmail}</p> : null}
            </div>
            <UserButton />
          </div>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-5xl px-6 py-8">
        <p className="mb-8 text-sm text-zinc-600 dark:text-zinc-400">
          Create a new quiz or join one instantly with a unique code.
        </p>

        {syncState === "syncing" ? (
          <p className="mb-4 rounded-md border border-zinc-200 bg-zinc-100 px-4 py-3 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            Syncing your account with database…
          </p>
        ) : null}
        {syncState === "error" && actionMessage ? (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {actionMessage}
          </p>
        ) : null}
        {syncState === "done" && actionMessage ? (
          <p className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
            {actionMessage}
          </p>
        ) : null}

        <section className="grid gap-6 md:grid-cols-2">
          <article className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-lg font-semibold tracking-tight">Create a new quiz</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Start building a quiz, add questions, and share it instantly.
            </p>
            <button
              type="button"
              onClick={startCreateQuiz}
              className="mt-6 inline-flex rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
            >
              Create quiz
            </button>
          </article>

          <article className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-lg font-semibold tracking-tight">Join a quiz</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Enter the unique code shared with you to join a live quiz.
            </p>
            <label className="mt-6 block">
              <span className="sr-only">Unique quiz code</span>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Enter unique code"
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500"
              />
            </label>
            <button
              type="button"
              onClick={joinWithCode}
              className="mt-4 inline-flex rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              Join
            </button>
          </article>
        </section>
      </main>
    </div>
  );
}
