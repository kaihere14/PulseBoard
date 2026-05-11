import { useClerk, useAuth } from "@clerk/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getQuizBySlug, LoginRequiredError, type QuizDetail } from "../lib/api";

export const Route = createFileRoute("/quiz")({
  validateSearch: (search: Record<string, unknown>) => ({
    id: typeof search.id === "string" ? search.id : "",
  }),
  component: QuizPage,
});

type FetchState = "idle" | "loading" | "done" | "error" | "login_required";

function QuizPage() {
  const { id: slug } = Route.useSearch();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { openSignIn } = useClerk();
  const navigate = useNavigate();

  const [fetchState, setFetchState] = useState<FetchState>("idle");
  const [quiz, setQuiz] = useState<QuizDetail | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;

    let cancelled = false;
    void (async () => {
      if (!slug) {
        setFetchState("error");
        setErrorMessage("No quiz ID provided.");
        return;
      }

      try {
        setFetchState("loading");
        const token = isSignedIn ? await getToken() : null;
        const data = await getQuizBySlug(slug, token);
        if (!cancelled) {
          setQuiz(data);
          setFetchState("done");
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof LoginRequiredError) {
          setFetchState("login_required");
        } else {
          setFetchState("error");
          setErrorMessage(err instanceof Error ? err.message : "Failed to load quiz.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, slug, getToken]);

  const handleSignIn = () => {
    openSignIn({
      afterSignInUrl: window.location.href,
      afterSignUpUrl: window.location.href,
    });
  };

  if (!isLoaded || fetchState === "idle") {
    return <FullScreenLoader />;
  }

  return (
    <div className="min-h-screen bg-stone-100 text-zinc-900">
      <header className="border-b-2 border-zinc-900 bg-amber-200">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-4">
          <button
            type="button"
            onClick={() => void navigate({ to: "/home" })}
            className="flex items-center gap-2 text-sm font-black uppercase tracking-widest hover:underline"
          >
            ← Back
          </button>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-700">
            PulseBoard
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-6 py-10">
        {fetchState === "loading" && (
          <div className="flex flex-col items-center gap-4 py-24">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-900 border-t-amber-400" />
            <p className="text-sm font-semibold text-zinc-500">Loading quiz…</p>
          </div>
        )}

        {fetchState === "login_required" && (
          <LoginGate slug={slug} onSignIn={handleSignIn} />
        )}

        {fetchState === "error" && (
          <div className="mt-10 rounded-2xl border-2 border-zinc-900 bg-rose-100 p-8 text-center shadow-[6px_6px_0_0_#18181b]">
            <span className="text-4xl">⚠</span>
            <h2 className="mt-3 text-xl font-black tracking-tight">Something went wrong</h2>
            <p className="mt-2 text-sm font-semibold text-zinc-600">
              {errorMessage ?? "Could not load the quiz."}
            </p>
            <button
              type="button"
              onClick={() => void navigate({ to: "/home" })}
              className="mt-6 inline-flex items-center gap-2 rounded-lg border-2 border-zinc-900 bg-white px-5 py-2.5 text-sm font-black uppercase tracking-widest shadow-[4px_4px_0_0_#18181b] transition-all hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#18181b]"
            >
              Go home
            </button>
          </div>
        )}

        {fetchState === "done" && quiz && <QuizView quiz={quiz} />}
      </main>
    </div>
  );
}

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-stone-100">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-900 border-t-amber-400" />
      <p className="text-sm font-semibold text-zinc-500">Loading…</p>
    </div>
  );
}

function LoginGate({ slug, onSignIn }: { slug: string; onSignIn: () => void }) {
  return (
    <div className="mt-10 flex flex-col items-center">
      <div className="relative w-full max-w-md">
        <span
          className="absolute -right-3 -top-3 rotate-3 rounded-md border-2 border-zinc-900 bg-amber-300 px-2 py-1 text-[11px] font-black uppercase tracking-widest shadow-[3px_3px_0_0_#18181b]"
          aria-hidden
        >
          Members only
        </span>

        <div className="rounded-2xl border-2 border-zinc-900 bg-white p-8 shadow-[8px_8px_0_0_#18181b]">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl border-2 border-zinc-900 bg-rose-200 text-2xl shadow-[3px_3px_0_0_#18181b]">
            🔒
          </span>

          <h2 className="mt-4 text-2xl font-black tracking-tight">Login required</h2>
          <p className="mt-2 text-sm text-zinc-600">
            This quiz is not anonymous. You need to sign in before you can view or answer it.
          </p>

          <div className="mt-3 rounded-lg border-2 border-dashed border-zinc-400 bg-stone-50 px-3 py-2">
            <p className="font-mono text-[11px] font-semibold text-zinc-500">
              quiz: <span className="text-zinc-800">{slug}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onSignIn}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg border-2 border-zinc-900 bg-emerald-500 px-5 py-3 text-sm font-black uppercase tracking-widest text-white shadow-[4px_4px_0_0_#18181b] transition-all hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#18181b] active:translate-y-1 active:shadow-[1px_1px_0_0_#18181b]"
          >
            Sign in to continue →
          </button>
        </div>
      </div>
    </div>
  );
}

const statusStyles: Record<string, string> = {
  active: "bg-lime-300",
  draft: "bg-amber-200",
  expired: "bg-zinc-200",
};

function QuizView({ quiz }: { quiz: QuizDetail }) {
  const { poll, questions } = quiz;

  return (
    <div>
      {/* Poll header */}
      <div className="relative rounded-2xl border-2 border-zinc-900 bg-white p-6 shadow-[6px_6px_0_0_#18181b] md:p-8">
        <span
          className={`absolute -right-3 -top-3 rounded-md border-2 border-zinc-900 px-2 py-1 text-[10px] font-black uppercase tracking-widest shadow-[3px_3px_0_0_#18181b] ${statusStyles[poll.status] ?? "bg-stone-200"}`}
        >
          {poll.status}
        </span>

        <div className="flex flex-wrap gap-2">
          {poll.isAnonymousPoll && (
            <span className="rounded-full border-2 border-zinc-900 bg-rose-200 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest">
              Anonymous
            </span>
          )}
          {poll.isPublished ? (
            <span className="rounded-full border-2 border-zinc-900 bg-lime-200 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest">
              Published
            </span>
          ) : (
            <span className="rounded-full border-2 border-zinc-900 bg-stone-200 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest">
              Draft
            </span>
          )}
        </div>

        <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">{poll.title}</h1>

        <p className="mt-2 font-mono text-[11px] font-semibold text-zinc-500">/{poll.slug}</p>

        {poll.expiresAt && (
          <p className="mt-2 text-xs font-semibold text-zinc-500">
            Expires{" "}
            {new Date(poll.expiresAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        )}
      </div>

      {/* Questions */}
      <ol className="mt-6 space-y-4">
        {questions.map((q, idx) => (
          <li key={q._id}>
            <article className="rounded-2xl border-2 border-zinc-900 bg-white p-5 shadow-[4px_4px_0_0_#18181b] md:p-6">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 border-zinc-900 bg-amber-200 text-xs font-black">
                  {idx + 1}
                </span>
                <div className="flex-1">
                  <p className="font-bold leading-snug">
                    {q.question}
                    {q.isRequired && (
                      <span className="ml-1.5 text-rose-500">*</span>
                    )}
                  </p>

                  <ul className="mt-3 space-y-2">
                    {q.options.map((option, oIdx) => (
                      <li key={oIdx}>
                        <label className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-zinc-900 bg-stone-50 px-4 py-3 text-sm font-semibold shadow-[2px_2px_0_0_#18181b] transition-all hover:bg-amber-50 hover:shadow-[3px_3px_0_0_#18181b]">
                          <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-zinc-900 bg-white text-[10px] font-black">
                            {String.fromCharCode(65 + oIdx)}
                          </span>
                          {option}
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          </li>
        ))}
      </ol>

      {questions.length === 0 && (
        <div className="mt-6 rounded-2xl border-2 border-dashed border-zinc-900 bg-stone-50 px-6 py-10 text-center">
          <p className="text-sm font-semibold text-zinc-500">
            No questions added to this quiz yet.
          </p>
        </div>
      )}
    </div>
  );
}
