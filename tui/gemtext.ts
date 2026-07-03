// https://geminiprotocol.net/docs/gemtext-specification.gmi
export function renderGemtext(text: string): string {
	const lines = text.split("\n");
	const out: string[] = [];
	let inPre = false;

	for (const line of lines) {
		if (line.startsWith("```")) {
			inPre = !inPre;
			continue;
		}
		if (inPre) {
			out.push(line);
			continue;
		}
		if (line.startsWith("=> ")) {
			const rest = line.slice(3).trimStart();
			const spIdx = rest.search(/\s/);
			if (spIdx >= 0) {
				const url = rest.slice(0, spIdx);
				const label = rest.slice(spIdx).trim();
				out.push(`-> ${label}  (${url})`);
			} else {
				out.push(`-> ${rest}`);
			}
		} else if (line.startsWith("### ")) {
			out.push(`-- ${line.slice(4)} --`);
		} else if (line.startsWith("## ")) {
			out.push(`--- ${line.slice(3)} ---`);
		} else if (line.startsWith("# ")) {
			out.push(`=== ${line.slice(2)} ===`);
		} else if (line.startsWith("* ")) {
			out.push(`- ${line.slice(2)}`);
		} else {
			out.push(line);
		}
	}

	return out.join("\n");
}
