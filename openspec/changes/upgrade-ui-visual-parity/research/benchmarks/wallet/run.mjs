// node run.mjs prototype | baseline      (run make_variants.mjs first)
import { DEFECTS, DECOYS } from "./defects.mjs";
import { benchPrototype, printTable } from "../lib/proto.mjs";
import { benchBaseline, printBaseline } from "../lib/baseline.mjs";
const viewport = { width: 390, height: 844, dpr: 2 };
const dir = import.meta.dirname;
if (process.argv[2] === "baseline") {
  const items = [...DEFECTS, ...DECOYS, { id: "all", what: "all 36 at once" }];
  printBaseline(await benchBaseline({ dir, viewport, items }), items);
} else {
  // The implementation side is the "restructured" page: same picture, different element tree.
  const items = [{ id: "control", what: "identical picture, different element tree" }, ...DEFECTS, ...DECOYS, { id: "all", what: "all 36 at once" }];
  printTable(await benchPrototype({ dir, root: ".screen", viewport, suffix: ".restructured.html", items }), items);
}
