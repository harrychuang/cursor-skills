import fs from "node:fs";
import path from "node:path";
import { DEFECTS, DECOYS, applyVariant, tagAll, restructure } from "./defects.mjs";
const dir = path.join(import.meta.dirname, "pages");
const ref = fs.readFileSync(path.join(dir, "reference.html"), "utf8");
const tagged = tagAll(ref);
fs.writeFileSync(path.join(dir, "reference.tagged.html"), tagged);
const sets = [["control", []], ["all", DEFECTS], ...DEFECTS.map((d) => [d.id, [d]]), ...DECOYS.map((d) => [d.id, [d]])];
for (const [name, items] of sets) {
  fs.writeFileSync(path.join(dir, `impl-${name}.html`), applyVariant(ref, items));
  fs.writeFileSync(path.join(dir, `impl-${name}.tagged.html`), applyVariant(tagged, items));
  fs.writeFileSync(path.join(dir, `impl-${name}.restructured.html`), restructure(applyVariant(ref, items)));
}
console.log(`variants: ${sets.length} × 3 (plain + tagged + restructured); tagged elements: ${(tagged.match(/data-testid=/g) || []).length}`);
