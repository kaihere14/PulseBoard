import http from "http";
import { Server } from "socket.io";
import { getApplication } from "./app/app";
import { initAnalyticsRealtime } from "./app/realtime/analyticsRealtime";

const app = await getApplication();
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

const clientOrigin = process.env.CLIENT_URL || "http://localhost:5173";
const io = new Server(server, {
  cors: {
    origin: clientOrigin,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

initAnalyticsRealtime(io);

server.listen(PORT, () => {
    console.log(`[Server] Server is running on http://localhost:${PORT}`);
});