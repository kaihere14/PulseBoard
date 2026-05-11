import { useClerk, useAuth } from "@clerk/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  getQuizBySlug,
  submitQuizResponse,
  LoginRequiredError,
  AlreadyVotedError,
  QuizNotActiveError,
  type QuizDetail,
} from "../lib/api";

export const Route = createFileRoute("/quiz")({
  validateSearch: (search: Record<string, unknown>) => ({
    id: typeof search.id === "string" ? search.id : "",
  }),
  component: QuizPage,
});

type FetchState = "idle" | "loading" | "done" | "error" | "login_required";
type SubmitState = "idle" | "submitting" | "success" | "error" | "already_voted";

function voterKey(pollId: string) {
  return `pulse_voter_${pollId}`;
}

function hasAlreadyVoted(pollId: string): boolean {
  return localStorage.getItem(voterKey(pollId)) !== null;
}

function persistVoterId(pollId: string, voterId: string) {
  localStorage.setItem(voterKey(pollId), voterId);
}

function QuizPage() {
  const { id: slug } = Route.useSearch();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { openSignIn } = useClerk();
  const navigate = useNavigate();

  const [fetchState, setFetchState] = useState<FetchState>("idle");
  const [quiz, setQuiz] = useState<QuizDetail | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [selections, setSelections] = useState<Record<string, number>>({});
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);

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
        if (cancelled) return;

        if (data.poll.isPublished) {
          void navigate({
            to: "/analytics",
            search: { id: slug },
            replace: true,
          });
          return;
        }

        setQuiz(data);
        setFetchState("done");
        if (data.poll.isAnonymousPoll && hasAlreadyVoted(data.poll._id)) {
          setSubmitState("already_voted");
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
  }, [isLoaded, isSignedIn, slug, getToken, navigate]);

  const handleSelect = (questionId: string, optionIndex: number) => {
    setSelections((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleSubmit = async () => {
    if (!quiz) return;
    const { poll, questions } = quiz;

    for (const q of questions) {
      if (q.isRequired && selections[q._id] === undefined) {
        setSubmitError(`Please answer: "${q.question}"`);
        setSubmitState("error");
        return;
      }
    }

    const answers = Object.entries(selections).map(([questionId, selectedOptionIndex]) => ({
      questionId,
      selectedOptionIndex,
    }));

    if (answers.length === 0) {
      setSubmitError("Please select at least one answer before submitting.");
      setSubmitState("error");
      return;
    }

    setSubmitError(null);
    setSubmitState("submitting");

    try {
      const token = isSignedIn ? await getToken() : null;

      let voterId: string;
      if (poll.isAnonymousPoll) {
        const existing = localStorage.getItem(voterKey(poll._id));
        if (existing) {
          setSubmitState("already_voted");
          return;
        }
        voterId = crypto.randomUUID();
      } else {
        voterId = "auth";
      }

      await submitQuizResponse(token, { pollId: poll._id, voterId, answers });

      if (poll.isAnonymousPoll) {
        persistVoterId(poll._id, voterId);
      }

      setSubmitState("success");
    } catch (err) {
      if (err instanceof AlreadyVotedError) {
        if (quiz.poll.isAnonymousPoll) {
          const existing = localStorage.getItem(voterKey(quiz.poll._id));
          if (!existing) persistVoterId(quiz.poll._id, crypto.randomUUID());
        }
        setSubmitState("already_voted");
      } else if (err instanceof QuizNotActiveError) {
        setSubmitState("error");
        setSubmitError(err.message);
      } else {
        setSubmitState("error");
        setSubmitError(err instanceof Error ? err.message : "Something went wrong. Try again.");
      }
    }
  };

  const handleSignIn = () => {
    openSignIn({
      forceRedirectUrl: window.location.href,
      fallbackRedirectUrl: window.location.href,
    });
  };

  if (!isLoaded || fetchState === "idle") return <FullScreenLoader />;

  return (
    <div className="min-h-screen bg-stone-100 text-zinc-900">
      <header className="border-b-2 border-zinc-900 bg-amber-200">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={() => void navigate({ to: "/home" })}
            className="flex shrink-0 items-center gap-2 text-xs font-black uppercase tracking-widest hover:underline sm:text-sm"
          >
            ← Back
          </button>
          <p className="max-w-[55%] truncate text-right text-[10px] font-black uppercase tracking-[0.3em] text-zinc-700 sm:max-w-none">
            PulseBoard
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
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
          <ErrorView
            message={errorMessage}
            onGoHome={() => void navigate({ to: "/home" })}
          />
        )}

        {fetchState === "done" && quiz && (
          <>
            {submitState === "success" && (
              <SuccessView
                pollTitle={quiz.poll.title}
                onGoHome={() => void navigate({ to: "/home" })}
              />
            )}
            {submitState === "already_voted" && (
              <AlreadyVotedView onGoHome={() => void navigate({ to: "/home" })} />
            )}
            {(submitState === "idle" ||
              submitState === "submitting" ||
              submitState === "error") && (
              <QuizView
                quiz={quiz}
                selections={selections}
                onSelect={handleSelect}
                onSubmit={() => void handleSubmit()}
                submitState={submitState}
                submitError={submitError}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

// ─── Sub-views ────────────────────────────────────────────────────────────────

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-stone-100">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-900 border-t-amber-400" />
      <p className="text-sm font-semibold text-zinc-500">Loading…</p>
    </div>
  );
}

function ErrorView({
  message,
  onGoHome,
}: {
  message: string | null;
  onGoHome: () => void;
}) {
  return (
    <div className="mt-10 rounded-2xl border-2 border-zinc-900 bg-rose-100 p-8 text-center shadow-[6px_6px_0_0_#18181b]">
      <span className="text-4xl">⚠</span>
      <h2 className="mt-3 text-xl font-black tracking-tight">Something went wrong</h2>
      <p className="mt-2 text-sm font-semibold text-zinc-600">
        {message ?? "Could not load the quiz."}
      </p>
      <button
        type="button"
        onClick={onGoHome}
        className="mt-6 inline-flex items-center gap-2 rounded-lg border-2 border-zinc-900 bg-white px-5 py-2.5 text-sm font-black uppercase tracking-widest shadow-[4px_4px_0_0_#18181b] transition-all hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#18181b]"
      >
        Go home
      </button>
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
            This quiz is not anonymous. Sign in before you can view or answer it.
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

function SuccessView({
  pollTitle,
  onGoHome,
}: {
  pollTitle: string;
  onGoHome: () => void;
}) {
  return (
    <div className="flex flex-col items-center py-10">
      {/* Confetti-strip decoration */}
      <div className="mb-8 flex gap-2" aria-hidden>
        {["bg-lime-300", "bg-amber-300", "bg-sky-300", "bg-rose-300", "bg-orange-300", "bg-lime-300", "bg-amber-300"].map(
          (color, i) => (
            <span
              key={i}
              className={`inline-block h-3 w-3 rotate-12 rounded-sm border-2 border-zinc-900 ${color}`}
              style={{ animationDelay: `${i * 80}ms` }}
            />
          )
        )}
      </div>

      <div className="relative w-full max-w-md">
        {/* Floating badge */}
        <span
          className="absolute -right-4 -top-4 rotate-6 rounded-md border-2 border-zinc-900 bg-lime-300 px-3 py-1 text-[11px] font-black uppercase tracking-widest shadow-[3px_3px_0_0_#18181b]"
          aria-hidden
        >
          Done ✦
        </span>

        <div className="rounded-2xl border-2 border-zinc-900 bg-white shadow-[8px_8px_0_0_#18181b]">
          {/* Coloured header strip */}
          <div className="rounded-t-2xl border-b-2 border-zinc-900 bg-lime-200 px-8 py-6 text-center">
            <div className="mx-auto mb-3 inline-flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-zinc-900 bg-white text-4xl shadow-[4px_4px_0_0_#18181b]">
              🎉
            </div>
            <h2 className="text-3xl font-black tracking-tight">Thank you!</h2>
            <p className="mt-1 text-sm font-semibold text-zinc-700">Your response has been recorded.</p>
          </div>

          {/* Body */}
          <div className="px-8 py-6 text-center">
            <p className="text-sm text-zinc-600 leading-relaxed">
              You just answered{" "}
              <span className="rounded-md border-2 border-zinc-900 bg-amber-100 px-1.5 py-0.5 font-bold text-zinc-900">
                {pollTitle}
              </span>
              . Your voice matters — results are being tallied.
            </p>

            <div className="mt-6 flex flex-col gap-2">
              <div className="flex items-center gap-2 rounded-lg border-2 border-dashed border-zinc-300 bg-stone-50 px-4 py-3 text-left">
                <span className="text-lg">✅</span>
                <p className="text-xs font-semibold text-zinc-600">Response saved successfully</p>
              </div>
              <div className="flex items-center gap-2 rounded-lg border-2 border-dashed border-zinc-300 bg-stone-50 px-4 py-3 text-left">
                <span className="text-lg">🔒</span>
                <p className="text-xs font-semibold text-zinc-600">Submission locked — no double voting</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onGoHome}
              className="mt-6 inline-flex w-full items-center justify-center rounded-lg border-2 border-zinc-900 bg-zinc-900 px-5 py-3 text-sm font-black uppercase tracking-widest text-white shadow-[4px_4px_0_0_#a1a1aa] transition-all hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#a1a1aa] active:translate-y-1 active:shadow-none"
            >
              Back to home
            </button>
          </div>
        </div>
      </div>

      {/* Bottom confetti strip */}
      <div className="mt-8 flex gap-2" aria-hidden>
        {["bg-sky-300", "bg-rose-300", "bg-lime-300", "bg-orange-300", "bg-amber-300", "bg-sky-300", "bg-rose-300"].map(
          (color, i) => (
            <span
              key={i}
              className={`inline-block h-3 w-3 -rotate-12 rounded-sm border-2 border-zinc-900 ${color}`}
            />
          )
        )}
      </div>
    </div>
  );
}

function AlreadyVotedView({ onGoHome }: { onGoHome: () => void }) {
  return (
    <div className="flex flex-col items-center py-10">
      <div className="relative w-full max-w-md">
        <span
          className="absolute -left-4 -top-4 -rotate-6 rounded-md border-2 border-zinc-900 bg-amber-300 px-3 py-1 text-[11px] font-black uppercase tracking-widest shadow-[3px_3px_0_0_#18181b]"
          aria-hidden
        >
          Hey you
        </span>
        <div className="rounded-2xl border-2 border-zinc-900 bg-white shadow-[8px_8px_0_0_#18181b]">
          <div className="rounded-t-2xl border-b-2 border-zinc-900 bg-amber-100 px-8 py-6 text-center">
            <div className="mx-auto mb-3 inline-flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-zinc-900 bg-white text-4xl shadow-[4px_4px_0_0_#18181b]">
              👀
            </div>
            <h2 className="text-2xl font-black tracking-tight">Already voted!</h2>
            <p className="mt-1 text-sm font-semibold text-zinc-700">
              Looks like you've already submitted a response.
            </p>
          </div>
          <div className="px-8 py-6 text-center">
            <p className="text-sm text-zinc-600 leading-relaxed">
              Each person can only respond once. Your previous answer is safely recorded — no need
              to submit again.
            </p>
            <button
              type="button"
              onClick={onGoHome}
              className="mt-6 inline-flex w-full items-center justify-center rounded-lg border-2 border-zinc-900 bg-zinc-900 px-5 py-3 text-sm font-black uppercase tracking-widest text-white shadow-[4px_4px_0_0_#a1a1aa] transition-all hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#a1a1aa] active:translate-y-1 active:shadow-none"
            >
              Back to home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Quiz answering view ───────────────────────────────────────────────────────

const ACCENTS = [
  "bg-amber-200",
  "bg-sky-200",
  "bg-rose-200",
  "bg-lime-200",
  "bg-orange-200",
] as const;

const statusStyles: Record<string, string> = {
  active: "bg-lime-300",
  draft: "bg-amber-200",
  expired: "bg-zinc-200",
};

function QuizView({
  quiz,
  selections,
  onSelect,
  onSubmit,
  submitState,
  submitError,
}: {
  quiz: QuizDetail;
  selections: Record<string, number>;
  onSelect: (questionId: string, optionIndex: number) => void;
  onSubmit: () => void;
  submitState: "idle" | "submitting" | "error";
  submitError: string | null;
}) {
  const { poll, questions } = quiz;
  const isNotActive = poll.status !== "active";

  return (
    <div>
      {/* Poll header */}
      <div className="relative rounded-2xl border-2 border-zinc-900 bg-white p-4 shadow-[6px_6px_0_0_#18181b] sm:p-6 md:p-8">
        <span
          className={`absolute right-2 top-2 rounded-md border-2 border-zinc-900 px-2 py-1 text-[10px] font-black uppercase tracking-widest shadow-[3px_3px_0_0_#18181b] sm:-right-3 sm:-top-3 sm:text-[10px] ${statusStyles[poll.status] ?? "bg-stone-200"}`}
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
              Results public
            </span>
          ) : (
            <span className="rounded-full border-2 border-zinc-900 bg-stone-200 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest">
              Results private
            </span>
          )}
        </div>

        <h1 className="mt-3 text-balance wrap-break-word text-2xl font-black tracking-tight sm:text-3xl md:text-4xl">{poll.title}</h1>
        <p className="mt-2 break-all font-mono text-[11px] font-semibold text-zinc-500">/{poll.slug}</p>

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

      {/* Not-active banner */}
      {isNotActive && (
        <div className="mt-4 rounded-xl border-2 border-zinc-900 bg-amber-100 px-5 py-3 text-sm font-semibold text-zinc-800">
          {poll.status === "draft"
            ? "This quiz is a draft and not yet open for responses."
            : "This quiz has expired and is no longer accepting responses."}
        </div>
      )}

      {/* Questions */}
      {questions.length > 0 ? (
        <ol className="mt-6 space-y-4">
          {questions.map((q, idx) => {
            const accent = ACCENTS[idx % ACCENTS.length];
            const selected = selections[q._id];
            return (
              <li key={q._id}>
                <article className="rounded-2xl border-2 border-zinc-900 bg-white p-4 shadow-[4px_4px_0_0_#18181b] sm:p-5 md:p-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                    <span
                      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 border-zinc-900 ${accent} text-xs font-black`}
                    >
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="wrap-break-word font-bold leading-snug">{q.question}</p>
                        {q.isRequired ? (
                          <span className="shrink-0 rounded-md border-2 border-zinc-900 bg-rose-200 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest">
                            Required
                          </span>
                        ) : (
                          <span className="shrink-0 rounded-md border-2 border-zinc-300 bg-stone-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
                            Optional
                          </span>
                        )}
                      </div>

                      <ul className="mt-3 space-y-2">
                        {q.options.map((option, oIdx) => {
                          const isChosen = selected === oIdx;
                          return (
                            <li key={oIdx}>
                              <button
                                type="button"
                                disabled={isNotActive}
                                onClick={() => onSelect(q._id, oIdx)}
                                className={`flex w-full cursor-pointer items-start gap-3 rounded-lg border-2 px-4 py-3 text-left text-sm font-semibold transition-all ${
                                  isChosen
                                    ? "border-zinc-900 bg-emerald-100 shadow-[3px_3px_0_0_#18181b]"
                                    : "border-zinc-900 bg-stone-50 shadow-[2px_2px_0_0_#18181b] hover:bg-amber-50 hover:shadow-[3px_3px_0_0_#18181b]"
                                } disabled:cursor-not-allowed disabled:opacity-60`}
                              >
                                <span
                                  className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-zinc-900 text-[10px] font-black transition-colors ${
                                    isChosen ? "bg-emerald-500 text-white" : "bg-white"
                                  }`}
                                >
                                  {isChosen ? "✓" : String.fromCharCode(65 + oIdx)}
                                </span>
                                <span className="min-w-0 flex-1 wrap-break-word">{option}</span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="mt-6 rounded-2xl border-2 border-dashed border-zinc-900 bg-stone-50 px-6 py-10 text-center">
          <p className="text-sm font-semibold text-zinc-500">No questions added to this quiz yet.</p>
        </div>
      )}

      {/* Submit section */}
      {!isNotActive && questions.length > 0 && (
        <div className="mt-6 rounded-2xl border-2 border-zinc-900 bg-white p-4 shadow-[6px_6px_0_0_#18181b] sm:p-5 md:p-6">
          {submitState === "error" && submitError && (
            <p className="mb-4 rounded-md border-2 border-zinc-900 bg-rose-100 px-4 py-3 text-sm font-semibold">
              {submitError}
            </p>
          )}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <p className="text-center text-xs font-semibold text-zinc-500 sm:text-left">
              {Object.keys(selections).length} / {questions.length} answered
            </p>
            <button
              type="button"
              onClick={onSubmit}
              disabled={submitState === "submitting"}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border-2 border-zinc-900 bg-emerald-500 px-6 py-3 text-sm font-black uppercase tracking-widest text-white shadow-[4px_4px_0_0_#18181b] transition-all hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#18181b] active:translate-y-1 active:shadow-[1px_1px_0_0_#18181b] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0_0_#18181b] sm:w-auto sm:shrink-0"
            >
              {submitState === "submitting" ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Submitting…
                </>
              ) : (
                "Submit answers →"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
