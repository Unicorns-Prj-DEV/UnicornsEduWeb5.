"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ClassTeacher } from "@/dtos/class.dto";
import type { ClassTrainingManager } from "@/dtos/training-manager.dto";
import { formatCurrency } from "@/lib/class.helpers";
import {
  getTrainingManagerOptions,
  updateClassTrainingManager,
} from "@/lib/apis/training-manager.api";
import UpgradedSelect from "@/components/ui/UpgradedSelect";
import ClassCard from "./ClassCard";

const TEACHER_STATUS_LABELS = {
  active: "Đang hoạt động",
  inactive: "Ngưng hoạt động",
} as const;

type TutorItem = {
  id: string;
  name: string;
  status: string | null;
  assignmentStatus?: string | null;
  customAllowance: number | null;
  operatingDeductionRatePercent: number | null;
};

type Props = {
  classId?: string;
  teachers?: ClassTeacher[];
  trainingManager?: ClassTrainingManager | null;
  trainingManagerRatePercent?: number | null;
  canEditTrainingManager?: boolean;
  /** Class default allowance per student per session (VNĐ). Used when teacher has no custom override. */
  defaultAllowancePerStudent?: number | null;
  /** Admin, accountant, assistant only — shows per-teacher Trợ cấp + Vận hành. */
  showTeacherCompensation?: boolean;
  /** Admin, assistant, accountant, training manager view — shows QLL allowance column in sessions. */
  showTrainingManagerAllowance?: boolean;
  className?: string;
  action?: React.ReactNode;
  enableTeacherNavigation?: boolean;
  canStopTeaching?: boolean;
  onStopTeaching?: (teacherId: string) => void;
  stopTeachingPendingTeacherId?: string | null;
  onTrainingManagerUpdated?: () => void;
};

function normalizeMoneyAmount(value?: number | null): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

function normalizeRatePercent(value?: number | null): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.round(value * 100) / 100;
}

function formatRatePercent(ratePercent?: number | null): string {
  const normalized = normalizeRatePercent(ratePercent) ?? 0;
  return `${normalized.toFixed(2)}%`;
}

function resolveEffectiveAllowance(
  customAllowance: number | null,
  defaultAllowancePerStudent?: number | null,
): number | null {
  const custom = normalizeMoneyAmount(customAllowance);
  if (custom != null) return custom;
  return normalizeMoneyAmount(defaultAllowancePerStudent);
}

function normalizeTutors(
  teachers?: ClassTeacher[],
  defaultAllowancePerStudent?: number | null,
): TutorItem[] {
  if (!Array.isArray(teachers)) return [];

  return teachers.reduce<TutorItem[]>((acc, teacher) => {
    const name = teacher?.fullName?.trim() || "";
    if (!name) return acc;

    const operatingDeductionRatePercent = normalizeRatePercent(
      teacher.operatingDeductionRatePercent ?? null,
    );

    return [
      ...acc,
      {
        id: teacher.id,
        name,
        status:
          teacher.assignmentStatus === "inactive"
            ? "Nghỉ dạy"
            : teacher.status && teacher.status in TEACHER_STATUS_LABELS
              ? TEACHER_STATUS_LABELS[teacher.status]
              : null,
        assignmentStatus: teacher.assignmentStatus,
        customAllowance: resolveEffectiveAllowance(
          normalizeMoneyAmount(teacher.customAllowance),
          defaultAllowancePerStudent,
        ),
        operatingDeductionRatePercent,
      },
    ];
  }, []);
}

function getErrorMessage(error: unknown, fallback: string) {
  const message = (error as { response?: { data?: { message?: string | string[] } } })
    ?.response?.data?.message;

  if (Array.isArray(message)) {
    return message.filter(Boolean).join(", ") || fallback;
  }

  if (typeof message === "string" && message.trim()) {
    return message;
  }

  return (error as Error)?.message ?? fallback;
}

export default function TutorCard({
  classId,
  teachers,
  trainingManager,
  trainingManagerRatePercent,
  canEditTrainingManager = false,
  defaultAllowancePerStudent,
  showTeacherCompensation = false,
  className = "",
  action,
  enableTeacherNavigation = true,
  canStopTeaching = false,
  onStopTeaching,
  stopTeachingPendingTeacherId = null,
  onTrainingManagerUpdated,
}: Props) {
  const queryClient = useQueryClient();
  const tutorItems = normalizeTutors(
    teachers,
    showTeacherCompensation ? defaultAllowancePerStudent : undefined,
  );
  const { push } = useRouter();
  const [managerStaffId, setManagerStaffId] = useState(
    trainingManager?.id ?? "",
  );
  const [managerRateInput, setManagerRateInput] = useState(
    trainingManagerRatePercent != null ? String(trainingManagerRatePercent) : "",
  );

  useEffect(() => {
    setManagerStaffId(trainingManager?.id ?? "");
    setManagerRateInput(
      trainingManagerRatePercent != null ? String(trainingManagerRatePercent) : "",
    );
  }, [trainingManager?.id, trainingManagerRatePercent]);

  const { data: managerOptions = [], isLoading: isManagerOptionsLoading } =
    useQuery({
      queryKey: ["training-manager", "options"],
      queryFn: () => getTrainingManagerOptions({ limit: 100 }),
      enabled: canEditTrainingManager,
      staleTime: 60_000,
    });

  const managerSelectOptions = useMemo(
    () => [
      { value: "", label: "Chưa gán" },
      ...managerOptions.map((option) => ({
        value: option.id,
        label: option.fullName,
      })),
    ],
    [managerOptions],
  );

  const saveTrainingManagerMutation = useMutation({
    mutationFn: async () => {
      if (!classId) {
        throw new Error("Thiếu mã lớp học.");
      }

      const parsedRate =
        managerRateInput.trim() === ""
          ? null
          : Number(managerRateInput.replace(",", "."));

      if (parsedRate != null && (!Number.isFinite(parsedRate) || parsedRate < 0 || parsedRate > 100)) {
        throw new Error("Tỷ lệ quản lý lớp phải từ 0 đến 100.");
      }

      return updateClassTrainingManager(classId, {
        trainingManagerStaffId: managerStaffId.trim() || null,
        trainingManagerRatePercent: parsedRate,
      });
    },
    onSuccess: async () => {
      toast.success("Đã cập nhật quản lý lớp.");
      if (classId) {
        await queryClient.invalidateQueries({
          queryKey: ["class", "detail", classId],
        });
        await queryClient.invalidateQueries({
          queryKey: ["staff-ops", "class", "detail", classId],
        });
      }
      onTrainingManagerUpdated?.();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Không cập nhật được quản lý lớp."));
    },
  });

  const managerDisplayName = trainingManager?.fullName?.trim() || "Chưa gán";
  const managerRateDisplay = formatRatePercent(trainingManagerRatePercent);

  return (
    <ClassCard title="Gia sư & Quản lý" className={className} action={action}>
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
            Gia sư phụ trách
          </p>
          {tutorItems.length > 0 ? (
            <div className="space-y-1.5">
              {tutorItems.map((teacher, index) => (
                <div
                  key={teacher.id}
                  role="button"
                  tabIndex={enableTeacherNavigation ? 0 : -1}
                  aria-disabled={!enableTeacherNavigation}
                  onClick={
                    enableTeacherNavigation
                      ? () => push(`/admin/staffs/${encodeURIComponent(teacher.id)}`)
                      : undefined
                  }
                  onKeyDown={
                    enableTeacherNavigation
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            push(`/admin/staffs/${encodeURIComponent(teacher.id)}`);
                          }
                        }
                      : undefined
                  }
                  className={`rounded-lg border border-border-default bg-bg-secondary/70 transition-colors ${
                    showTeacherCompensation
                      ? "px-2.5 py-2 sm:px-3 sm:py-2.5"
                      : "flex items-center gap-2 px-2.5 py-1.5 sm:gap-2.5 sm:px-3 sm:py-2"
                  } ${
                    enableTeacherNavigation
                      ? "cursor-pointer hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                      : "cursor-default"
                  }`}
                >
                  <div
                    className={
                      showTeacherCompensation
                        ? "flex items-center gap-2 sm:gap-2.5"
                        : "contents"
                    }
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border-default bg-bg-surface text-[10px] font-semibold tabular-nums text-text-secondary">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium leading-tight text-text-primary">
                        {teacher.name}
                      </p>
                    </div>
                    <div
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] sm:text-[11px] ${
                        teacher.status === "Đang hoạt động"
                          ? "border-success/30 bg-success/10 text-success"
                          : teacher.status === "Ngưng hoạt động"
                            ? "border-error/30 bg-error/10 text-error"
                            : "border-border-default bg-bg-surface text-text-secondary"
                      }`}
                    >
                      {teacher.status ?? "Đang phân công"}
                    </div>
                  </div>
                  {showTeacherCompensation ? (
                    <div
                      className="mt-2 grid grid-cols-2 gap-2 border-t border-border-default/70 pt-2"
                      role="presentation"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                          Trợ cấp
                        </p>
                        <p className="mt-0.5 truncate text-sm font-semibold tabular-nums text-primary">
                          {formatCurrency(teacher.customAllowance)}
                        </p>
                      </div>
                      <div className="min-w-0 text-right">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                          Vận hành
                        </p>
                        <p className="mt-0.5 text-sm font-semibold tabular-nums text-text-primary">
                          {formatRatePercent(teacher.operatingDeductionRatePercent)}
                        </p>
                      </div>
                      {canStopTeaching && teacher.assignmentStatus !== "inactive" ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onStopTeaching?.(teacher.id);
                          }}
                          disabled={stopTeachingPendingTeacherId === teacher.id}
                          className="col-span-2 inline-flex min-h-9 items-center justify-center rounded-md border border-border-default bg-bg-surface px-3 text-xs font-semibold text-text-secondary transition hover:bg-bg-tertiary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                        >
                          {stopTeachingPendingTeacherId === teacher.id
                            ? "Đang lưu..."
                            : "Nghỉ dạy"}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border-default bg-bg-secondary/50 px-3 py-4 text-center text-xs text-text-muted">
              Chưa phân công gia sư phụ trách.
            </div>
          )}
        </div>

        <div className="border-t border-border-default/70 pt-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
            Quản lý lớp (Đào tạo)
          </p>
          {canEditTrainingManager ? (
            <div className="space-y-3 rounded-lg border border-border-default bg-bg-secondary/50 p-3">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-text-secondary">
                  Nhân sự quản lý
                </span>
                <UpgradedSelect
                  name="training-manager-staff"
                  value={managerStaffId}
                  onValueChange={setManagerStaffId}
                  options={managerSelectOptions}
                  disabled={isManagerOptionsLoading}
                  buttonClassName="min-h-11 w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-text-secondary">
                  Tỷ lệ trợ cấp (%)
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={managerRateInput}
                  onChange={(event) => setManagerRateInput(event.target.value)}
                  placeholder="VD: 5"
                  className="min-h-11 w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                />
              </label>
              <button
                type="button"
                onClick={() => saveTrainingManagerMutation.mutate()}
                disabled={saveTrainingManagerMutation.isPending || !classId}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-inverse transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saveTrainingManagerMutation.isPending
                  ? "Đang lưu..."
                  : "Lưu quản lý lớp"}
              </button>
            </div>
          ) : (
            <div className="rounded-lg border border-border-default bg-bg-secondary/50 px-3 py-3 text-sm">
              <p className="font-medium text-text-primary">{managerDisplayName}</p>
              <p className="mt-1 text-xs text-text-muted">
                Tỷ lệ: <span className="font-semibold text-text-primary">{managerRateDisplay}</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </ClassCard>
  );
}
