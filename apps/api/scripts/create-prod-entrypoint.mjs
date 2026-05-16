import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const apiRoot = path.resolve(import.meta.dirname, "..");
const distDir = path.join(apiRoot, "dist");
const entrypointPath = path.join(distDir, "main.js");

await mkdir(distDir, { recursive: true });
await writeFile(
  entrypointPath,
  [
    '"use strict";',
    "// Compatibility entrypoint for hosts that run `node dist/main`.",
    'require("./src/main.js");',
    "",
  ].join("\n"),
  "utf8",
);
