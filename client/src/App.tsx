/**
 * Clerk: https://clerk.com/docs/react/reference/components/authentication/sign-in
 * Control: https://clerk.com/docs/react/reference/components/control/show
 *
 * Note: Clerk does not issue a real user session for “anonymous” access. Guest mode here is UI-only so
 * respondents can use the app without signing in until you wire public poll routes + backend guest tokens.
 */
import { useState } from "react";
import { ClerkLoaded, ClerkLoading, Show, SignIn, UserButton } from "@clerk/react";

export function App() {
  const [_guestBrowsing, setGuestBrowsing] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <ClerkLoading>
        <div className="flex min-h-screen items-center justify-center text-sm text-zinc-500">
          Loading…
        </div>
      </ClerkLoading>
      <ClerkLoaded>
        <div className="flex min-h-screen w-full flex-col md:flex-row">
          <section className="flex flex-1 flex-col justify-center px-8 py-12 md:px-16 md:py-20">
            <p className="text-xs font-medium uppercase tracking-widest text-zinc-500 dark:text-zinc-500">
              Full-stack polling
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">PulseBoard</h1>
            <p className="mt-4 max-w-lg text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
              Create polls, share a public link, and collect feedback—then dig into analytics and publish
              results when you&apos;re ready.
            </p>
            <ul className="mt-10 max-w-lg space-y-4 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              <li className="flex gap-3">
                <span className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden>
                  ●
                </span>
                <span>
                  <strong className="font-medium text-zinc-900 dark:text-zinc-100">Build</strong> polls with
                  multiple questions—mark each as mandatory or optional, and choose anonymous or authenticated
                  responses.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden>
                  ●
                </span>
                <span>
                  <strong className="font-medium text-zinc-900 dark:text-zinc-100">Share</strong> one link;
                  respondents answer with smooth single-choice flows. Set an expiry so the poll closes on time.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden>
                  ●
                </span>
                <span>
                  <strong className="font-medium text-zinc-900 dark:text-zinc-100">Analyze & publish</strong>{" "}
                  totals, per-question summaries, and option counts—then publish so anyone with the link sees final
                  outcomes.
                </span>
              </li>
            </ul>
            <p className="mt-10 max-w-lg text-xs text-zinc-500 dark:text-zinc-500">
              Hackathon scope: single-select questions · protected creator tools · public respond flow · live updates
              via WebSockets.
            </p>
          </section>
          <aside className="flex flex-1 items-center justify-center border-b border-zinc-200 bg-white px-6 py-10 md:border-b-0 md:border-l md:border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="w-full max-w-md">
              <Show when="signed-out">
                
                  <div className="flex flex-col justify-center items-center gap-4">
                    <SignIn />
                    <div className="relative py-1 text-center text-xs text-zinc-400 before:absolute before:inset-x-0 before:top-1/2 before:-z-10 before:border-t before:border-zinc-200 dark:before:border-zinc-700">
                      <span className="bg-white px-2 dark:bg-zinc-900">or</span>
                    </div>
                    <button
                      type="button"
                      className="w-full rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                      onClick={() => setGuestBrowsing(true)}
                    >
                      Continue anonymously
                    </button>
                  </div>
                
              </Show>
              <Show when="signed-in">
                <div className="flex flex-col  items-center gap-6 text-center">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Signed in—open your dashboard to manage polls and responses.
                  </p>
                  <UserButton />
                </div>
              </Show>
            </div>
          </aside>
        </div>
      </ClerkLoaded>
    </div>
  );
}
