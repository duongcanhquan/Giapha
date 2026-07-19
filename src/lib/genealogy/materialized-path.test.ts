import assert from "node:assert/strict";
import { buildMaterializedPath } from "./materialized-path.ts";

function run() {
  const parentPath = ["m1", "m2", "placeholder-x"];
  const next = buildMaterializedPath(parentPath, "m-new");
  assert.deepEqual(next, ["m1", "m2", "placeholder-x", "m-new"]);
  assert.equal(next[next.length - 1], "m-new");
  console.log("materialized-path.test: ok");
}

run();
