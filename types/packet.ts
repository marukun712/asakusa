import { z } from "zod";

export interface SpacePacketData {
	publicKey: Uint8Array;
	handle: string;
	signature: Uint8Array;
	audio: Uint8Array;
}

function parsePacket(data: Uint8Array): SpacePacketData | null {
	const MIN = 32 + 2 + 1 + 64 + 1;
	if (data.length < MIN) return null;

	const view = new DataView(data.buffer, data.byteOffset);
	let offset = 0;

	const publicKey = data.slice(offset, offset + 32);
	offset += 32;

	const handleLen = view.getUint16(offset, false);
	offset += 2;

	if (handleLen < 1 || handleLen > 64) return null;
	if (data.length < offset + handleLen + 64 + 1) return null;

	const handle = new TextDecoder().decode(
		data.slice(offset, offset + handleLen),
	);
	offset += handleLen;

	const signature = data.slice(offset, offset + 64);
	offset += 64;

	const audio = data.slice(offset);

	return { publicKey, handle, signature, audio };
}

export const SpacePacketSchema = z
	.instanceof(Uint8Array)
	.refine((data) => parsePacket(data) !== null, "invalid packet structure");

export function parseSpacePacket(data: Uint8Array): SpacePacketData {
	const parsed = parsePacket(data);
	if (!parsed) throw new Error("invalid packet");
	return parsed;
}
