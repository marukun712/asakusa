import { SPACE_PORT } from "./ports.js";

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

	ws.addEventListener("message", (e) => {
		if (e.data instanceof ArrayBuffer) {
			if (!joined) return;
			playPcm(e.data.slice(4));
			return;
		}
		const msg = JSON.parse(e.data);

		if (msg.type === "joined") {
			myIdentityEl.innerHTML = `
        <div style="display:flex;gap:1rem;align-items:center">
          ${msg.avatar_svg}
          <div>
            <strong>${msg.handle}</strong>
            <br><code style="font-size:0.75rem;word-break:break-all">${msg.fingerprint}</code>
          </div>
        </div>`;
			myIdentityEl.hidden = false;
			joined = true;
			setControls(true);
			startAudio(audioModeEl.value).catch((err) => {
				participantsEl.innerHTML = `<p>Audio error: ${err.message}</p>`;
			});
		}

		if (msg.type === "participant") {
			const id = `participant-${msg.fingerprint.slice(0, 8)}`;
			if (!document.getElementById(id)) {
				const card = document.createElement("article");
				card.id = id;
				card.innerHTML = `
          <div style="display:flex;gap:1rem;align-items:center">
            ${msg.avatar_svg}
            <div>
              <strong>${msg.handle}</strong>
              <br><code style="font-size:0.75rem;word-break:break-all">${msg.fingerprint}</code>
            </div>
          </div>`;
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
		participantsEl.innerHTML = "";
	});
}
