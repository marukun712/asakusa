import { RelayEventSchema } from "../types/event.ts";
import { broadcast, clientKey } from "./broadcast.ts";

export async function startServer(port: number): Promise<void> {
	const conn = Deno.listenDatagram({
		port,
		transport: "udp",
		hostname: "0.0.0.0",
	});
	const clients = new Map<string, Deno.NetAddr>();
	console.log(`relay listening on UDP :${port}`);

	for await (const [data, addr] of conn) {
		const sender = addr as Deno.NetAddr;
		clients.set(clientKey(sender), sender);

		try {
			const json = JSON.parse(new TextDecoder().decode(data));
			const result = RelayEventSchema.safeParse(json);
			if (!result.success) continue;
			broadcast(conn, clients, data, sender);
		} catch {
			// ignore non-JSON packets
		}
	}
}
