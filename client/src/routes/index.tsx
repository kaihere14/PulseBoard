import { SignIn, useAuth } from "@clerk/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  component: Landing,
});

const FEATURES = [
  {
    accent: "bg-amber-300",
    stat: "Builder",
    title: "Create multiple-choice quizzes fast",
    body: "Add one or more questions, give each at least two options, mark required questions, and save the whole thing in a clean builder flow.",
  },
  {
    accent: "bg-sky-300",
    stat: "Access",
    title: "Choose anonymous or authenticated responses",
    body: "Run low-friction anonymous voting or require Clerk sign-in when you need identity-backed participation.",
  },
  {
    accent: "bg-lime-300",
    stat: "Sharing",
    title: "Share by slug and QR code",
    body: "Every quiz gets a clean shareable link, and after creation you also get a QR code for fast mobile join flows.",
  },
  {
    accent: "bg-rose-300",
    stat: "Analytics",
    title: "Track results with creator controls",
    body: "See counts, percentages, and leading options, then manage status, expiry, privacy, and publish state from the analytics side.",
  },
] as const;

const COMPARISON_ROWS = [
  {
    label: "Quiz lifecycle",
    pulseBoard: "Built around real states: save as draft, open as active, or close as expired when the poll is done.",
    typical: "Often focused on collecting answers, with less control over the full create-to-close flow.",
  },
  {
    label: "Participation rules",
    pulseBoard: "Supports anonymous voting or authenticated-only response mode depending on how much identity you need.",
    typical: "Usually treats every respondent the same, with fewer participation controls.",
  },
  {
    label: "Sharing",
    pulseBoard: "Uses a readable slug-based link and QR sharing so people can join quickly from mobile or desktop.",
    typical: "Share links work, but they are often less deliberate and less host-friendly in live settings.",
  },
  {
    label: "Results visibility",
    pulseBoard: "Unpublished analytics stay creator-only, and published analytics become shareable once the quiz is closed.",
    typical: "Results sharing is often less explicit, or not connected to a clear publish workflow.",
  },
] as const;

const FOOTER_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#comparison", label: "Comparison" },
  { href: "#illustrations", label: "Illustrations" },
  { href: "#sign-in", label: "Try it" },
] as const;

function SectionHeading({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="max-w-3xl">
      <p className="text-xs font-black uppercase tracking-[0.3em] text-zinc-600">{eyebrow}</p>
      <h2 className="mt-3 text-balance text-3xl font-black leading-none tracking-tight sm:text-4xl md:text-5xl">
        {title}
      </h2>
      <p className="mt-4 text-base leading-relaxed text-zinc-700 sm:text-lg">{body}</p>
    </div>
  );
}

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
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f7f1e3] text-zinc-900">
      <header className="border-b-4 border-zinc-900 bg-[#ffdb57]">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border-4 border-zinc-900 bg-white shadow-[4px_4px_0_0_#18181b]">
              <img src="https://res.cloudinary.com/dw87upoot/image/upload/v1778488812/logo_rku0hm.svg" alt="hello" />
            </span>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.26em] text-zinc-700 sm:text-xs">
                PulseBoard
              </p>
              <p className="text-sm font-bold sm:text-base">Quiz builder, sharing, and analytics</p>
            </div>
          </div>
          <nav className="hidden items-center gap-2 md:flex">
            {FOOTER_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-full border-2 border-zinc-900 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.24em] shadow-[3px_3px_0_0_#18181b] transition-all hover:translate-y-[2px] hover:shadow-[1px_1px_0_0_#18181b] active:translate-y-[3px] active:shadow-none"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main>
        <section className="relative isolate overflow-hidden">
          <div
            className="absolute -left-24 top-10 h-40 w-40 rotate-12 rounded-4xl border-4 border-zinc-900 bg-sky-300"
            aria-hidden
          />
          <div
            className="absolute -right-16 top-24 h-28 w-28 -rotate-12 rounded-full border-4 border-zinc-900 bg-rose-300"
            aria-hidden
          />
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-14 lg:py-18">
            <section className="relative z-10 text-center lg:text-left">
              <p className="inline-flex rounded-full border-2 border-zinc-900 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.3em] shadow-[4px_4px_0_0_#18181b]">
                Full-stack quiz workflow
              </p>

              <h1 className="mt-6 text-balance text-4xl font-black leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
                Build a
                <span className="mx-2 inline-block -rotate-2 rounded-2xl border-4 border-zinc-900 bg-lime-300 px-3 py-1 shadow-[6px_6px_0_0_#18181b]">
                  quiz
                </span>
                share the slug, and watch the results stack up.
              </h1>

              <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-zinc-700 sm:text-lg lg:mx-0">
                PulseBoard gives creators a complete flow: sign in, build a multiple-choice quiz,
                choose anonymous or authenticated responses, share a slug-based link, and review
                polished analytics when the answers come in.
              </p>

              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
                <a
                  href="#sign-in"
                  className="inline-flex items-center justify-center rounded-2xl border-4 border-zinc-900 bg-emerald-400 px-6 py-3 text-sm font-black uppercase tracking-[0.22em] text-white shadow-[6px_6px_0_0_#18181b] transition-all hover:translate-y-[2px] hover:shadow-[4px_4px_0_0_#18181b] active:translate-y-1 active:shadow-[2px_2px_0_0_#18181b]"
                >
                  Start building
                </a>
                <a
                  href="#comparison"
                  className="inline-flex items-center justify-center rounded-2xl border-4 border-zinc-900 bg-white px-6 py-3 text-sm font-black uppercase tracking-[0.22em] shadow-[6px_6px_0_0_#18181b] transition-all hover:translate-y-[2px] hover:shadow-[4px_4px_0_0_#18181b] active:translate-y-1 active:shadow-[2px_2px_0_0_#18181b]"
                >
                  See product flow
                </a>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border-4 border-zinc-900 bg-white p-4 text-left shadow-[6px_6px_0_0_#18181b]">
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-zinc-500">
                    Quiz state
                  </p>
                  <p className="mt-2 text-2xl font-black">Draft / Active / Expired</p>
                </div>
                <div className="rounded-2xl border-4 border-zinc-900 bg-[#8de6ff] p-4 text-left shadow-[6px_6px_0_0_#18181b]">
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-zinc-700">
                    Sharing
                  </p>
                  <p className="mt-2 text-2xl font-black">Slug + QR</p>
                </div>
                <div className="rounded-2xl border-4 border-zinc-900 bg-[#ffa8d8] p-4 text-left shadow-[6px_6px_0_0_#18181b]">
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-zinc-700">
                    Protection
                  </p>
                  <p className="mt-2 text-2xl font-black">One response each</p>
                </div>
              </div>
            </section>

            <aside id="sign-in" className="relative z-10 flex w-full justify-center lg:justify-end">
              <div className="relative w-full max-w-xl">
                <div
                  className="absolute z-999 -right-10 max-w-[12vw] -top-14 hidden rotate-15 rounded-2xl border-4 border-zinc-900 bg-amber-300 px-4 py-3 text-left shadow-[6px_6px_0_0_#18181b] sm:block"
                  aria-hidden
                >
                  <p className="text-[11px] font-black uppercase tracking-[0.24em]">Host mode</p>
                  <p className="mt-1 text-sm font-bold">Create quizzes, set status, and control who can answer.</p>
                </div>
                <div
                  className="absolute  z-999 -right-2 -bottom-10 hidden rotate-6 rounded-2xl border-4 border-zinc-900 bg-lime-300 px-4 py-3 text-left shadow-[6px_6px_0_0_#18181b] sm:block"
                  aria-hidden
                >
                  <p className="text-[11px] font-black uppercase tracking-[0.24em]">Audience mode</p>
                  <p className="mt-1 text-sm font-bold">Join from the share link and submit one clean response.</p>
                </div>
                <span className="absolute z-99  inline-flex -translate-y-1/2 -rotate-3 rounded-xl border-4 border-zinc-900 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.24em] shadow-[5px_5px_0_0_#18181b] sm:text-[11px]">
                  Sign in as a creator to start
                </span>
                <div className="overflow-hidden rounded-4xl border-4 border-zinc-900 bg-[#fffbf3] p-4 shadow-[10px_10px_0_0_#18181b] sm:p-6">
                  <SignIn
                    forceRedirectUrl="/home"
                    signUpFallbackRedirectUrl="/home"
                    appearance={{
                      elements: {
                        rootBox: "w-full min-w-0",
                        card: "w-full min-w-0 border-0 bg-transparent p-0 shadow-none",
                        headerTitle: "text-zinc-900 font-black tracking-tight",
                        headerSubtitle: "text-zinc-600",
                        socialButtonsBlockButton:
                          "w-full rounded-xl border-4 border-zinc-900 bg-white text-sm font-semibold shadow-[4px_4px_0_0_#18181b] transition-all hover:translate-y-[2px] hover:bg-stone-50 hover:shadow-[2px_2px_0_0_#18181b] active:translate-y-[3px] active:shadow-none",
                        formButtonPrimary:
                          "rounded-xl border-4 border-zinc-900 bg-emerald-400 font-black uppercase tracking-[0.18em] text-white shadow-[4px_4px_0_0_#18181b] transition-all hover:translate-y-[2px] hover:bg-emerald-400 hover:shadow-[2px_2px_0_0_#18181b] active:translate-y-[3px] active:shadow-none",
                        formFieldInput:
                          "min-w-0 rounded-xl border-4 border-zinc-900 bg-white focus:ring-4 focus:ring-amber-300",
                        footerAction: "flex-wrap justify-center gap-1 text-center",
                        footerActionLink: "font-bold text-emerald-700",
                        dividerLine: "bg-zinc-900",
                        dividerText: "font-black uppercase tracking-[0.2em] text-zinc-500",
                      },
                    }}
                  />
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section id="features" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
          <div className="rounded-[2.5rem] border-4 border-zinc-900 bg-[#ffd8ea] p-6 shadow-[10px_10px_0_0_#18181b] sm:p-8">
            <SectionHeading
              eyebrow="Feature section"
              title="PulseBoard covers the full creator-to-participant quiz flow."
              body="The core product is not just quiz creation. It also handles response rules, duplicate-vote protection, clean sharing, and analytics that change depending on publish state."
            />

            <ul className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {FEATURES.map((feature, index) => (
                <li
                  key={feature.title}
                  className="rounded-[1.75rem] border-4 border-zinc-900 bg-white p-5 shadow-[8px_8px_0_0_#18181b]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={`inline-flex rounded-xl border-4 border-zinc-900 px-3 py-2 text-[11px] font-black uppercase tracking-[0.2em] ${feature.accent}`}
                    >
                      {feature.stat}
                    </span>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border-4 border-zinc-900 bg-zinc-900 text-sm font-black text-white">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="mt-5 text-2xl font-black leading-tight tracking-tight">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-700">{feature.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="comparison" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
          <SectionHeading
            eyebrow="Comparison section"
            title="Built for quizzes and polls, not just generic form collection"
            body="PulseBoard is shaped around the product flow this repo actually implements: builder, sharing, response rules, analytics visibility, and post-launch controls."
          />

          <div className="mt-8 overflow-hidden rounded-[2.5rem] border-4 border-zinc-900 bg-white shadow-[10px_10px_0_0_#18181b]">
            <div className="grid bg-zinc-900 text-white md:grid-cols-[0.8fr_1fr_1fr]">
              <div className="border-b-4 border-zinc-900 px-5 py-4 text-xs font-black uppercase tracking-[0.28em] md:border-b-0 md:border-r-4">
                Category
              </div>
              <div className="border-b-4 border-zinc-900 bg-lime-300 px-5 py-4 text-xs font-black uppercase tracking-[0.28em] text-zinc-900 md:border-b-0 md:border-r-4">
                PulseBoard
              </div>
              <div className="bg-zinc-200 px-5 py-4 text-xs font-black uppercase tracking-[0.28em] text-zinc-900">
                Typical tools
              </div>
            </div>
            <div className="grid md:grid-cols-[0.8fr_1fr_1fr]">
              {COMPARISON_ROWS.map((row, index) => (
                <div key={row.label} className="contents">
                  <div
                    className={`border-zinc-900 px-5 py-5 font-black tracking-tight ${index < COMPARISON_ROWS.length - 1 ? "border-b-4 md:border-r-4" : "md:border-r-4"}`}
                  >
                    {row.label}
                  </div>
                  <div
                    className={`border-zinc-900 bg-amber-100 px-5 py-5 text-sm leading-relaxed ${index < COMPARISON_ROWS.length - 1 ? "border-b-4 md:border-r-4" : "md:border-r-4"}`}
                  >
                    {row.pulseBoard}
                  </div>
                  <div
                    className={`border-zinc-900 bg-rose-100 px-5 py-5 text-sm leading-relaxed ${index < COMPARISON_ROWS.length - 1 ? "border-b-4" : ""}`}
                  >
                    {row.typical}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="illustrations" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
          <div className="rounded-[2.5rem] border-4 border-zinc-900 bg-[#8de6ff] p-6 shadow-[10px_10px_0_0_#18181b] sm:p-8">
            <SectionHeading
              eyebrow="From the real product"
              title="Analytics, participation rules, and the share modal"
              body="These panels are based on the screens PulseBoard actually ships: the analytics view, the quiz rules that decide who can answer, and the post-create modal with the slug and QR code."
            />

            <div className="mt-8 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
              <article className="relative overflow-hidden rounded-4xl border-4 border-zinc-900 bg-white p-5 h-full shadow-[8px_8px_0_0_#18181b] sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.26em] text-zinc-500">
                      Analytics view
                    </p>
                    <h3 className="mt-2 text-2xl font-black tracking-tight">Question breakdown in action</h3>
                  </div>
                  <span className="inline-flex animate-pulse rounded-full border-4 border-zinc-900 bg-rose-300 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em]">
                    Live updates
                  </span>
                </div>

                <div className="mt-6 rounded-[1.75rem] border-4 border-zinc-900 bg-[#fff3a7] p-5">
                  <p className="text-[11px] font-black uppercase tracking-[0.26em] text-zinc-600">
                    Question 02
                  </p>
                  <h4 className="mt-2 text-2xl font-black leading-tight">
                    Which session format should we run next?
                  </h4>

                  <div className="mt-6 space-y-3">
                    <div className="rounded-2xl border-4 border-zinc-900 bg-white p-3">
                      <div className="flex items-center justify-between gap-3 text-sm font-bold">
                        <span>Lightning quiz</span>
                        <span>58%</span>
                      </div>
                      <div className="mt-3 h-5 rounded-full border-4 border-zinc-900 bg-zinc-100">
                        <div className="h-full w-[58%] rounded-full bg-lime-300" />
                      </div>
                    </div>
                    <div className="rounded-2xl border-4 border-zinc-900 bg-white p-3">
                      <div className="flex items-center justify-between gap-3 text-sm font-bold">
                        <span>Anonymous pulse check</span>
                        <span>27%</span>
                      </div>
                      <div className="mt-3 h-5 rounded-full border-4 border-zinc-900 bg-zinc-100">
                        <div className="h-full w-[27%] rounded-full bg-sky-300" />
                      </div>
                    </div>
                    <div className="rounded-2xl border-4 border-zinc-900 bg-white p-3">
                      <div className="flex items-center justify-between gap-3 text-sm font-bold">
                        <span>Authenticated Q&amp;A round</span>
                        <span>15%</span>
                      </div>
                      <div className="mt-3 h-5 rounded-full border-4 border-zinc-900 bg-zinc-100">
                        <div className="h-full w-[15%] rounded-full bg-rose-300" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border-4 border-zinc-900 bg-white p-3 text-center">
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">
                        Responses
                      </p>
                      <p className="mt-2 text-2xl font-black">124</p>
                    </div>
                    <div className="rounded-2xl border-4 border-zinc-900 bg-white p-3 text-center">
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">
                        Questions
                      </p>
                      <p className="mt-2 text-2xl font-black">6 total</p>
                    </div>
                    <div className="rounded-2xl border-4 border-zinc-900 bg-white p-3 text-center">
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">
                        Avg / Q
                      </p>
                      <p className="mt-2 text-2xl font-black">3.8</p>
                    </div>
                  </div>
                </div>

                <div className="absolute z-999 hidden md:block md:bottom-10 md:right-20  rounded-2xl border-4 border-zinc-900 bg-white px-4 py-2 text-md font-black shadow-[6px_6px_0_0_#18181b]">
                  Creator view: counts, percentages, top picks
                </div>
              </article>

              <div className="grid gap-5">
                <article className="rounded-4xl border-4 border-zinc-900 bg-[#ffd8ea] p-5 shadow-[8px_8px_0_0_#18181b]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.26em] text-zinc-600">
                        Participation rules
                      </p>
                      <h3 className="mt-2 text-2xl font-black tracking-tight">Anonymous or sign-in required</h3>
                    </div>
                    <div className="flex gap-1" aria-hidden>
                      <span className="h-3 w-3 rounded-full border-2 border-zinc-900 bg-lime-300 animate-pulse" />
                      <span className="h-3 w-3 rounded-full border-2 border-zinc-900 bg-amber-300 animate-pulse" />
                      <span className="h-3 w-3 rounded-full border-2 border-zinc-900 bg-sky-300 animate-pulse" />
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    {[
                      "Turn on anonymous responses when anyone should be able to vote",
                      "Leave anonymous responses off when the quiz should require sign-in",
                      "Use public analytics and expiry to control what stays private or closes",
                    ].map((event, index) => (
                      <div
                        key={event}
                        className="flex items-center gap-3 rounded-2xl border-4 border-zinc-900 bg-white p-3"
                      >
                        <span
                          className={`inline-flex h-10 w-10 items-center justify-center rounded-full border-4 border-zinc-900 font-black ${
                            index === 0 ? "bg-lime-300" : index === 1 ? "bg-amber-300" : "bg-sky-300"
                          }`}
                        >
                          {index + 1}
                        </span>
                        <p className="text-sm font-bold leading-snug">{event}</p>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="rounded-4xl border-4 border-zinc-900 bg-white p-5 shadow-[8px_8px_0_0_#18181b]">
                  <p className="text-[11px] font-black uppercase tracking-[0.26em] text-zinc-500">
                    Create success modal
                  </p>
                  <h3 className="mt-2 text-2xl font-black tracking-tight">Slug, QR, then jump to analytics</h3>

                  <div className="mt-5 grid grid-cols-[1fr_auto] gap-4">
                    <div className="rounded-2xl border-4 border-zinc-900 bg-[#f7f1e3] p-4">
                      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-zinc-500">
                        Join URL
                      </p>
                      <p className="mt-2 break-all text-sm font-bold">
                        pulseboard.app/quiz/team-retro-may
                      </p>
                    </div>
                    <div className="grid h-24 w-24 grid-cols-4 gap-1 rounded-2xl border-4 border-zinc-900 bg-white p-2">
                      {Array.from({ length: 16 }).map((_, index) => (
                        <span
                          key={index}
                          className={`rounded-[2px] ${index % 3 === 0 || index === 5 || index === 14 ? "bg-zinc-900" : "bg-zinc-200"}`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border-4 border-dashed border-zinc-900 bg-lime-200 p-4">
                    <p className="text-sm font-bold">
                      After saving, the real app shows the join link, renders a scannable QR code,
                      and sends the creator straight to that quiz's analytics view.
                    </p>
                  </div>
                </article>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
          <div className="rounded-[2.5rem] border-4 border-zinc-900 bg-emerald-400 p-6 shadow-[10px_10px_0_0_#18181b] sm:p-8">
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <p className="inline-flex rounded-full border-2 border-zinc-900 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-[0.28em]">
                  Final CTA
                </p>
                <h2 className="mt-5 text-balance text-3xl font-black leading-none tracking-tight text-white sm:text-5xl">
                  Ready to launch a quiz that is easy to build, easy to join, and easy to review?
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-emerald-950 sm:text-lg">
                  Sign in, create your questions, pick the response mode, share the slug, and let
                  PulseBoard handle duplicate protection, visibility rules, and the analytics view.
                </p>

                <div className="mt-7 flex flex-col items-start gap-3 sm:flex-row">
                  <a
                    href="#sign-in"
                    className="inline-flex items-center justify-center rounded-2xl border-4 border-zinc-900 bg-white px-6 py-3 text-sm font-black uppercase tracking-[0.22em] shadow-[6px_6px_0_0_#18181b] transition-all hover:translate-y-[2px] hover:shadow-[4px_4px_0_0_#18181b] active:translate-y-1 active:shadow-[2px_2px_0_0_#18181b]"
                  >
                    Sign in to create
                  </a>
                  <a
                    href="#illustrations"
                    className="inline-flex items-center justify-center rounded-2xl border-4 border-zinc-900 bg-[#ffdb57] px-6 py-3 text-sm font-black uppercase tracking-[0.22em] shadow-[6px_6px_0_0_#18181b] transition-all hover:translate-y-[2px] hover:shadow-[4px_4px_0_0_#18181b] active:translate-y-1 active:shadow-[2px_2px_0_0_#18181b]"
                  >
                    Explore the flow
                  </a>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  "Anonymous or authenticated responses per quiz",
                  "Shareable analytics once results are published",
                  "Slug links and QR codes for fast participation",
                  "Creator controls for status, expiry, and privacy",
                ].map((item, index) => (
                  <div
                    key={item}
                    className={`rounded-3xl border-4 border-zinc-900 p-4 shadow-[6px_6px_0_0_#18181b] ${
                      index % 2 === 0 ? "bg-white" : "bg-[#ffdb57]"
                    }`}
                  >
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-zinc-600">
                      Reason 0{index + 1}
                    </p>
                    <p className="mt-2 text-lg font-black leading-tight">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto w-full max-w-6xl px-4 pb-10 pt-4 sm:px-6">
        <div className="rounded-[2.5rem] border-4 border-zinc-900 bg-zinc-900 p-6 text-white shadow-[10px_10px_0_0_#ffdb57] sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-xl">
              <p className="text-[11px] font-black uppercase tracking-[0.3em] text-zinc-400">
                Full-stack polling platform
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">PulseBoard</h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-300 sm:text-base">
                A compact monorepo project with a React frontend, Bun and Express API, MongoDB
                storage, Clerk auth, slug-based sharing, duplicate-vote protection, and polished
                analytics for finished quizzes.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {FOOTER_LINKS.map((link, index) => (
                <a
                  key={link.href}
                  href={link.href}
                  className={`rounded-2xl border-4 border-zinc-900 px-4 py-3 text-sm font-black uppercase tracking-[0.22em] shadow-[5px_5px_0_0_#18181b] transition-all hover:translate-y-[2px] hover:shadow-[3px_3px_0_0_#18181b] active:translate-y-1 active:shadow-[1px_1px_0_0_#18181b] ${
                    index % 2 === 0 ? "bg-white text-zinc-900" : "bg-[#ffdb57] text-zinc-900"
                  }`}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-4 border-t-4 border-zinc-700 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-400">
              Create. Share. Collect. Review.
            </p>
            <p className="rounded-full border-2 border-zinc-700 bg-zinc-800 px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-zinc-300">
              Clerk auth. Quiz states. QR sharing. Analytics.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
