import fs from "node:fs"; import path from "node:path";
import { DEFECTS, DECOYS, applyVariant, tagAll } from "./defects.mjs";
const dir = path.join(import.meta.dirname, "pages");
const ref = fs.readFileSync(path.join(dir, "reference.html"), "utf8");
const tagged = tagAll(ref);
fs.writeFileSync(path.join(dir, "reference.tagged.html"), tagged);
for (const [name, items] of [["control", []], ["all", DEFECTS], ...[...DEFECTS, ...DECOYS].map((d) => [d.id, [d]])]) {
  fs.writeFileSync(path.join(dir, `impl-${name}.html`), applyVariant(ref, items));
  fs.writeFileSync(path.join(dir, `impl-${name}.tagged.html`), applyVariant(tagged, items));
}
console.log("ok", fs.readdirSync(dir).length, "files; tagged elements", (tagged.match(/data-testid=/g) || []).length);
