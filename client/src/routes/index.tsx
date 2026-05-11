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
    <div className="min-h-screen overflow-x-hidden bg-stone-100 text-zinc-900">
      <header className="border-b-2 border-zinc-900 bg-amber-200">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg">
              <img src="https://res.cloudinary.com/dw87upoot/image/upload/v1778488812/logo_rku0hm.svg" alt="hello" />
            </span>
            <p className="text-xs font-black uppercase tracking-[0.18em] sm:text-sm sm:tracking-[0.25em]">
              PulseBoard
            </p>
          </div>
          <span className="hidden rounded-full border-2 border-zinc-900 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-widest md:inline-block">
            Polls · Quizzes · Live
          </span>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:gap-10 sm:px-6 sm:py-12 md:flex-row md:items-center md:gap-10 lg:gap-14 lg:py-16">
        <section className="flex flex-1 flex-col justify-center text-center md:text-left">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-zinc-500 sm:text-xs sm:tracking-[0.3em]">
            Full-stack polling, made playful
          </p>

          <h1 className="mt-4 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
            Ask a question.{" "}
            <span className="relative inline-block">
              <span className="absolute inset-x-1 bottom-2 z-0 h-4 bg-lime-300" aria-hidden />
              <span className="relative">Get real answers.</span>
            </span>
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-zinc-700 sm:mt-6 sm:text-lg md:max-w-2xl">
            Build a quiz in minutes, share a single link, and watch responses roll in — without the
            corporate vibes.
          </p>

          <ul className="mt-8 grid max-w-xl gap-3 sm:mt-10 sm:grid-cols-2 lg:grid-cols-3">
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

          <div className="mt-8 hidden flex-wrap items-center gap-3 md:flex">
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

        <aside className="flex w-full flex-1 items-start justify-center md:items-center">
          <div className="relative w-full max-w-sm sm:max-w-md">
            <span
              className="absolute left-4 top-0 z-10 inline-flex -translate-y-1/2 -rotate-3 items-center gap-1 rounded-md border-2 border-zinc-900 bg-amber-300 px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] shadow-[3px_3px_0_0_#18181b] sm:text-[11px] sm:tracking-widest"
              aria-hidden
            >
              Sign in ↘
            </span>
            <div className="overflow-hidden rounded-2xl border-2 border-zinc-900 bg-white p-4 shadow-[6px_6px_0_0_#18181b] sm:p-5 sm:shadow-[8px_8px_0_0_#18181b] md:p-6">
              <SignIn
                forceRedirectUrl="/home"
                signUpFallbackRedirectUrl="/home"
                appearance={{
                  elements: {
                    rootBox: "w-full min-w-0",
                    card: "w-full min-w-0 border-0 bg-transparent p-0 shadow-none",
                    headerTitle: "text-zinc-900 font-bold tracking-tight",
                    headerSubtitle: "text-zinc-600",
                    socialButtonsBlockButton:
                      "w-full rounded-lg border-2 border-zinc-900 bg-white text-sm font-semibold shadow-[3px_3px_0_0_#18181b] transition-all hover:translate-y-0.5 hover:bg-stone-50 hover:shadow-[1px_1px_0_0_#18181b] active:translate-y-1 active:shadow-none",
                    formButtonPrimary:
                      "rounded-lg border-2 border-zinc-900 bg-emerald-500 font-bold uppercase tracking-wide shadow-[3px_3px_0_0_#18181b] transition-all hover:translate-y-0.5 hover:bg-emerald-500 hover:shadow-[1px_1px_0_0_#18181b] active:translate-y-1 active:shadow-none",
                    formFieldInput:
                      "min-w-0 rounded-lg border-2 border-zinc-900 focus:ring-2 focus:ring-amber-300",
                    footerAction: "flex-wrap justify-center gap-1 text-center",
                    footerActionLink: "font-bold text-emerald-700",
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
