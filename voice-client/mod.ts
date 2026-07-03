import { VOICE_CLIENT_PORT } from "../ports.ts";
import { startServer } from "./server/http.ts";

const port = parseInt(
	Deno.env.get("CLIENT_PORT") ?? String(VOICE_CLIENT_PORT),
	10,
);
startServer(port);
