import * as React from "react";
import { cn } from "@/lib/utils";

type AlertVariant = "default" | "success" | "warning" | "destructive" | "info";

const ALERT_VARIANTS: Record<AlertVariant, string> = {
  default: "border-border-default bg-bg-surface text-text-primary",
  success: "border-success/20 bg-success/10 text-success",
  warning: "border-warning/20 bg-warning/10 text-warning",
  destructive: "border-error/20 bg-error/10 text-error",
  info: "border-info/20 bg-info/10 text-info",
};

function Alert({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & {
  variant?: AlertVariant;
}) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn("grid items-start gap-1 rounded-[1.25rem] border px-4 py-3", ALERT_VARIANTS[variant], className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn("font-medium tracking-[-0.02em]", className)}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn("text-sm leading-6 text-current", className)}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription };
