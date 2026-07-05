// https://deno.land/x/tui@2.1.11/mod.ts
// https://deno.land/x/tui@2.1.11/src/components/mod.ts
// https://deno.land/x/crayon@3.3.3/mod.ts

import { DOCS_PORT } from "@polka/types/ports.ts";
import { computeFingerprint } from "@polka/utils/crypto/fingerprint.ts";
import { Signal, type Tui } from "@tui";
import { Input, Label } from "@tui/components";
import { crayon } from "crayon";
import { renderGemtext } from "./gemtext.ts";
import { fetchPolka } from "./polka.ts";

export function setupBrowse(tui: Tui): { setVisible: (v: boolean) => void } {
	const { columns, rows } = Deno.consoleSize();

	const urlInput = new Input({
		parent: tui,
		placeholder: `polka://hostname:${DOCS_PORT}/path`,
		rectangle: { column: 0, row: 1, width: columns, height: 1 },
		theme: {
			base: crayon.bgBlack.white,
			focused: crayon.bgBlue.white,
			active: crayon.bgBlue.white,
			cursor: {
				base: crayon.bgWhite.black,
				focused: crayon.bgWhite.black,
			},
		},
		zIndex: 0,
	});

	const statusSignal = new Signal("");
	const statusLabel = new Label({
		parent: tui,
		text: statusSignal,
		rectangle: { column: 0, row: 2, width: columns, height: 1 },
		theme: { base: crayon.bgBlack.white },
		align: { horizontal: "left", vertical: "top" },
		zIndex: 0,
	});

	const contentSignal = new Signal("Enter a URL above and press Enter.");
	const contentLabel = new Label({
		parent: tui,
		text: contentSignal,
		rectangle: { column: 0, row: 3, width: columns, height: rows - 3 },
		theme: { base: crayon.bgBlack.white },
		align: { horizontal: "left", vertical: "top" },
		zIndex: 0,
	});

	urlInput.on("keyPress", ({ key }) => {
		if (key !== "return") return;
		const url = urlInput.text.peek();
		if (!url) return;

		let host: string;
		let port: number;
		try {
			const parsed = new URL(url.replace(/^polka:/, "http:"));
			host = parsed.hostname;
			port = parseInt(parsed.port, 10) || DOCS_PORT;
		} catch {
			statusSignal.value = "Invalid URL.";
			return;
		}

		statusSignal.value = "Loading...";
		contentSignal.value = "";

		fetchPolka(host, port, url)
			.then(({ transportKey, status, meta, body }) => {
				const fingerprint = computeFingerprint(transportKey);
				statusSignal.value = `Key: ${fingerprint.slice}...  [${status} ${meta}]`;

				if (status === 20 && meta.startsWith("text/gemini")) {
					contentSignal.value = renderGemtext(body);
				} else if (status === 20) {
					contentSignal.value = body;
				} else {
					contentSignal.value = `Error ${status}: ${meta}`;
				}
			})
			.catch((err) => {
				statusSignal.value = `Connection error: ${String(err)}`;
				contentSignal.value = "";
			});
	});

	const components = [urlInput, statusLabel, contentLabel];
	return {
		setVisible: (v: boolean) => {
			for (const c of components) c.visible.value = v;
		},
	};
}
