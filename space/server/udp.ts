import { broadcast, clientKey } from "./broadcast.ts";

export async function startServer(port: number): Promise<void> {
	const conn = Deno.listenDatagram({
		port,
		transport: "udp",
		hostname: "0.0.0.0",
	});
	const clients = new Map<string, Deno.NetAddr>();
	console.log(`space listening on UDP :${port}`);

	for await (const [data, addr] of conn) {
		const sender = addr as Deno.NetAddr;
		clients.set(clientKey(sender), sender);
		broadcast(conn, clients, data, sender);
	}
}
