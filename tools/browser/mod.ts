import { startServer } from "./server/http.ts";

const port = parseInt(Deno.env.get("CLIENT_PORT") ?? "8184", 10);
startServer(port);
