// https://github.com/paulmillr/noble-hashes

import * as bottts from "@dicebear/bottts";
// https://www.dicebear.com/styles/bottts/
import { createAvatar } from "@dicebear/core";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

export function computeFingerprint(publicKey: Uint8Array): string {
	return bytesToHex(sha256(publicKey));
}

export function generateAvatar(fingerprint: string): string {
	return createAvatar(bottts, { seed: fingerprint }).toString();
}
