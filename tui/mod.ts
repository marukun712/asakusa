// https://opentui.com/docs/getting-started/
// https://opentui.com/docs/core-concepts/renderer
import {
	BoxRenderable,
	createCliRenderer,
	TextRenderable,
} from "@opentui/core";
import { setupBrowse } from "./browse.ts";
import { setupVerify } from "./verify.ts";

const renderer = await createCliRenderer({ exitOnCtrlC: true });

const hint = new TextRenderable(renderer, {
	content: "Ctrl+B: Browse | Ctrl+V: Verify | Ctrl+C: Quit",
});
renderer.root.add(hint);

const browsePanel = new BoxRenderable(renderer, {
	id: "browse-panel",
	flexGrow: 1,
	flexDirection: "column",
});
const verifyPanel = new BoxRenderable(renderer, {
	id: "verify-panel",
	flexGrow: 1,
	flexDirection: "column",
});
verifyPanel.visible = false;

renderer.root.add(browsePanel);
renderer.root.add(verifyPanel);

setupBrowse(renderer, browsePanel);
setupVerify(renderer, verifyPanel);

renderer.keyInput.on("keypress", (key) => {
	if (key.ctrl && key.name === "b") {
		browsePanel.visible = true;
		verifyPanel.visible = false;
	} else if (key.ctrl && key.name === "v") {
		browsePanel.visible = false;
		verifyPanel.visible = true;
	}
});
