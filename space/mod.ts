import { startServer } from "./server/udp.ts";

const port = parseInt(Deno.env.get("SPACE_PORT") ?? "7072", 10);
await startServer(port);
