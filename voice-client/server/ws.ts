// https://github.com/nicktindall/opusscript
import { Buffer } from "node:buffer";
import {
	computeFingerprint,
	generateAvatar,
} from "@polka/utils/crypto/fingerprint.ts";
import OpusScript from "opusscript";
import {
	buildPacket,
	createSession,
	parsePacket,
	type SpaceSession,
	verifyPacket,
} from "./packet.ts";

function fingerprintPrefix(fp: string): Uint8Array {
	const b = new Uint8Array(4);
	for (let i = 0; i < 4; i++) b[i] = parseInt(fp.slice(i * 2, i * 2 + 2), 16);
	return b;
}

export function handleWs(ws: WebSocket): void {
	let udpConn: Deno.DatagramConn | null = null;
	let spaceAddr: { hostname: string; port: number } | null = null;
	let session: SpaceSession | null = null;
	const participants = new Map<string, { handle: string }>();
	let encoder: InstanceType<typeof OpusScript> | null = null;
	let decoder: InstanceType<typeof OpusScript> | null = null;

	ws.onmessage = async (event) => {
		if (typeof event.data === "string") {
			let msg: Record<string, unknown>;
			try {
				msg = JSON.parse(event.data);
			} catch {
				return;
			}

			if (msg.type === "join") {
				encoder ??= new OpusScript(48000, 1, OpusScript.Application.VOIP);
				decoder ??= new OpusScript(48000, 1);
				spaceAddr = { hostname: msg.host as string, port: msg.port as number };
				session = createSession(msg.handle as string);
				udpConn = Deno.listenDatagram({
					port: 0,
					transport: "udp",
					hostname: "0.0.0.0",
				});
				const fingerprint = computeFingerprint(session.publicKey);
				ws.send(
					JSON.stringify({
						type: "joined",
						fingerprint,
						avatar_svg: generateAvatar(fingerprint),
						handle: session.handle,
					}),
				);
				receiveLoop(udpConn, ws, spaceAddr, participants, decoder);
			}
			return;
		}

		if (
			event.data instanceof ArrayBuffer &&
			udpConn &&
			spaceAddr &&
			session &&
			encoder
		) {
			const float32 = new Float32Array(event.data);
			const int16 = new Int16Array(float32.length);
			for (let i = 0; i < float32.length; i++) {
				int16[i] = Math.max(
					-32768,
					Math.min(32767, Math.round(float32[i] * 32768)),
				);
			}
			try {
				const encoded = encoder.encode(Buffer.from(int16.buffer), 480);
				await udpConn.send(buildPacket(session, encoded), {
					transport: "udp",
					...spaceAddr,
				});
			} catch {
				/* */
			}
		}
	};

	ws.onclose = () => {
		try {
			udpConn?.close();
		} catch {
			/* */
		}
		try {
			encoder?.delete?.();
		} catch {
			/* */
		}
		try {
			decoder?.delete?.();
		} catch {
			/* */
		}
	};
}

async function receiveLoop(
	conn: Deno.DatagramConn,
	ws: WebSocket,
	spaceAddr: { hostname: string; port: number },
	participants: Map<string, { handle: string }>,
	decoder: InstanceType<typeof OpusScript>,
): Promise<void> {
	try {
		for await (const [data, addr] of conn) {
			if (ws.readyState !== WebSocket.OPEN) break;
			const sender = addr as Deno.NetAddr;
			if (
				sender.hostname !== spaceAddr.hostname ||
				sender.port !== spaceAddr.port
			) {
				continue;
			}
			const parsed = parsePacket(data);
			if (!parsed || !verifyPacket(parsed)) continue;
			const fingerprint = computeFingerprint(parsed.publicKey);
			if (!participants.has(fingerprint)) {
				participants.set(fingerprint, { handle: parsed.handle });
				ws.send(
					JSON.stringify({
						type: "participant",
						fingerprint,
						handle: parsed.handle,
						avatar_svg: generateAvatar(fingerprint),
					}),
				);
			}
			try {
				const raw = decoder.decode(Buffer.from(parsed.audio));
				const pcm16 = new Int16Array(
					raw.buffer,
					raw.byteOffset,
					raw.byteLength / 2,
				);
				const float32 = new Float32Array(pcm16.length);
				for (let i = 0; i < pcm16.length; i++) float32[i] = pcm16[i] / 32768;
				const prefix = fingerprintPrefix(fingerprint);
				const out = new Uint8Array(4 + float32.byteLength);
				out.set(prefix, 0);
				out.set(new Uint8Array(float32.buffer), 4);
				ws.send(out.buffer);
			} catch {
				/* */
			}
		}
	} catch {
		/* */
	}
}
