import TutorStatusBadge from "@/components/staff/tutors/TutorStatusBadge";
import { Badge } from "@/components/ui/badge";
import UserAvatar from "@/components/ui/UserAvatar";
import type { SaleCsTeamMember } from "@/dtos/sale-cs-team.dto";
import { pickAvatarUrl } from "@/lib/avatar";
import { formatStaffRoleLabels } from "@/lib/training-head-roles";
import { ROLE_LABELS } from "@/lib/staff.constants";

/** Avatar + tên + role + trạng thái nhân sự / khoá tài khoản. */
export default function SaleCsTeamMemberIdentity({
  member,
  size = "md",
}: {
  member: SaleCsTeamMember;
  size?: "md" | "lg";
}) {
  const name = member.fullName.trim() || "Nhân sự";
  const avatarClass = size === "lg" ? "size-14 text-lg" : "size-10 text-sm";
  return (
    <div className="flex min-w-0 items-start gap-3">
      <UserAvatar
        src={pickAvatarUrl(member.avatarUrl)}
        fallback={name.charAt(0).toUpperCase()}
        alt={name}
        className={`${avatarClass} shrink-0 bg-bg-tertiary font-semibold text-text-primary`}
      />
      <div className="min-w-0 flex-1">
        <p
          className={`font-medium wrap-anywhere text-text-primary ${size === "lg" ? "text-lg" : ""}`}
        >
          {name}
        </p>
        {member.roles.length > 0 ? (
          <p className="mt-0.5 text-xs text-text-secondary wrap-anywhere">
            {formatStaffRoleLabels(member.roles, ROLE_LABELS)}
          </p>
        ) : null}
        <div className="mt-1 flex flex-wrap gap-1.5">
          <TutorStatusBadge status={member.status} />
          {member.accountLocked ? (
            <Badge variant="destructive">Đã khoá tài khoản</Badge>
          ) : null}
        </div>
      </div>
    </div>
  );
}
