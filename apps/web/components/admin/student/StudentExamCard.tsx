"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { createClientId } from "@/lib/client-id";
import StudentExamSchedulePopup from "./StudentExamSchedulePopup";
import StudentInfoCard from "./StudentInfoCard";

export type StudentExamItem = {
  id: string;
  examDate: string;
  note: string;
  createdAt: string;
};

type Props = {
  studentId: string;
  className?: string;
  editable?: boolean;
};

const STORAGE_PREFIX = "ue.student.examSchedule.";

export function readStudentExamSchedule(studentId: string): StudentExamItem[] {
  if (!studentId) return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${studentId}`);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as StudentExamItem[]) : [];
  } catch {
    return [];
  }
}

export function saveStudentExamSchedule(studentId: string, items: StudentExamItem[]) {
  if (!studentId) return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${studentId}`, JSON.stringify(items.slice(0, 200)));
  } catch {
    // ignore storage errors
  }
}

function formatDateOnly(iso: string): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function createLocalId(): string {
  return createClientId();
}

function normalizeExamDate(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? trimmed : "";
}

export default function StudentExamCard({
  studentId,
  className = "",
  editable = false,
}: Props) {
  const [items, setItems] = useState<StudentExamItem[]>(() => readStudentExamSchedule(studentId));
  const [editorItems, setEditorItems] = useState<StudentExamItem[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);

  const syncItems = (nextItems: StudentExamItem[]) => {
    setItems(nextItems);
    saveStudentExamSchedule(studentId, nextItems);
  };

  const openEditor = () => {
    setEditorItems(items.map((item) => ({ ...item })));
    setEditorOpen(true);
  };

  const handleSaveEditor = (nextItems: StudentExamItem[]) => {
    const normalizedItems = nextItems.map((item) => ({
      ...item,
      examDate: normalizeExamDate(item.examDate),
      note: item.note.trim(),
      createdAt: item.createdAt || new Date().toISOString(),
      id: item.id || createLocalId(),
    }));

    syncItems(normalizedItems);
    setEditorOpen(false);
    toast.success("Đã lưu lịch thi.");
  };

  const sorted = useMemo(() => {
    return [...items]
      .filter((item) => item?.examDate)
      .sort((a, b) => {
        const at = new Date(a.examDate).getTime();
        const bt = new Date(b.examDate).getTime();
        if (Number.isFinite(at) && Number.isFinite(bt)) return at - bt;
        if (Number.isFinite(at)) return -1;
        if (Number.isFinite(bt)) return 1;
        return (a.createdAt ?? "").localeCompare(b.createdAt ?? "");
      });
  }, [items]);

  return (
    <StudentInfoCard title="Lịch thi" className={className}>
      <StudentExamSchedulePopup
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        items={editorItems}
        onItemsChange={setEditorItems}
        onSave={handleSaveEditor}
      />

      {editable ? (
        <div className="mb-4 flex flex-col items gap-3">

          <div className="flex justify-end">
            <button
              type="button"
              onClick={openEditor}
              className={`inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium text-text-inverse transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus ${sorted.length > 0
                ? "bg-primary hover:bg-primary-hover"
                : "bg-info hover:brightness-95"
                }`}
            >
              {sorted.length > 0 ? "Điều chỉnh lịch thi" : "Thêm lịch thi"}
            </button>
          </div>
        </div>
      ) : null}

      {sorted.length === 0 ? (
        <div className="rounded-xl border border-border-default bg-bg-secondary/40 px-3.5 py-4 text-sm text-text-muted">
          {editable
            ? "Chưa có lịch thi. Mở popup để tạo lịch thi đầu tiên."
            : "Chưa có lịch thi."}
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((item) => (
            <div key={item.id} className="rounded-xl border border-border-default bg-bg-surface px-3.5 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text-primary">
                    {formatDateOnly(item.examDate)}
                  </p>
                  {item.note?.trim() ? (
                    <p className="mt-1 text-xs text-text-muted">{item.note.trim()}</p>
                  ) : null}
                </div>
                {editable ? (
                  <button
                    type="button"
                    onClick={openEditor}
                    className="inline-flex shrink-0 items-center justify-center rounded-lg border border-border-default px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  >
                    Sửa
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </StudentInfoCard>
  );
}
