"use client";

import { useId, useState, type ChangeEvent, type ComponentProps } from "react";
import MonthNav from "@/components/admin/MonthNav";
import { getDefaultMonthKey, parseMonthKey } from "@/lib/month-format";
import { cn } from "@/lib/utils";

export type MonthInputProps = Omit<ComponentProps<"input">, "type">;

function emitMonthChange(
  onChange: MonthInputProps["onChange"],
  monthKey: string,
  name?: string,
) {
  if (!onChange) {
    return;
  }

  const event = {
    target: { value: monthKey, name: name ?? "" },
    currentTarget: { value: monthKey, name: name ?? "" },
  } as ChangeEvent<HTMLInputElement>;

  onChange(event);
}

export function MonthInput({
  className,
  disabled,
  readOnly,
  value,
  onChange,
  name,
  id,
  "aria-label": ariaLabel,
  ...props
}: MonthInputProps) {
  const generatedId = useId();
  const [monthPopupOpen, setMonthPopupOpen] = useState(false);
  const parsed = parseMonthKey(typeof value === "string" ? value : "");
  const monthKey =
    typeof value === "string" && value.trim()
      ? value
      : parsed?.monthKey ?? getDefaultMonthKey();
  const isDisabled = Boolean(disabled || readOnly);

  const handleMonthNavChange = (nextMonthKey: string) => {
    emitMonthChange(onChange, nextMonthKey, name);
  };

  return (
    <div
      id={id ?? generatedId}
      data-month-input
      className={cn("w-full", className)}
      aria-label={ariaLabel}
    >
      <input
        type="hidden"
        name={name}
        value={monthKey}
        readOnly
        tabIndex={-1}
        aria-hidden
        {...props}
      />
      <MonthNav
        value={monthKey}
        onChange={handleMonthNavChange}
        monthPopupOpen={monthPopupOpen}
        setMonthPopupOpen={setMonthPopupOpen}
        disabled={isDisabled}
      />
    </div>
  );
}
