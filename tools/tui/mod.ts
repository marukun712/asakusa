// https://deno.land/x/tui@2.1.11/mod.ts
// https://deno.land/x/crayon@3.3.3/mod.ts
import {
	handleInput,
	handleKeyboardControls,
	handleMouseControls,
	Tui,
} from "@tui";
import { Label } from "@tui/components";
import { crayon } from "crayon";
import { setupBrowse } from "./browse.ts";
import { setupVerify } from "./verify.ts";

const { columns } = Deno.consoleSize();

const tui = new Tui({
	style: crayon.bgBlack,
	refreshRate: 1000 / 60,
});

handleInput(tui);
handleMouseControls(tui);
handleKeyboardControls(tui);
tui.dispatch();

new Label({
	parent: tui,
	text: "Ctrl+B: Browse | Ctrl+V: Verify | Ctrl+C: Quit",
	rectangle: { column: 0, row: 0, width: columns, height: 1 },
	theme: { base: crayon.bgBlack.white },
	align: { horizontal: "left", vertical: "top" },
	zIndex: 0,
});

const browse = setupBrowse(tui);
const verify = setupVerify(tui);
verify.setVisible(false);

tui.on("keyPress", ({ key, ctrl }) => {
	if (ctrl && key === "b") {
		browse.setVisible(true);
		verify.setVisible(false);
	} else if (ctrl && key === "v") {
		browse.setVisible(false);
		verify.setVisible(true);
	}
});

tui.run();
