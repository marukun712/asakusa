import { load as loadContent } from "./keypair/content.ts";
import { buildWellKnown, sign } from "./merkle/sign.ts";
import { buildMerkleRoot, collectFileHashes } from "./merkle/tree.ts";

function readPassphrase(): string {
	const buf = new Uint8Array(256);
	Deno.stdout.writeSync(new TextEncoder().encode("Content key passphrase: "));
	const n = Deno.stdin.readSync(buf);
	if (n === null) throw new Error("no input");
	return new TextDecoder().decode(buf.subarray(0, n)).trim();
}

const docsDir = Deno.args[0];
if (!docsDir) {
	console.error("usage: builder.ts <docs-dir>");
	Deno.exit(1);
}

const passphrase = readPassphrase();
const pair = await loadContent(passphrase);

const hashes = await collectFileHashes(docsDir);
const rootHash = buildMerkleRoot(hashes);
const timestamp = Date.now();
const sig = sign(rootHash, pair.secretKey);
const wellKnown = buildWellKnown(pair.publicKey, rootHash, timestamp, sig);

await Deno.mkdir(`${docsDir}/.well-known`, { recursive: true });
await Deno.writeTextFile(`${docsDir}/.well-known/polka`, wellKnown);

console.log("wrote .well-known/polka");
console.log(wellKnown);
