// https://opentui.com/docs/components/input
import {
	type BoxRenderable,
	type CliRenderer,
	InputRenderable,
	InputRenderableEvents,
	ScrollBoxRenderable,
	TextRenderable,
} from "@opentui/core";
import { DOCS_PORT } from "@polka/types/ports.ts";
import { computeFingerprint } from "@polka/utils/crypto/fingerprint.ts";
import { renderGemtext } from "./gemtext.ts";
import { fetchPolka } from "./polka.ts";

export function setupBrowse(renderer: CliRenderer, panel: BoxRenderable): void {
	const urlInput = new InputRenderable(renderer, {
		id: "browse-url",
		placeholder: `polka://hostname:${DOCS_PORT}/path`,
		width: "100%",
	});

	const statusText = new TextRenderable(renderer, {
		id: "browse-status",
		content: "",
	});

	const contentScroll = new ScrollBoxRenderable(renderer, {
		id: "browse-scroll",
		flexGrow: 1,
		scrollY: true,
	});

	const contentText = new TextRenderable(renderer, {
		id: "browse-content",
		content: "Enter a URL above and press Enter.",
	});

	contentScroll.add(contentText);
	panel.add(urlInput);
	panel.add(statusText);
	panel.add(contentScroll);

	urlInput.focus();

	urlInput.on(InputRenderableEvents.ENTER, async (value: string) => {
		const url = value.trim();
		if (!url) return;

		let host: string;
		let port: number;
		try {
			const parsed = new URL(url.replace(/^polka:/, "http:"));
			host = parsed.hostname;
			port = parseInt(parsed.port, 10) || DOCS_PORT;
		} catch {
			statusText.content = "Invalid URL.";
			return;
		}

		statusText.content = "Loading...";
		contentText.content = "";

		try {
			const { transportKey, status, meta, body } = await fetchPolka(
				host,
				port,
				url,
			);
			const fingerprint = computeFingerprint(transportKey);
			statusText.content = `Key: ${fingerprint.slice}...  [${status} ${meta}]`;

			if (status === 20 && meta.startsWith("text/gemini")) {
				contentText.content = renderGemtext(body);
			} else if (status === 20) {
				contentText.content = body;
			} else {
				contentText.content = `Error ${status}: ${meta}`;
			}
		} catch (err) {
			statusText.content = `Connection error: ${String(err)}`;
			contentText.content = "";
		}
	});
}
