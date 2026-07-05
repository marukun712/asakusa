// https://jsr.io/@std/cli/doc/prompt-secret/~/promptSecret
import { promptSecret } from "@std/cli/prompt-secret";
// https://www.npmjs.com/package/md2gmi
import { MarkdownToGemtext } from "md2gmi";
import { load as loadContent } from "./keypair/content.ts";
import { buildWellKnown, sign } from "./merkle/sign.ts";
import {
	buildMerkleRoot,
	collectFileHashes,
	collectFilePaths,
} from "./merkle/tree.ts";

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

export async function run(args: string[]): Promise<void> {
	const home = Deno.env.get("HOME") ?? "";
	const docsRoot = `${home}/.polka/pod/`;
	const docsDir = args[0] ?? docsRoot;

	const passphrase = promptSecret("Content key passphrase:") ?? "";
	const pair = await loadContent(passphrase);

	await convertMarkdown(docsDir);
	const hashes = await collectFileHashes(docsDir);
	const rootHash = buildMerkleRoot(hashes);
	const timestamp = Date.now();
	const sig = sign(rootHash, pair.secretKey);
	const wellKnown = buildWellKnown(pair.publicKey, rootHash, timestamp, sig);

	const filePaths = await collectFilePaths(docsDir);

	await Deno.mkdir(`${docsDir}/.well-known/polka`, { recursive: true });
	await Deno.writeTextFile(`${docsDir}/.well-known/polka/token`, wellKnown);
	await Deno.writeTextFile(
		`${docsDir}/.well-known/polka/manifest`,
		filePaths.join("\n"),
	);

	console.log("wrote .well-known/polka/token");
	console.log(wellKnown);
}
