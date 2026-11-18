// Serves the MediaPipe runtime (used to remove photo backgrounds in the browser) from our own site.
import { copyFileSync, mkdirSync } from 'node:fs';
const from = 'node_modules/@mediapipe/tasks-vision/wasm/', to = 'public/mediapipe/';
mkdirSync(to, { recursive: true });
for (const f of ['vision_wasm_internal.js', 'vision_wasm_internal.wasm']) copyFileSync(from + f, to + f);
