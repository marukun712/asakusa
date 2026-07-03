// https://github.com/paulmillr/noble-hashes

// https://www.dicebear.com/how-to-use/js-library/
import { Avatar } from "@dicebear/core";
import * as pixelArt from "@dicebear/pixel-art";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

export function computeFingerprint(publicKey: Uint8Array): string {
	return bytesToHex(sha256(publicKey));
}

export function generateAvatar(fingerprint: string): string {
	return new Avatar(pixelArt, { seed: fingerprint }).toString();
}
