// https://github.com/holepunchto/noise-handshake
import Noise from "npm:noise-handshake";
import Cipher from "npm:noise-handshake/cipher";

export interface Channel {
	send(data: Uint8Array): Promise<void>;
	recv(): Promise<Uint8Array>;
}

const MAX_NOISE_MSG = 65535;

async function readFramed(conn: Deno.Conn): Promise<Uint8Array> {
	const lenBuf = new Uint8Array(4);
	let offset = 0;
	while (offset < 4) {
		const n = await conn.read(lenBuf.subarray(offset));
		if (n === null) throw new Error("connection closed");
		offset += n;
	}
	const len = new DataView(lenBuf.buffer).getUint32(0, false);
	if (len > MAX_NOISE_MSG) throw new Error("message too large");

	const data = new Uint8Array(len);
	offset = 0;
	while (offset < len) {
		const n = await conn.read(data.subarray(offset));
		if (n === null) throw new Error("connection closed");
		offset += n;
	}
	return data;
}

async function writeFramed(conn: Deno.Conn, data: Uint8Array): Promise<void> {
	const lenBuf = new Uint8Array(4);
	new DataView(lenBuf.buffer).setUint32(0, data.length, false);
	await conn.write(lenBuf);
	await conn.write(data);
}

export async function serverHandshake(
	conn: Deno.Conn,
	keyPair: { publicKey: Uint8Array; secretKey: Uint8Array },
): Promise<Channel> {
	const noise = new Noise("NX", false, keyPair);
	noise.initialise(new Uint8Array(0));

	const msg1 = await readFramed(conn);
	noise.recv(msg1);

	const msg2 = noise.send();
	await writeFramed(conn, msg2);

	if (!noise.complete) throw new Error("handshake incomplete");

	const sendCipher = new Cipher(noise.tx);
	const recvCipher = new Cipher(noise.rx);

	return {
		async send(data: Uint8Array): Promise<void> {
			await writeFramed(conn, sendCipher.encrypt(data));
		},
		async recv(): Promise<Uint8Array> {
			const encrypted = await readFramed(conn);
			return recvCipher.decrypt(encrypted);
		},
	};
}
