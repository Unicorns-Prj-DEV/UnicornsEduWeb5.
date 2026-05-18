"use client";

import { type ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { openNativeInputPicker } from "./nativeInputPicker";

export type DateInputProps = Omit<ComponentProps<"input">, "type">;

export function DateInput({
  className,
  disabled,
  readOnly,
  onClick,
  ref,
  ...props
}: DateInputProps) {
  return (
    <input
      ref={ref}
      type="date"
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
