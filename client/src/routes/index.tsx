import { SignIn, useAuth } from "@clerk/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  component: Landing,
});

const FEATURES = [
  { chip: "bg-amber-200", title: "Anonymous or named", body: "Pick the vibe per quiz." },
  { chip: "bg-sky-200", title: "One code to join", body: "Share a link, get answers." },
  { chip: "bg-lime-200", title: "Publish when ready", body: "Draft today, share later." },
] as const;

function Landing() {
  const navigate = useNavigate({ from: "/" });
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    void navigate({ to: "/home", replace: true });
  }, [isLoaded, isSignedIn, navigate]);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-100 text-sm font-semibold text-zinc-700">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 text-zinc-900">
      <header className="border-b-2 border-zinc-900 bg-amber-200">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg">
              <img src="/src/logo.svg" alt="hello" />
            </span>
            <p className="text-sm font-black uppercase tracking-[0.25em]">PulseBoard</p>
          </div>
          <span className="hidden rounded-full border-2 border-zinc-900 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-widest md:inline-block">
            Polls · Quizzes · Live
          </span>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12 md:flex-row md:gap-12 md:py-35 md:scale-120">
        <section className="flex flex-1 flex-col justify-center">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">
            Full-stack polling, made playful
          </p>

          <h1 className="mt-4 text-5xl font-black leading-[1.05] tracking-tight md:text-6xl">
            Ask a question.{" "}
            <span className="relative inline-block">
              <span className="absolute inset-x-1 bottom-2 z-0 h-4 bg-lime-300" aria-hidden />
              <span className="relative">Get real answers.</span>
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-700">
            Build a quiz in minutes, share a single link, and watch responses roll in — without the
            corporate vibes.
          </p>

          <ul className="mt-10 grid max-w-xl gap-3 sm:grid-cols-3">
            {FEATURES.map((f) => (
              <li
                key={f.title}
                className="rounded-xl border-2 border-zinc-900 bg-white p-4 shadow-[4px_4px_0_0_#18181b]"
              >
                <span
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-md border-2 border-zinc-900 ${f.chip} text-xs font-black`}
                  aria-hidden
                >
                  ★
                </span>
                <p className="mt-2 text-sm font-bold">{f.title}</p>
                <p className="text-xs text-zinc-600">{f.body}</p>
              </li>
            ))}
          </ul>

          <div className="mt-10 hidden items-center gap-3 md:flex">
            <span className="rounded-full border-2 border-zinc-900 bg-rose-200 px-3 py-1 text-[11px] font-bold uppercase tracking-wider">
              Free to try
            </span>
            <span className="rounded-full border-2 border-zinc-900 bg-sky-200 px-3 py-1 text-[11px] font-bold uppercase tracking-wider">
              No credit card
            </span>
            <span className="rounded-full border-2 border-zinc-900 bg-orange-200 px-3 py-1 text-[11px] font-bold uppercase tracking-wider">
              Anonymous mode
            </span>
          </div>
        </section>

        <aside className="flex flex-1 items-start justify-center md:items-center">
          <div className="relative w-full max-w-md">
            <span
              className="absolute -left-3 -top-3 inline-flex -rotate-6 items-center gap-1 rounded-md border-2 border-zinc-900 bg-amber-300 px-2 py-1 text-[11px] font-black uppercase tracking-widest shadow-[3px_3px_0_0_#18181b]"
              aria-hidden
            >
              Sign in ↘
            </span>
            <div className="rounded-2xl border-2 border-zinc-900 bg-white p-5 shadow-[8px_8px_0_0_#18181b] md:p-6">
              <SignIn
                forceRedirectUrl="/home"
                signUpFallbackRedirectUrl="/home"
                appearance={{
                  elements: {
                    rootBox: "w-full",
                    card: "bg-transparent shadow-none border-0 p-0",
                    headerTitle: "text-zinc-900 font-bold tracking-tight",
                    headerSubtitle: "text-zinc-600",
                    socialButtonsBlockButton:
                      "border-2 border-zinc-900 rounded-lg bg-white font-semibold shadow-[3px_3px_0_0_#18181b] transition-all hover:translate-y-0.5 hover:bg-stone-50 hover:shadow-[1px_1px_0_0_#18181b] active:translate-y-1 active:shadow-none",
                    formButtonPrimary:
                      "bg-emerald-500 hover:bg-emerald-500 border-2 border-zinc-900 rounded-lg font-bold uppercase tracking-wide shadow-[3px_3px_0_0_#18181b] transition-all hover:translate-y-0.5 hover:shadow-[1px_1px_0_0_#18181b] active:translate-y-1 active:shadow-none",
                    formFieldInput:
                      "border-2 border-zinc-900 rounded-lg focus:ring-2 focus:ring-amber-300",
                    footerActionLink: "text-emerald-700 font-bold",
                  },
                }}
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
