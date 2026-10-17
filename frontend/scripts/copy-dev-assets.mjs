import { cpSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const src = fileURLToPath(new URL("../../docs/design/screens", import.meta.url));
const dest = fileURLToPath(new URL("../public/dev/screens", import.meta.url));

if (existsSync(src)) {
  cpSync(src, dest, { recursive: true });
} else {
  console.warn(`[copy-dev-assets] ไม่พบ ${src} — /dev/overlay จะไม่มีรูป mockup`);
}
