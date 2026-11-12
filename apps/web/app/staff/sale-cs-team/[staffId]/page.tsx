"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Lock, LockOpen, Pencil, UserCog } from "lucide-react";
import SaleCsTeamBonusesSection from "@/components/staff/sale-cs-team/SaleCsTeamBonusesSection";
import SaleCsTeamMemberIdentity from "@/components/staff/sale-cs-team/SaleCsTeamMemberIdentity";
import SaleCsTeamProfileDialog from "@/components/staff/sale-cs-team/SaleCsTeamProfileDialog";
import SaleCsTeamRolesDialog from "@/components/staff/sale-cs-team/SaleCsTeamRolesDialog";
import SaleCsTeamSaleAllowancesSection from "@/components/staff/sale-cs-team/SaleCsTeamSaleAllowancesSection";
import { useSaleCsTeamAccountLock } from "@/components/staff/sale-cs-team/useSaleCsTeamAccountLock";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryErrorToast } from "@/hooks/use-query-error-toast";
import {
  getSaleCsTeamMember,
  saleCsTeamKeys,
} from "@/lib/apis/sale-cs-team.api";
import { formatCustomerCarePercent } from "@/lib/sale-cs-team";

const ACTION_CLASS =
  "inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-border-default bg-bg-surface px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-50";

export default function StaffSaleCsTeamMemberPage() {
  const params = useParams<{ staffId: string }>();
  const staffId = decodeURIComponent(params.staffId ?? "");
  const [showRoles, setShowRoles] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const accountLock = useSaleCsTeamAccountLock();

  const {
    data: member,
    isLoading,
    isError,
  } = useQuery({
    queryKey: saleCsTeamKeys.detail(staffId),
    queryFn: () => getSaleCsTeamMember(staffId),
    enabled: Boolean(staffId),
  });
  useQueryErrorToast(isError, "Không tải được hồ sơ thành viên.");

  const isSale = member?.roles.includes("sale") ?? false;
  const isCustomerCare = member?.roles.includes("customer_care") ?? false;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 bg-bg-primary p-4 pb-8 sm:p-6">
      <Link
        href="/staff/sale-cs-team"
        className="inline-flex min-h-10 items-center gap-1.5 self-start text-sm text-text-muted hover:text-text-primary"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Đội Sale & CSKH
      </Link>

      {isLoading ? (
        <Skeleton className="h-32 w-full rounded-xl" />
      ) : !member ? (
        <p className="py-10 text-center text-sm text-text-muted">
          Không tìm thấy thành viên trong đội.
        </p>
      ) : (
        <>
          <section className="flex flex-col gap-4 rounded-xl border border-border-default bg-bg-surface p-4">
            <SaleCsTeamMemberIdentity member={member} size="lg" />
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-text-muted">Trường đại học</dt>
                <dd className="text-text-primary wrap-anywhere">
                  {member.university?.trim() || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-text-muted">Trường THPT</dt>
                <dd className="text-text-primary wrap-anywhere">
                  {member.highSchool?.trim() || "—"}
                </dd>
              </div>
              {isCustomerCare ? (
                <>
                  <div>
                    <dt className="text-xs text-text-muted">
                      % CSKH mặc định (chỉ Admin sửa)
                    </dt>
                    <dd className="text-text-primary">
                      {formatCustomerCarePercent(
                        member.customerCareDefaultProfitPercent,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-text-muted">Học sinh CSKH</dt>
                    <dd className="text-text-primary">
                      {member.customerCareStudentCount}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs text-text-muted">
                      Trưởng phòng quản lý
                    </dt>
                    <dd className="text-text-primary wrap-anywhere">
                      {member.managedBy?.fullName.trim() || "—"}
                    </dd>
                  </div>
                </>
              ) : null}
            </dl>
            <div className="flex flex-wrap gap-2">
              {member.permissions.canEditProfile ? (
                <button
                  type="button"
                  className={ACTION_CLASS}
                  onClick={() => setShowProfile(true)}
                >
                  <Pencil className="size-4" aria-hidden />
                  Sửa hồ sơ chuyên môn
                </button>
              ) : null}
              {member.permissions.canEditRoles ? (
                <button
                  type="button"
                  className={ACTION_CLASS}
                  onClick={() => setShowRoles(true)}
                >
                  <UserCog className="size-4" aria-hidden />
                  Sửa role
                </button>
              ) : null}
              {member.permissions.canLockAccount &&
              member.accountLocked != null ? (
                <button
                  type="button"
                  className={`${ACTION_CLASS} ${member.accountLocked ? "" : "text-error"}`}
                  disabled={accountLock.isPending}
                  onClick={() => void accountLock.requestToggle(member)}
                >
                  {member.accountLocked ? (
                    <LockOpen className="size-4" aria-hidden />
                  ) : (
                    <Lock className="size-4" aria-hidden />
                  )}
                  {member.accountLocked
                    ? "Mở khoá tài khoản"
                    : "Khoá tài khoản"}
                </button>
              ) : null}
              {isCustomerCare ? (
                <Link
                  href={`/staff/customer-care-detail/${encodeURIComponent(member.id)}`}
                  className={ACTION_CLASS}
                >
                  Học sinh & lịch sử CSKH
                </Link>
              ) : null}
            </div>
          </section>

          {isSale ? (
            <SaleCsTeamSaleAllowancesSection staffId={member.id} />
          ) : null}
          <SaleCsTeamBonusesSection staffId={member.id} />

          {showRoles ? (
            <SaleCsTeamRolesDialog
              staff={member}
              onClose={() => setShowRoles(false)}
            />
          ) : null}
          {showProfile ? (
            <SaleCsTeamProfileDialog
              member={member}
              onClose={() => setShowProfile(false)}
            />
          ) : null}
        </>
      )}
      {accountLock.dialog}
    </div>
  );
}
