"use client";

import { useEffect, useMemo, useState } from "react";
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

export default function StudentExamCard({ studentId, className = "" }: Props) {
  const [items, setItems] = useState<StudentExamItem[]>([]);

  useEffect(() => {
    setItems(readStudentExamSchedule(studentId));
  }, [studentId]);

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
      {sorted.length === 0 ? (
        <div className="rounded-xl border border-border-default bg-bg-secondary/40 px-3.5 py-4 text-sm text-text-muted">
          Chưa có lịch thi.
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((item) => (
            <div key={item.id} className="rounded-xl border border-border-default bg-bg-surface px-3.5 py-3">
              <p className="text-sm font-semibold text-text-primary">
                {formatDateOnly(item.examDate)}
              </p>
              {item.note?.trim() ? (
                <p className="mt-1 text-xs text-text-muted">{item.note.trim()}</p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </StudentInfoCard>
  );
}

