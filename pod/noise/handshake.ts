import { readFramed, writeFramed } from "@polka/utils/noise/frame.ts";
import {
	decryptWithAd,
	destroy,
	encryptWithAd,
	initialize,
	MACLEN,
	readMessage,
	writeMessage,
} from "@polka/utils/noise/protocol.ts";

export interface Channel {
	send(data: Uint8Array): Promise<void>;
	recv(): Promise<Uint8Array>;
}

export async function serverHandshake(
	conn: Deno.Conn,
	keyPair: { publicKey: Uint8Array; secretKey: Uint8Array },
): Promise<Channel> {
	const reader = conn.readable.getReader({ mode: "byob" });
	const writer = conn.writable.getWriter();

	const state = initialize("NX", false, new Uint8Array(0), keyPair);

	const msg1 = await readFramed(reader);
	readMessage(state, msg1, new Uint8Array(0));

	const msg2Buf = new Uint8Array(256);
	const { written, split } = writeMessage(state, new Uint8Array(0), msg2Buf);
	await writeFramed(writer, msg2Buf.subarray(0, written));

	if (!split) throw new Error("handshake incomplete");
	destroy(state);

	return {
		async send(data: Uint8Array): Promise<void> {
			const out = new Uint8Array(data.byteLength + MACLEN);
			encryptWithAd(split.tx, out, null, data);
			await writeFramed(writer, out);
		},
		async recv(): Promise<Uint8Array> {
			const encrypted = await readFramed(reader);
			const out = new Uint8Array(encrypted.byteLength - MACLEN);
			decryptWithAd(split.rx, out, null, encrypted);
			return out;
		},
	};
}
