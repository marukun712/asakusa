// https://jsr.io/@std/cli/doc/prompt-secret/~/promptSecret
import { promptSecret } from "@std/cli/prompt-secret";
import {
	generate as generateContent,
	save as saveContent,
} from "./keypair/content.ts";
import {
	generate as generateTransport,
	save as saveTransport,
} from "./keypair/transport.ts";

export async function run(): Promise<void> {
	const passphrase = promptSecret("Content key passphrase:") ?? "";

	const transport = generateTransport();
	await saveTransport(transport);
	console.log("transport keypair saved to ~/.polka/transport/");

	const content = generateContent();
	await saveContent(content, passphrase);
	console.log("content keypair saved to ~/.polka/content/");
}
