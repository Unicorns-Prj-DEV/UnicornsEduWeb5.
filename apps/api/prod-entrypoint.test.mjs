import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const API_ROOT = import.meta.dirname;

test("production build exposes dist/main.js compatibility entrypoint", () => {
  execFileSync(process.execPath, [
    path.join(API_ROOT, "scripts", "create-prod-entrypoint.mjs"),
  ]);

  const entrypoint = path.join(API_ROOT, "dist", "main.js");
  assert.equal(fs.existsSync(entrypoint), true);
  assert.match(fs.readFileSync(entrypoint, "utf8"), /src\/main\.js/);
});

test("production launch commands use the compatibility entrypoint", () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(API_ROOT, "package.json"), "utf8"),
  );
  assert.equal(packageJson.scripts.prod, "node dist/main.js");

  const dockerfile = fs.readFileSync(
    path.join(API_ROOT, "Dockerfile"),
    "utf8",
  );
  assert.match(dockerfile, /CMD \["node", "dist\/main\.js"\]/);
});
