// https://www.npmjs.com/package/md2gmi
import { MarkdownToGemtext } from "md2gmi";
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

const home = Deno.env.get("HOME") ?? "";
const docsRoot = Deno.env.get("DOCS_ROOT") ?? `${home}/.polka/pod/`;
const docsDir = Deno.args[0] ?? docsRoot;

async function convertMarkdown(dir: string): Promise<void> {
	for await (const entry of Deno.readDir(dir)) {
		const path = `${dir}/${entry.name}`;
		if (entry.isFile && entry.name.endsWith(".md")) {
			const md = await Deno.readTextFile(path);
			const gmi = new MarkdownToGemtext().convert(md, entry.name);
			await Deno.writeTextFile(`${path.slice(0, -3)}.gmi`, gmi);
		} else if (entry.isDirectory) {
			await convertMarkdown(path);
		}
	}
}

const passphrase = readPassphrase();
const pair = await loadContent(passphrase);

await convertMarkdown(docsDir);
const hashes = await collectFileHashes(docsDir);
const rootHash = buildMerkleRoot(hashes);
const timestamp = Date.now();
const sig = sign(rootHash, pair.secretKey);
const wellKnown = buildWellKnown(pair.publicKey, rootHash, timestamp, sig);

await Deno.mkdir(`${docsDir}/.well-known`, { recursive: true });
await Deno.writeTextFile(`${docsDir}/.well-known/polka`, wellKnown);

console.log("wrote .well-known/polka");
console.log(wellKnown);
