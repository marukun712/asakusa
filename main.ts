import {
	BROWSER_PORT,
	DOCS_PORT,
	RELAY_PORT,
	SPACE_PORT,
} from "@polka/types/ports.ts";
import { parseArgs } from "@std/cli/parse-args";
import { startServer as startPod } from "./server/pod/server/tcp.ts";
import { startServer as startRelay } from "./server/relay/server/udp.ts";
import { startServer as startSpace } from "./server/space/server/udp.ts";
import { run as runBuilder } from "./tools/builder.ts";
import { run as runSetup } from "./tools/setup.ts";
import { startServer as startVoice } from "./tools/voice-client/server/http.ts";

function resolveHome(path: string): string {
	const home = Deno.env.get("HOME") ?? "";
	return `${home}/${path}`;
}

const [subcommand, ...rest] = Deno.args;

const flags = parseArgs(rest, {
	string: ["port", "dir"],
});

switch (subcommand) {
	case "relay":
		await startRelay(parseInt(flags.port ?? String(RELAY_PORT), 10));
		break;

	case "space":
		await startSpace(parseInt(flags.port ?? String(SPACE_PORT), 10));
		break;

	case "pod": {
		const port = parseInt(flags.port ?? String(DOCS_PORT), 10);
		const docsRoot = flags.dir ?? resolveHome(".polka/pod/");
		const keyPair = {
			secretKey: await Deno.readFile(resolveHome(".polka/transport/key")),
			publicKey: await Deno.readFile(resolveHome(".polka/transport/key.pub")),
		};
		await startPod(port, docsRoot, keyPair);
		break;
	}

	case "voice":
		startVoice(parseInt(flags.port ?? String(BROWSER_PORT), 10));
		break;

	case "setup":
		await runSetup();
		break;

	case "build":
		await runBuilder(flags.dir ?? resolveHome(".polka/pod/"));
		break;

	default:
		console.log("usage: polka <subcommand> [options]");
		console.log("");
		console.log("subcommands:");
		console.log("  relay   [--port <port>]              start relay server");
		console.log("  space   [--port <port>]              start space server");
		console.log("  pod     [--port <port>] [--dir <dir>] start pod server");
		console.log("  voice   [--port <port>]              start voice client");
		console.log("  setup                                generate keypairs");
		console.log(
			"  build   [--dir <dir>]                build and sign documents",
		);
		break;
}
