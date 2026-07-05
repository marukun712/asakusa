// https://deno.land/x/tui@2.1.11/mod.ts
// https://deno.land/x/tui@2.1.11/src/components/mod.ts
// https://deno.land/x/crayon@3.3.3/mod.ts

import { ed25519 } from "@noble/curves/ed25519.js";
import { bytesToHex, hexToBytes } from "@noble/curves/utils.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { DOCS_PORT } from "@polka/types/ports.ts";
import { computeFingerprint } from "@polka/utils/crypto/fingerprint.ts";
import { Signal, type Tui } from "@tui";
import { Input, Label } from "@tui/components";
import { crayon } from "crayon";
import { buildMerkleRoot } from "../merkle/tree.ts";
import { fetchPolka, fetchPolkaBytes } from "./polka.ts";

export function setupVerify(tui: Tui): { setVisible: (v: boolean) => void } {
	const { columns, rows } = Deno.consoleSize();

	const inputTheme = {
		base: crayon.bgBlack.white,
		focused: crayon.bgBlue.white,
		active: crayon.bgBlue.white,
		cursor: {
			base: crayon.bgWhite.black,
			focused: crayon.bgWhite.black,
		},
	};

	const hostInput = new Input({
		parent: tui,
		placeholder: "hostname",
		rectangle: { column: 0, row: 1, width: columns, height: 1 },
		theme: inputTheme,
		zIndex: 0,
	});

	const portInput = new Input({
		parent: tui,
		placeholder: `port (default: ${DOCS_PORT})`,
		rectangle: { column: 0, row: 2, width: columns, height: 1 },
		theme: inputTheme,
		zIndex: 0,
	});

	const resultSignal = new Signal(
		"Enter host and port, then press Enter in the port field.",
	);
	const resultLabel = new Label({
		parent: tui,
		text: resultSignal,
		rectangle: { column: 0, row: 3, width: columns, height: rows - 3 },
		theme: { base: crayon.bgBlack.white },
		align: { horizontal: "left", vertical: "top" },
		zIndex: 0,
	});

	portInput.on("keyPress", ({ key }) => {
		if (key !== "return") return;
		const host = hostInput.text.peek().trim();
		const port = parseInt(portInput.text.peek().trim(), 10) || DOCS_PORT;
		if (!host) {
			resultSignal.value = "Host is required.";
			return;
		}

		resultSignal.value = "Verifying...";

		const url = `polka://${host}:${port}/.well-known/polka`;
		fetchPolka(host, port, url)
			.then(async ({ body }) => {
				const parts = body.trim().split(".");
				if (parts.length !== 4) {
					throw new Error("invalid .well-known/polka format");
				}
				const [pkHex, hashHex, tsStr, sigHex] = parts;
				const contentPk = hexToBytes(pkHex);
				let valid = false;
				try {
					valid = ed25519.verify(
						hexToBytes(sigHex),
						hexToBytes(hashHex),
						contentPk,
					);
				} catch {
					/* */
				}
				const fingerprint = computeFingerprint(contentPk);
				const date = new Date(parseInt(tsStr, 10)).toLocaleString();
				const sigStatus = valid ? "Signature VALID" : "Signature INVALID";

				resultSignal.value = `${sigStatus}\nFingerprint: ${fingerprint}\nSigned at: ${date}\nVerifying content...`;

				const manifestUrl = `polka://${host}:${port}/.well-known/polka-manifest`;
				const manifest = await fetchPolkaBytes(host, port, manifestUrl);
				if (manifest.status !== 20) {
					throw new Error("manifest not found");
				}
				const paths = new TextDecoder()
					.decode(manifest.body)
					.trim()
					.split("\n")
					.filter(Boolean);

				const hashes: Uint8Array[] = [];
				for (const path of paths) {
					const file = await fetchPolkaBytes(
						host,
						port,
						`polka://${host}:${port}${path}`,
					);
					if (file.status !== 20) {
						throw new Error(`failed to fetch ${path}`);
					}
					hashes.push(sha256(file.body));
				}
				const computedRoot = buildMerkleRoot(hashes);
				const contentStatus =
					bytesToHex(computedRoot) === hashHex
						? "Content VALID"
						: "Content INVALID";

				resultSignal.value = `${sigStatus}\n${contentStatus}\nFingerprint: ${fingerprint}\nSigned at: ${date}`;
			})
			.catch((err) => {
				resultSignal.value = `Error: ${String(err)}`;
			});
	});

	const components = [hostInput, portInput, resultLabel];
	return {
		setVisible: (v: boolean) => {
			for (const c of components) c.visible.value = v;
		},
	};
}
