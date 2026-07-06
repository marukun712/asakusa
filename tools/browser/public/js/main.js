// https://github.com/wooorm/dioscuri
import { buffer } from "https://esm.sh/dioscuri";

const tabBrowse = document.getElementById("tab-browse");
const tabVerify = document.getElementById("tab-verify");
const sectionBrowse = document.getElementById("section-browse");
const sectionVerify = document.getElementById("section-verify");

tabBrowse.addEventListener("click", (e) => {
	e.preventDefault();
	tabBrowse.setAttribute("aria-current", "page");
	tabVerify.removeAttribute("aria-current");
	sectionBrowse.hidden = false;
	sectionVerify.hidden = true;
});

tabVerify.addEventListener("click", (e) => {
	e.preventDefault();
	tabVerify.setAttribute("aria-current", "page");
	tabBrowse.removeAttribute("aria-current");
	sectionVerify.hidden = false;
	sectionBrowse.hidden = true;
});

const browseStatus = document.getElementById("browse-status");
const browseContent = document.getElementById("browse-content");
const browseUrlInput = document.getElementById("browse-url");

async function fetchAndRender(url) {
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

function parseGmi(text) {
	const html = buffer(text);
	const div = document.createElement("div");
	div.innerHTML = html;
	return div;
}

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
