const MAX_NOISE_MSG = 65535;

export async function read(
	reader: ReadableStreamBYOBReader,
	n: number,
): Promise<Uint8Array> {
	const result = new Uint8Array(n);
	let offset = 0;
	while (offset < n) {
		const buf = new Uint8Array(n - offset);
		const { value, done } = await reader.read(buf);
		if (done) throw new Error("connection closed");
		result.set(
			new Uint8Array(value.buffer, value.byteOffset, value.byteLength),
			offset,
		);
		offset += value.byteLength;
	}
	return result;
}

export async function readMessage(
	reader: ReadableStreamBYOBReader,
): Promise<Uint8Array> {
	const lenBuf = await read(reader, 4);
	const len = new DataView(lenBuf.buffer).getUint32(0, false);
	if (len > MAX_NOISE_MSG) throw new Error("message too large");
	return read(reader, len);
}

export async function writeMessage(
	writer: WritableStreamDefaultWriter<Uint8Array>,
	data: Uint8Array,
): Promise<void> {
	const lenBuf = new Uint8Array(4);
	new DataView(lenBuf.buffer).setUint32(0, data.length, false);
	await writer.write(lenBuf);
	await writer.write(data);
}
