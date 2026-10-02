// node run.mjs prototype | baseline      (run make_variants.mjs first)
import { DEFECTS, DECOYS } from "./defects.mjs";
import { benchPrototype, printTable } from "../lib/proto.mjs";
import { benchBaseline, printBaseline } from "../lib/baseline.mjs";
const viewport = { width: 1280, height: 800, dpr: 2 };
const dir = import.meta.dirname;
if (process.argv[2] === "baseline") {
  const items = [...DEFECTS, ...DECOYS, { id: "all", what: "all at once" }];
  printBaseline(await benchBaseline({ dir, viewport, items }), items);
} else {
  const items = [{ id: "control", what: "identical page" }, ...DEFECTS, ...DECOYS, { id: "all", what: "all at once" }];
  printTable(await benchPrototype({ dir, root: ".app", viewport, items }), items);
}
