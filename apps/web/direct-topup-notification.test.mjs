import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "./node_modules/typescript/lib/typescript.js";

function compileModule(relativePath) {
  const sourcePath = path.join(import.meta.dirname, relativePath);
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

test("extracts direct top-up request id from notification rich text", () => {
  const {
    OPEN_DIRECT_TOPUP_APPROVAL_EVENT,
    extractDirectTopUpRequestId,
  } = compileModule("lib/direct-topup-notification.ts");

  assert.equal(
    OPEN_DIRECT_TOPUP_APPROVAL_EVENT,
    "ue:open-direct-topup-approval",
  );
  assert.equal(
    extractDirectTopUpRequestId(
      '<p><code data-direct-topup-request-id="request-123">request-123</code></p>',
    ),
    "request-123",
  );
});

test("ignores ordinary notifications without a direct top-up request id", () => {
  const { extractDirectTopUpRequestId } = compileModule(
    "lib/direct-topup-notification.ts",
  );

  assert.equal(
    extractDirectTopUpRequestId("<p>Lịch nghỉ lễ đã được cập nhật.</p>"),
    null,
  );
});
