import { DOCS_PORT } from "@polka/types/ports.ts";
import { startServer } from "./server/tcp.ts";

const port = parseInt(Deno.args[0] ?? String(DOCS_PORT), 10);
const home = Deno.env.get("HOME") ?? "";
const docsRoot = Deno.args[1] ?? `${home}/.polka/pod/`;
const keyPair = {
	secretKey: await Deno.readFile(`${home}/.polka/transport/key`),
	publicKey: await Deno.readFile(`${home}/.polka/transport/key.pub`),
};

await startServer(port, docsRoot, keyPair);
