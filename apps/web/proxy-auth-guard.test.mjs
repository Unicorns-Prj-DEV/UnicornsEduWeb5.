import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "./node_modules/typescript/lib/typescript.js";

function loadProxyAuthGuard() {
  const sourcePath = path.join(
    import.meta.dirname,
    "lib/proxy-auth-guard.ts",
  );
  const source = fs.readFileSync(sourcePath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const exports = {};
  const moduleShim = { exports };
  new Function("exports", "module", compiled)(exports, moduleShim);
  return moduleShim.exports;
}

function headers(values = {}) {
  const normalized = new Map(
    Object.entries(values).map(([key, value]) => [
      key.toLowerCase(),
      String(value),
    ]),
  );

  return {
    get(key) {
      return normalized.get(key.toLowerCase()) ?? null;
    },
    has(key) {
      return normalized.has(key.toLowerCase());
    },
  };
}

test("proxy verifies direct protected document navigations", () => {
  const { shouldVerifySessionInProxy } = loadProxyAuthGuard();

  assert.equal(
    shouldVerifySessionInProxy({
      pathname: "/staff",
      searchParams: new URLSearchParams(),
      headers: headers({
        accept: "text/html,application/xhtml+xml",
        "sec-fetch-mode": "navigate",
      }),
    }),
    true,
  );
});

test("proxy skips App Router RSC requests caused by tab or query navigation", () => {
  const { shouldVerifySessionInProxy } = loadProxyAuthGuard();

  assert.equal(
    shouldVerifySessionInProxy({
      pathname: "/staff/lesson-plans",
      searchParams: new URLSearchParams("tab=work&_rsc=abc"),
      headers: headers({
        accept: "text/x-component",
        rsc: "1",
        "next-router-state-tree": "%5B%5D",
      }),
    }),
    false,
  );
});

test("proxy skips Next router prefetch requests", () => {
  const { shouldVerifySessionInProxy } = loadProxyAuthGuard();

  assert.equal(
    shouldVerifySessionInProxy({
      pathname: "/admin/dashboard",
      searchParams: new URLSearchParams(),
      headers: headers({
        accept: "text/x-component",
        "next-router-prefetch": "1",
        purpose: "prefetch",
      }),
    }),
    false,
  );
});
