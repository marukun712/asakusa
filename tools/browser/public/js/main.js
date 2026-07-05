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

document.getElementById("browse-form").addEventListener("submit", async (e) => {
	e.preventDefault();
	const url = document.getElementById("browse-url").value.trim();
	if (!url) return;

	browseStatus.textContent = "Loading...";
	browseStatus.style.display = "";
	browseContent.style.display = "none";

	const res = await fetch(`/api/browse?${new URLSearchParams({ url })}`);
	const data = await res.json();

	if (!data.ok) {
		browseStatus.textContent = `Error: ${data.error}`;
		return;
	}

	browseStatus.textContent = `Key: ${data.fingerprint.slice(0, 16)}...  [${data.status} ${data.meta}]`;
	browseContent.textContent = data.body;
	browseContent.style.display = "";
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

	verifyAvatar.innerHTML = data.avatarSvg;
	verifyAvatar.hidden = false;
});
