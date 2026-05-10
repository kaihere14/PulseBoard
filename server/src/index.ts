import http from "http";
import { getApplication } from "./app/app";

const app = await getApplication();

const server = http.createServer(app);

server.listen(3000, () => {
    console.log("Server is running on port 3000");
});