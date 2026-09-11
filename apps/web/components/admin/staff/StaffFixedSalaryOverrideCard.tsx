"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MoneyInput } from "@/components/ui/MoneyInput";
import StaffCard from "@/components/admin/staff/StaffCard";
import type {
  FixedSalaryStaffRole,
  ResolvedFixedSalaryAxis,
  StaffFixedSalaryOverrideStaff,
} from "@/dtos/fixed-salary-settings.dto";
import * as fixedSalarySettingsApi from "@/lib/apis/fixed-salary-settings.api";
import {
  fixedSalaryInputClassName,
  getFixedSalaryApiErrorMessage,
} from "@/lib/fixed-salary-settings.helpers";
import {
  moneyInputInitialFromNumber,
  parseMoneyInput,
} from "@/lib/money-input.helpers";
import { ROLE_LABELS } from "@/lib/staff.constants";
import { formatVnNumber } from "@/lib/formatters";

function formatVnd(value: number): string {
  return `${formatVnNumber(value)}đ`;
}

function parseAmountOrThrow(rawValue: string): number {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    throw new Error("Nhập số tiền hoặc bấm Gỡ mức đè.");
  }

  if (/-/.test(trimmed)) {
    throw new Error("Số tiền lương cứng không được âm.");
  }

  const parsed = parseMoneyInput(trimmed);
  if (parsed == null || parsed < 0) {
    throw new Error("Số tiền lương cứng không hợp lệ.");
  }

  return parsed;
}

function parseOperatingRateOrThrow(rawValue: string): number {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    throw new Error("Nhập % vận hành hoặc bấm Gỡ mức đè.");
  }

  const numericValue = Number(trimmed.replace(",", "."));
  if (!Number.isFinite(numericValue) || numericValue < 0 || numericValue > 100) {
    throw new Error("% khấu trừ vận hành lương cứng phải nằm trong khoảng 0–100.");
  }

  return Number(numericValue.toFixed(2));
}

function amountSourceLabel(axis: ResolvedFixedSalaryAxis): string {
  if (axis.source === "override" && axis.applied === 0) {
    return "cố ý loại — mức đè";
  }
  if (axis.source === "override") {
    return "mức đè";
  }
  if (axis.source === "role_default") {
    return "mặc định role";
  }
  return "chưa cấu hình";
}

function rateSourceLabel(axis: ResolvedFixedSalaryAxis): string {
  if (axis.source === "override" && axis.applied === 0) {
    return "cố ý 0% — mức đè";
  }
  if (axis.source === "override") {
    return "mức đè";
  }
  if (axis.source === "role_default") {
    return "mặc định role";
  }
  return "chưa cấu hình";
}

function AppliedValue({
  value,
  sourceLabel,
}: {
  value: string;
  sourceLabel: string;
}) {
  return (
    <p className="text-xs text-text-secondary">
      Đang áp dụng:{" "}
      <span className="font-medium text-text-primary tabular-nums">{value}</span>
      <span className="text-text-muted"> ({sourceLabel})</span>
    </p>
  );
}

function AxisActions({
  canEdit,
  isSaving,
  hasOverride,
  onSave,
  onClear,
}: {
  canEdit: boolean;
  isSaving: boolean;
  hasOverride: boolean;
  onSave: () => void;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onSave}
        disabled={!canEdit || isSaving}
        className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg bg-primary px-3 text-sm font-semibold text-text-inverse hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-10 sm:flex-none"
      >
        {isSaving ? "Đang lưu…" : "Lưu mức đè"}
      </button>
      {hasOverride ? (
        <button
          type="button"
          onClick={onClear}
          disabled={!canEdit || isSaving}
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border border-border-default px-3 text-sm font-semibold text-text-primary hover:bg-bg-secondary disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-10 sm:flex-none"
        >
          Gỡ mức đè
        </button>
      ) : null}
    </div>
  );
}

function StaffRoleOverrideRows({
  staff,
  canEdit,
}: {
  staff: StaffFixedSalaryOverrideStaff;
  canEdit: boolean;
}) {
  const queryClient = useQueryClient();
  // Draft chỉ giữ các ô người dùng đã sửa; ô chưa sửa đọc thẳng từ server
  // nên sau mỗi lần lưu / refetch giá trị tự đồng bộ, không cần effect resync.
  const [amountDraft, setAmountDraft] = useState<Record<string, string>>({});
  const [rateDraft, setRateDraft] = useState<Record<string, string>>({});
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const serverDrafts = useMemo(() => {
    const amount: Record<string, string> = {};
    const rate: Record<string, string> = {};
    for (const row of staff.roles) {
      amount[row.roleType] = row.amount.hasOverride
        ? moneyInputInitialFromNumber(row.amount.overrideValue)
        : "";
      rate[row.roleType] =
        row.operatingRate.hasOverride && row.operatingRate.overrideValue != null
          ? String(row.operatingRate.overrideValue)
          : "";
    }
    return { amount, rate };
  }, [staff]);

  const amountValue = (roleType: FixedSalaryStaffRole) =>
    amountDraft[roleType] ?? serverDrafts.amount[roleType] ?? "";
  const rateValue = (roleType: FixedSalaryStaffRole) =>
    rateDraft[roleType] ?? serverDrafts.rate[roleType] ?? "";

  const dropDraft =
    (setDraft: typeof setAmountDraft) => (roleType: FixedSalaryStaffRole) =>
      setDraft((prev) => {
        if (!(roleType in prev)) return prev;
        const next = { ...prev };
        delete next[roleType];
        return next;
      });
  const dropAmountDraft = dropDraft(setAmountDraft);
  const dropRateDraft = dropDraft(setRateDraft);

  const invalidate = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["fixed-salary-settings", "staff-overrides"],
    });
  };

  const amountMutation = useMutation({
    mutationFn: fixedSalarySettingsApi.upsertStaffFixedSalaryAmount,
    onSuccess: async () => {
      toast.success("Đã lưu mức đè lương cứng.");
      await invalidate();
    },
    onError: (error) => {
      toast.error(
        getFixedSalaryApiErrorMessage(error, "Không lưu được mức đè lương cứng."),
      );
    },
    onSettled: () => {
      setPendingKey(null);
    },
  });

  const rateMutation = useMutation({
    mutationFn: fixedSalarySettingsApi.upsertStaffFixedSalaryOperatingRate,
    onSuccess: async () => {
      toast.success("Đã lưu mức đè % vận hành.");
      await invalidate();
    },
    onError: (error) => {
      toast.error(
        getFixedSalaryApiErrorMessage(
          error,
          "Không lưu được mức đè % vận hành.",
        ),
      );
    },
    onSettled: () => {
      setPendingKey(null);
    },
  });

  const saveAmount = async (
    roleType: FixedSalaryStaffRole,
    amount: number | null,
  ) => {
    setPendingKey(`amount:${roleType}`);
    try {
      // onError đã toast; catch ở đây để tránh unhandled rejection.
      await amountMutation.mutateAsync({
        staffId: staff.staffId,
        roleType,
        amount,
      });
      dropAmountDraft(roleType);
    } catch {
      // đã xử lý trong onError
    }
  };

  const saveRate = async (
    roleType: FixedSalaryStaffRole,
    operatingRatePercent: number | null,
  ) => {
    setPendingKey(`rate:${roleType}`);
    try {
      // onError đã toast; catch ở đây để tránh unhandled rejection.
      await rateMutation.mutateAsync({
        staffId: staff.staffId,
        roleType,
        operatingRatePercent,
      });
      dropRateDraft(roleType);
    } catch {
      // đã xử lý trong onError
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {staff.roles.map((row) => (
        <section
          key={`${staff.staffId}-${row.roleType}`}
          className="rounded-lg border border-border-default bg-bg-secondary/45 p-3 sm:p-4"
        >
          <h3 className="text-sm font-semibold text-text-primary">
            {ROLE_LABELS[row.roleType] ?? row.roleType}
          </h3>

          <div className="mt-3 flex flex-col gap-4 lg:grid lg:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-2">
              <p className="text-sm font-medium text-text-primary">Lương cứng</p>
              <AppliedValue
                value={
                  row.amount.applied == null
                    ? "chưa cấu hình"
                    : formatVnd(row.amount.applied)
                }
                sourceLabel={amountSourceLabel(row.amount)}
              />
              <MoneyInput
                name={`staff-amount-${staff.staffId}-${row.roleType}`}
                value={amountValue(row.roleType)}
                onValueChange={(value) =>
                  setAmountDraft((prev) => ({ ...prev, [row.roleType]: value }))
                }
                disabled={!canEdit}
                placeholder="Nhập mức đè (0 = loại)"
                aria-label={`Mức đè lương cứng ${staff.fullName} ${ROLE_LABELS[row.roleType] ?? row.roleType}`}
                className={fixedSalaryInputClassName}
              />
              <AxisActions
                canEdit={canEdit}
                isSaving={pendingKey === `amount:${row.roleType}`}
                hasOverride={row.amount.hasOverride}
                onSave={() => {
                  try {
                    void saveAmount(
                      row.roleType,
                      parseAmountOrThrow(amountValue(row.roleType)),
                    );
                  } catch (error) {
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : "Số tiền không hợp lệ.",
                    );
                  }
                }}
                onClear={() => {
                  void saveAmount(row.roleType, null);
                }}
              />
            </div>

            <div className="flex min-w-0 flex-col gap-2">
              <p className="text-sm font-medium text-text-primary">
                % vận hành lương cứng
              </p>
              <AppliedValue
                value={
                  row.operatingRate.applied == null
                    ? "chưa cấu hình"
                    : `${row.operatingRate.applied}%`
                }
                sourceLabel={rateSourceLabel(row.operatingRate)}
              />
              <input
                name={`staff-rate-${staff.staffId}-${row.roleType}`}
                inputMode="decimal"
                value={rateValue(row.roleType)}
                onChange={(event) =>
                  setRateDraft((prev) => ({
                    ...prev,
                    [row.roleType]: event.target.value,
                  }))
                }
                disabled={!canEdit}
                placeholder="Nhập mức đè (0 = 0%)"
                aria-label={`Mức đè % vận hành ${staff.fullName} ${ROLE_LABELS[row.roleType] ?? row.roleType}`}
                className={fixedSalaryInputClassName}
              />
              <AxisActions
                canEdit={canEdit}
                isSaving={pendingKey === `rate:${row.roleType}`}
                hasOverride={row.operatingRate.hasOverride}
                onSave={() => {
                  try {
                    void saveRate(
                      row.roleType,
                      parseOperatingRateOrThrow(rateValue(row.roleType)),
                    );
                  } catch (error) {
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : "% vận hành không hợp lệ.",
                    );
                  }
                }}
                onClear={() => {
                  void saveRate(row.roleType, null);
                }}
              />
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

export default function StaffFixedSalaryOverrideCard({
  staffId,
  canEdit,
}: {
  staffId: string;
  canEdit: boolean;
}) {
  const overridesQuery = useQuery({
    queryKey: ["fixed-salary-settings", "staff-overrides", { staffId }],
    queryFn: () => fixedSalarySettingsApi.getStaffFixedSalaryOverrides({ staffId }),
    enabled: Boolean(staffId),
    staleTime: 15_000,
  });

  const staff = overridesQuery.data?.staff?.[0] ?? null;

  return (
    <StaffCard title="Mức đè lương cứng theo nhân sự">
      <p className="mb-4 text-sm text-text-secondary">
        Mỗi role là một dòng độc lập. Đè lương cứng và đè % vận hành tách rời: gỡ
        một trục thì trục đó theo mặc định role, trục kia không đổi. 0đ / 0% là
        cố ý loại, khác với chưa đặt mức đè.
      </p>

      {overridesQuery.isError ? (
        <p className="text-sm text-error">
          Không tải được mức đè lương cứng. Thử tải lại trang.
        </p>
      ) : overridesQuery.isLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              key={index}
              className="h-40 animate-pulse rounded-lg border border-border-default bg-bg-secondary/45"
            />
          ))}
        </div>
      ) : staff && staff.roles.length > 0 ? (
        <StaffRoleOverrideRows staff={staff} canEdit={canEdit} />
      ) : (
        <p className="text-sm text-text-muted">
          Nhân sự này chưa có role đang hoạt động để đặt mức đè lương cứng.
        </p>
      )}
    </StaffCard>
  );
}
