"use client";

import { type ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { openNativeInputPicker } from "./nativeInputPicker";

export type MonthInputProps = Omit<ComponentProps<"input">, "type">;

export function MonthInput({
  className,
  disabled,
  readOnly,
  onClick,
  ref,
  ...props
}: MonthInputProps) {
  return (
    <input
      ref={ref}
      type="month"
      disabled={disabled}
      readOnly={readOnly}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          openNativeInputPicker(event.currentTarget);
        }
      }}
      className={cn(!disabled && !readOnly && "cursor-pointer", className)}
      {...props}
    />
  );
}
