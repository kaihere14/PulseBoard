import { io, type Socket } from "socket.io-client";
import { apiOrigin } from "./api";

export function createAnalyticsSocket(): Socket {
  return io(apiOrigin(), {
    transports: ["websocket", "polling"],
    withCredentials: true,
    autoConnect: true,
  });
}
