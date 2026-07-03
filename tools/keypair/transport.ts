// https://github.com/paulmillr/noble-curves
import { x25519 } from "npm:@noble/curves/ed25519";

export interface TransportKeyPair {
	secretKey: Uint8Array;
	publicKey: Uint8Array;
}

export function generate(): TransportKeyPair {
	const secretKey = x25519.utils.randomPrivateKey();
	const publicKey = x25519.getPublicKey(secretKey);
	return { secretKey, publicKey };
}

export async function save(pair: TransportKeyPair): Promise<void> {
	const dir = `${Deno.env.get("HOME") ?? ""}/.polka/transport`;
	await Deno.mkdir(dir, { recursive: true });
	await Deno.writeFile(`${dir}/key`, pair.secretKey);
	await Deno.writeFile(`${dir}/key.pub`, pair.publicKey);
}

export async function load(): Promise<TransportKeyPair> {
	const dir = `${Deno.env.get("HOME") ?? ""}/.polka/transport`;
	const secretKey = await Deno.readFile(`${dir}/key`);
	const publicKey = await Deno.readFile(`${dir}/key.pub`);
	return { secretKey, publicKey };
}
