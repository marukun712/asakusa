import { SPACE_PORT } from "./ports.js";

function buildIdentityEl(avatar_svg, handle, fingerprint) {
	const wrapper = document.createElement("div");
	wrapper.style.cssText = "display:flex;gap:1rem;align-items:center";

	const svgDoc = new DOMParser().parseFromString(avatar_svg, "image/svg+xml");
	wrapper.appendChild(document.adoptNode(svgDoc.documentElement));

	const info = document.createElement("div");
	const strong = document.createElement("strong");
	strong.textContent = handle;
	const br = document.createElement("br");
	const code = document.createElement("code");
	code.style.cssText = "font-size:0.75rem;word-break:break-all";
	code.textContent = fingerprint;
	info.appendChild(strong);
	info.appendChild(br);
	info.appendChild(code);
	wrapper.appendChild(info);

	return wrapper;
}

export function initSpace(ws) {
	const form = document.getElementById("space-form");
	const hostInput = document.getElementById("space-host");
	const portInput = document.getElementById("space-port");
	const handleInput = document.getElementById("space-handle");
	const joinBtn = document.getElementById("space-join");
	const leaveBtn = document.getElementById("space-leave");
	const myIdentityEl = document.getElementById("my-identity");
	const participantsEl = document.getElementById("participants");

	const audioModeEl = document.getElementById("audio-mode");
	let audioCtx = null;
	let mediaStream = null;
	let processor = null;
	let joined = false;
	const speakingTimers = new Map();

	ws.addEventListener("message", (e) => {
		if (e.data instanceof ArrayBuffer) {
			if (!joined) return;
			const prefix = new Uint8Array(e.data, 0, 4);
			const fpPrefix = Array.from(prefix)
				.map((b) => b.toString(16).padStart(2, "0"))
				.join("");
			const card = document.getElementById(`participant-${fpPrefix}`);
			if (card) {
				card.dataset.speaking = "true";
				clearTimeout(speakingTimers.get(fpPrefix));
				speakingTimers.set(
					fpPrefix,
					setTimeout(() => {
						delete card.dataset.speaking;
						speakingTimers.delete(fpPrefix);
					}, 300),
				);
			}
			playPcm(e.data.slice(4));
			return;
		}
		const msg = JSON.parse(e.data);

		if (msg.type === "joined") {
			myIdentityEl.replaceChildren(
				buildIdentityEl(msg.avatar_svg, msg.handle, msg.fingerprint),
			);
			myIdentityEl.hidden = false;
			joined = true;
			setControls(true);
			startAudio(audioModeEl.value).catch((err) => {
				const p = document.createElement("p");
				p.textContent = `Audio error: ${err.message}`;
				participantsEl.replaceChildren(p);
			});
		}

		if (msg.type === "participant") {
			const id = `participant-${msg.fingerprint.slice(0, 8)}`;
			if (!document.getElementById(id)) {
				const card = document.createElement("article");
				card.id = id;
				card.appendChild(
					buildIdentityEl(msg.avatar_svg, msg.handle, msg.fingerprint),
				);
				participantsEl.appendChild(card);
			}
		}
	});

	async function startAudio(mode) {
		if (mode === "desktop") {
			mediaStream = await navigator.mediaDevices.getDisplayMedia({
				audio: true,
				video: false,
			});
		} else {
			mediaStream = await navigator.mediaDevices.getUserMedia({
				audio: true,
				video: false,
			});
		}
		audioCtx = new AudioContext({ sampleRate: 48000 });
		const source = audioCtx.createMediaStreamSource(mediaStream);
		processor = audioCtx.createScriptProcessor(480, 1, 1);
		const silent = audioCtx.createGain();
		silent.gain.value = 0;
		processor.connect(silent);
		silent.connect(audioCtx.destination);
		source.connect(processor);
		processor.onaudioprocess = (e) => {
			if (ws.readyState !== WebSocket.OPEN) return;
			ws.send(e.inputBuffer.getChannelData(0).buffer.slice(0));
		};
	}

	function stopAudio() {
		if (processor) {
			processor.disconnect();
			processor = null;
		}
		if (audioCtx) {
			audioCtx.close();
			audioCtx = null;
		}
		if (mediaStream) {
			for (const t of mediaStream.getTracks()) t.stop();
			mediaStream = null;
		}
	}

	function playPcm(buffer) {
		if (!audioCtx) return;
		const float32 = new Float32Array(buffer);
		const buf = audioCtx.createBuffer(1, float32.length, 48000);
		buf.copyToChannel(float32, 0);
		const src = audioCtx.createBufferSource();
		src.buffer = buf;
		src.connect(audioCtx.destination);
		src.start();
	}

	function setControls(active) {
		joinBtn.disabled = active;
		leaveBtn.disabled = !active;
		hostInput.disabled = active;
		portInput.disabled = active;
		handleInput.disabled = active;
		audioModeEl.disabled = active;
	}

	form.addEventListener("submit", (e) => {
		e.preventDefault();
		const host = hostInput.value.trim();
		const port = parseInt(portInput.value, 10) || SPACE_PORT;
		const handle = handleInput.value.trim();
		if (!host || !handle) return;
		ws.send(JSON.stringify({ type: "join", host, port, handle }));
	});

	leaveBtn.addEventListener("click", () => {
		joined = false;
		stopAudio();
		setControls(false);
		myIdentityEl.hidden = true;
		participantsEl.replaceChildren();
	});
}
