"use client";

import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import { useDebounce } from "use-debounce";
import { toast } from "sonner";
import type { ClassStatus, ClassType } from "@/dtos/class.dto";
import { normalizeTimeOnly } from "@/lib/class.helpers";

type ScheduleRangeForm = {
  id: string;
  from: string;
  to: string;
};

const EMPTY_SCHEDULE_RANGE = { from: "", to: "" } as const;

type Props = {
  open: boolean;
  onClose: () => void;
  onAdd: (data: {
    name: string;
    type: ClassType;
    status: ClassStatus;
    teacherNames: string;
  }) => void;
};

/** Mock gia sư – dùng khi chưa kết nối BE */
const MOCK_STAFF = [
  { id: "st1", fullName: "Nguyễn Văn A" },
  { id: "st2", fullName: "Trần Thị B" },
  { id: "st3", fullName: "Lê Văn C" },
  { id: "st4", fullName: "Phạm Thị D" },
];

const STATUS_OPTIONS: { value: ClassStatus; label: string }[] = [
  { value: "running", label: "Đang chạy" },
  { value: "ended", label: "Đã kết thúc" },
];

const TYPE_OPTIONS: { value: ClassType; label: string }[] = [
  { value: "basic", label: "Basic" },
  { value: "vip", label: "VIP" },
  { value: "advance", label: "Advance" },
  { value: "hardcore", label: "Hardcore" },
];

function createScheduleRange(range?: Partial<Pick<ScheduleRangeForm, "from" | "to">>): ScheduleRangeForm {
  return {
    id: crypto.randomUUID(),
    from: range?.from ?? EMPTY_SCHEDULE_RANGE.from,
    to: range?.to ?? EMPTY_SCHEDULE_RANGE.to,
  };
}

function parseTimeToSeconds(value: string): number | null {
  const m = value.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const [, h, min, sec = "0"] = m;
  const hours = Number(h);
  const minutes = Number(min);
  const seconds = Number(sec);
  if (hours > 23 || minutes > 59 || seconds > 59) return null;
  return hours * 3600 + minutes * 60 + seconds;
}

export default function AddClassPopup({ open, onClose, onAdd }: Props) {
  const [name, setName] = useState("");
  const [type, setType] = useState<ClassType>("basic");
  const [status, setStatus] = useState<ClassStatus>("running");
  const [maxStudentsInput, setMaxStudentsInput] = useState("");
  const [allowancePerSessionInput, setAllowancePerSessionInput] = useState("");
  const [maxAllowancePerSessionInput, setMaxAllowancePerSessionInput] = useState("");
  const [scaleAmountInput, setScaleAmountInput] = useState("");
  const [studentTuitionPerSessionInput, setStudentTuitionPerSessionInput] = useState("");
  const [tuitionPackageTotalInput, setTuitionPackageTotalInput] = useState("");
  const [tuitionPackageSessionInput, setTuitionPackageSessionInput] = useState("");
  const [scheduleRanges, setScheduleRanges] = useState<ScheduleRangeForm[]>(() => [createScheduleRange()]);
  const [selectedTeachers, setSelectedTeachers] = useState<Array<{ id: string; name: string }>>([]);
  const [teacherSearchInput, setTeacherSearchInput] = useState("");
  const [teacherSearchFocused, setTeacherSearchFocused] = useState(false);
  const teacherSearchRef = useRef<HTMLDivElement>(null);

  const [debouncedSearch] = useDebounce(teacherSearchInput.trim(), 350);
  const filteredStaff = MOCK_STAFF.filter(
    (s) =>
      !selectedTeachers.some((t) => t.id === s.id) &&
      (debouncedSearch ? s.fullName.toLowerCase().includes(debouncedSearch.toLowerCase()) : true),
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (teacherSearchRef.current && !teacherSearchRef.current.contains(e.target as Node)) {
        setTeacherSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) {
      setName("");
      setType("basic");
      setStatus("running");
      setMaxStudentsInput("");
      setAllowancePerSessionInput("");
      setMaxAllowancePerSessionInput("");
      setScaleAmountInput("");
      setStudentTuitionPerSessionInput("");
      setTuitionPackageTotalInput("");
      setTuitionPackageSessionInput("");
      setScheduleRanges([createScheduleRange()]);
      setSelectedTeachers([]);
      setTeacherSearchInput("");
    }
  }, [open]);

  const handleAddRange = () => {
    setScheduleRanges((prev) => [...prev, createScheduleRange()]);
  };

  const handleRemoveRange = (id: string) => {
    setScheduleRanges((prev) =>
      prev.length === 1 ? [createScheduleRange()] : prev.filter((item) => item.id !== id),
    );
  };

  const handleChangeRange = (id: string, field: "from" | "to", value: string) => {
    const normalized = normalizeTimeOnly(value);
    setScheduleRanges((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: normalized } : item)),
    );
  };

  const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Tên lớp là bắt buộc.");
      return;
    }

    const scheduleValid = scheduleRanges.every((r) => {
      if (!r.from && !r.to) return true;
      if ((r.from && !r.to) || (!r.from && r.to)) return false;
      const fromS = parseTimeToSeconds(normalizeTimeOnly(r.from));
      const toS = parseTimeToSeconds(normalizeTimeOnly(r.to));
      return fromS != null && toS != null && fromS < toS;
    });
    if (!scheduleValid) {
      toast.error("Khung giờ học không hợp lệ.");
      return;
    }

    const teacherNames = selectedTeachers.length > 0 ? selectedTeachers.map((t) => t.name).join(", ") : "—";
    onAdd({ name: trimmedName, type, status, teacherNames });
    toast.success("Đã thêm lớp học.");
    onClose();
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" aria-hidden onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-class-title"
        className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-border-default bg-bg-surface p-5 shadow-xl"
      >
        <div className="mb-4 flex shrink-0 items-center justify-between">
          <h2 id="add-class-title" className="text-lg font-semibold text-text-primary">
            Thêm lớp học
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-text-muted transition-colors duration-200 hover:bg-bg-tertiary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            aria-label="Đóng"
          >
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 space-y-4 overflow-y-auto pr-1">
          <section className="rounded-lg border border-border-default bg-bg-secondary/50 p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">
              Thông tin cơ bản
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm text-text-secondary sm:col-span-2">
                <span>Tên lớp</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  placeholder="Ví dụ: Math 10A"
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-text-secondary">
                <span>Phân loại</span>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as ClassType)}
                  className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  {TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm text-text-secondary">
                <span>Trạng thái</span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ClassStatus)}
                  className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm text-text-secondary">
                <span>Sĩ số tối đa</span>
                <input
                  type="number"
                  min={1}
                  value={maxStudentsInput}
                  onChange={(e) => setMaxStudentsInput(e.target.value)}
                  className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-text-secondary">
                <span>Trợ cấp / HV / buổi</span>
                <input
                  type="number"
                  min={0}
                  value={allowancePerSessionInput}
                  onChange={(e) => setAllowancePerSessionInput(e.target.value)}
                  className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  placeholder="VNĐ"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-text-secondary">
                <span>Trợ cấp tối đa / buổi</span>
                <input
                  type="number"
                  min={0}
                  value={maxAllowancePerSessionInput}
                  onChange={(e) => setMaxAllowancePerSessionInput(e.target.value)}
                  className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  placeholder="VNĐ"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-text-secondary">
                <span>Scales</span>
                <input
                  type="number"
                  min={0}
                  value={scaleAmountInput}
                  onChange={(e) => setScaleAmountInput(e.target.value)}
                  className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                />
              </label>
            </div>
          </section>

          <section className="rounded-lg border border-border-default bg-bg-secondary/50 p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">
              Gia sư phụ trách
            </h3>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {selectedTeachers.map((t) => (
                  <span
                    key={t.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border-default bg-bg-surface px-3 py-1.5 text-sm text-text-primary"
                  >
                    {t.name}
                    <button
                      type="button"
                      onClick={() => setSelectedTeachers((prev) => prev.filter((x) => x.id !== t.id))}
                      className="rounded-full p-0.5 text-text-muted transition-colors hover:bg-bg-tertiary hover:text-error focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                      aria-label={`Bỏ ${t.name}`}
                    >
                      <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
              <div className="relative" ref={teacherSearchRef}>
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={teacherSearchInput}
                    onChange={(e) => setTeacherSearchInput(e.target.value)}
                    onFocus={() => setTeacherSearchFocused(true)}
                    placeholder="Tìm kiếm gia sư theo tên..."
                    className="w-full rounded-md border border-border-default bg-bg-surface px-3 py-2 pr-9 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                    aria-label="Tìm kiếm gia sư"
                    aria-autocomplete="list"
                    aria-expanded={teacherSearchFocused}
                  />
                  <span
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
                    aria-hidden
                  >
                    <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                </div>
                {teacherSearchFocused && (
                  <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-md border border-border-default bg-bg-surface py-1 shadow-lg">
                    {filteredStaff.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-text-muted">
                        {teacherSearchInput.trim() ? "Không tìm thấy kết quả" : "Nhập tên để tìm kiếm gia sư"}
                      </p>
                    ) : (
                      filteredStaff.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setSelectedTeachers((prev) => [...prev, { id: s.id, name: s.fullName }]);
                            setTeacherSearchInput("");
                            setTeacherSearchFocused(false);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text-primary transition-colors hover:bg-bg-tertiary focus:bg-bg-tertiary focus:outline-none focus-visible:ring-0"
                        >
                          {s.fullName}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border-default bg-bg-secondary/50 p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">
              Học phí
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm text-text-secondary">
                <span>Học phí mỗi buổi</span>
                <input
                  type="number"
                  min={0}
                  value={studentTuitionPerSessionInput}
                  onChange={(e) => setStudentTuitionPerSessionInput(e.target.value)}
                  className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  placeholder="VNĐ"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-text-secondary">
                <span>Gói học phí tổng (bao tiền)</span>
                <input
                  type="number"
                  min={0}
                  value={tuitionPackageTotalInput}
                  onChange={(e) => setTuitionPackageTotalInput(e.target.value)}
                  className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  placeholder="VNĐ"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-text-secondary">
                <span>Số buổi gói học phí (bao buổi)</span>
                <input
                  type="number"
                  min={0}
                  value={tuitionPackageSessionInput}
                  onChange={(e) => setTuitionPackageSessionInput(e.target.value)}
                  className="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  placeholder="Số buổi"
                />
              </label>
            </div>
          </section>

          <section className="rounded-lg border border-border-default bg-bg-secondary/50 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Khung giờ học</h3>
                <p className="mt-1 text-xs text-text-muted">Định dạng HH:mm.</p>
              </div>
              <button
                type="button"
                onClick={handleAddRange}
                className="rounded-md border border-border-default bg-bg-surface px-3 py-1.5 text-sm font-medium text-text-primary transition-colors duration-200 hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                + Thêm khung giờ
              </button>
            </div>
            <div className="space-y-3">
              {scheduleRanges.map((range, index) => (
                <div
                  key={range.id}
                  className="rounded-xl border border-border-default bg-bg-surface p-4 shadow-sm transition-colors duration-200 hover:bg-bg-secondary/80"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-xs font-medium uppercase tracking-[0.24em] text-text-muted">
                      Khung {String(index + 1).padStart(2, "0")}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleRemoveRange(range.id)}
                      className="rounded-md border border-border-default px-3 py-1.5 text-sm font-medium text-text-muted transition-colors duration-200 hover:bg-error/15 hover:text-error focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                    >
                      Xóa
                    </button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
                    <label className="flex flex-col gap-1 text-sm text-text-secondary">
                      <span className="text-[11px] uppercase tracking-[0.2em] text-text-muted">Bắt đầu</span>
                      <input
                        type="time"
                        step={1}
                        value={range.from}
                        onChange={(e) => handleChangeRange(range.id, "from", e.target.value)}
                        className="rounded-md border border-border-default bg-bg-surface px-3 py-2 font-mono text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                      />
                    </label>
                    <div className="flex items-center justify-center pb-2 text-text-muted" aria-hidden>
                      <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-4-4 4 4-4 4" />
                      </svg>
                    </div>
                    <label className="flex flex-col gap-1 text-sm text-text-secondary">
                      <span className="text-[11px] uppercase tracking-[0.2em] text-text-muted">Kết thúc</span>
                      <input
                        type="time"
                        step={1}
                        value={range.to}
                        onChange={(e) => handleChangeRange(range.id, "to", e.target.value)}
                        className="rounded-md border border-border-default bg-bg-surface px-3 py-2 font-mono text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border-default pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border-default bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors duration-200 hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors duration-200 hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              Thêm lớp
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
