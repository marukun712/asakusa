import { z } from "zod";
import {
	badRequest,
	notFound,
	serverError,
	success,
} from "../gemtext/format.ts";
import type { Channel } from "../noise/handshake.ts";

const RequestSchema = z
	.string()
	.transform((s) => s.replace(/\r\n$/, ""))
	.pipe(z.url().max(1024));

export async function handleRequest(
	docsRoot: string,
	channel: Channel,
): Promise<void> {
	const requestData = await channel.recv();
	const raw = new TextDecoder().decode(requestData);

	const parsed = RequestSchema.safeParse(raw);
	if (!parsed.success) {
		await channel.send(badRequest());
		return;
	}

	const pathname = new URL(parsed.data).pathname;
	const response = await resolveFile(docsRoot, pathname);
	await channel.send(response);
}

async function resolveFile(
	docsRoot: string,
	pathname: string,
): Promise<Uint8Array> {
	const normalized = pathname.startsWith("/") ? pathname.slice(1) : pathname;
	const resolved = `${docsRoot}/${normalized}`;

	let realRoot: string;
	let realResolved: string;

	try {
		realRoot = await Deno.realPath(docsRoot);
	} catch (e) {
		console.error("failed to resolve docs root:", e);
		return serverError();
	}

	try {
		realResolved = await Deno.realPath(resolved);
	} catch (e) {
		console.error("failed to resolve path:", e);
		return notFound();
	}

	if (!realResolved.startsWith(`${realRoot}/`) && realResolved !== realRoot) {
		return badRequest("Path outside root");
	}

	try {
		const stat = await Deno.stat(realResolved);
		const target = stat.isDirectory
			? `${realResolved}/index.gmi`
			: realResolved;
		const body = await Deno.readFile(target);
		return success(body);
	} catch (e) {
		console.error("failed to read file:", e);
		return notFound();
	}
}
