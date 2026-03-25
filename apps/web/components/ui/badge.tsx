import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant =
  | "default"
  | "secondary"
  | "success"
  | "warning"
  | "destructive"
  | "info"
  | "outline";

const BADGE_VARIANTS: Record<BadgeVariant, string> = {
  default: "border-primary/15 bg-primary/10 text-primary",
  secondary: "border-border-default bg-bg-secondary text-text-secondary",
  success: "border-success/20 bg-success/10 text-success",
  warning: "border-warning/20 bg-warning/10 text-warning",
  destructive: "border-error/20 bg-error/10 text-error",
  info: "border-info/20 bg-info/10 text-info",
  outline: "border-border-default bg-transparent text-text-primary",
};

function Badge({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"span"> & {
  variant?: BadgeVariant;
}) {
  return (
    <span
      data-slot="badge"
      data-variant={variant}
      className={cn(
        "inline-flex w-fit shrink-0 items-center justify-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none",
        BADGE_VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
