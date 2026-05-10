import http from "http";
import { getApplication } from "./app/app";

const app = await getApplication();
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

server.listen(PORT, () => {
    console.log(`[Server] Server is running on http://localhost:${PORT}`);
});