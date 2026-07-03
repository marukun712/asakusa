import { RELAY_PORT } from "@polka/types/ports.ts";
import { startServer } from "./server/udp.ts";

const port = parseInt(Deno.env.get("RELAY_PORT") ?? String(RELAY_PORT), 10);
await startServer(port);
