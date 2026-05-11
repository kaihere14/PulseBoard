import { UserButton, useAuth, useUser } from "@clerk/react";
import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getUserQuizzes, type QuizSummary } from "../lib/api";

export const Route = createFileRoute("/home")({
  component: Home,
});

type SyncState = "idle" | "syncing" | "done" | "error";
type QuizFetchState = "idle" | "loading" | "done" | "error";

function apiOrigin() {
  const url = import.meta.env.VITE_API_URL?.replace(/\/$/, "");
  return url && url.length > 0 ? url : "http://localhost:3000";
}

function Home() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user, isLoaded: userLoaded } = useUser();
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState("");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [quizFetchState, setQuizFetchState] = useState<QuizFetchState>("idle");

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

  useEffect(() => {
    if (!isLoaded || !isSignedIn || syncState !== "done") return;

    let cancelled = false;
    void (async () => {
      try {
        setQuizFetchState("loading");
        const token = await getToken();
        const data = await getUserQuizzes(token);
        if (!cancelled) {
          setQuizzes(data);
          setQuizFetchState("done");
        }
      } catch {
        if (!cancelled) setQuizFetchState("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [getToken, isLoaded, isSignedIn, syncState]);

  if (!isLoaded || !userLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-100 text-sm font-semibold text-zinc-700">
        Loading…
      </div>
    );
  }

  if (!isSignedIn || !user) {
    return <Navigate to="/" replace />;
  }

  const primaryEmail = user.primaryEmailAddress?.emailAddress;
  const name =
    user.fullName ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.username ||
    "Account";
  const firstName = user.firstName || name.split(" ")[0] || "there";

  const startCreateQuiz = () => {
    void navigate({ to: "/create" });
  };

  const joinWithCode = () => {
    const code = joinCode.trim();
    if (!code) {
      setActionMessage("Enter a quiz code before joining.");
      return;
    }
    void navigate({ to: "/quiz", search: { id: code } });
  };

  return (
    <div className="min-h-screen bg-stone-100 text-zinc-900">
      <header className="border-b-2 border-zinc-900 bg-amber-200">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg ">
              <img src="https://res.cloudinary.com/dw87upoot/image/upload/v1778488812/logo_rku0hm.svg" alt="hello"/>
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-700">
                PulseBoard
              </p>
              <h1 className="text-lg font-bold tracking-tight">Home base</h1>
            </div>
          </div>
          <div className="flex w-full items-start justify-between gap-3 sm:w-auto sm:items-center sm:justify-end">
            <div className="min-w-0 flex-1 rounded-lg border-2 border-zinc-900 bg-white px-3 py-1.5 text-left shadow-[3px_3px_0_0_#18181b] sm:max-w-xs sm:flex-none sm:text-right">
              <p className="truncate text-sm font-bold leading-tight">{name}</p>
              {primaryEmail ? (
                <p className="truncate text-[11px] leading-tight text-zinc-600">{primaryEmail}</p>
              ) : null}
            </div>
            <div className="shrink-0 rounded-full border-2 border-zinc-900 bg-white p-0.5 shadow-[3px_3px_0_0_#18181b]">
              <UserButton />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">
              Hey, {firstName} 👋
            </p>
            <h2 className="mt-2 text-balance text-3xl font-black tracking-tight sm:text-4xl md:text-5xl">
              What are we asking today?
            </h2>
            <p className="mt-3 max-w-xl text-base text-zinc-600">
              Spin up a quiz, or jump into one with a code. Either way — no boring forms.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <span className="rounded-full border-2 border-zinc-900 bg-lime-200 px-3 py-1 text-[11px] font-bold uppercase tracking-widest">
              Live in seconds
            </span>
            <span className="rounded-full border-2 border-zinc-900 bg-rose-200 px-3 py-1 text-[11px] font-bold uppercase tracking-widest">
              Anonymous mode
            </span>
          </div>
        </div>

        {syncState === "syncing" ? (
          <p className="mb-6 rounded-lg border-2 border-zinc-900 bg-amber-100 px-4 py-3 text-sm font-semibold">
            Syncing your account…
          </p>
        ) : null}
        {syncState === "error" && actionMessage ? (
          <p className="mb-6 rounded-lg border-2 border-zinc-900 bg-rose-100 px-4 py-3 text-sm font-semibold">
            {actionMessage}
          </p>
        ) : null}
        {syncState === "done" && actionMessage ? (
          <p className="mb-6 rounded-lg border-2 border-zinc-900 bg-lime-100 px-4 py-3 text-sm font-semibold">
            {actionMessage}
          </p>
        ) : null}

        <section className="grid gap-6 md:grid-cols-2">
          {/* Create card */}
          <article className="relative rounded-2xl border-2 border-zinc-900 bg-white p-5 shadow-[6px_6px_0_0_#18181b] sm:p-6 md:p-7">
            <span
              className="absolute right-2 top-2 rotate-3 rounded-md border-2 border-zinc-900 bg-emerald-300 px-2 py-1 text-[11px] font-black uppercase tracking-widest shadow-[3px_3px_0_0_#18181b] sm:-right-3 sm:-top-3"
              aria-hidden
            >
              New ✦
            </span>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border-2 border-zinc-900 bg-lime-200 text-lg font-black">
              ＋
            </span>
            <h3 className="mt-4 text-2xl font-bold tracking-tight">Create a quiz</h3>
            <p className="mt-2 text-sm text-zinc-600">
              Title it, drop in some questions, pick anonymous or named, and ship.
            </p>
            <ul className="mt-4 space-y-1.5 text-xs font-semibold text-zinc-700">
              <li className="flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border-2 border-zinc-900 bg-amber-200">
                  1
                </span>
                Set the basics
              </li>
              <li className="flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border-2 border-zinc-900 bg-sky-200">
                  2
                </span>
                Add questions & options
              </li>
              <li className="flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border-2 border-zinc-900 bg-rose-200">
                  3
                </span>
                Share the link
              </li>
            </ul>
            <button
              type="button"
              onClick={startCreateQuiz}
              className="mt-6 inline-flex w-full items-center justify-center rounded-lg border-2 border-zinc-900 bg-emerald-500 px-5 py-3 text-sm font-black uppercase tracking-widest text-white shadow-[4px_4px_0_0_#18181b] transition-all hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#18181b] active:translate-y-1 active:shadow-[1px_1px_0_0_#18181b] sm:w-auto"
            >
              Start building →
            </button>
          </article>

          {/* Join card */}
          <article className="relative rounded-2xl border-2 border-zinc-900 bg-white p-5 shadow-[6px_6px_0_0_#18181b] sm:p-6 md:p-7">
            <span
              className="absolute left-2 top-2 -rotate-3 rounded-md border-2 border-zinc-900 bg-sky-300 px-2 py-1 text-[11px] font-black uppercase tracking-widest shadow-[3px_3px_0_0_#18181b] sm:-left-3 sm:-top-3"
              aria-hidden
            >
              Got a code?
            </span>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border-2 border-zinc-900 bg-sky-200 text-lg font-black">
              →
            </span>
            <h3 className="mt-4 text-2xl font-bold tracking-tight">Join a quiz</h3>
            <p className="mt-2 text-sm text-zinc-600">
              Type the code someone shared with you and jump straight in.
            </p>

            <label className="mt-5 block">
              <span className="text-[11px] font-black uppercase tracking-widest text-zinc-600">
                Unique code
              </span>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.currentTarget.value)}
                onKeyDown={(e) => { if (e.key === "Enter") joinWithCode(); }}
                placeholder="e.g. PULSE-42"
                className="mt-2 w-full rounded-lg border-2 border-zinc-900 bg-white px-4 py-3 text-base font-semibold uppercase tracking-widest placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
            </label>

            <button
              type="button"
              onClick={joinWithCode}
              className="mt-4 inline-flex w-full items-center justify-center rounded-lg border-2 border-zinc-900 bg-white px-5 py-3 text-sm font-black uppercase tracking-widest shadow-[4px_4px_0_0_#18181b] transition-all hover:translate-y-0.5 hover:bg-amber-100 hover:shadow-[2px_2px_0_0_#18181b] active:translate-y-1 active:shadow-[1px_1px_0_0_#18181b] sm:w-auto"
            >
              Join now
            </button>
          </article>
        </section>

        <section className="mt-10 rounded-2xl border-2 border-dashed border-zinc-900 bg-stone-50 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-zinc-700">
              Tip: turn on{" "}
              <span className="rounded-md border-2 border-zinc-900 bg-rose-200 px-1.5 py-0.5 text-xs font-bold">
                Anonymous responses
              </span>{" "}
              to get more honest answers.
            </p>
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
              You’re signed in · ready to go
            </p>
          </div>
        </section>

        <section className="mt-12">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-black tracking-tight sm:text-2xl">Your quizzes</h2>
            {quizFetchState === "loading" && (
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-500 animate-pulse">
                Loading…
              </span>
            )}
          </div>

          {quizFetchState === "error" && (
            <p className="rounded-lg border-2 border-zinc-900 bg-rose-100 px-4 py-3 text-sm font-semibold">
              Could not load your quizzes. Try refreshing.
            </p>
          )}

          {quizFetchState === "done" && quizzes.length === 0 && (
            <div className="rounded-2xl border-2 border-dashed border-zinc-900 bg-stone-50 px-6 py-10 text-center">
              <p className="text-sm font-semibold text-zinc-500">
                No quizzes yet — create your first one above!
              </p>
            </div>
          )}

          {quizzes.length > 0 && (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {quizzes.map((quiz) => (
                <li key={quiz._id}>
                  <Link
                    to="/analytics"
                    search={{ id: quiz.slug }}
                    className="group block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-100"
                    aria-label={`View analytics for ${quiz.title}`}
                  >
                    <article className="flex h-full flex-col rounded-2xl border-2 border-zinc-900 bg-white p-5 shadow-[4px_4px_0_0_#18181b] transition-all group-hover:-translate-y-0.5 group-hover:shadow-[6px_6px_0_0_#18181b]">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-base font-bold leading-snug tracking-tight line-clamp-2">
                          {quiz.title}
                        </h3>
                        <StatusBadge status={quiz.status} />
                      </div>

                      <p className="mt-2 font-mono text-[11px] font-semibold text-zinc-500">
                        /{quiz.slug}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {quiz.isAnonymousPoll && (
                          <span className="rounded-full border-2 border-zinc-900 bg-rose-200 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest">
                            Anonymous
                          </span>
                        )}
                        {quiz.isPublished ? (
                          <span className="rounded-full border-2 border-zinc-900 bg-lime-200 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest">
                            Results public
                          </span>
                        ) : (
                          <span className="rounded-full border-2 border-zinc-900 bg-stone-200 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest">
                            Results private
                          </span>
                        )}
                      </div>

                      <div className="mt-auto flex items-end justify-between gap-2 pt-4">
                        <p className="text-[11px] font-semibold text-zinc-400">
                          Created{" "}
                          {new Date(quiz.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                        <span className="inline-flex items-center gap-1 rounded-md border-2 border-zinc-900 bg-amber-200 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest opacity-80 transition-all group-hover:translate-x-0.5 group-hover:opacity-100">
                          Analytics →
                        </span>
                      </div>
                    </article>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

const statusStyles: Record<string, string> = {
  active: "bg-lime-300 border-zinc-900",
  draft: "bg-amber-200 border-zinc-900",
  expired: "bg-zinc-200 border-zinc-900",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`shrink-0 rounded-md border-2 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${statusStyles[status] ?? "bg-stone-200 border-zinc-900"}`}
    >
      {status}
    </span>
  );
}
