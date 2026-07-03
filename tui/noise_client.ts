// https://github.com/holepunchto/noise-handshake

import { readFramed, writeFramed } from "@polka/utils/noise/frame.ts";
import Noise from "noise-handshake";
import Cipher from "noise-handshake/cipher";

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

	const noise = new Noise("NX", true);
	noise.initialise(new Uint8Array(0));

	const msg1 = noise.send();
	await writeFramed(writer, msg1);

	const msg2 = await readFramed(reader);
	noise.recv(msg2);

	if (!noise.complete) throw new Error("handshake incomplete");

	const sendCipher = new Cipher(noise.tx);
	const recvCipher = new Cipher(noise.rx);

	return {
		serverPublicKey: noise.rs,
		async send(data: Uint8Array): Promise<void> {
			await writeFramed(writer, sendCipher.encrypt(data));
		},
		async recv(): Promise<Uint8Array> {
			const encrypted = await readFramed(reader);
			return recvCipher.decrypt(encrypted);
		},
	};
}
