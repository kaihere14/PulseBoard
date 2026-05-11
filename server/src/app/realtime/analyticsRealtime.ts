import type { Server } from "socket.io";

export type AnalyticsChangedReason =
  | "response_submitted"
  | "poll_updated"
  | "poll_deleted";

export interface AnalyticsChangedPayload {
  slug: string;
  reason: AnalyticsChangedReason;
  updatedAt: string;
}

function analyticsRoom(slug: string): string {
  return `analytics:${slug}`;
}

let ioInstance: Server | null = null;

export function initAnalyticsRealtime(io: Server): void {
  ioInstance = io;

  io.on("connection", (socket) => {
    socket.on("join-analytics-room", (slug: unknown) => {
      if (typeof slug !== "string" || slug.length === 0) return;
      void socket.join(analyticsRoom(slug));
    });

    socket.on("leave-analytics-room", (slug: unknown) => {
      if (typeof slug !== "string" || slug.length === 0) return;
      void socket.leave(analyticsRoom(slug));
    });
  });
}

export function notifyAnalyticsChanged(
  slug: string,
  reason: AnalyticsChangedReason
): void {
  if (!ioInstance || slug.length === 0) return;
  const payload: AnalyticsChangedPayload = {
    slug,
    reason,
    updatedAt: new Date().toISOString(),
  };
  ioInstance.to(analyticsRoom(slug)).emit("analytics:changed", payload);
}
