import { useAuth, useUser } from "@clerk/react";
import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  createQuiz,
  type CreateQuizPayload,
  type CreateQuizQuestionPayload,
  type QuizStatus,
} from "../lib/api";

export const Route = createFileRoute("/create")({
  component: CreateQuiz,
});

type DraftQuestion = {
  id: string;
  question: string;
  options: string[];
  isRequired: boolean;
};

type Submit = "idle" | "submitting" | "success" | "error";

const STATUS_OPTIONS: { value: QuizStatus; label: string; helper: string }[] = [
  { value: "draft", label: "Draft", helper: "Hidden, only you can see it." },
  { value: "active", label: "Active", helper: "People can join and respond." },
  { value: "expired", label: "Expired", helper: "Closed, no new responses." },
];

const ACCENTS = ["bg-amber-200", "bg-sky-200", "bg-rose-200", "bg-lime-200", "bg-orange-200"] as const;

function newQuestion(): DraftQuestion {
  return {
    id: crypto.randomUUID(),
    question: "",
    options: ["", ""],
    isRequired: false,
  };
}

function SuccessModal({ slug, onClose }: { slug: string; onClose: () => void }) {
  const quizUrl = `${window.location.origin}/quiz?id=${slug}`;
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(quizUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm rounded-2xl border-2 border-zinc-900 bg-white shadow-[8px_8px_0_0_#18181b]">
        {/* Header */}
        <div className="rounded-t-2xl border-b-2 border-zinc-900 bg-lime-200 px-6 py-4">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-600">Success</p>
          <h2 className="mt-0.5 text-xl font-bold tracking-tight text-zinc-900">Quiz saved!</h2>
        </div>

        {/* QR Code */}
        <div className="flex flex-col items-center gap-3 px-6 pt-6 pb-4">
          <div className="rounded-xl border-2 border-zinc-900 bg-white p-3 shadow-[4px_4px_0_0_#18181b]">
            <QRCodeSVG
              value={quizUrl}
              size={180}
              bgColor="#ffffff"
              fgColor="#18181b"
              level="M"
            />
          </div>
          <p className="text-xs text-zinc-500">Scan to open the quiz</p>
        </div>

        {/* Link + Copy */}
        <div className="px-6 pb-2">
          <p className="mb-1.5 text-xs font-semibold text-zinc-600 uppercase tracking-wider">
            Join link
          </p>
          <div className="flex items-center gap-2 rounded-lg border-2 border-zinc-900 bg-stone-50 px-3 py-2">
            <a
              href={quizUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 truncate font-mono text-xs text-zinc-800 underline decoration-dotted underline-offset-2 hover:text-emerald-700"
            >
              {quizUrl}
            </a>
            <button
              type="button"
              onClick={handleCopy}
              className="shrink-0 rounded-md border-2 border-zinc-900 bg-white px-2.5 py-1 text-xs font-bold shadow-[2px_2px_0_0_#18181b] transition-all hover:translate-y-0.5 hover:shadow-[1px_1px_0_0_#18181b] active:translate-y-1 active:shadow-none"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        {/* Close */}
        <div className="px-6 py-5">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border-2 border-zinc-900 bg-zinc-900 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow-[4px_4px_0_0_#a1a1aa] transition-all hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#a1a1aa] active:translate-y-1 active:shadow-none"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateQuiz() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { isLoaded: userLoaded } = useUser();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [isAnonymousPoll, setIsAnonymousPoll] = useState(false);
  const [status, setStatus] = useState<QuizStatus>("draft");
  const [expiresAt, setExpiresAt] = useState("");
  const [questions, setQuestions] = useState<DraftQuestion[]>([newQuestion()]);

  const [submitState, setSubmitState] = useState<Submit>("idle");
  const [error, setError] = useState<string | null>(null);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);

  if (!isLoaded || !userLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-100 text-sm text-zinc-700">
        Loading…
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/" replace />;
  }

  const updateQuestion = (id: string, patch: Partial<DraftQuestion>) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  };

  const updateOption = (qid: string, index: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === qid
          ? { ...q, options: q.options.map((opt, i) => (i === index ? value : opt)) }
          : q
      )
    );
  };

  const addOption = (qid: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === qid ? { ...q, options: [...q.options, ""] } : q))
    );
  };

  const removeOption = (qid: string, index: number) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === qid
          ? {
              ...q,
              options: q.options.length > 2 ? q.options.filter((_, i) => i !== index) : q.options,
            }
          : q
      )
    );
  };

  const addQuestion = () => {
    setQuestions((prev) => [...prev, newQuestion()]);
  };

  const removeQuestion = (id: string) => {
    setQuestions((prev) => (prev.length > 1 ? prev.filter((q) => q.id !== id) : prev));
  };

  const validate = (): string | null => {
    if (!title.trim()) return "Give your quiz a title.";
    if (questions.length === 0) return "Add at least one question.";
    for (const [i, q] of questions.entries()) {
      if (!q.question.trim()) return `Question ${i + 1} needs some text.`;
      const cleaned = q.options.map((o) => o.trim()).filter(Boolean);
      if (cleaned.length < 2) return `Question ${i + 1} needs at least 2 options.`;
    }
    return null;
  };

  const handleSubmit = async () => {
    const problem = validate();
    if (problem) {
      setError(problem);
      setSubmitState("error");
      return;
    }

    setError(null);
    setSubmitState("submitting");

    try {
      const token = await getToken();
      const payloadQuestions: CreateQuizQuestionPayload[] = questions.map((q, index) => ({
        question: q.question.trim(),
        options: q.options.map((o) => o.trim()).filter(Boolean),
        isRequired: q.isRequired,
        order: index + 1,
      }));

      const payload: CreateQuizPayload = {
        poll: {
          title: title.trim(),
          isAnonymousPoll,
          status,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
          questions: payloadQuestions,
        },
      };

      const result = await createQuiz(token, payload);
      setSubmitState("success");
      setCreatedSlug(result.poll.slug);
    } catch (err) {
      setSubmitState("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 text-zinc-900">
      {submitState === "success" && createdSlug ? (
        <SuccessModal
          slug={createdSlug}
          onClose={() => {
            setSubmitState("idle");
            setCreatedSlug(null);
          }}
        />
      ) : null}
      <header className="border-b-2 border-zinc-900 bg-amber-200">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-5">
          <button
            type="button"
            onClick={() => void navigate({ to: "/home" })}
            className="rounded-md border-2 border-zinc-900 bg-white px-3 py-1.5 text-sm font-semibold shadow-[3px_3px_0_0_#18181b] transition-all hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#18181b] active:translate-y-1 active:shadow-[1px_1px_0_0_#18181b]"
          >
            ← Back
          </button>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-900">
            PulseBoard · Builder
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-6 py-10">
        <div className="mb-10">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">
            Step 1 of 2
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight md:text-5xl">
            Build a quiz worth taking.
          </h1>
          <p className="mt-3 max-w-2xl text-base text-zinc-600">
            Set the basics, drop in questions, and share the link when you’re ready.
          </p>
        </div>

        {/* Basics card */}
        <section className="mb-8 rounded-2xl border-2 border-zinc-900 bg-white p-6 shadow-[6px_6px_0_0_#18181b] md:p-8">
          <div className="mb-6 flex items-center gap-3">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-zinc-900 bg-lime-200 text-sm font-bold">
              1
            </span>
            <h2 className="text-xl font-semibold tracking-tight">The basics</h2>
          </div>

          <label className="block">
            <span className="text-sm font-semibold">Title</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.currentTarget.value)}
              placeholder="e.g. Monday team mood check"
              className="mt-2 w-full rounded-lg border-2 border-zinc-900 bg-white px-4 py-3 text-base placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
          </label>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <label className="flex items-center gap-3 rounded-lg border-2 border-zinc-900 bg-stone-50 px-4 py-3">
              <input
                type="checkbox"
                checked={isAnonymousPoll}
                onChange={(e) => setIsAnonymousPoll(e.currentTarget.checked)}
                className="size-5 accent-emerald-600"
              />
              <span className="text-sm">
                <span className="font-semibold">Anonymous responses</span>
                <span className="block text-zinc-600">Hide who answered what.</span>
              </span>
            </label>

            <label className="block">
              <span className="text-sm font-semibold">Expires at (optional)</span>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.currentTarget.value)}
                className="mt-2 w-full rounded-lg border-2 border-zinc-900 bg-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
            </label>

            <fieldset>
              <legend className="text-sm font-semibold">Status</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((opt) => {
                  const active = status === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setStatus(opt.value)}
                      className={`rounded-lg border-2 border-zinc-900 px-3 py-1.5 text-sm font-semibold transition-all ${
                        active
                          ? "bg-emerald-500 text-white shadow-[3px_3px_0_0_#18181b] hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#18181b] active:translate-y-1 active:shadow-[1px_1px_0_0_#18181b]"
                          : "bg-white shadow-[3px_3px_0_0_#18181b] hover:translate-y-0.5 hover:bg-stone-50 hover:shadow-[2px_2px_0_0_#18181b] active:translate-y-1 active:shadow-[1px_1px_0_0_#18181b]"
                      }`}
                      title={opt.helper}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-zinc-600">
                {STATUS_OPTIONS.find((o) => o.value === status)?.helper}
              </p>
            </fieldset>
          </div>
        </section>

        {/* Questions */}
        <section className="mb-8">
          <div className="mb-4 flex items-center gap-3">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-zinc-900 bg-sky-200 text-sm font-bold">
              2
            </span>
            <h2 className="text-xl font-semibold tracking-tight">Questions</h2>
            <span className="ml-auto rounded-full border-2 border-zinc-900 bg-white px-3 py-0.5 text-xs font-semibold">
              {questions.length} total
            </span>
          </div>

          <ul className="space-y-5">
            {questions.map((q, qIndex) => {
              const accent = ACCENTS[qIndex % ACCENTS.length];
              return (
                <li
                  key={q.id}
                  className="rounded-2xl border-2 border-zinc-900 bg-white p-5 shadow-[6px_6px_0_0_#18181b] md:p-6"
                >
                  <div className="mb-4 flex items-start gap-3">
                    <span
                      className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg border-2 border-zinc-900 ${accent} px-2 text-sm font-bold`}
                    >
                      Q{qIndex + 1}
                    </span>
                    <input
                      type="text"
                      value={q.question}
                      onChange={(e) => updateQuestion(q.id, { question: e.currentTarget.value })}
                      placeholder="Type your question…"
                      className="flex-1 rounded-lg border-2 border-zinc-900 bg-white px-4 py-2.5 text-base placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
                    />
                    <button
                      type="button"
                      onClick={() => removeQuestion(q.id)}
                      disabled={questions.length === 1}
                      className="rounded-lg border-2 border-zinc-900 bg-rose-200 px-3 py-2 text-xs font-bold uppercase tracking-wide shadow-[3px_3px_0_0_#18181b] transition-all hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#18181b] active:translate-y-1 active:shadow-[1px_1px_0_0_#18181b] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-[3px_3px_0_0_#18181b]"
                      title="Remove question"
                    >
                      Remove
                    </button>
                  </div>

                  <ul className="space-y-2">
                    {q.options.map((opt, optIndex) => (
                      <li key={optIndex} className="flex items-center gap-2">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-zinc-900 bg-stone-100 text-xs font-bold">
                          {String.fromCharCode(65 + optIndex)}
                        </span>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => updateOption(q.id, optIndex, e.currentTarget.value)}
                          placeholder={`Option ${optIndex + 1}`}
                          className="flex-1 rounded-lg border-2 border-zinc-900 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
                        />
                        <button
                          type="button"
                          onClick={() => removeOption(q.id, optIndex)}
                          disabled={q.options.length <= 2}
                          className="rounded-md border-2 border-zinc-900 bg-white px-2 py-1.5 text-xs font-bold shadow-[2px_2px_0_0_#18181b] transition-all hover:translate-y-0.5 hover:shadow-[1px_1px_0_0_#18181b] active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-[2px_2px_0_0_#18181b]"
                          title="Remove option"
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => addOption(q.id)}
                      className="rounded-lg border-2 border-zinc-900 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wide shadow-[2px_2px_0_0_#18181b] transition-all hover:translate-y-0.5 hover:shadow-[1px_1px_0_0_#18181b] active:translate-y-1 active:shadow-none"
                    >
                      + Add option
                    </button>
                    <label className="ml-auto flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={q.isRequired}
                        onChange={(e) =>
                          updateQuestion(q.id, { isRequired: e.currentTarget.checked })
                        }
                        className="size-4 accent-emerald-600"
                      />
                      <span className="font-medium">Required</span>
                    </label>
                  </div>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            onClick={addQuestion}
            className="mt-5 inline-flex items-center gap-2 rounded-lg border-2 border-dashed border-zinc-900 bg-white px-4 py-2.5 text-sm font-bold uppercase tracking-wide shadow-[3px_3px_0_0_#18181b] transition-all hover:translate-y-0.5 hover:bg-amber-100 hover:shadow-[2px_2px_0_0_#18181b] active:translate-y-1 active:shadow-[1px_1px_0_0_#18181b]"
          >
            + Add another question
          </button>
        </section>

        {/* Footer actions */}
        <section className="rounded-2xl border-2 border-zinc-900 bg-white p-5 shadow-[6px_6px_0_0_#18181b] md:p-6">
          {error && submitState === "error" ? (
            <p className="mb-4 rounded-md border-2 border-zinc-900 bg-rose-100 px-4 py-3 text-sm font-medium">
              {error}
            </p>
          ) : null}


          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={() => void navigate({ to: "/home" })}
              className="rounded-lg border-2 border-zinc-900 bg-white px-4 py-2.5 text-sm font-bold uppercase tracking-wide shadow-[3px_3px_0_0_#18181b] transition-all hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#18181b] active:translate-y-1 active:shadow-[1px_1px_0_0_#18181b]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={submitState === "submitting"}
              className="rounded-lg border-2 border-zinc-900 bg-emerald-500 px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow-[4px_4px_0_0_#18181b] transition-all hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#18181b] active:translate-y-1 active:shadow-[1px_1px_0_0_#18181b] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-[4px_4px_0_0_#18181b]"
            >
              {submitState === "submitting" ? "Creating…" : "Create quiz"}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
