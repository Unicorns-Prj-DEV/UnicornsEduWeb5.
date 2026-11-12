"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useDebounce } from "use-debounce";
import { Lock, LockOpen, Search, UserCog, UserPlus } from "lucide-react";
import SaleCsTeamActionButton from "@/components/staff/sale-cs-team/SaleCsTeamActionButton";
import SaleCsTeamMemberIdentity from "@/components/staff/sale-cs-team/SaleCsTeamMemberIdentity";
import SaleCsTeamRolesDialog from "@/components/staff/sale-cs-team/SaleCsTeamRolesDialog";
import { useSaleCsTeamAccountLock } from "@/components/staff/sale-cs-team/useSaleCsTeamAccountLock";
import TutorPager from "@/components/staff/tutors/TutorPager";
import { Skeleton } from "@/components/ui/skeleton";
import UpgradedSelect from "@/components/ui/UpgradedSelect";
import { useQueryErrorToast } from "@/hooks/use-query-error-toast";
import { useRowLink } from "@/hooks/use-row-link";
import type {
  SaleCsTeamMember,
  SaleCsTeamRole,
  SaleCsTeamScope,
} from "@/dtos/sale-cs-team.dto";
import type { StaffStatus } from "@/dtos/staff.dto";
import {
  listSaleCsTeamMembers,
  saleCsTeamKeys,
} from "@/lib/apis/sale-cs-team.api";
import { ROW_LINK_INTERACTION_CLASS } from "@/lib/row-link";
import { formatCustomerCarePercent } from "@/lib/sale-cs-team";

const PAGE_SIZE = 20;
const memberHref = (id: string) =>
  `/staff/sale-cs-team/${encodeURIComponent(id)}`;
const memberLabel = (member: SaleCsTeamMember) =>
  `Xem ${member.fullName.trim() || "thành viên"}`;

const SCOPE_OPTIONS = [
  { value: "members", label: "Thành viên đội" },
  { value: "candidates", label: "Nhân sự khác" },
];
const ROLE_OPTIONS = [
  { value: "", label: "Sale & CSKH" },
  { value: "sale", label: "Chỉ Sale" },
  { value: "customer_care", label: "Chỉ CSKH" },
];
const STATUS_OPTIONS = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "active", label: "Hoạt động" },
  { value: "inactive", label: "Ngừng hoạt động" },
];

/**
 * Trưởng phòng Sale & CSKH quản lý đội (#271). Nút hành động hiện theo
 * `permissions` backend trả cho từng dòng.
 */
export default function StaffSaleCsTeamPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search] = useDebounce(searchInput.trim(), 300);
  const [scope, setScope] = useState<SaleCsTeamScope>("members");
  const [role, setRole] = useState<"" | SaleCsTeamRole>("");
  const [status, setStatus] = useState<"" | StaffStatus>("");
  const [page, setPage] = useState(1);
  const [roleTarget, setRoleTarget] = useState<SaleCsTeamMember | null>(null);
  const rowLink = useRowLink();
  const accountLock = useSaleCsTeamAccountLock();

  const isCandidates = scope === "candidates";
  const params = {
    page,
    limit: PAGE_SIZE,
    search,
    status,
    scope,
    role: isCandidates ? ("" as const) : role,
  };
  const { data, isLoading, isError } = useQuery({
    queryKey: saleCsTeamKeys.list(params),
    queryFn: () => listSaleCsTeamMembers(params),
    placeholderData: keepPreviousData,
  });
  const members = data?.data ?? [];
  useQueryErrorToast(isError, "Không tải được danh sách nhân sự.");

  const resetPage = () => setPage(1);

  const renderActions = (member: SaleCsTeamMember) => (
    <div className="flex flex-wrap items-center gap-x-4">
      {member.permissions.canEditRoles ? (
        <SaleCsTeamActionButton
          onClick={() => setRoleTarget(member)}
          icon={
            isCandidates ? (
              <UserPlus className="size-3.5 shrink-0" aria-hidden />
            ) : (
              <UserCog className="size-3.5 shrink-0" aria-hidden />
            )
          }
        >
          {isCandidates ? "Bật role" : "Sửa role"}
        </SaleCsTeamActionButton>
      ) : null}
      {!isCandidates &&
      member.permissions.canLockAccount &&
      member.accountLocked != null ? (
        <SaleCsTeamActionButton
          tone={member.accountLocked ? "primary" : "danger"}
          disabled={accountLock.isPending}
          onClick={() => void accountLock.requestToggle(member)}
          icon={
            member.accountLocked ? (
              <LockOpen className="size-3.5 shrink-0" aria-hidden />
            ) : (
              <Lock className="size-3.5 shrink-0" aria-hidden />
            )
          }
        >
          {member.accountLocked ? "Mở khoá" : "Khoá tài khoản"}
        </SaleCsTeamActionButton>
      ) : null}
    </div>
  );

  const renderSummary = (member: SaleCsTeamMember) =>
    member.roles.includes("customer_care") ? (
      <dl className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt className="text-text-muted">% CSKH mặc định</dt>
          <dd className="font-medium text-text-primary">
            {formatCustomerCarePercent(member.customerCareDefaultProfitPercent)}
          </dd>
        </div>
        <div>
          <dt className="text-text-muted">Học sinh CSKH</dt>
          <dd className="font-medium text-text-primary">
            {member.customerCareStudentCount}
          </dd>
        </div>
      </dl>
    ) : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 bg-bg-primary p-4 pb-8 sm:p-6">
      <header>
        <h1 className="text-xl font-semibold text-text-primary">
          Đội Sale & CSKH
        </h1>
        <p className="text-sm text-text-muted">
          {isCandidates
            ? "Nhân sự chưa thuộc đội — bật role Sale hoặc CSKH để thêm vào đội."
            : "Thành viên Sale và CSKH. Không gồm liên hệ, giấy tờ, ngân hàng, lương."}
        </p>
      </header>

      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="flex min-h-10 flex-1 items-center gap-2 rounded-md border border-border-default bg-bg-surface px-3 focus-within:ring-2 focus-within:ring-border-focus">
          <Search className="size-4 shrink-0 text-text-muted" aria-hidden />
          <span className="sr-only">Tìm nhân sự</span>
          <input
            type="search"
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value);
              resetPage();
            }}
            placeholder="Theo tên…"
            className="min-w-0 flex-1 border-0 bg-transparent py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
          />
        </label>
        <div className="sm:w-44">
          <UpgradedSelect
            name="sale-cs-team-scope"
            ariaLabel="Phạm vi"
            value={scope}
            options={SCOPE_OPTIONS}
            onValueChange={(next) => {
              setScope(next as SaleCsTeamScope);
              resetPage();
            }}
          />
        </div>
        {!isCandidates ? (
          <div className="sm:w-40">
            <UpgradedSelect
              name="sale-cs-team-role"
              ariaLabel="Lọc role"
              value={role}
              options={ROLE_OPTIONS}
              onValueChange={(next) => {
                setRole(next as "" | SaleCsTeamRole);
                resetPage();
              }}
            />
          </div>
        ) : null}
        <div className="sm:w-48">
          <UpgradedSelect
            name="sale-cs-team-status"
            ariaLabel="Lọc trạng thái"
            value={status}
            options={STATUS_OPTIONS}
            onValueChange={(next) => {
              setStatus(next as "" | StaffStatus);
              resetPage();
            }}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : members.length === 0 ? (
        <p className="py-10 text-center text-sm text-text-muted">
          {isError ? "Chưa có dữ liệu." : "Không có nhân sự phù hợp."}
        </p>
      ) : (
        <ul
          className="grid gap-3 lg:grid-cols-2"
          aria-label="Danh sách nhân sự"
        >
          {members.map((member) => (
            <li
              key={member.id}
              {...(isCandidates
                ? {}
                : rowLink(memberHref(member.id), memberLabel(member)))}
              className={`flex flex-col gap-3 rounded-xl border border-border-default bg-bg-surface p-4 ${isCandidates ? "" : ROW_LINK_INTERACTION_CLASS}`}
            >
              <SaleCsTeamMemberIdentity member={member} />
              {isCandidates ? null : renderSummary(member)}
              {renderActions(member)}
            </li>
          ))}
        </ul>
      )}

      {data ? (
        <TutorPager
          page={page}
          total={data.meta.total}
          limit={data.meta.limit}
          onPageChange={setPage}
        />
      ) : null}

      {roleTarget ? (
        <SaleCsTeamRolesDialog
          staff={roleTarget}
          onClose={() => setRoleTarget(null)}
        />
      ) : null}
      {accountLock.dialog}
    </div>
  );
}
