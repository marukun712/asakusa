// https://deno.land/x/tui@2.1.11/mod.ts
// https://deno.land/x/tui@2.1.11/src/components/mod.ts
// https://deno.land/x/crayon@3.3.3/mod.ts

import { ed25519 } from "@noble/curves/ed25519.js";
import { hexToBytes } from "@noble/curves/utils.js";
import { DOCS_PORT } from "@polka/types/ports.ts";
import { computeFingerprint } from "@polka/utils/crypto/fingerprint.ts";
import { Signal, type Tui } from "@tui";
import { Input, Label } from "@tui/components";
import { crayon } from "crayon";
import { fetchPolka } from "./polka.ts";

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
			.then(({ body }) => {
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
				const status = valid ? "Signature VALID" : "Signature INVALID";
				resultSignal.value = `${status}\nFingerprint: ${fingerprint}\nSigned at: ${date}`;
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
