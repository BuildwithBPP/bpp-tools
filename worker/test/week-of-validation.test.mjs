import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";

const source = await fs.readFile(new URL("../src/index.js", import.meta.url), "utf8");
const context = vm.createContext({
  Response,
  Request,
  URL,
  atob,
  btoa,
  unescape,
  console,
});
const module = new vm.SourceTextModule(source, { context, identifier: "worker/src/index.js" });
await module.link(() => {
  throw new Error("The Worker has no module imports");
});
await module.evaluate();

const worker = module.namespace.default;
const env = {
  ALLOWED_ORIGIN: "https://example.test",
  GITHUB_REPO: "BuildwithBPP/bpp-tools",
  SHARED_SECRET: "test-only-secret",
  GITHUB_TOKEN: "test-only-token",
};

async function postToWorker(path, weekOf, fetchImpl) {
  context.fetch = fetchImpl;
  return worker.fetch(
    new Request(`https://worker.example.test${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.SHARED_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ week_of: weekOf, decisions: [] }),
    }),
    env
  );
}

for (const invalidWeekOf of ["2026-07-29/../../pages/index", "2026-7-29", "2026-07-29.md"]) {
  const response = await postToWorker("/save-recap", invalidWeekOf, async () => {
    throw new Error("Invalid week_of must be rejected before GitHub is called");
  });
  assert.equal(response.status, 400, `rejects malformed week_of: ${invalidWeekOf}`);
  assert.deepEqual(await response.json(), { error: "week_of must be YYYY-MM-DD" });
}

const decisionResponse = await postToWorker("/save-decisions", "2026-07-29/../../pages/index", async () => {
  throw new Error("Invalid decision week_of must be rejected before GitHub is called");
});
assert.equal(decisionResponse.status, 400, "rejects malformed week_of for decision saves");
assert.deepEqual(await decisionResponse.json(), { error: "week_of must be YYYY-MM-DD" });

let githubCalls = 0;
const validResponse = await postToWorker("/save-recap", "2026-07-29", async () => {
  githubCalls += 1;
  return new Response(JSON.stringify({ content: "", sha: "test-sha" }), { status: 200 });
});
assert.equal(validResponse.status, 200, "accepts a YYYY-MM-DD week_of");
assert.equal(githubCalls, 4, "valid recap follows the existing GitHub read/write flow");

console.log("week_of validation tests passed");
