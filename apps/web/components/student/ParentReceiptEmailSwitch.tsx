"use client";

import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type Props = {
  enabled: boolean;
  disabled?: boolean;
  onToggle: (enabled: boolean) => void;
  className?: string;
};

export default function ParentReceiptEmailSwitch({
  enabled,
  disabled = false,
  onToggle,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 rounded-[1.15rem] border border-border-default bg-bg-secondary/60 px-4 py-4",
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-medium text-text-primary">
          Gửi biên lai nạp ví qua email
        </p>
        <p className="text-xs leading-relaxed text-text-muted">
          Khi tắt, hệ thống không gửi biên lai cho phụ huynh và CSKH sau khi nạp
          ví thành công. Số dư ví vẫn được cập nhật bình thường.
        </p>
      </div>
      <Switch
        checked={enabled}
        disabled={disabled}
        onCheckedChange={onToggle}
        aria-label="Gửi biên lai nạp ví qua email"
        className="mt-0.5"
      />
    </div>
  );
}
