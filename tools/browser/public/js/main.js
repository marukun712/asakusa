const tabBrowse = document.getElementById("tab-browse");
const tabVerify = document.getElementById("tab-verify");
const sectionBrowse = document.getElementById("section-browse");
const sectionVerify = document.getElementById("section-verify");

tabBrowse.addEventListener("click", (e) => {
	e.preventDefault();
	tabBrowse.classList.add("active");
	tabVerify.classList.remove("active");
	sectionBrowse.classList.add("active");
	sectionVerify.classList.remove("active");
});

tabVerify.addEventListener("click", (e) => {
	e.preventDefault();
	tabVerify.classList.add("active");
	tabBrowse.classList.remove("active");
	sectionVerify.classList.add("active");
	sectionBrowse.classList.remove("active");
});

const browseStatus = document.getElementById("browse-status");
const browseContent = document.getElementById("browse-content");
const browseUrlInput = document.getElementById("browse-url");
const btnBack = document.getElementById("btn-back");
const btnForward = document.getElementById("btn-forward");

const navHistory = [];
let navIndex = -1;

function updateNavButtons() {
	btnBack.disabled = navIndex <= 0;
	btnForward.disabled = navIndex >= navHistory.length - 1;
}

async function fetchAndRender(url, push = true) {
	if (push) {
		navHistory.splice(navIndex + 1);
		navHistory.push(url);
		navIndex = navHistory.length - 1;
	}
	updateNavButtons();
	browseUrlInput.value = url;
	browseStatus.textContent = "Loading...";
	browseStatus.style.display = "";
	browseContent.style.display = "none";

	const res = await fetch(`/api/browse?${new URLSearchParams({ url })}`);
	const data = await res.json();

	if (!data.ok) {
		browseStatus.textContent = `Error: ${data.error}`;
		return;
	}

	browseStatus.textContent = `[${data.status} ${data.meta}]  Key: ${data.fingerprint.slice(
		0,
		16,
	)}...`;

	const isGemini =
		data.status === 20 &&
		(data.meta === "" ||
			data.meta.toLowerCase().includes("gemini") ||
			data.meta.toLowerCase().includes("gmi"));

	if (isGemini) {
		browseContent.replaceChildren(parseGmi(data.body));
	} else {
		const preEl = document.createElement("pre");
		preEl.textContent = data.body;
		browseContent.replaceChildren(preEl);
	}
	browseContent.style.display = "";
}

// https://geminiprotocol.net/docs/gemtext-specification.gmi
function parseGmi(text) {
	const div = document.createElement("div");
	const lines = text.split("\n");
	let preformatted = false;
	let pre = null;

	for (const line of lines) {
		if (line.startsWith("```")) {
			if (!preformatted) {
				pre = document.createElement("pre");
				div.appendChild(pre);
				preformatted = true;
			} else {
				preformatted = false;
				pre = null;
			}
			continue;
		}

		if (preformatted) {
			pre.textContent += `${line}\n`;
			continue;
		}

		if (line.startsWith("###")) {
			const h = document.createElement("h3");
			h.textContent = line.slice(3).trim();
			div.appendChild(h);
		} else if (line.startsWith("##")) {
			const h = document.createElement("h2");
			h.textContent = line.slice(2).trim();
			div.appendChild(h);
		} else if (line.startsWith("#")) {
			const h = document.createElement("h1");
			h.textContent = line.slice(1).trim();
			div.appendChild(h);
		} else if (line.startsWith("* ")) {
			const prevUl = div.lastChild?.tagName === "UL" ? div.lastChild : null;
			const list = prevUl ?? document.createElement("ul");
			if (!prevUl) div.appendChild(list);
			const li = document.createElement("li");
			li.textContent = line.slice(2);
			list.appendChild(li);
		} else if (line.startsWith(">")) {
			const bq = document.createElement("blockquote");
			bq.textContent = line.slice(1).trim();
			div.appendChild(bq);
		} else {
			const p = document.createElement("p");
			p.textContent = line;
			div.appendChild(p);
		}
	}

	return div;
}

btnBack.addEventListener("click", () => {
	if (navIndex <= 0) return;
	navIndex--;
	fetchAndRender(navHistory[navIndex], false);
});

btnForward.addEventListener("click", () => {
	if (navIndex >= navHistory.length - 1) return;
	navIndex++;
	fetchAndRender(navHistory[navIndex], false);
});

browseContent.addEventListener("click", (e) => {
	const a = e.target.closest("a");
	if (!a) return;
	const href = a.getAttribute("href");
	if (!href) return;
	e.preventDefault();
	if (href.startsWith("polka://")) {
		fetchAndRender(href);
	}
});

document.getElementById("browse-form").addEventListener("submit", (e) => {
	e.preventDefault();
	const url = browseUrlInput.value.trim();
	if (!url) return;
	tabBrowse.classList.add("active");
	tabVerify.classList.remove("active");
	sectionBrowse.classList.add("active");
	sectionVerify.classList.remove("active");
	fetchAndRender(url);
});

const verifyAvatar = document.getElementById("verify-avatar");
const verifyResult = document.getElementById("verify-result");

document.getElementById("verify-form").addEventListener("submit", async (e) => {
	e.preventDefault();
	const host = document.getElementById("verify-host").value.trim();
	const port = document.getElementById("verify-port").value.trim();
	if (!host) return;

	verifyAvatar.hidden = true;
	verifyResult.textContent = "Verifying...";
	verifyResult.style.display = "";

	const params = new URLSearchParams({ host });
	if (port) params.set("port", port);

	const res = await fetch(`/api/verify?${params}`);
	const data = await res.json();

	if (!data.ok) {
		verifyResult.textContent = `Error: ${data.error}`;
		return;
	}

	const sigStatus = data.sigValid ? "Signature VALID" : "Signature INVALID";
	const contentStatus = data.contentValid ? "Content VALID" : "Content INVALID";
	verifyResult.textContent = [
		sigStatus,
		contentStatus,
		`Fingerprint: ${data.fingerprint}`,
		`Signed at: ${new Date(data.signedAt).toLocaleString()}`,
	].join("\n");

	const svgDoc = new DOMParser().parseFromString(
		data.avatarSvg,
		"image/svg+xml",
	);
	verifyAvatar.replaceChildren(document.adoptNode(svgDoc.documentElement));
	verifyAvatar.hidden = false;
});
