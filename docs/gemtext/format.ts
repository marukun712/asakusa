const encoder = new TextEncoder();

function header(status: number, meta: string): Uint8Array {
	return encoder.encode(`${status} ${meta}\r\n`);
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
	const result = new Uint8Array(a.length + b.length);
	result.set(a, 0);
	result.set(b, a.length);
	return result;
}

export function success(
	body: Uint8Array,
	mimeType = "text/gemini",
): Uint8Array {
	return concat(header(20, mimeType), body);
}

export function notFound(): Uint8Array {
	return header(51, "Not Found");
}

export function badRequest(description = "Bad Request"): Uint8Array {
	return header(59, description);
}

export function serverError(): Uint8Array {
	return header(50, "Internal Server Error");
}
