import { handleWs } from "./ws.ts";

const PUBLIC_DIR = new URL("../public/", import.meta.url).pathname;

const MIME_TYPES: Record<string, string> = {
	html: "text/html; charset=utf-8",
	js: "text/javascript; charset=utf-8",
	css: "text/css",
	svg: "image/svg+xml",
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

export function startServer(port: number): void {
	Deno.serve({ port, hostname: "localhost" }, (req) => {
		const { pathname } = new URL(req.url);
		if (pathname === "/ws" && req.headers.get("upgrade") === "websocket") {
			const { socket, response } = Deno.upgradeWebSocket(req);
			handleWs(socket);
			return response;
		}
		return serveStatic(pathname);
	});
	console.log(`Polka client running at http://localhost:${port}`);
}
