const MAX_NOISE_MSG = 65535;

export async function readExact(
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

export async function readFramed(
	reader: ReadableStreamBYOBReader,
): Promise<Uint8Array> {
	const lenBuf = await readExact(reader, 4);
	const len = new DataView(lenBuf.buffer).getUint32(0, false);
	if (len > MAX_NOISE_MSG) throw new Error("message too large");
	return readExact(reader, len);
}

export async function writeFramed(
	writer: WritableStreamDefaultWriter<Uint8Array>,
	data: Uint8Array,
): Promise<void> {
	const lenBuf = new Uint8Array(4);
	new DataView(lenBuf.buffer).setUint32(0, data.length, false);
	await writer.write(lenBuf);
	await writer.write(data);
}
