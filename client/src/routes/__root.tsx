import { createRootRoute, Outlet } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: Root,
});

function Root() {
  return (
    <div className="min-h-dvh overflow-x-clip bg-stone-100 antialiased text-zinc-900">
      <Outlet />
    </div>
  );
}
