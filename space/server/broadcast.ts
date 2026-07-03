export function clientKey(addr: Deno.NetAddr): string {
	return `${addr.hostname}:${addr.port}`;
}

export function broadcast(
	conn: Deno.DatagramConn,
	clients: Map<string, Deno.NetAddr>,
	data: Uint8Array,
	exclude: Deno.NetAddr,
): void {
	const excludeKey = clientKey(exclude);
	for (const [key, addr] of clients) {
		if (key === excludeKey) continue;
		conn.send(data, {
			transport: "udp",
			hostname: addr.hostname,
			port: addr.port,
		});
	}
}
