import { initSpace } from "./space.js";

const ws = new WebSocket(`ws://${location.host}/ws`);

initSpace(ws);
