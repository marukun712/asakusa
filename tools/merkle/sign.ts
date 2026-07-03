// https://github.com/paulmillr/noble-curves
import { ed25519 } from "npm:@noble/curves/ed25519";

export function sign(rootHash: Uint8Array, secretKey: Uint8Array): Uint8Array {
	return ed25519.sign(rootHash, secretKey);
}

export function toHex(bytes: Uint8Array): string {
	return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function buildWellKnown(
	publicKey: Uint8Array,
	rootHash: Uint8Array,
	timestamp: number,
	sig: Uint8Array,
): string {
	return `${toHex(publicKey)}.${toHex(rootHash)}.${timestamp}.${toHex(sig)}`;
}
