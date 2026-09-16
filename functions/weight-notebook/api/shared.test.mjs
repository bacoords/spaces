import test from "node:test";
import assert from "node:assert/strict";
import { isSameOrigin } from "./_shared.mjs";

test("accepts the public custom domain after internal dispatch", () => {
  const request = new Request("https://polished-fediverse.spacefast.site/weight-notebook/api/lifts", {
    headers: { origin: "https://spaces.briancoords.com" }
  });
  assert.equal(isSameOrigin(request), true);
});
