import {
	generate as generateContent,
	save as saveContent,
} from "./keypair/content.ts";
import {
	generate as generateTransport,
	save as saveTransport,
} from "./keypair/transport.ts";

function readPassphrase(): string {
	const buf = new Uint8Array(256);
	Deno.stdout.writeSync(new TextEncoder().encode("Content key passphrase: "));
	const n = Deno.stdin.readSync(buf);
	if (n === null) throw new Error("no input");
	return new TextDecoder().decode(buf.subarray(0, n)).trim();
}

const passphrase = readPassphrase();

const transport = generateTransport();
await saveTransport(transport);
console.log("transport keypair saved to ~/.polka/transport/");

const content = generateContent();
await saveContent(content, passphrase);
console.log("content keypair saved to ~/.polka/content/");
