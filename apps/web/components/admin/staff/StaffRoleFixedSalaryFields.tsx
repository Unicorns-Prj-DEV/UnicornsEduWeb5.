"use client";

import { MoneyInput } from "@/components/ui/MoneyInput";
import {
  fixedSalaryInputClassName,
  formatFixedSalaryVnd,
} from "@/lib/fixed-salary-settings.helpers";

function axisPreview(params: {
  input: string;
  roleDefault: number | null;
  formatApplied: (value: number) => string;
  zeroOverrideLabel: string;
}): { value: string; sourceLabel: string } {
  const trimmed = params.input.trim();
  if (trimmed === "") {
    if (params.roleDefault == null) {
      return { value: "chưa cấu hình", sourceLabel: "mặc định vai trò" };
    }
    return {
      value: params.formatApplied(params.roleDefault),
      sourceLabel: "mặc định vai trò",
    };
  }

  if (trimmed === "0") {
    return {
      value: params.formatApplied(0),
      sourceLabel: params.zeroOverrideLabel,
    };
  }

  return { value: trimmed, sourceLabel: "mức đè" };
}

export default function StaffRoleFixedSalaryFields({
  roleLabel,
  amountValue,
  rateValue,
  roleDefaultAmount,
  roleDefaultRate,
  onAmountChange,
  onRateChange,
}: {
  roleLabel: string;
  amountValue: string;
  rateValue: string;
  roleDefaultAmount: number | null;
  roleDefaultRate: number | null;
  onAmountChange: (value: string) => void;
  onRateChange: (value: string) => void;
}) {
  const amountPreview = axisPreview({
    input: amountValue,
    roleDefault: roleDefaultAmount,
    formatApplied: formatFixedSalaryVnd,
    zeroOverrideLabel: "cố ý loại — mức đè",
  });
  const parsedRate =
    rateValue.trim() === "" ? null : Number(rateValue.replace(",", "."));
  const ratePreview = axisPreview({
    input: rateValue,
    roleDefault: roleDefaultRate,
    formatApplied: (value) => `${value}%`,
    zeroOverrideLabel: "cố ý 0% — mức đè",
  });
  const rateDisplay =
    rateValue.trim() !== "" &&
    rateValue.trim() !== "0" &&
    parsedRate != null &&
    Number.isFinite(parsedRate)
      ? { value: `${parsedRate}%`, sourceLabel: "mức đè" }
      : ratePreview;

  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <label className="flex min-w-0 flex-col gap-1.5 text-sm text-text-secondary">
        <span>Lương cứng</span>
        <p className="text-xs text-text-secondary">
          Đang áp dụng:{" "}
          <span className="font-medium text-text-primary tabular-nums">
            {amountPreview.value}
          </span>
          <span className="text-text-muted"> ({amountPreview.sourceLabel})</span>
        </p>
        <MoneyInput
          name={`staff-role-amount-${roleLabel}`}
          value={amountValue}
          onValueChange={onAmountChange}
          placeholder="Để trống = mặc định vai trò"
          aria-label={`Lương cứng ${roleLabel}`}
          className={fixedSalaryInputClassName}
        />
        <span className="text-xs text-text-muted">
          Để trống = dùng mặc định vai trò. Nhập 0 = cố ý loại.
        </span>
      </label>

      <label className="flex min-w-0 flex-col gap-1.5 text-sm text-text-secondary">
        <span>% vận hành</span>
        <p className="text-xs text-text-secondary">
          Đang áp dụng:{" "}
          <span className="font-medium text-text-primary tabular-nums">
            {rateDisplay.value}
          </span>
          <span className="text-text-muted"> ({rateDisplay.sourceLabel})</span>
        </p>
        <input
          name={`staff-role-rate-${roleLabel}`}
          inputMode="decimal"
          value={rateValue}
          onChange={(event) => onRateChange(event.target.value)}
          placeholder="Để trống = mặc định vai trò"
          aria-label={`% vận hành ${roleLabel}`}
          className={fixedSalaryInputClassName}
        />
        <span className="text-xs text-text-muted">
          Để trống = dùng mặc định vai trò. Nhập 0 = cố ý 0%.
        </span>
      </label>
    </div>
  );
}
