import { startServer } from "./server/udp.ts";

const port = parseInt(Deno.env.get("RELAY_PORT") ?? "7071", 10);
await startServer(port);
