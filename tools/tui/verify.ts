// https://opentui.com/docs/components/input

import { ed25519 } from "@noble/curves/ed25519.js";
import { hexToBytes } from "@noble/curves/utils.js";
import {
	type BoxRenderable,
	type CliRenderer,
	InputRenderable,
	InputRenderableEvents,
	TextRenderable,
} from "@opentui/core";
import { DOCS_PORT } from "@polka/types/ports.ts";
import { computeFingerprint } from "@polka/utils/crypto/fingerprint.ts";
import { fetchPolka } from "./polka.ts";

export function setupVerify(renderer: CliRenderer, panel: BoxRenderable): void {
	const hostInput = new InputRenderable(renderer, {
		id: "verify-host",
		placeholder: "hostname",
		width: "100%",
	});

	const portInput = new InputRenderable(renderer, {
		id: "verify-port",
		placeholder: `port (default: ${DOCS_PORT})`,
		width: "100%",
	});

	const resultText = new TextRenderable(renderer, {
		id: "verify-result",
		content: "Enter host and port, then press Enter in the port field.",
		flexGrow: 1,
	});

	panel.add(hostInput);
	panel.add(portInput);
	panel.add(resultText);

	portInput.on(InputRenderableEvents.ENTER, async () => {
		const host = hostInput.value.trim();
		const port = parseInt(portInput.value.trim(), 10) || DOCS_PORT;
		if (!host) {
			resultText.content = "Host is required.";
			return;
		}

		resultText.content = "Verifying...";

		try {
			const url = `polka://${host}:${port}/.well-known/polka`;
			const { body } = await fetchPolka(host, port, url);
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
			resultText.content = `${status}\nFingerprint: ${fingerprint}\nSigned at: ${date}`;
		} catch (err) {
			resultText.content = `Error: ${String(err)}`;
		}
	});
}
