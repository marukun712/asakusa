import { SPACE_PORT } from "@polka/types/ports.ts";
import { startServer } from "./server/udp.ts";

const port = parseInt(Deno.args[0] ?? String(SPACE_PORT), 10);
await startServer(port);
