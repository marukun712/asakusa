// https://github.com/holepunchto/noise-handshake
import Noise from "npm:noise-handshake";
import Cipher from "npm:noise-handshake/cipher";

export interface Channel {
	send(data: Uint8Array): Promise<void>;
	recv(): Promise<Uint8Array>;
}

const MAX_NOISE_MSG = 65535;

async function readExact(
	reader: ReadableStreamBYOBReader,
	n: number,
): Promise<Uint8Array> {
	const result = new Uint8Array(n);
	let view = new Uint8Array(result.buffer, 0, n);
	while (view.byteLength > 0) {
		const { value, done } = await reader.read(view);
		if (done) throw new Error("connection closed");
		view = new Uint8Array(result.buffer, value.byteOffset + value.byteLength);
	}
	return result;
}

async function readFramed(
	reader: ReadableStreamBYOBReader,
): Promise<Uint8Array> {
	const lenBuf = await readExact(reader, 4);
	const len = new DataView(lenBuf.buffer).getUint32(0, false);
	if (len > MAX_NOISE_MSG) throw new Error("message too large");
	return readExact(reader, len);
}

async function writeFramed(
	writer: WritableStreamDefaultWriter<Uint8Array>,
	data: Uint8Array,
): Promise<void> {
	const lenBuf = new Uint8Array(4);
	new DataView(lenBuf.buffer).setUint32(0, data.length, false);
	await writer.write(lenBuf);
	await writer.write(data);
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
