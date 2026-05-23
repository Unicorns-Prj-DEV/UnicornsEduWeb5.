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
