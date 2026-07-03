// https://github.com/paulmillr/noble-hashes
import { sha256 } from "npm:@noble/hashes/sha256";

export function buildMerkleRoot(leaves: Uint8Array[]): Uint8Array {
	if (leaves.length === 0) return new Uint8Array(32);

	let level = leaves.map((leaf) => sha256(leaf));

	while (level.length > 1) {
		const next: Uint8Array[] = [];
		for (let i = 0; i < level.length; i += 2) {
			const left = level[i];
			const right = level[i + 1] ?? level[i];
			const combined = new Uint8Array(64);
			combined.set(left, 0);
			combined.set(right, 32);
			next.push(sha256(combined));
		}
		level = next;
	}

	return level[0];
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

async function collectFiles(dir: string, result: string[]): Promise<void> {
	for await (const entry of Deno.readDir(dir)) {
		const path = `${dir}/${entry.name}`;
		if (entry.isFile) {
			result.push(path);
		} else if (entry.isDirectory) {
			await collectFiles(path, result);
		}
	}
}
