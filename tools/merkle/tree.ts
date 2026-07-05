// https://github.com/paulmillr/noble-hashes
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";

export function buildMerkleRoot(leaves: Uint8Array[]): Uint8Array {
	if (leaves.length === 0) return new Uint8Array(32);

	let tree: string[] = leaves.map((leaf) => bytesToHex(leaf));

	function concat(data: string[]): string[] {
		const next: string[] = [];
		for (let i = 0; i < data.length; i += 2) {
			const left = data[i];
			const right = data[i + 1] ?? data[i];
			next.push(bytesToHex(sha256(new TextEncoder().encode(left + right))));
		}
		return next;
	}

	while (tree.length !== 1) {
		tree = concat(tree);
	}

	return hexToBytes(tree[0]);
}

export async function collectFileHashes(dir: string): Promise<Uint8Array[]> {
	const files: string[] = [];
	await collectFiles(dir, files);
	files.sort();

	const hashes: Uint8Array[] = [];
	for (const file of files) {
		const content = await Deno.readFile(file);
		hashes.push(sha256(content));
	}
	return hashes;
}

export async function collectFilePaths(dir: string): Promise<string[]> {
	const files: string[] = [];
	await collectFiles(dir, files);
	files.sort();
	return files.map((f) => {
		const rel = f.slice(dir.length);
		return rel
			.split("/")
			.map((seg) => (seg ? encodeURIComponent(seg) : seg))
			.join("/");
	});
}

async function collectFiles(dir: string, result: string[]): Promise<void> {
	for await (const entry of Deno.readDir(dir)) {
		if (entry.isDirectory && entry.name === ".well-known") continue;
		const path = `${dir}/${entry.name}`;
		if (entry.isFile && !entry.name.endsWith(".md")) {
			result.push(path);
		} else if (entry.isDirectory) {
			await collectFiles(path, result);
		}
	}
}
