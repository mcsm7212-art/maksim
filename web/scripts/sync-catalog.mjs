// Copies the shared service catalog (../data/services.json and its Spanish names) into the app.
import { copyFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
for (const name of ["services.json", "services-es.json"]) {
  const src = resolve(here, "../../data", name);
  if (!existsSync(src)) { console.error("Catalog not found:", src); process.exit(1); }
  copyFileSync(src, resolve(here, "../lib", name));
}
console.log("Catalog synced");
