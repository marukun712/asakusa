import { BROWSER_PORT } from "@polka/types/ports.ts";
import { startServer } from "./server/http.ts";

const port = parseInt(Deno.args[0] ?? String(BROWSER_PORT), 10);
startServer(port);
