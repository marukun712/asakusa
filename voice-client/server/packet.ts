// https://github.com/paulmillr/noble-curves
import { ed25519 } from "@noble/curves/ed25519.js";
import type { SpacePacketData } from "../../space/types/packet.ts";

export type { SpacePacketData } from "../../space/types/packet.ts";
export { parseSpacePacket as parsePacket } from "../../space/types/packet.ts";

export interface SpaceSession {
	publicKey: Uint8Array;
	secretKey: Uint8Array;
	handle: string;
	signature: Uint8Array;
}

export function createSession(handle: string): SpaceSession {
	const secretKey = ed25519.utils.randomSecretKey();
	const publicKey = ed25519.getPublicKey(secretKey);
	const handleBytes = new TextEncoder().encode(handle);
	const toSign = new Uint8Array(publicKey.length + handleBytes.length);
	toSign.set(publicKey, 0);
	toSign.set(handleBytes, publicKey.length);
	const signature = ed25519.sign(toSign, secretKey);
	return { publicKey, secretKey, handle, signature };
}

export function buildPacket(
	session: SpaceSession,
	audio: Uint8Array,
): Uint8Array {
	const handleBytes = new TextEncoder().encode(session.handle);
	const buf = new Uint8Array(32 + 2 + handleBytes.length + 64 + audio.length);
	const view = new DataView(buf.buffer);
	let offset = 0;

	buf.set(session.publicKey, offset);
	offset += 32;

	view.setUint16(offset, handleBytes.length, false);
	offset += 2;

	buf.set(handleBytes, offset);
	offset += handleBytes.length;

	buf.set(session.signature, offset);
	offset += 64;

	buf.set(audio, offset);

	return buf;
}

export function verifyPacket(parsed: SpacePacketData): boolean {
	const handleBytes = new TextEncoder().encode(parsed.handle);
	const toVerify = new Uint8Array(parsed.publicKey.length + handleBytes.length);
	toVerify.set(parsed.publicKey, 0);
	toVerify.set(handleBytes, parsed.publicKey.length);
	try {
		return ed25519.verify(parsed.signature, toVerify, parsed.publicKey);
	} catch {
		return false;
	}
}
