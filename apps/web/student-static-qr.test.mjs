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
