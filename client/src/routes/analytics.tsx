import { useAuth, useClerk } from "@clerk/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  deleteQuiz,
  getQuizAnalytics,
  updateQuiz,
  ForbiddenError,
  LoginRequiredError,
  type AnalyticsOption,
  type AnalyticsQuestion,
  type QuizAnalytics,
  type QuizStatus,
} from "../lib/api";

export const Route = createFileRoute("/analytics")({
  validateSearch: (search: Record<string, unknown>) => ({
    id: typeof search.id === "string" ? search.id : "",
  }),
  component: AnalyticsPage,
});

type FetchState =
  | "idle"
  | "loading"
  | "done"
  | "error"
  | "login_required"
  | "forbidden";

const OPTION_ACCENTS = [
  "bg-amber-300",
  "bg-sky-300",
  "bg-lime-300",
  "bg-rose-300",
  "bg-orange-300",
  "bg-violet-300",
] as const;

const STATUS_STYLES: Record<string, string> = {
  active: "bg-lime-300",
  draft: "bg-amber-200",
  expired: "bg-zinc-200",
};

function AnalyticsPage() {
  const { id: slug } = Route.useSearch();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { openSignIn } = useClerk();
  const navigate = useNavigate();

  const [fetchState, setFetchState] = useState<FetchState>("idle");
  const [analytics, setAnalytics] = useState<QuizAnalytics | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [animate, setAnimate] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [copied, setCopied] = useState(false);

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
        setAnimate(false);
        const token = isSignedIn ? await getToken() : null;
        const data = await getQuizAnalytics(slug, token);
        if (cancelled) return;
        setAnalytics(data);
        setFetchState("done");
        // Defer to next frames so the browser paints 0% first, then grows.
        requestAnimationFrame(() =>
          requestAnimationFrame(() => setAnimate(true))
        );
      } catch (err) {
        if (cancelled) return;
        if (err instanceof LoginRequiredError) {
          setFetchState("login_required");
        } else if (err instanceof ForbiddenError) {
          setFetchState("forbidden");
          setErrorMessage(err.message);
        } else {
          setFetchState("error");
          setErrorMessage(
            err instanceof Error ? err.message : "Failed to load analytics."
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, slug, getToken, refreshTick]);

  const shareUrl = useMemo(() => {
    if (!slug) return "";
    const origin = window.location.origin;
    if (analytics?.poll.isPublished) {
      return `${origin}/analytics?id=${encodeURIComponent(slug)}`;
    }
    return `${origin}/quiz?id=${encodeURIComponent(slug)}`;
  }, [slug, analytics?.poll.isPublished]);

  const handleCopy = () => {
    if (!shareUrl) return;
    void navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  const handleRefresh = () => setRefreshTick((t) => t + 1);

  const handleSignIn = () =>
    openSignIn({
      forceRedirectUrl: window.location.href,
      fallbackRedirectUrl: window.location.href,
    });

  return (
    <div className="min-h-screen bg-stone-100 text-zinc-900">
      <header className="border-b-2 border-zinc-900 bg-amber-200">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          <button
            type="button"
            onClick={() => void navigate({ to: "/home" })}
            className="flex items-center gap-2 text-sm font-black uppercase tracking-widest hover:underline"
          >
            ← Back
          </button>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-700">
            PulseBoard · Analytics
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-6 py-10">
        {(!isLoaded || fetchState === "idle" || fetchState === "loading") && (
          <LoadingState />
        )}

        {fetchState === "login_required" && (
          <LoginGate slug={slug} onSignIn={handleSignIn} />
        )}

        {fetchState === "forbidden" && (
          <ForbiddenView
            message={errorMessage}
            onGoHome={() => void navigate({ to: "/home" })}
          />
        )}

        {fetchState === "error" && (
          <ErrorView
            message={errorMessage}
            onGoHome={() => void navigate({ to: "/home" })}
            onRetry={handleRefresh}
          />
        )}

        {fetchState === "done" && analytics && (
          <AnalyticsView
            analytics={analytics}
            animate={animate}
            shareUrl={shareUrl}
            copied={copied}
            onCopy={handleCopy}
            onRefresh={handleRefresh}
            onPollUpdated={(updated) =>
              setAnalytics((prev) =>
                prev ? { ...prev, poll: { ...prev.poll, ...updated } } : prev
              )
            }
            onPollDeleted={() => void navigate({ to: "/home" })}
            getToken={getToken}
          />
        )}
      </main>
    </div>
  );
}

// ─── Sub-views ────────────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="flex flex-col items-center gap-4 py-24">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-900 border-t-amber-400" />
      <p className="text-sm font-semibold text-zinc-500">Crunching numbers…</p>
    </div>
  );
}

function ErrorView({
  message,
  onGoHome,
  onRetry,
}: {
  message: string | null;
  onGoHome: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="mt-10 rounded-2xl border-2 border-zinc-900 bg-rose-100 p-8 text-center shadow-[6px_6px_0_0_#18181b]">
      <span className="text-4xl">⚠</span>
      <h2 className="mt-3 text-xl font-black tracking-tight">
        Could not load analytics
      </h2>
      <p className="mt-2 text-sm font-semibold text-zinc-600">
        {message ?? "Something went wrong."}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-lg border-2 border-zinc-900 bg-amber-200 px-5 py-2.5 text-sm font-black uppercase tracking-widest shadow-[4px_4px_0_0_#18181b] transition-all hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#18181b]"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={onGoHome}
          className="inline-flex items-center gap-2 rounded-lg border-2 border-zinc-900 bg-white px-5 py-2.5 text-sm font-black uppercase tracking-widest shadow-[4px_4px_0_0_#18181b] transition-all hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#18181b]"
        >
          Go home
        </button>
      </div>
    </div>
  );
}

function ForbiddenView({
  message,
  onGoHome,
}: {
  message: string | null;
  onGoHome: () => void;
}) {
  return (
    <div className="mt-10 flex flex-col items-center">
      <div className="relative w-full max-w-md">
        <span
          className="absolute -right-3 -top-3 rotate-3 rounded-md border-2 border-zinc-900 bg-rose-300 px-2 py-1 text-[11px] font-black uppercase tracking-widest shadow-[3px_3px_0_0_#18181b]"
          aria-hidden
        >
          Creator only
        </span>
        <div className="rounded-2xl border-2 border-zinc-900 bg-white p-8 shadow-[8px_8px_0_0_#18181b]">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl border-2 border-zinc-900 bg-rose-200 text-2xl shadow-[3px_3px_0_0_#18181b]">
            🚫
          </span>
          <h2 className="mt-4 text-2xl font-black tracking-tight">
            Hold up — this is private
          </h2>
          <p className="mt-2 text-sm text-zinc-600">
            {message ??
              "These analytics aren't shared yet, so only the creator can view this page."}
          </p>
          <button
            type="button"
            onClick={onGoHome}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg border-2 border-zinc-900 bg-zinc-900 px-5 py-3 text-sm font-black uppercase tracking-widest text-white shadow-[4px_4px_0_0_#a1a1aa] transition-all hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#a1a1aa] active:translate-y-1 active:shadow-none"
          >
            Back to home
          </button>
        </div>
      </div>
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
          Sign in
        </span>
        <div className="rounded-2xl border-2 border-zinc-900 bg-white p-8 shadow-[8px_8px_0_0_#18181b]">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl border-2 border-zinc-900 bg-sky-200 text-2xl shadow-[3px_3px_0_0_#18181b]">
            🔒
          </span>
          <h2 className="mt-4 text-2xl font-black tracking-tight">
            Login to view analytics
          </h2>
          <p className="mt-2 text-sm text-zinc-600">
            You need to be signed in to see results for this quiz.
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

// ─── Main analytics view ──────────────────────────────────────────────────────

function AnalyticsView({
  analytics,
  animate,
  shareUrl,
  copied,
  onCopy,
  onRefresh,
  onPollUpdated,
  onPollDeleted,
  getToken,
}: {
  analytics: QuizAnalytics;
  animate: boolean;
  shareUrl: string;
  copied: boolean;
  onCopy: () => void;
  onRefresh: () => void;
  onPollUpdated: (poll: Partial<QuizAnalytics["poll"]>) => void;
  onPollDeleted: () => void;
  getToken: () => Promise<string | null>;
}) {
  const { poll, totalResponses, questions, isCreator } = analytics;

  const visibility = poll.isPublished ? "Results public" : "Results private";
  const avgAnswersPerQuestion = useMemo(() => {
    if (questions.length === 0) return 0;
    const total = questions.reduce((sum, q) => sum + q.totalAnswers, 0);
    return total / questions.length;
  }, [questions]);

  return (
    <div>
      {/* Hero / poll header */}
      <div className="relative rounded-2xl border-2 border-zinc-900 bg-white p-6 shadow-[6px_6px_0_0_#18181b] md:p-8">
        <span
          className="absolute -right-3 -top-3 rotate-3 rounded-md border-2 border-zinc-900 bg-emerald-300 px-2 py-1 text-[11px] font-black uppercase tracking-widest shadow-[3px_3px_0_0_#18181b]"
          aria-hidden
        >
          Live results ✦
        </span>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-md border-2 border-zinc-900 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${
              STATUS_STYLES[poll.status] ?? "bg-stone-200"
            }`}
          >
            {poll.status}
          </span>
          {poll.isAnonymousPoll && (
            <span className="rounded-full border-2 border-zinc-900 bg-rose-200 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest">
              Anonymous
            </span>
          )}
          <span
            className={`rounded-full border-2 border-zinc-900 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${
              poll.isPublished ? "bg-lime-200" : "bg-stone-200"
            }`}
          >
            {visibility}
          </span>
        </div>

        <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
          {poll.title}
        </h1>
        <p className="mt-2 font-mono text-[11px] font-semibold text-zinc-500">
          /{poll.slug}
        </p>

        {/* Share row */}
        <div className="mt-5 flex flex-wrap items-stretch gap-2">
          <div className="flex flex-1 items-center gap-2 overflow-hidden rounded-lg border-2 border-zinc-900 bg-stone-50 px-3 py-2 shadow-[3px_3px_0_0_#18181b]">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              Link
            </span>
            <span className="truncate font-mono text-xs font-semibold text-zinc-700">
              {shareUrl}
            </span>
          </div>
          <button
            type="button"
            onClick={onCopy}
            className={`inline-flex items-center gap-2 rounded-lg border-2 border-zinc-900 px-4 py-2 text-xs font-black uppercase tracking-widest shadow-[3px_3px_0_0_#18181b] transition-all hover:translate-y-0.5 hover:shadow-[1px_1px_0_0_#18181b] ${
              copied ? "bg-lime-300" : "bg-white"
            }`}
          >
            {copied ? "Copied ✓" : "Copy link"}
          </button>
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-2 rounded-lg border-2 border-zinc-900 bg-amber-200 px-4 py-2 text-xs font-black uppercase tracking-widest shadow-[3px_3px_0_0_#18181b] transition-all hover:translate-y-0.5 hover:shadow-[1px_1px_0_0_#18181b]"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Responses"
          value={totalResponses.toString()}
          accent="bg-lime-200"
          icon="📨"
        />
        <StatCard
          label="Questions"
          value={questions.length.toString()}
          accent="bg-sky-200"
          icon="❓"
        />
        <StatCard
          label="Avg / Q"
          value={avgAnswersPerQuestion.toFixed(1)}
          accent="bg-amber-200"
          icon="📊"
        />
        <StatCard
          label="Created"
          value={new Date(poll.createdAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
          accent="bg-rose-200"
          icon="📅"
        />
      </section>

      {isCreator && (
        <ManagePollPanel
          slug={poll.slug}
          status={poll.status}
          isPublished={poll.isPublished}
          isAnonymousPoll={poll.isAnonymousPoll}
          expiresAt={poll.expiresAt}
          getToken={getToken}
          onUpdated={onPollUpdated}
          onDeleted={onPollDeleted}
        />
      )}

      {/* Empty results */}
      {totalResponses === 0 && (
        <div className="mt-8 rounded-2xl border-2 border-dashed border-zinc-900 bg-stone-50 px-6 py-12 text-center">
          <span className="text-4xl" aria-hidden>
            🦗
          </span>
          <h3 className="mt-3 text-xl font-black tracking-tight">
            No responses yet
          </h3>
          <p className="mt-2 text-sm font-semibold text-zinc-500">
            Share the quiz link above — results show up here in real time.
          </p>
        </div>
      )}

      {/* Per-question results */}
      {totalResponses > 0 && questions.length > 0 && (
        <section className="mt-8 space-y-5">
          <div className="flex items-end justify-between">
            <h2 className="text-2xl font-black tracking-tight">
              Question breakdown
            </h2>
            <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">
              {questions.length} {questions.length === 1 ? "question" : "questions"}
            </span>
          </div>

          {questions.map((q, idx) => (
            <QuestionCard
              key={q.questionId}
              index={idx}
              question={q}
              animate={animate}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: string;
  accent: string;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border-2 border-zinc-900 bg-white p-4 shadow-[4px_4px_0_0_#18181b] transition-all hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#18181b]">
      <div className="flex items-center justify-between">
        <span
          className={`inline-flex h-8 w-8 items-center justify-center rounded-md border-2 border-zinc-900 text-base ${accent}`}
          aria-hidden
        >
          {icon}
        </span>
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
          {label}
        </p>
      </div>
      <p className="mt-3 text-2xl font-black tracking-tight">{value}</p>
    </div>
  );
}

function QuestionCard({
  index,
  question,
  animate,
}: {
  index: number;
  question: AnalyticsQuestion;
  animate: boolean;
}) {
  const accent = OPTION_ACCENTS[index % OPTION_ACCENTS.length];

  // Highest vote count — used to crown the "top pick". Ties: any/all top.
  const topCount = question.options.reduce(
    (max, o) => (o.count > max ? o.count : max),
    0
  );

  return (
    <article className="rounded-2xl border-2 border-zinc-900 bg-white p-5 shadow-[4px_4px_0_0_#18181b] md:p-6">
      <div className="flex items-start gap-3">
        <span
          className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border-2 border-zinc-900 text-xs font-black ${accent}`}
        >
          {index + 1}
        </span>
        <div className="flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-lg font-bold leading-snug">{question.question}</p>
            <div className="flex shrink-0 items-center gap-2">
              {question.isRequired ? (
                <span className="rounded-md border-2 border-zinc-900 bg-rose-200 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest">
                  Required
                </span>
              ) : (
                <span className="rounded-md border-2 border-zinc-300 bg-stone-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
                  Optional
                </span>
              )}
              <span className="rounded-md border-2 border-zinc-900 bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-widest">
                {question.totalAnswers} {question.totalAnswers === 1 ? "vote" : "votes"}
              </span>
            </div>
          </div>

          <ul className="mt-4 space-y-2.5">
            {question.options.map((opt, oIdx) => (
              <OptionBar
                key={opt.optionIndex}
                option={opt}
                accentIndex={oIdx}
                animate={animate}
                isTop={question.totalAnswers > 0 && opt.count === topCount}
              />
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}

function OptionBar({
  option,
  accentIndex,
  animate,
  isTop,
}: {
  option: AnalyticsOption;
  accentIndex: number;
  animate: boolean;
  isTop: boolean;
}) {
  const accent = OPTION_ACCENTS[accentIndex % OPTION_ACCENTS.length];
  const targetWidth = animate ? `${Math.max(option.percentage, 0)}%` : "0%";

  return (
    <li>
      <div
        className={`group relative overflow-hidden rounded-lg border-2 border-zinc-900 bg-stone-50 shadow-[2px_2px_0_0_#18181b] transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#18181b] ${
          isTop ? "ring-2 ring-emerald-400 ring-offset-2 ring-offset-stone-100" : ""
        }`}
      >
        {/* Animated bar */}
        <div
          className={`absolute inset-y-0 left-0 ${accent} transition-[width] duration-700 ease-out`}
          style={{ width: targetWidth }}
          aria-hidden
        />

        {/* Foreground content */}
        <div className="relative flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-zinc-900 bg-white text-[10px] font-black">
              {String.fromCharCode(65 + option.optionIndex)}
            </span>
            <span className="truncate text-sm font-bold text-zinc-900">
              {option.optionText}
            </span>
            {isTop && (
              <span
                className="shrink-0 rounded-md border-2 border-zinc-900 bg-white px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest"
                title="Top pick"
              >
                👑 Top
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2 font-mono text-xs font-black text-zinc-900">
            <span>{option.count}</span>
            <span className="text-zinc-500">·</span>
            <span>{option.percentage.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </li>
  );
}

// ─── Manage poll panel (creator-only) ─────────────────────────────────────────

const STATUS_OPTIONS: Array<{ value: QuizStatus; label: string; accent: string }> = [
  { value: "draft", label: "Draft", accent: "bg-amber-200" },
  { value: "active", label: "Active", accent: "bg-lime-300" },
  { value: "expired", label: "Expired", accent: "bg-zinc-200" },
];

// Convert an ISO timestamp into the local "YYYY-MM-DDTHH:mm" shape that
// <input type="datetime-local"> expects.
function toDatetimeLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ManagePollPanel({
  slug,
  status,
  isPublished,
  isAnonymousPoll,
  expiresAt,
  getToken,
  onUpdated,
  onDeleted,
}: {
  slug: string;
  status: QuizStatus;
  isPublished: boolean;
  isAnonymousPoll: boolean;
  expiresAt: string | null;
  getToken: () => Promise<string | null>;
  onUpdated: (poll: Partial<QuizAnalytics["poll"]>) => void;
  onDeleted: () => void;
}) {
  const [draftStatus, setDraftStatus] = useState<QuizStatus>(status);
  const [draftPublished, setDraftPublished] = useState<boolean>(isPublished);
  const [draftAnonymous, setDraftAnonymous] = useState<boolean>(isAnonymousPoll);
  const [draftExpiresAt, setDraftExpiresAt] = useState<string>(
    toDatetimeLocalInputValue(expiresAt)
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [feedback, setFeedback] = useState<{
    kind: "ok" | "err";
    text: string;
  } | null>(null);

  const currentExpiresAtInput = toDatetimeLocalInputValue(expiresAt);
  const dirty =
    draftStatus !== status ||
    draftPublished !== isPublished ||
    draftAnonymous !== isAnonymousPoll ||
    draftExpiresAt !== currentExpiresAtInput;

  const handleSave = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    setFeedback(null);
    try {
      const token = await getToken();
      const payload: Parameters<typeof updateQuiz>[2] = {};
      if (draftPublished !== isPublished) payload.isPublished = draftPublished;
      if (draftPublished && !isPublished) payload.status = "expired";
      else if (draftStatus !== status) payload.status = draftStatus;
      if (draftAnonymous !== isAnonymousPoll)
        payload.isAnonymousPoll = draftAnonymous;
      if (draftExpiresAt !== currentExpiresAtInput) {
        payload.expiresAt = draftExpiresAt
          ? new Date(draftExpiresAt).toISOString()
          : null;
      }

      const { poll: updated } = await updateQuiz(slug, token, payload);
      setDraftStatus(updated.status);
      setDraftPublished(updated.isPublished);
      setDraftAnonymous(updated.isAnonymousPoll);
      setDraftExpiresAt(toDatetimeLocalInputValue(updated.expiresAt));
      onUpdated({
        status: updated.status,
        isPublished: updated.isPublished,
        isAnonymousPoll: updated.isAnonymousPoll,
        expiresAt: updated.expiresAt,
        updatedAt: updated.updatedAt,
      });
      setFeedback({ kind: "ok", text: "Poll updated." });
    } catch (err) {
      setFeedback({
        kind: "err",
        text: err instanceof Error ? err.message : "Failed to update poll.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    setFeedback(null);
    try {
      const token = await getToken();
      await deleteQuiz(slug, token);
      onDeleted();
    } catch (err) {
      setFeedback({
        kind: "err",
        text: err instanceof Error ? err.message : "Failed to delete poll.",
      });
      setDeleting(false);
      setConfirmingDelete(false);
    }
  };

  return (
    <section className="mt-8 rounded-2xl border-2 border-zinc-900 bg-white p-5 shadow-[6px_6px_0_0_#18181b] md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
            Creator tools
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight">Manage poll</h2>
        </div>
        <span className="rounded-full border-2 border-zinc-900 bg-amber-200 px-3 py-1 text-[10px] font-black uppercase tracking-widest">
          Only you can see this
        </span>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {/* Status */}
        <div>
          <span className="text-[11px] font-black uppercase tracking-widest text-zinc-600">
            Status
          </span>
          <div className="mt-2 flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((opt) => {
              const selected = draftStatus === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDraftStatus(opt.value)}
                  className={`rounded-lg border-2 border-zinc-900 px-3 py-1.5 text-xs font-black uppercase tracking-widest transition-all ${
                    selected
                      ? `${opt.accent} shadow-[3px_3px_0_0_#18181b]`
                      : "bg-white shadow-[2px_2px_0_0_#18181b] hover:translate-y-0.5 hover:shadow-[1px_1px_0_0_#18181b]"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Expiry */}
        <div>
          <label className="block">
            <span className="text-[11px] font-black uppercase tracking-widest text-zinc-600">
              Expires at
            </span>
            <div className="mt-2 flex gap-2">
              <input
                type="datetime-local"
                value={draftExpiresAt}
                onChange={(e) => setDraftExpiresAt(e.currentTarget.value)}
                className="w-full rounded-lg border-2 border-zinc-900 bg-white px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
              {draftExpiresAt && (
                <button
                  type="button"
                  onClick={() => setDraftExpiresAt("")}
                  className="rounded-lg border-2 border-zinc-900 bg-stone-100 px-3 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-stone-200"
                  title="Clear expiry"
                >
                  Clear
                </button>
              )}
            </div>
          </label>
          <p className="mt-1 text-[10px] font-semibold text-zinc-500">
            Leave empty for no expiry.
          </p>
        </div>

        {/* Toggles */}
        <ToggleRow
          label="Public analytics"
          description="Closes the poll and lets anyone with the link view results."
          value={draftPublished}
          onChange={setDraftPublished}
        />
        <ToggleRow
          label="Anonymous responses"
          description="Voters don't need an account to submit."
          value={draftAnonymous}
          onChange={setDraftAnonymous}
        />
      </div>

      {feedback && (
        <p
          className={`mt-4 rounded-lg border-2 border-zinc-900 px-3 py-2 text-xs font-bold ${
            feedback.kind === "ok" ? "bg-lime-100" : "bg-rose-100"
          }`}
        >
          {feedback.text}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!dirty || saving}
          className="inline-flex items-center gap-2 rounded-lg border-2 border-zinc-900 bg-emerald-500 px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-[4px_4px_0_0_#18181b] transition-all hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#18181b] active:translate-y-1 active:shadow-[1px_1px_0_0_#18181b] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0_0_#18181b]"
        >
          {saving ? "Saving…" : dirty ? "Save changes" : "No changes"}
        </button>

        {!confirmingDelete ? (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="inline-flex items-center gap-2 rounded-lg border-2 border-zinc-900 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-widest shadow-[4px_4px_0_0_#18181b] transition-all hover:translate-y-0.5 hover:bg-rose-100 hover:shadow-[2px_2px_0_0_#18181b]"
          >
            🗑 Delete poll
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border-2 border-zinc-900 bg-rose-100 px-3 py-2 shadow-[3px_3px_0_0_#18181b]">
            <span className="text-[11px] font-black uppercase tracking-widest">
              Delete forever?
            </span>
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={deleting}
              className="rounded-md border-2 border-zinc-900 bg-rose-500 px-3 py-1.5 text-[11px] font-black uppercase tracking-widest text-white shadow-[2px_2px_0_0_#18181b] transition-all hover:translate-y-0.5 hover:shadow-[1px_1px_0_0_#18181b] disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Yes, delete"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              disabled={deleting}
              className="rounded-md border-2 border-zinc-900 bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-widest shadow-[2px_2px_0_0_#18181b] transition-all hover:translate-y-0.5 hover:shadow-[1px_1px_0_0_#18181b]"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {confirmingDelete && (
        <p className="mt-3 text-[11px] font-semibold text-rose-700">
          This wipes the poll, every question, and every response. No undo.
        </p>
      )}
    </section>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border-2 border-zinc-900 bg-stone-50 px-4 py-3 shadow-[2px_2px_0_0_#18181b]">
      <div>
        <p className="text-sm font-black tracking-tight">{label}</p>
        <p className="text-[11px] font-semibold text-zinc-500">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={label}
        onClick={() => onChange(!value)}
        className={`relative h-7 w-12 shrink-0 rounded-full border-2 border-zinc-900 transition-colors ${
          value ? "bg-lime-300" : "bg-white"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full border-2 border-zinc-900 bg-white transition-all ${
            value ? "left-[22px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}
