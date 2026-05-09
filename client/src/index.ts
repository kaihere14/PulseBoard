import { serve } from "bun";
import index from "./index.html";

const server = serve({
  routes: {
    "/*": index,
  },
  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`Client: ${server.url}`);
