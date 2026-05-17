"use client";

import { forwardRef, type ComponentProps } from "react";
import { cn } from "@/lib/utils";

export type TimeInputProps = Omit<ComponentProps<"input">, "type">;

function openTimePicker(input: HTMLInputElement) {
  if (input.disabled || input.readOnly) return;
  try {
    input.showPicker?.();
  } catch {
    // showPicker may throw when not allowed; native focus still works.
  }
}

export const TimeInput = forwardRef<HTMLInputElement, TimeInputProps>(function TimeInput(
  { className, step = 1, disabled, readOnly, onClick, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      type="time"
      step={step}
      disabled={disabled}
      readOnly={readOnly}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          openTimePicker(event.currentTarget);
        }
      }}
      className={cn(!disabled && !readOnly && "cursor-pointer", className)}
      {...props}
    />
  );
});
