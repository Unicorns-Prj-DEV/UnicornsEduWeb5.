"use client";

import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import { useDebounce } from "use-debounce";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import UpgradedSelect from "@/components/ui/UpgradedSelect";
import type { ClassDetail, ClassStatus, ClassType, UpdateClassPayload } from "@/dtos/class.dto";
import * as classApi from "@/lib/apis/class.api";
import * as staffApi from "@/lib/apis/staff.api";
import * as studentApi from "@/lib/apis/student.api";
import { normalizeTimeOnly } from "@/lib/class.helpers";

type ScheduleRangeForm = {
  id: string;
  from: string;
  to: string;
};

const EMPTY_SCHEDULE_RANGE = {
  from: "",
  to: "",
} as const;

type Props = {
  open: boolean;
  onClose: () => void;
  classDetail: ClassDetail;
};

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

function normalizeSchedule(schedule: unknown): ScheduleRangeForm[] {
  if (!Array.isArray(schedule)) return [];

  return schedule.reduce<ScheduleRangeForm[]>((acc, item) => {
    if (!item || typeof item !== "object") return acc;

    const record = item as Record<string, unknown>;
    const from = normalizeTimeOnly(typeof record.from === "string" ? record.from : "");
    const to = normalizeTimeOnly(typeof record.to === "string" ? record.to : "");

    if (!from && !to) return acc;

    return [...acc, createScheduleRange({ from, to })];
  }, []);
}

function parseOptionalInt(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.floor(parsed);
}

function parseTimeToSeconds(value: string): number | null {
  const matched = value.match(/^(\d{2}):(\d{2}):(\d{2})$/);
  if (!matched) return null;

  const [, hoursRaw, minutesRaw, secondsRaw] = matched;
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  const seconds = Number(secondsRaw);

  if (hours > 23 || minutes > 59 || seconds > 59) return null;
  return hours * 3600 + minutes * 60 + seconds;
}

function buildSchedulePayload(scheduleRanges: ScheduleRangeForm[]): NonNullable<UpdateClassPayload["schedule"]> {
  return scheduleRanges.reduce<NonNullable<UpdateClassPayload["schedule"]>>((acc, range) => {
    if (!range.from && !range.to) return acc;

    if ((range.from && !range.to) || (!range.from && range.to)) {
      throw new Error("Mỗi dòng lịch học cần đủ cả thời gian bắt đầu và kết thúc.");
    }

    const from = normalizeTimeOnly(range.from);
    const to = normalizeTimeOnly(range.to);
    const fromSeconds = parseTimeToSeconds(from);
    const toSeconds = parseTimeToSeconds(to);

    if (!from || !to || fromSeconds == null || toSeconds == null) {
      throw new Error("Khung giờ học phải dùng định dạng HH:mm:ss.");
    }

    if (fromSeconds >= toSeconds) {
      throw new Error("Thời gian lịch học không hợp lệ (bắt đầu phải nhỏ hơn kết thúc).");
    }

    return [...acc, { from, to }];
  }, []);
}

export default function EditClassPopup({ open, onClose, classDetail }: Props) {
  const queryClient = useQueryClient();

  const [name, setName] = useState(classDetail.name ?? "");
  const [type, setType] = useState<ClassType>(classDetail.type);
  const [status, setStatus] = useState<ClassStatus>(classDetail.status);
  const [maxStudentsInput, setMaxStudentsInput] = useState(String(classDetail.maxStudents ?? ""));
  const [allowancePerSessionInput, setAllowancePerSessionInput] = useState(
    String(classDetail.allowancePerSessionPerStudent ?? ""),
  );
  const [maxAllowancePerSessionInput, setMaxAllowancePerSessionInput] = useState(
    classDetail.maxAllowancePerSession == null ? "" : String(classDetail.maxAllowancePerSession),
  );
  const [scaleAmountInput, setScaleAmountInput] = useState(
    classDetail.scaleAmount == null ? "" : String(classDetail.scaleAmount),
  );

  const [studentTuitionPerSessionInput, setStudentTuitionPerSessionInput] = useState(
    classDetail.studentTuitionPerSession == null ? "" : String(classDetail.studentTuitionPerSession),
  );
  const [tuitionPackageTotalInput, setTuitionPackageTotalInput] = useState(
    classDetail.tuitionPackageTotal == null ? "" : String(classDetail.tuitionPackageTotal),
  );
  const [tuitionPackageSessionInput, setTuitionPackageSessionInput] = useState(
    classDetail.tuitionPackageSession == null ? "" : String(classDetail.tuitionPackageSession),
  );
  const [scheduleRanges, setScheduleRanges] = useState<ScheduleRangeForm[]>(() => {
    const normalized = normalizeSchedule(classDetail.schedule);
    return normalized.length > 0 ? normalized : [createScheduleRange()];
  });
  const [selectedTeachers, setSelectedTeachers] = useState<
    Array<{ id: string; name: string; customAllowance?: number }>
  >(() =>
    (classDetail.teachers ?? [])
      .filter((t) => t?.id)
      .map((t) => ({
        id: t.id,
        name: t.fullName?.trim() ?? "—",
        customAllowance: t.customAllowance ?? undefined,
      })),
  );
  const [selectedStudents, setSelectedStudents] = useState<Array<{ id: string; name: string }>>(() =>
    (classDetail.students ?? []).map((s) => ({ id: s.id, name: s.fullName?.trim() ?? "—" })),
  );
  const [teacherSearchInput, setTeacherSearchInput] = useState("");
  const [teacherSearchFocused, setTeacherSearchFocused] = useState(false);
  const teacherSearchRef = useRef<HTMLDivElement>(null);
  const [studentSearchInput, setStudentSearchInput] = useState("");
  const [studentSearchFocused, setStudentSearchFocused] = useState(false);
  const studentSearchRef = useRef<HTMLDivElement>(null);

  const [debouncedTeacherSearch] = useDebounce(teacherSearchInput.trim(), 350);
  const [debouncedStudentSearch] = useDebounce(studentSearchInput.trim(), 350);

  const { data: staffSearchResult } = useQuery({
    queryKey: ["staff", "list", { page: 1, limit: 50, search: debouncedTeacherSearch }],
    queryFn: () =>
      staffApi.getStaff({
        page: 1,
        limit: 50,
        search: debouncedTeacherSearch || undefined,
      }),
    enabled: open,
  });

  const { data: studentSearchResult } = useQuery({
    queryKey: ["student", "list", { page: 1, limit: 50, search: debouncedStudentSearch }],
    queryFn: () =>
      studentApi.getStudents({
        page: 1,
        limit: 50,
        search: debouncedStudentSearch || undefined,
      }),
    enabled: open,
  });

  const filteredStudents = (studentSearchResult ?? []).filter(
    (s) => !selectedStudents.some((st) => st.id === s.id),
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (teacherSearchRef.current && !teacherSearchRef.current.contains(target)) {
        setTeacherSearchFocused(false);
      }
      if (studentSearchRef.current && !studentSearchRef.current.contains(target)) {
        setStudentSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;

    setName(classDetail.name ?? "");
    setType(classDetail.type);
    setStatus(classDetail.status);
    setMaxStudentsInput(String(classDetail.maxStudents ?? ""));
    setAllowancePerSessionInput(String(classDetail.allowancePerSessionPerStudent ?? ""));
    setMaxAllowancePerSessionInput(
      classDetail.maxAllowancePerSession == null ? "" : String(classDetail.maxAllowancePerSession),
    );
    setScaleAmountInput(classDetail.scaleAmount == null ? "" : String(classDetail.scaleAmount));
    setStudentTuitionPerSessionInput(
      classDetail.studentTuitionPerSession == null ? "" : String(classDetail.studentTuitionPerSession),
    );
    setTuitionPackageTotalInput(
      classDetail.tuitionPackageTotal == null ? "" : String(classDetail.tuitionPackageTotal),
    );
    setTuitionPackageSessionInput(
      classDetail.tuitionPackageSession == null ? "" : String(classDetail.tuitionPackageSession),
    );

    const normalized = normalizeSchedule(classDetail.schedule);
    setScheduleRanges(normalized.length > 0 ? normalized : [createScheduleRange()]);
    setSelectedTeachers(
      (classDetail.teachers ?? [])
        .filter((t) => t?.id)
        .map((t) => ({
          id: t.id,
          name: t.fullName?.trim() ?? "—",
          customAllowance: t.customAllowance ?? undefined,
        })),
    );
    setSelectedStudents(
      (classDetail.students ?? []).map((s) => ({ id: s.id, name: s.fullName?.trim() ?? "—" })),
    );
    setTeacherSearchInput("");
    setStudentSearchInput("");
  }, [open, classDetail]);

  const updateMutation = useMutation({
    mutationFn: classApi.updateClass,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["class", "detail", classDetail.id] }),
        queryClient.invalidateQueries({ queryKey: ["class", "list"] }),
      ]);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (err as Error)?.message ??
        "Không thể cập nhật lớp học.";
      toast.error(msg);
    },
  });

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Tên lớp là bắt buộc.");
      return;
    }

    const maxStudents = parseOptionalInt(maxStudentsInput);
    if (maxStudents !== undefined && maxStudents < 1) {
      toast.error("Sĩ số tối đa phải lớn hơn hoặc bằng 1.");
      return;
    }

    let schedulePayload: NonNullable<UpdateClassPayload["schedule"]>;
    try {
      schedulePayload = buildSchedulePayload(scheduleRanges);
    } catch (error) {
      toast.error((error as Error).message || "Không thể lưu lịch học.");
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: classDetail.id,
        name: trimmedName,
        type,
        status,
        max_students: maxStudents,
        allowance_per_session_per_student: parseOptionalInt(allowancePerSessionInput),
        max_allowance_per_session: parseOptionalInt(maxAllowancePerSessionInput),
        scale_amount: parseOptionalInt(scaleAmountInput),
        student_tuition_per_session: parseOptionalInt(studentTuitionPerSessionInput),
        tuition_package_total: parseOptionalInt(tuitionPackageTotalInput),
        tuition_package_session: parseOptionalInt(tuitionPackageSessionInput),
        schedule: schedulePayload,
        teachers: selectedTeachers.map((t) => ({
          teacher_id: t.id,
          ...(t.customAllowance != null && t.customAllowance > 0 ? { custom_allowance: t.customAllowance } : {}),
        })),
        student_ids: selectedStudents.map((s) => s.id),
      });
      toast.success("Đã lưu thông tin lớp học.");
      onClose();
    } catch {
      // lỗi đã được xử lý trong onError
    }
  };

  const handleAddRange = () => {
    setScheduleRanges((prev) => [...prev, createScheduleRange()]);
  };

  const handleRemoveRange = (id: string) => {
    setScheduleRanges((prev) => {
      if (prev.length === 1) {
        return [createScheduleRange()];
      }
      return prev.filter((item) => item.id !== id);
    });
  };

  const handleChangeRange = (id: string, field: keyof Pick<ScheduleRangeForm, "from" | "to">, value: string) => {
    const normalizedValue = normalizeTimeOnly(value);
    setScheduleRanges((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: normalizedValue } : item)),
    );
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" aria-hidden onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-class-title"
        className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-border-default bg-bg-surface p-5 shadow-xl"
      >
        <div className="mb-4 flex shrink-0 items-center justify-between">
          <h2 id="edit-class-title" className="text-lg font-semibold text-text-primary">
            Chỉnh sửa thông tin lớp học
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
                <UpgradedSelect
                  name="edit-class-type"
                  value={type}
                  onValueChange={(nextValue) => setType(nextValue as ClassType)}
                  options={TYPE_OPTIONS}
                  buttonClassName="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm text-text-secondary">
                <span>Trạng thái</span>
                <UpgradedSelect
                  name="edit-class-status"
                  value={status}
                  onValueChange={(nextValue) => setStatus(nextValue as ClassStatus)}
                  options={STATUS_OPTIONS}
                  buttonClassName="rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                />
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
            <p className="mb-3 text-xs text-text-muted">
              Có thể nhập trợ cấp riêng (VNĐ) cho từng gia sư; để trống thì dùng trợ cấp mặc định của lớp.
            </p>
            <div className="space-y-3">
              <div className="flex flex-col gap-2">
                {selectedTeachers.map((t) => (
                  <div
                    key={t.id}
                    className="flex flex-wrap items-center gap-2 rounded-lg border border-border-default bg-bg-surface p-2 sm:flex-nowrap"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">
                      {t.name}
                    </span>
                    <label className="flex shrink-0 items-center gap-1.5 text-sm text-text-secondary">
                      <span className="whitespace-nowrap text-xs">Trợ cấp riêng</span>
                      <input
                        type="number"
                        min={0}
                        value={t.customAllowance ?? ""}
                        onChange={(e) => {
                          const v = e.target.value.trim();
                          const num = v === "" ? undefined : Math.floor(Number(v)) || 0;
                          setSelectedTeachers((prev) =>
                            prev.map((x) =>
                              x.id === t.id ? { ...x, customAllowance: v === "" ? undefined : num } : x,
                            ),
                          );
                        }}
                        placeholder="VNĐ"
                        className="w-24 rounded border border-border-default bg-bg-primary px-2 py-1.5 text-right text-sm tabular-nums text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-1 focus-visible:ring-border-focus"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setSelectedTeachers((prev) => prev.filter((x) => x.id !== t.id))}
                      className="rounded p-1 text-text-muted transition-colors hover:bg-bg-tertiary hover:text-error focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                      aria-label={`Bỏ ${t.name}`}
                    >
                      <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              <div className="relative" ref={teacherSearchRef}>
                <div className="flex gap-2">
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
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </span>
                  </div>
                </div>
                {teacherSearchFocused && (
                  <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-md border border-border-default bg-bg-surface py-1 shadow-lg">
                    {(staffSearchResult?.data ?? []).filter((s) => !selectedTeachers.some((t) => t.id === s.id))
                      .length === 0 ? (
                      <p className="px-3 py-2 text-sm text-text-muted">
                        {teacherSearchInput.trim()
                          ? "Không tìm thấy kết quả"
                          : "Nhập tên để tìm kiếm gia sư"}
                      </p>
                    ) : (
                      (staffSearchResult?.data ?? [])
                        .filter((s) => !selectedTeachers.some((t) => t.id === s.id))
                        .map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setSelectedTeachers((prev) => [
                                ...prev,
                                { id: s.id, name: s.fullName?.trim() ?? s.id, customAllowance: undefined },
                              ]);
                              setTeacherSearchInput("");
                              setTeacherSearchFocused(false);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text-primary transition-colors hover:bg-bg-tertiary focus:bg-bg-tertiary focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                          >
                            {s.fullName?.trim() || s.id}
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
              Danh sách học sinh
            </h3>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {selectedStudents.map((s) => (
                  <span
                    key={s.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border-default bg-bg-surface px-3 py-1.5 text-sm text-text-primary"
                  >
                    {s.name}
                    <button
                      type="button"
                      onClick={() => setSelectedStudents((prev) => prev.filter((x) => x.id !== s.id))}
                      className="rounded-full p-0.5 text-text-muted transition-colors hover:bg-bg-tertiary hover:text-error focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                      aria-label={`Bỏ ${s.name}`}
                    >
                      <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
              <div className="relative" ref={studentSearchRef}>
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={studentSearchInput}
                    onChange={(e) => setStudentSearchInput(e.target.value)}
                    onFocus={() => setStudentSearchFocused(true)}
                    placeholder="Tìm kiếm học sinh theo tên..."
                    className="w-full rounded-md border border-border-default bg-bg-surface px-3 py-2 pr-9 text-sm text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                    aria-label="Tìm kiếm học sinh"
                    aria-autocomplete="list"
                    aria-expanded={studentSearchFocused}
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
                {studentSearchFocused && (
                  <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-md border border-border-default bg-bg-surface py-1 shadow-lg">
                    {filteredStudents.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-text-muted">
                        {studentSearchInput.trim() ? "Không tìm thấy kết quả" : "Nhập tên để tìm kiếm học sinh"}
                      </p>
                    ) : (
                      filteredStudents.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setSelectedStudents((prev) => [
                              ...prev,
                              { id: s.id, name: (s.fullName?.trim() ?? "") || s.id },
                            ]);
                            setStudentSearchInput("");
                            setStudentSearchFocused(false);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text-primary transition-colors hover:bg-bg-tertiary focus:bg-bg-tertiary focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                        >
                          {(s.fullName?.trim() ?? "") || s.id}
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
                <p className="mt-1 text-xs text-text-muted">Định dạng HH:mm:ss.</p>
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
              disabled={updateMutation.isPending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors duration-200 hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:opacity-60"
            >
              {updateMutation.isPending ? "Đang lưu…" : "Lưu thông tin"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
