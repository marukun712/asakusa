import { serverHandshake } from "../noise/handshake.ts";
import { handleRequest } from "./handler.ts";

export async function startServer(
	port: number,
	docsRoot: string,
	keyPair: { publicKey: Uint8Array; secretKey: Uint8Array },
): Promise<void> {
	const listener = Deno.listen({ port, transport: "tcp" });
	console.log(`docs listening on TCP :${port}`);

	for await (const conn of listener) {
		handleConnection(conn, docsRoot, keyPair).catch((e) => {
			console.error("connection error:", e);
			conn.close();
		});
	}
}

async function handleConnection(
	conn: Deno.Conn,
	docsRoot: string,
	keyPair: { publicKey: Uint8Array; secretKey: Uint8Array },
): Promise<void> {
	try {
		const channel = await serverHandshake(conn, keyPair);
		await handleRequest(docsRoot, channel);
	} finally {
		conn.close();
	}
}
