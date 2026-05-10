import { SignIn, useAuth } from "@clerk/react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const navigate = useNavigate({ from: "/" });
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    void navigate({ to: "/home", replace: true });
  }, [isLoaded, isSignedIn, navigate]);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-sm text-zinc-600 dark:bg-zinc-950 dark:text-zinc-400">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="flex min-h-screen w-full flex-col md:flex-row">
        <section className="flex flex-1 flex-col justify-center px-8 py-12 md:px-16 md:py-20">
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-500 dark:text-zinc-500">
            Full-stack polling
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">PulseBoard</h1>
          <p className="mt-4 max-w-lg text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
            Create polls, share a public link, and collect feedback in one place.
          </p>
          <ul className="mt-10 max-w-lg space-y-4 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            <li>Choose response mode per poll: anonymous or authenticated.</li>
            <li>Share one code/link so people can join quickly.</li>
            <li>Analyze responses and publish results when ready.</li>
          </ul>
        </section>

        <aside className="flex flex-1 items-center justify-center border-b border-zinc-200 bg-white px-6 py-10 md:border-b-0 md:border-l md:border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="w-full max-w-md">
            <SignIn forceRedirectUrl="/home" signUpFallbackRedirectUrl="/home" />
          </div>
        </aside>
      </div>
    </div>
  );
}
