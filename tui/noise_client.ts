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

export interface ClientChannel {
	send(data: Uint8Array): Promise<void>;
	recv(): Promise<Uint8Array>;
	serverPublicKey: Uint8Array;
}

export async function clientHandshake(
	conn: Deno.TcpConn,
): Promise<ClientChannel> {
	const reader = conn.readable.getReader({ mode: "byob" });
	const writer = conn.writable.getWriter();

	const state = initialize("NX", true, new Uint8Array(0));

	const msg1Buf = new Uint8Array(64);
	const { written } = writeMessage(state, new Uint8Array(0), msg1Buf);
	await writeFramed(writer, msg1Buf.subarray(0, written));

	const msg2 = await readFramed(reader);
	const split = readMessage(state, msg2, new Uint8Array(0));

	if (!split) throw new Error("handshake incomplete");
	if (!split.rs) throw new Error("server public key not received");

	const serverPublicKey = split.rs;
	destroy(state);

	return {
		serverPublicKey,
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
