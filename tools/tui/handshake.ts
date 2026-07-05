import { readMessage, writeMessage } from "@polka/utils/noise/frame.ts";
import {
	client_first,
	client_second,
	createTransport,
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

	const clientKeys = client_first();
	await writeMessage(writer, clientKeys.public.e_pk);

	const msg = await readMessage(reader);
	const e_server_pk = msg.slice(0, 32);
	const s_pk_encrypted = msg.slice(32);

	const result = client_second(
		e_server_pk,
		clientKeys.private.e_sk,
		s_pk_encrypted,
	);

	const transport = createTransport(
		result.private.encrypt,
		result.private.decrypt,
	);

	return {
		serverPublicKey: result.serverPublicKey,
		async send(data: Uint8Array): Promise<void> {
			await writeMessage(writer, transport.encrypt(data));
		},
		async recv(): Promise<Uint8Array> {
			return transport.decrypt(await readMessage(reader));
		},
	};
}
