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

test("appends list-row class ids and names to static QR addInfo when backend note lacks them", () => {
  const { ensureStaticQrUrlIncludesClassNames } = compileModule(
    "lib/student-static-qr.ts",
  );

  const output = ensureStaticQrUrlIncludesClassNames(
    "https://img.vietqr.io/image/970422-123-compact2.png?addInfo=NAPVI+UNIST-1&accountName=UNICORNS+EDU",
    [
      { id: "UNICL-1", name: "Toan 8A" },
      { id: "UNICL-2", name: "Ly 8A" },
    ],
  );

  const url = new URL(output);
  assert.equal(
    url.searchParams.get("addInfo"),
    "NAPVI UNIST-1 UNICL-1 UNICL-2 LOP Toan 8A, Ly 8A",
  );
  assert.equal(url.searchParams.get("accountName"), "UNICORNS EDU");
});

test("backfills missing class ids before an existing static QR class suffix", () => {
  const { ensureStaticQrUrlIncludesClassNames } = compileModule(
    "lib/student-static-qr.ts",
  );

  const output = ensureStaticQrUrlIncludesClassNames(
    "https://img.vietqr.io/image/970422-123-compact2.png?addInfo=NAPVI+UNIST-1+UNICL-1+LOP+Toan+8A",
    [
      { id: "UNICL-1", name: "Toan 8A" },
      { id: "UNICL-2", name: "Ly 8A" },
    ],
  );

  assert.equal(
    new URL(output).searchParams.get("addInfo"),
    "NAPVI UNIST-1 UNICL-1 UNICL-2 LOP Toan 8A",
  );
});

test("extracts sorted active class items from student list row data", () => {
  const { getActiveClassItemsFromStudent } = compileModule(
    "lib/student-static-qr.ts",
  );

  assert.deepEqual(
    getActiveClassItemsFromStudent({
      studentClasses: [
        {
          status: "inactive",
          class: { id: "UNICL-old", name: "Lop cu" },
        },
        {
          status: "active",
          class: { id: "UNICL-2", name: "Ly 8A" },
        },
        {
          status: "active",
          class: { id: "UNICL-1", name: " Toan 8A " },
        },
        {
          status: "active",
          class: { id: "UNICL-1", name: "Toan 8A" },
        },
      ],
    }),
    [
      { id: "UNICL-2", name: "Ly 8A" },
      { id: "UNICL-1", name: "Toan 8A" },
    ],
  );
});
