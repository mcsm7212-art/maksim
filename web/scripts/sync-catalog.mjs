// Copies the shared service catalog (../data/services.json) into the app.
import { copyFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, "../../data/services.json");
const dst = resolve(here, "../lib/services.json");
if (!existsSync(src)) { console.error("Catalog not found:", src); process.exit(1); }
copyFileSync(src, dst);
console.log("Catalog synced");
