import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "./node_modules/typescript/lib/typescript.js";

function loadThemeContext() {
  const sourcePath = path.join(import.meta.dirname, "context/ThemeContext.tsx");
  const source = fs.readFileSync(sourcePath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;

  const exports = {};
  const moduleShim = { exports };
  const localRequire = (id) => {
    if (id === "react") {
      return {
        createContext: () => ({}),
        use: () => null,
        useCallback: (fn) => fn,
        useLayoutEffect: () => {},
        useMemo: (fn) => fn(),
        useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot(),
      };
    }
    if (id === "react/jsx-runtime") {
      return {
        jsx: () => ({}),
      };
    }
    if (id === "@/dtos/theme.dto") {
      return {
        THEME_STORAGE_KEY: "ue-app-theme",
        isAppThemeId: (value) =>
          value === "light" || value === "dark" || value === "pink",
      };
    }
    throw new Error(`Unexpected require: ${id}`);
  };

  new Function("exports", "module", "require", compiled)(
    exports,
    moduleShim,
    localRequire,
  );
  return moduleShim.exports;
}

test("theme storage sync falls back to light when stored theme is cleared", () => {
  const { resolveThemeFromStoredValue } = loadThemeContext();

  assert.equal(resolveThemeFromStoredValue("pink"), "pink");
  assert.equal(resolveThemeFromStoredValue(null), "light");
  assert.equal(resolveThemeFromStoredValue("not-a-theme"), "light");
});
