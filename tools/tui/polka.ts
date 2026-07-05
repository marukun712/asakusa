import { clientHandshake } from "./handshake.ts";

export interface FetchResult {
	transportKey: Uint8Array;
	status: number;
	meta: string;
	body: string;
}

export async function fetchPolkaBytes(
	host: string,
	port: number,
	url: string,
): Promise<{ status: number; body: Uint8Array }> {
	const conn = await Deno.connect({ hostname: host, port, transport: "tcp" });
	try {
		const channel = await clientHandshake(conn);
		await channel.send(new TextEncoder().encode(`${url}\r\n`));
		const raw = await channel.recv();
		let crlfIdx = -1;
		for (let i = 0; i < raw.length - 1; i++) {
			if (raw[i] === 13 && raw[i + 1] === 10) {
				crlfIdx = i;
				break;
			}
		}
		const header = new TextDecoder().decode(
			crlfIdx >= 0 ? raw.slice(0, crlfIdx) : raw,
		);
		const body = crlfIdx >= 0 ? raw.slice(crlfIdx + 2) : new Uint8Array(0);
		const spIdx = header.indexOf(" ");
		return {
			status: parseInt(header.slice(0, spIdx), 10),
			body,
		};
	} finally {
		conn.close();
	}
}

export async function fetchPolka(
	host: string,
	port: number,
	url: string,
): Promise<FetchResult> {
	const conn = await Deno.connect({ hostname: host, port, transport: "tcp" });
	try {
		const channel = await clientHandshake(conn);
		await channel.send(new TextEncoder().encode(`${url}\r\n`));
		const raw = new TextDecoder().decode(await channel.recv());
		const crlfIdx = raw.indexOf("\r\n");
		const header = crlfIdx >= 0 ? raw.slice(0, crlfIdx) : raw;
		const body = crlfIdx >= 0 ? raw.slice(crlfIdx + 2) : "";
		const spIdx = header.indexOf(" ");
		return {
			transportKey: channel.serverPublicKey,
			status: parseInt(header.slice(0, spIdx), 10),
			meta: header.slice(spIdx + 1),
			body,
		};
	} finally {
		conn.close();
	}
}
