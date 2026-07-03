"use client";

import { useRouter } from "next/navigation";
import UserAvatar from "@/components/ui/UserAvatar";
import type { StaffStatus } from "@/dtos/staff.dto";
import { pickAvatarUrl } from "@/lib/avatar";
import {
  buildAdminLikePath,
  type AdminLikeRouteBase,
} from "@/lib/admin-shell-paths";

const STATUS_LABELS: Record<StaffStatus, string> = {
  active: "Hoạt động",
  inactive: "Ngừng hoạt động",
};

type StaffListAvatarProps = {
  staffId: string;
  fullName?: string | null;
  avatarUrl?: string | null;
  status: StaffStatus;
  routeBase: AdminLikeRouteBase;
  className?: string;
};

export default function StaffListAvatar({
  staffId,
  fullName,
  avatarUrl,
  status,
  routeBase,
  className,
}: StaffListAvatarProps) {
  const { push } = useRouter();
  const displayName = fullName?.trim() || "Nhân sự";
  const fallback = displayName.charAt(0).toUpperCase();
  const src = pickAvatarUrl(avatarUrl);

  const goToDetail = () => {
    push(buildAdminLikePath(routeBase, `staffs/${staffId}`));
  };

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        goToDetail();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.stopPropagation();
        }
      }}
      className={`relative inline-flex shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface ${className ?? ""}`}
      aria-label={`Xem hồ sơ ${displayName}`}
      title={`Xem hồ sơ ${displayName}`}
    >
      <UserAvatar
        src={src}
        fallback={fallback}
        alt={`Avatar ${displayName}`}
        className="size-10 bg-bg-tertiary text-sm font-semibold text-text-primary ring-2 ring-border-default"
      />
      <span
        className={`absolute bottom-0 right-0 block size-2.5 rounded-full border-2 border-bg-surface ${
          status === "active" ? "bg-success" : "bg-error"
        }`}
        title={STATUS_LABELS[status]}
        aria-hidden
      />
    </button>
  );
}
