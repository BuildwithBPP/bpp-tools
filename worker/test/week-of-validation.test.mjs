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

const protectedRoutes = ["/save-recap", "/save-decisions"];
const invalidWeekOfValues = [
  "2026-07-29/../../pages/index",
  "2026-7-29",
  "2026-07-29.md",
  "2026-02-30",
  "2026-04-31",
  "2026-13-01",
  "2025-02-29",
];

for (const path of protectedRoutes) {
  for (const invalidWeekOf of invalidWeekOfValues) {
    const response = await postToWorker(path, invalidWeekOf, async () => {
      throw new Error("Invalid week_of must be rejected before GitHub is called");
    });
    assert.equal(response.status, 400, `rejects invalid week_of on ${path}: ${invalidWeekOf}`);
    assert.deepEqual(await response.json(), { error: "week_of must be YYYY-MM-DD" });
  }
}

for (const [path, expectedCalls] of [["/save-recap", 4], ["/save-decisions", 2]]) {
  let githubCalls = 0;
  const validResponse = await postToWorker(path, "2024-02-29", async () => {
    githubCalls += 1;
    return new Response(JSON.stringify({ content: "", sha: "test-sha" }), { status: 200 });
  });
  assert.equal(validResponse.status, 200, `accepts a leap-day week_of on ${path}`);
  assert.equal(githubCalls, expectedCalls, `valid ${path} follows its existing GitHub flow`);
}

console.log("week_of validation tests passed");
