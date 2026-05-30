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
  new Function("exports", "module", "require", compiled)(
    exports,
    moduleShim,
    () => {
      throw new Error("Unexpected require");
    },
  );
  return moduleShim.exports;
}

const { selectRandomCheckEvent } = compileModule("lib/staff-calendar-random.ts");

const now = new Date("2026-05-29T03:30:00.000Z"); // 10:30 Asia/Ho_Chi_Minh

test("random check selects only a currently running learning event with Meet link", () => {
  const selected = selectRandomCheckEvent(
    [
      {
        occurrenceId: "fixed:past",
        eventType: "fixed",
        classId: "class-1",
        className: "Lớp cũ",
        teacherIds: [],
        teacherNames: [],
        date: "2026-05-29",
        startTime: "08:00",
        endTime: "09:00",
        meetLink: "https://meet.google.com/past",
      },
      {
        occurrenceId: "exam:now",
        eventType: "exam",
        classId: "class-2",
        className: "Lớp thi",
        teacherIds: [],
        teacherNames: [],
        date: "2026-05-29",
        startTime: "10:00",
        endTime: "11:00",
        meetLink: "https://meet.google.com/exam",
      },
      {
        occurrenceId: "makeup:no-meet",
        eventType: "makeup",
        classId: "class-3",
        className: "Lớp thiếu link",
        teacherIds: [],
        teacherNames: [],
        date: "2026-05-29",
        startTime: "10:00",
        endTime: "11:00",
      },
      {
        occurrenceId: "fixed:eligible",
        eventType: "fixed",
        classId: "class-4",
        className: "Lớp hợp lệ",
        teacherIds: [],
        teacherNames: [],
        date: "2026-05-29",
        startTime: "10:00",
        endTime: "11:00",
        meetLink: "https://meet.google.com/live",
      },
    ],
    now,
    () => 0,
  );

  assert.equal(selected?.occurrenceId, "fixed:eligible");
});

test("random check returns null when no event is eligible", () => {
  const selected = selectRandomCheckEvent(
    [
      {
        occurrenceId: "exam:now",
        eventType: "exam",
        classId: "class-1",
        className: "Lớp thi",
        teacherIds: [],
        teacherNames: [],
        date: "2026-05-29",
        startTime: "10:00",
        endTime: "11:00",
        meetLink: "https://meet.google.com/exam",
      },
    ],
    now,
  );

  assert.equal(selected, null);
});
