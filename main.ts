import {
	BROWSER_PORT,
	DOCS_PORT,
	RELAY_PORT,
	SPACE_PORT,
} from "@polka/types/ports.ts";
import { startServer as startPod } from "./server/pod/server/tcp.ts";
import { startServer as startRelay } from "./server/relay/server/udp.ts";
import { startServer as startSpace } from "./server/space/server/udp.ts";
import { startServer as startBrowser } from "./tools/browser/server/http.ts";
import { run as runBuilder } from "./tools/builder.ts";
import { run as runSetup } from "./tools/setup.ts";
import { startServer as startVoice } from "./tools/voice-client/server/http.ts";

const [subcommand, ...args] = Deno.args;

switch (subcommand) {
	case "relay":
		await startRelay(parseInt(args[0] ?? String(RELAY_PORT), 10));
		break;

	case "space":
		await startSpace(parseInt(args[0] ?? String(SPACE_PORT), 10));
		break;

	case "pod": {
		const port = parseInt(args[0] ?? String(DOCS_PORT), 10);
		const home = Deno.env.get("HOME") ?? "";
		const docsRoot = args[1] ?? `${home}/.polka/pod/`;
		const keyPair = {
			secretKey: await Deno.readFile(`${home}/.polka/transport/key`),
			publicKey: await Deno.readFile(`${home}/.polka/transport/key.pub`),
		};
		await startPod(port, docsRoot, keyPair);
		break;
	}

	case "voice":
		startVoice(parseInt(args[0] ?? String(BROWSER_PORT), 10));
		break;

	case "browser":
		startBrowser(parseInt(args[0] ?? String(BROWSER_PORT), 10));
		break;

	case "setup":
		await runSetup();
		break;

	case "build":
		await runBuilder(args);
		break;

	default:
		console.log("usage: polka <subcommand> [args]");
		console.log("");
		console.log("subcommands:");
		console.log("  relay [port]            start relay server");
		console.log("  space [port]            start space server");
		console.log("  pod [port] [docs-root]  start pod server");
		console.log("  voice [port]            start voice client");
		console.log("  browser [port]          start browser");
		console.log("  setup                    generate keypairs");
		console.log("  build [docs-dir]        build and sign documents");
		break;
}
