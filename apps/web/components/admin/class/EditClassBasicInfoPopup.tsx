"use client";

import { useEffect, useState, type SyntheticEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ClassDetail, ClassStatus, ClassType, UpdateClassBasicInfoPayload } from "@/dtos/class.dto";
import * as classApi from "@/lib/apis/class.api";

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

function parseOptionalInt(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.floor(parsed);
}

export default function EditClassBasicInfoPopup({ open, onClose, classDetail }: Props) {
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
  }, [open, classDetail]);

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateClassBasicInfoPayload) =>
      classApi.updateClassBasicInfo(classDetail.id, payload),
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
        "Không thể cập nhật thông tin lớp.";
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
    const payload: UpdateClassBasicInfoPayload = {
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
    };
    try {
      await updateMutation.mutateAsync(payload);
      toast.success("Đã lưu thông tin cơ bản.");
      onClose();
    } catch {
      // handled in onError
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" aria-hidden onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-class-basic-title"
        className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-border-default bg-bg-surface p-5 shadow-xl"
      >
        <div className="mb-4 flex shrink-0 items-center justify-between">
          <h2 id="edit-class-basic-title" className="text-lg font-semibold text-text-primary">
            Chỉnh sửa thông tin cơ bản lớp học
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-text-muted transition-colors hover:bg-bg-tertiary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
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

          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border-default pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border-default bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:opacity-60"
            >
              {updateMutation.isPending ? "Đang lưu…" : "Lưu"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
