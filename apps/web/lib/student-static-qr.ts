import type { StudentListItem } from "@/dtos/student.dto";

export type StudentQrClassItem = {
  id: string;
  name: string;
};

function normalizeText(value: string | null | undefined): string {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

function getTransferNoteParamName(url: URL): "addInfo" | "des" | null {
  if (url.searchParams.has("des")) return "des";
  if (url.searchParams.has("addInfo")) return "addInfo";
  return null;
}

function splitTransferNotePrefix(transferNote: string): {
  prefix: string;
  note: string;
} {
  const markerMatch = transferNote.match(/\bNAP\s*VI\b/i);
  if (!markerMatch || markerMatch.index === undefined) {
    return { prefix: "", note: transferNote };
  }

  return {
    prefix: transferNote.slice(0, markerMatch.index).trim(),
    note: transferNote.slice(markerMatch.index).trim(),
  };
}

function joinTransferNotePrefix(prefix: string, note: string): string {
  return [prefix, note].map(normalizeText).filter(Boolean).join(" ");
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
    const transferNoteParamName = getTransferNoteParamName(url);
    if (!transferNoteParamName) {
      return url.toString();
    }

    const transferNote = normalizeText(
      url.searchParams.get(transferNoteParamName),
    );
    if (!transferNote) {
      return url.toString();
    }

    const { prefix, note } = splitTransferNotePrefix(transferNote);
    const lopMatch = note.match(/\sLOP\s+/i);
    const idSegment = lopMatch
      ? note.slice(0, lopMatch.index).trim()
      : note;
    const existingClassNameSuffix = lopMatch
      ? note
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
    const nextNote = classNameSuffix
      ? `${nextIdSegment} LOP ${classNameSuffix}`
      : nextIdSegment;
    url.searchParams.set(
      transferNoteParamName,
      joinTransferNotePrefix(prefix, nextNote),
    );
    return url.toString();
  } catch {
    return qrCodeUrl;
  }
}
