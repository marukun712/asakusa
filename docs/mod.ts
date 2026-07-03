import { DOCS_PORT } from "../ports.ts";
import { startServer } from "./server/tcp.ts";

const port = parseInt(Deno.env.get("DOCS_PORT") ?? String(DOCS_PORT), 10);
const docsRoot = Deno.env.get("DOCS_ROOT") ?? "./data";

const home = Deno.env.get("HOME") ?? "";
const keyPair = {
	secretKey: await Deno.readFile(`${home}/.polka/transport/key`),
	publicKey: await Deno.readFile(`${home}/.polka/transport/key.pub`),
};

await startServer(port, docsRoot, keyPair);
