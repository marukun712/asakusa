// https://jsr.io/@std/cli/doc/prompt-secret/~/promptSecret
import { promptSecret } from "@std/cli/prompt-secret";
import { load as loadContent } from "./keypair/content.ts";
import { buildWellKnown, sign } from "./merkle/sign.ts";
import {
	buildMerkleRoot,
	collectFileHashes,
	collectFilePaths,
} from "./merkle/tree.ts";

export async function run(docsDir: string): Promise<void> {
	const passphrase = promptSecret("Content key passphrase:") ?? "";
	const pair = await loadContent(passphrase);
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
