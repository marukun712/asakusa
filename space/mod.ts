import { SPACE_PORT } from "../ports.ts";
import { startServer } from "./server/udp.ts";

const port = parseInt(Deno.env.get("SPACE_PORT") ?? String(SPACE_PORT), 10);
await startServer(port);
