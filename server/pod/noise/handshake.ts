import { readMessage, writeMessage } from "@polka/utils/noise/frame.ts";
import { createTransport, server_first } from "@polka/utils/noise/protocol.ts";

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

	const e_client_pk = await readMessage(reader);

	const result = server_first(e_client_pk, {
		pk: keyPair.publicKey,
		sk: keyPair.secretKey,
	});

	const msg = new Uint8Array(
		result.public.e.length + result.public.s_pk_encrypted.length,
	);
	msg.set(result.public.e, 0);
	msg.set(result.public.s_pk_encrypted, result.public.e.length);
	await writeMessage(writer, msg);

	const transport = createTransport(
		result.private.encrypt,
		result.private.decrypt,
	);

	return {
		async send(data: Uint8Array): Promise<void> {
			await writeMessage(writer, transport.encrypt(data));
		},
		async recv(): Promise<Uint8Array> {
			return transport.decrypt(await readMessage(reader));
		},
	};
}
