"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MoneyInput } from "@/components/ui/MoneyInput";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { FixedSalaryStaffRole } from "@/dtos/fixed-salary-settings.dto";
import { FIXED_SALARY_STAFF_ROLES } from "@/dtos/fixed-salary-settings.dto";
import { getFullProfile } from "@/lib/apis/auth.api";
import * as fixedSalarySettingsApi from "@/lib/apis/fixed-salary-settings.api";
import { resolveAdminShellAccess } from "@/lib/admin-shell-access";
import {
  fixedSalaryInputClassName,
  getFixedSalaryApiErrorMessage,
} from "@/lib/fixed-salary-settings.helpers";
import {
  moneyInputInitialFromNumber,
  parseMoneyInput,
} from "@/lib/money-input.helpers";
import { ROLE_LABELS } from "@/lib/staff.constants";
import {
  RolePolicySaveButton,
  RolePolicySettingsCard,
} from "./RolePolicySettingsCard";
import { FixedSalaryClosePanel } from "./FixedSalaryClosePanel";

function parseAmountOrThrow(rawValue: string): number | null {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return null;
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

function parseOperatingRateOrThrow(rawValue: string): number | null {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return null;
  }

  const numericValue = Number(trimmed.replace(",", "."));
  if (!Number.isFinite(numericValue) || numericValue < 0 || numericValue > 100) {
    throw new Error("% khấu trừ vận hành lương cứng phải nằm trong khoảng 0–100.");
  }

  return Number(numericValue.toFixed(2));
}

function createAmountDraft(
  roles:
    | Array<{ roleType: FixedSalaryStaffRole; amount: number | null }>
    | undefined,
): Record<FixedSalaryStaffRole, string> {
  const next = {} as Record<FixedSalaryStaffRole, string>;
  for (const roleType of FIXED_SALARY_STAFF_ROLES) {
    const row = roles?.find((item) => item.roleType === roleType);
    next[roleType] = moneyInputInitialFromNumber(row?.amount);
  }
  return next;
}

function createRateDraft(
  roles:
    | Array<{
        roleType: FixedSalaryStaffRole;
        operatingRatePercent: number | null;
      }>
    | undefined,
): Record<FixedSalaryStaffRole, string> {
  const next = {} as Record<FixedSalaryStaffRole, string>;
  for (const roleType of FIXED_SALARY_STAFF_ROLES) {
    const row = roles?.find((item) => item.roleType === roleType);
    next[roleType] =
      row?.operatingRatePercent == null ? "" : String(row.operatingRatePercent);
  }
  return next;
}

function AmountFields({
  roleType,
  value,
  canEdit,
  onChange,
}: {
  roleType: FixedSalaryStaffRole;
  value: string;
  canEdit: boolean;
  onChange: (value: string) => void;
}) {
  const unconfigured = value.trim() === "";

  return (
    <label className="flex min-w-0 flex-col gap-1 text-sm text-text-secondary">
      <span className="md:sr-only">Số tiền lương cứng</span>
      <MoneyInput
        name={`fixed-salary-amount-${roleType}`}
        value={value}
        onValueChange={onChange}
        disabled={!canEdit}
        placeholder="Chưa có mức lương"
        aria-label={`Số tiền lương cứng ${ROLE_LABELS[roleType] ?? roleType}`}
        className={`${fixedSalaryInputClassName} ${unconfigured ? "placeholder:text-text-muted" : ""}`}
      />
      {unconfigured ? (
        <span className="text-xs text-text-muted">Chưa có mức lương</span>
      ) : null}
    </label>
  );
}

function OperatingRateFields({
  roleType,
  value,
  canEdit,
  onChange,
}: {
  roleType: FixedSalaryStaffRole;
  value: string;
  canEdit: boolean;
  onChange: (value: string) => void;
}) {
  const unconfigured = value.trim() === "";

  return (
    <label className="flex min-w-0 flex-col gap-1 text-sm text-text-secondary">
      <span className="md:sr-only">% khấu trừ vận hành lương cứng</span>
      <input
        name={`fixed-salary-operating-${roleType}`}
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={!canEdit}
        placeholder="Chưa cấu hình"
        aria-label={`% khấu trừ vận hành lương cứng ${ROLE_LABELS[roleType] ?? roleType}`}
        className={fixedSalaryInputClassName}
      />
      {unconfigured ? (
        <span className="text-xs text-text-muted">Chưa cấu hình — khác 0%</span>
      ) : null}
    </label>
  );
}

export function FixedSalarySettingsPanel() {
  const queryClient = useQueryClient();
  const [amountDraftByRole, setAmountDraftByRole] = useState<Record<
    FixedSalaryStaffRole,
    string
  > | null>(null);
  const [rateDraftByRole, setRateDraftByRole] = useState<Record<
    FixedSalaryStaffRole,
    string
  > | null>(null);

  const { data: fullProfile } = useQuery({
    queryKey: ["auth", "full-profile"],
    queryFn: getFullProfile,
    retry: false,
    staleTime: 60_000,
  });
  const { isAdmin, isAssistant } = resolveAdminShellAccess(fullProfile);
  const canEditSettings = isAdmin || isAssistant;

  const amountQuery = useQuery({
    queryKey: ["fixed-salary-settings", "role-defaults"],
    queryFn: fixedSalarySettingsApi.getRoleFixedSalaryDefaults,
    staleTime: 30_000,
  });
  const rateQuery = useQuery({
    queryKey: ["fixed-salary-settings", "role-operating-rates"],
    queryFn: fixedSalarySettingsApi.getRoleFixedSalaryOperatingRates,
    staleTime: 30_000,
  });

  const serverAmountDraft = useMemo(
    () => createAmountDraft(amountQuery.data?.roles),
    [amountQuery.data?.roles],
  );
  const serverRateDraft = useMemo(
    () => createRateDraft(rateQuery.data?.roles),
    [rateQuery.data?.roles],
  );
  const amountDraft = amountDraftByRole ?? serverAmountDraft;
  const rateDraft = rateDraftByRole ?? serverRateDraft;

  const saveAmountMutation = useMutation({
    mutationFn: fixedSalarySettingsApi.upsertRoleFixedSalaryDefaults,
    onSuccess: async () => {
      toast.success("Đã lưu mức lương cứng theo role.");
      setAmountDraftByRole(null);
      await queryClient.invalidateQueries({
        queryKey: ["fixed-salary-settings", "role-defaults"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["fixed-salary-settings", "staff-overrides"],
      });
    },
    onError: (error) => {
      toast.error(
        getFixedSalaryApiErrorMessage(error, "Không lưu được mức lương cứng."),
      );
    },
  });

  const saveRateMutation = useMutation({
    mutationFn: fixedSalarySettingsApi.upsertRoleFixedSalaryOperatingRates,
    onSuccess: async () => {
      toast.success("Đã lưu % vận hành lương cứng theo role.");
      setRateDraftByRole(null);
      await queryClient.invalidateQueries({
        queryKey: ["fixed-salary-settings", "role-operating-rates"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["fixed-salary-settings", "staff-overrides"],
      });
    },
    onError: (error) => {
      toast.error(
        getFixedSalaryApiErrorMessage(
          error,
          "Không lưu được % vận hành lương cứng.",
        ),
      );
    },
  });

  const handleSaveAmounts = async () => {
    try {
      const items = FIXED_SALARY_STAFF_ROLES.map((roleType) => ({
        roleType,
        amount: parseAmountOrThrow(amountDraft[roleType]),
      }));
      await saveAmountMutation.mutateAsync({ items });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Dữ liệu mức lương cứng không hợp lệ.",
      );
    }
  };

  const handleSaveRates = async () => {
    try {
      const items = FIXED_SALARY_STAFF_ROLES.map((roleType) => ({
        roleType,
        operatingRatePercent: parseOperatingRateOrThrow(rateDraft[roleType]),
      }));
      await saveRateMutation.mutateAsync({ items });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Dữ liệu % vận hành lương cứng không hợp lệ.",
      );
    }
  };

  const isLoading = amountQuery.isLoading || rateQuery.isLoading;

  const handleAmountChange = (roleType: FixedSalaryStaffRole, value: string) =>
    setAmountDraftByRole((prev) => ({
      ...(prev ?? serverAmountDraft),
      [roleType]: value,
    }));
  const handleRateChange = (roleType: FixedSalaryStaffRole, value: string) =>
    setRateDraftByRole((prev) => ({
      ...(prev ?? serverRateDraft),
      [roleType]: value,
    }));

  return (
    <div className="flex flex-col gap-8">
      {!canEditSettings ? (
        <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          Bạn đang ở chế độ chỉ xem.
        </div>
      ) : null}

      <FixedSalaryClosePanel canEdit={canEditSettings} />

      <RolePolicySettingsCard
        title="Chính sách lương cứng theo role"
        description="Mức lương và % vận hành lưu độc lập: mỗi nút chỉ ghi trục của nó. Để trống = chưa cấu hình, khác với 0đ / 0%. Áp cho mọi nhân sự đang hoạt động mang role tương ứng, trừ giáo viên (chỉ trợ cấp buổi học). % chỉ trừ trên lương cứng — không đổi trợ cấp buổi học và không ghi đè % vận hành theo lớp. Thuế vẫn dùng tab Khấu trừ. Mức đè riêng từng nhân sự nằm ở trang chi tiết nhân sự."
        actions={
          <>
            <RolePolicySaveButton
              label="Lưu mức lương"
              onClick={handleSaveAmounts}
              disabled={!canEditSettings || isLoading}
              isSaving={saveAmountMutation.isPending}
            />
            <RolePolicySaveButton
              label="Lưu % vận hành"
              onClick={handleSaveRates}
              disabled={!canEditSettings || isLoading}
              isSaving={saveRateMutation.isPending}
              variant="outline"
            />
          </>
        }
      >
        {amountQuery.isError || rateQuery.isError ? (
          <p className="mb-4 text-sm text-error">
            Không tải được chính sách lương cứng. Thử tải lại trang.
          </p>
        ) : null}

        <div className="grid gap-3 md:hidden">
          {isLoading
            ? Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-44 animate-pulse rounded-xl border border-border-default bg-bg-secondary/45"
                />
              ))
            : FIXED_SALARY_STAFF_ROLES.map((roleType) => (
                <section
                  key={roleType}
                  className="rounded-xl border border-border-default bg-bg-secondary/45 p-4"
                >
                  <h3 className="text-sm font-semibold text-text-primary">
                    {ROLE_LABELS[roleType] ?? roleType}
                  </h3>
                  <div className="mt-3 flex flex-col gap-3">
                    <AmountFields
                      roleType={roleType}
                      value={amountDraft[roleType]}
                      canEdit={canEditSettings}
                      onChange={(value) => handleAmountChange(roleType, value)}
                    />
                    <OperatingRateFields
                      roleType={roleType}
                      value={rateDraft[roleType]}
                      canEdit={canEditSettings}
                      onChange={(value) => handleRateChange(roleType, value)}
                    />
                  </div>
                </section>
              ))}
        </div>

        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[18rem]">Role</TableHead>
                <TableHead>Số tiền lương cứng</TableHead>
                <TableHead>% khấu trừ vận hành lương cứng</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 6 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="h-4 w-28 animate-pulse rounded bg-bg-tertiary" />
                      </TableCell>
                      <TableCell>
                        <div className="h-10 animate-pulse rounded bg-bg-secondary" />
                      </TableCell>
                      <TableCell>
                        <div className="h-10 animate-pulse rounded bg-bg-secondary" />
                      </TableCell>
                    </TableRow>
                  ))
                : FIXED_SALARY_STAFF_ROLES.map((roleType) => (
                    <TableRow key={roleType}>
                      <TableCell className="font-medium text-text-primary">
                        {ROLE_LABELS[roleType] ?? roleType}
                      </TableCell>
                      <TableCell className="min-w-[14rem] align-top">
                        <AmountFields
                          roleType={roleType}
                          value={amountDraft[roleType]}
                          canEdit={canEditSettings}
                          onChange={(value) =>
                            handleAmountChange(roleType, value)
                          }
                        />
                      </TableCell>
                      <TableCell className="min-w-[12rem] align-top">
                        <OperatingRateFields
                          roleType={roleType}
                          value={rateDraft[roleType]}
                          canEdit={canEditSettings}
                          onChange={(value) => handleRateChange(roleType, value)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </div>
      </RolePolicySettingsCard>
    </div>
  );
}
