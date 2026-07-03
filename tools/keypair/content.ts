// https://github.com/paulmillr/noble-curves
import { ed25519 } from "@noble/curves/ed25519.js";
// https://github.com/FiloSottile/typage
import { Decrypter, Encrypter } from "age-encryption";

export interface ContentKeyPair {
	secretKey: Uint8Array;
	publicKey: Uint8Array;
}

export function generate(): ContentKeyPair {
	const secretKey = ed25519.utils.randomSecretKey();
	const publicKey = ed25519.getPublicKey(secretKey);
	return { secretKey, publicKey };
}

export async function save(
	pair: ContentKeyPair,
	passphrase: string,
): Promise<void> {
	const dir = `${Deno.env.get("HOME") ?? ""}/.polka/content`;
	await Deno.mkdir(dir, { recursive: true });

	const e = new Encrypter();
	e.setPassphrase(passphrase);
	const encrypted = await e.encrypt(pair.secretKey);

	await Deno.writeFile(`${dir}/key.age`, encrypted);
	await Deno.writeFile(`${dir}/key.pub`, pair.publicKey);
}

export async function load(passphrase: string): Promise<ContentKeyPair> {
	const dir = `${Deno.env.get("HOME") ?? ""}/.polka/content`;
	const encrypted = await Deno.readFile(`${dir}/key.age`);
	const publicKey = await Deno.readFile(`${dir}/key.pub`);

	const d = new Decrypter();
	d.addPassphrase(passphrase);
	const secretKey = await d.decrypt(encrypted, "uint8array");

	return { secretKey, publicKey };
}
