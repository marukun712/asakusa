// https://github.com/holepunchto/noise-handshake

import { readFramed, writeFramed } from "@polka/utils/noise/frame.ts";
import Noise from "noise-handshake";
import Cipher from "noise-handshake/cipher";

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

	const noise = new Noise("NX", false, keyPair);
	noise.initialise(new Uint8Array(0));

	const msg1 = await readFramed(reader);
	noise.recv(msg1);

	const msg2 = noise.send();
	await writeFramed(writer, msg2);

	if (!noise.complete) throw new Error("handshake incomplete");

	const sendCipher = new Cipher(noise.tx);
	const recvCipher = new Cipher(noise.rx);

	return {
		async send(data: Uint8Array): Promise<void> {
			await writeFramed(writer, sendCipher.encrypt(data));
		},
		async recv(): Promise<Uint8Array> {
			const encrypted = await readFramed(reader);
			return recvCipher.decrypt(encrypted);
		},
	};
}
