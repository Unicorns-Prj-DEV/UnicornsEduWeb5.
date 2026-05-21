import type { StudentListItem } from "@/dtos/student.dto";

export type StudentQrClassItem = {
  id: string;
  name: string;
};

function normalizeText(value: string | null | undefined): string {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

export function getActiveClassItemsFromStudent(
  student: Pick<StudentListItem, "studentClasses">,
): StudentQrClassItem[] {
  const classes = new Map<string, string>();

  for (const item of student.studentClasses ?? []) {
    if (item.status && item.status !== "active") continue;

    const id = normalizeText(item.class?.id);
    const name = normalizeText(item.class?.name);
    if (!id || !name || classes.has(id)) continue;
    classes.set(id, name);
  }

  return Array.from(classes, ([id, name]) => ({ id, name })).sort((a, b) =>
    a.name.localeCompare(b.name, "vi"),
  );
}

export function ensureStaticQrUrlIncludesClassNames(
  qrCodeUrl: string,
  classItems: StudentQrClassItem[],
): string {
  const classIds = Array.from(
    new Set(classItems.map((item) => normalizeText(item.id)).filter(Boolean)),
  );
  const classNames = Array.from(
    new Set(classItems.map((item) => normalizeText(item.name)).filter(Boolean)),
  );
  if (classIds.length === 0 && classNames.length === 0) {
    return qrCodeUrl;
  }

  try {
    const url = new URL(qrCodeUrl);
    const transferNote = normalizeText(url.searchParams.get("addInfo"));
    if (!transferNote) {
      return url.toString();
    }

    const lopMatch = transferNote.match(/\sLOP\s+/i);
    const idSegment = lopMatch
      ? transferNote.slice(0, lopMatch.index).trim()
      : transferNote;
    const existingClassNameSuffix = lopMatch
      ? transferNote
          .slice((lopMatch.index ?? 0) + lopMatch[0].length)
          .trim()
      : "";
    const existingTokens = new Set(idSegment.split(/\s+/).filter(Boolean));
    const missingClassIds = classIds.filter((id) => !existingTokens.has(id));
    const nextIdSegment = [idSegment, ...missingClassIds]
      .filter(Boolean)
      .join(" ");
    const classNameSuffix =
      existingClassNameSuffix || classNames.join(", ");
    url.searchParams.set(
      "addInfo",
      classNameSuffix
        ? `${nextIdSegment} LOP ${classNameSuffix}`
        : nextIdSegment,
    );
    return url.toString();
  } catch {
    return qrCodeUrl;
  }
}
