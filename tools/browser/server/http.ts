import { ed25519 } from "@noble/curves/ed25519.js";
import { bytesToHex, hexToBytes } from "@noble/curves/utils.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { DOCS_PORT } from "@polka/types/ports.ts";
import {
	computeFingerprint,
	generateAvatar,
} from "@polka/utils/crypto/fingerprint.ts";
import { buildMerkleRoot } from "../../merkle/tree.ts";
import { fetchPolka } from "./polka.ts";

const PUBLIC_DIR = new URL("../public/", import.meta.url).pathname;

const MIME_TYPES: Record<string, string> = {
	html: "text/html; charset=utf-8",
	js: "text/javascript; charset=utf-8",
	css: "text/css",
};

async function serveStatic(pathname: string): Promise<Response> {
	const safePath = pathname === "/" ? "/index.html" : pathname;
	try {
		const file = await Deno.readFile(PUBLIC_DIR + safePath.slice(1));
		const ext = safePath.split(".").pop() ?? "";
		return new Response(file, {
			headers: {
				"Content-Type": MIME_TYPES[ext] ?? "application/octet-stream",
			},
		});
	} catch {
		return new Response("Not Found", { status: 404 });
	}
}

function json(data: unknown): Response {
	return new Response(JSON.stringify(data), {
		headers: { "Content-Type": "application/json" },
	});
}

async function handleBrowse(params: URLSearchParams): Promise<Response> {
	const url = params.get("url");
	if (!url) return json({ ok: false, error: "url is required" });

	let host: string;
	let port: number;
	try {
		const parsed = new URL(url.replace(/^polka:/, "http:"));
		host = parsed.hostname;
		port = parseInt(parsed.port, 10) || DOCS_PORT;
	} catch {
		return json({ ok: false, error: "Invalid URL." });
	}

	try {
		const { transportKey, status, meta, body } = await fetchPolka(
			host,
			port,
			url,
		);
		const fingerprint = computeFingerprint(transportKey);
		return json({ ok: true, fingerprint, status, meta, body });
	} catch (err) {
		return json({ ok: false, error: String(err) });
	}
}

async function handleVerify(params: URLSearchParams): Promise<Response> {
	const host = params.get("host")?.trim();
	const port = parseInt(params.get("port") ?? "", 10) || DOCS_PORT;
	if (!host) return json({ ok: false, error: "host is required" });

	try {
		const url = `polka://${host}:${port}/.well-known/polka/token`;
		const { body } = await fetchPolka(host, port, url);

		const parts = body.trim().split(".");
		if (parts.length !== 4)
			throw new Error("invalid .well-known/polka/token format");
		const [pkHex, hashHex, tsStr, sigHex] = parts;
		const contentPk = hexToBytes(pkHex);

		let sigValid = false;
		try {
			sigValid = ed25519.verify(
				hexToBytes(sigHex),
				hexToBytes(hashHex),
				contentPk,
			);
		} catch {
			/* */
		}

		const fingerprint = computeFingerprint(contentPk);
		const signedAt = new Date(parseInt(tsStr, 10)).toISOString();

		const manifestUrl = `polka://${host}:${port}/.well-known/polka/manifest`;
		const manifest = await fetchPolka(host, port, manifestUrl);
		if (manifest.status !== 20) throw new Error("manifest not found");

		const paths = manifest.body.trim().split("\n").filter(Boolean);

		const hashes: Uint8Array[] = [];
		for (const path of paths) {
			const file = await fetchPolka(
				host,
				port,
				`polka://${host}:${port}${path}`,
			);
			if (file.status !== 20) throw new Error(`failed to fetch ${path}`);
			hashes.push(sha256(new TextEncoder().encode(file.body)));
		}
		const computedRoot = buildMerkleRoot(hashes);
		const contentValid = bytesToHex(computedRoot) === hashHex;
		const avatarSvg = generateAvatar(fingerprint);

		return json({
			ok: true,
			sigValid,
			contentValid,
			fingerprint,
			signedAt,
			avatarSvg,
		});
	} catch (err) {
		return json({ ok: false, error: String(err) });
	}
}

export function startServer(): void {
	Deno.serve((req) => {
		const { pathname, searchParams } = new URL(req.url);
		if (pathname === "/api/browse") return handleBrowse(searchParams);
		if (pathname === "/api/verify") return handleVerify(searchParams);
		return serveStatic(pathname);
	});
}
