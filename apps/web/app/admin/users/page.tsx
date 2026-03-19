"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import UpgradedSelect from "@/components/ui/UpgradedSelect";
import * as userApi from "@/lib/apis/user.api";
import * as staffApi from "@/lib/apis/staff.api";
import {
  type UserListItem,
  type UserRoleType,
  type UserDetailWithStaff,
  type StaffRole,
} from "@/dtos/user.dto";
import { USER_ROLE_LABELS } from "@/lib/user.constants";
import { ROLE_LABELS } from "@/lib/staff.constants";

const PAGE_SIZE = 20;
const ROLE_TYPE_OPTIONS: Array<{ value: UserRoleType; label: string }> = [
  { value: "guest", label: USER_ROLE_LABELS.guest },
  { value: "staff", label: USER_ROLE_LABELS.staff },
  { value: "student", label: USER_ROLE_LABELS.student },
  { value: "admin", label: USER_ROLE_LABELS.admin },
];

const STAFF_ROLES: StaffRole[] = [
  "admin",
  "teacher",
  "lesson_plan",
  "lesson_plan_head",
  "accountant",
  "communication",
  "communication_head",
  "customer_care",
  "customer_care_head",
];

function parsePage(value: string | null): number {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

function roleBadgeClass(roleType: UserRoleType): string {
  switch (roleType) {
    case "admin":
      return "bg-primary/15 text-primary ring-primary/20";
    case "staff":
      return "bg-info/15 text-info ring-info/20";
    case "student":
      return "bg-success/15 text-success ring-success/20";
    default:
      return "bg-bg-tertiary text-text-secondary ring-border-default";
  }
}

function AssignRoleModal({
  user,
  onClose,
  onSaved,
}: {
  user: UserDetailWithStaff | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const queryClient = useQueryClient();
  const [roleType, setRoleType] = useState<UserRoleType>(user?.roleType ?? "guest");
  const [staffRoles, setStaffRoles] = useState<StaffRole[]>(
    user?.staffInfo?.roles ?? []
  );
  const [saving, setSaving] = useState(false);

  const updateUserMutation = useMutation({
    mutationFn: (payload: { id: string; roleType: UserRoleType }) =>
      userApi.updateUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", "list"] });
      queryClient.invalidateQueries({ queryKey: ["user", user?.id] });
    },
  });

  const updateStaffMutation = useMutation({
    mutationFn: (payload: { id: string; roles: string[] }) =>
      staffApi.updateStaff(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
  });

  useEffect(() => {
    if (user) {
      setRoleType(user.roleType);
      setStaffRoles(user.staffInfo?.roles ?? []);
    }
  }, [user?.id, user?.roleType, user?.staffInfo?.roles]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateUserMutation.mutateAsync({ id: user.id, roleType });
      if (roleType === "staff" && user.staffInfo && staffRoles.length > 0) {
        await updateStaffMutation.mutateAsync({
          id: user.staffInfo.id,
          roles: staffRoles,
        });
      }
      toast.success("Đã cập nhật phân quyền.");
      onSaved();
      onClose();
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? (err as Error)?.message ?? "Cập nhật thất bại.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const hasStaffInfo = !!user?.staffInfo;
  const showStaffRoles = roleType === "staff";

  if (!user) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px]"
        aria-hidden
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="assign-role-dialog-title"
        className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border-default bg-bg-surface p-4 shadow-xl sm:p-5"
      >
        <h2
          id="assign-role-dialog-title"
          className="text-lg font-semibold text-text-primary"
        >
          Phân quyền
        </h2>
        <p className="mt-1 text-sm text-text-muted">
          {user.accountHandle}
          {user.first_name || user.last_name
            ? ` · ${[user.first_name, user.last_name].filter(Boolean).join(" ")}`
            : ""}
        </p>

        <div className="mt-4 space-y-4">
          <label className="block">
            <span
              id="assign-role-type-label"
              className="mb-1.5 block text-sm font-medium text-text-secondary"
            >
              Loại tài khoản
            </span>
            <UpgradedSelect
              value={roleType}
              onValueChange={(value) => setRoleType(value as UserRoleType)}
              options={ROLE_TYPE_OPTIONS}
              labelId="assign-role-type-label"
              ariaLabel="Chọn loại tài khoản"
              buttonClassName="min-h-11 rounded-xl border border-border-default bg-gradient-to-b from-bg-surface to-bg-secondary/80 px-3.5 py-2.5 text-sm font-medium text-text-primary shadow-sm transition-[border-color,background-color,box-shadow] duration-200 hover:border-border-focus hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              menuClassName="rounded-2xl border border-border-default bg-bg-surface p-1.5 shadow-2xl"
            />
          </label>

          {showStaffRoles && (
            <div className="block">
              <span className="mb-2 block text-sm font-medium text-text-secondary">
                Role nhân sự
              </span>
              {hasStaffInfo ? (
                <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border border-border-default bg-bg-secondary/50 p-3">
                  {STAFF_ROLES.map((role) => (
                    <label
                      key={role}
                      className="flex cursor-pointer items-center gap-2 text-sm text-text-primary"
                    >
                      <input
                        type="checkbox"
                        checked={staffRoles.includes(role)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setStaffRoles((prev) => [...prev, role]);
                          } else {
                            setStaffRoles((prev) => prev.filter((r) => r !== role));
                          }
                        }}
                        className="h-4 w-4 rounded border-border-default text-primary focus:ring-border-focus"
                      />
                      {ROLE_LABELS[role] ?? role}
                    </label>
                  ))}
                </div>
              ) : (
                <p className="rounded-md border border-border-default bg-bg-secondary/50 p-3 text-sm text-text-muted">
                  User chưa có hồ sơ nhân sự. Tạo hồ sơ tại trang Nhân sự trước khi gán role chi tiết.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 flex-1 rounded-md border border-border-default bg-bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="min-h-11 flex-1 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-text-inverse transition hover:bg-[var(--ue-primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:opacity-50"
          >
            {saving ? "Đang lưu…" : "Lưu"}
          </button>
        </div>
      </div>
    </>
  );
}

function UserListTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-14 animate-pulse rounded-lg bg-bg-secondary/60"
          aria-hidden
        />
      ))}
    </div>
  );
}

export default function AdminUsersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const page = parsePage(searchParams.get("page"));
  const [assignModalUser, setAssignModalUser] =
    useState<UserDetailWithStaff | null>(null);

  const replacePage = (newPage: number) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("page", String(newPage));
    router.replace(`${pathname}?${params.toString()}`);
  };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["user", "list", page, PAGE_SIZE],
    queryFn: () => userApi.getUserList({ page, limit: PAGE_SIZE }),
  });

  const { data: detailUser, isLoading: detailLoading } = useQuery({
    queryKey: ["user", assignModalUser?.id],
    queryFn: () => userApi.getUserById(assignModalUser!.id),
    enabled: !!assignModalUser?.id,
  });

  const list = data?.data ?? [];
  const total = data?.meta?.total ?? 0;
  const currentPage = data?.meta?.page ?? page;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(currentPage * PAGE_SIZE, total);

  const handleRowClick = (u: UserListItem) => {
    setAssignModalUser({
      ...u,
      staffInfo: undefined,
    });
  };

  const handleCloseModal = () => {
    setAssignModalUser(null);
  };

  const modalUser = detailUser ?? assignModalUser;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-3 pb-8 sm:p-6">
      <div className="flex min-w-0 flex-1 flex-col rounded-xl border border-border-default bg-bg-surface p-3 shadow-sm sm:rounded-lg sm:p-5">
        <section className="relative mb-4 overflow-visible rounded-2xl border border-border-default bg-gradient-to-br from-bg-secondary via-bg-surface to-bg-secondary/70 p-4 sm:p-5">
          <div
            className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-primary/10 blur-2xl"
            aria-hidden
          />
          <h1 className="relative text-xl font-semibold text-text-primary sm:text-2xl">
            User
          </h1>
          <p className="relative mt-1 text-sm text-text-secondary">
            Xem toàn bộ user trong hệ thống và phân quyền: chọn loại tài khoản (Nhân sự / Học sinh) và role chi tiết cho nhân sự.
          </p>
        </section>

        <div className="min-w-0 flex-1 overflow-auto">
          {isLoading ? (
            <UserListTableSkeleton rows={PAGE_SIZE} />
          ) : isError ? (
            <div
              className="py-16 text-center text-error"
              role="alert"
              aria-live="assertive"
            >
              <p className="text-sm">
                {(error as { response?: { data?: { message?: string } } })?.response
                  ?.data?.message ??
                  (error as Error)?.message ??
                  "Không tải được danh sách user."}
              </p>
            </div>
          ) : list.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center gap-2 py-16 text-text-muted"
              aria-live="polite"
            >
              <p className="text-sm">Chưa có user nào.</p>
            </div>
          ) : (
            <>
              <div
                className="block space-y-3 md:hidden"
                role="list"
                aria-label="Danh sách user"
              >
                {list.map((u) => (
                  <article
                    key={u.id}
                    role="listitem"
                    className="cursor-pointer rounded-xl border border-border-default bg-bg-surface p-4 shadow-sm transition-colors duration-200 hover:bg-bg-secondary focus-within:bg-bg-secondary"
                    onClick={() => handleRowClick(u)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleRowClick(u);
                      }
                    }}
                    tabIndex={0}
                    aria-label={`Phân quyền ${u.accountHandle}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-text-primary">
                          {u.accountHandle}
                        </p>
                        <p className="mt-0.5 truncate text-sm text-text-secondary">
                          {u.email}
                        </p>
                      </div>
                      <span
                        className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${roleBadgeClass(u.roleType as UserRoleType)}`}
                      >
                        {USER_ROLE_LABELS[u.roleType as UserRoleType] ?? u.roleType}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-text-muted">
                      {(u.first_name || u.last_name)?.trim() || "—"}
                    </p>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[720px] table-fixed border-collapse text-left text-sm">
                  <caption className="sr-only">Danh sách user</caption>
                  <thead>
                    <tr className="border-b border-border-default bg-bg-secondary/80">
                      <th
                        scope="col"
                        className="w-[28%] min-w-0 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-secondary"
                      >
                        User
                      </th>
                      <th
                        scope="col"
                        className="w-[22%] min-w-0 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-secondary"
                      >
                        Email
                      </th>
                      <th
                        scope="col"
                        className="w-[18%] min-w-0 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-secondary"
                      >
                        Loại tài khoản
                      </th>
                      <th
                        scope="col"
                        className="w-[18%] min-w-0 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-secondary"
                      >
                        Trạng thái
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((u) => (
                      <tr
                        key={u.id}
                        role="button"
                        tabIndex={0}
                        className="cursor-pointer border-b border-border-default bg-bg-surface transition-colors duration-200 hover:bg-bg-secondary/70 focus-within:bg-bg-secondary/70"
                        onClick={() => handleRowClick(u)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleRowClick(u);
                          }
                        }}
                        aria-label={`Phân quyền ${u.accountHandle}`}
                      >
                        <td className="px-4 py-3 text-text-primary">
                          <span className="block truncate font-medium">
                            {u.accountHandle}
                          </span>
                          <span className="mt-0.5 block truncate text-text-secondary">
                            {(u.first_name || u.last_name)?.trim() || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 truncate text-text-primary">
                          {u.email}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${roleBadgeClass(u.roleType as UserRoleType)}`}
                          >
                            {USER_ROLE_LABELS[u.roleType as UserRoleType] ?? u.roleType}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-text-secondary">
                          {u.status === "active"
                            ? "Hoạt động"
                            : u.status === "inactive"
                              ? "Ngừng"
                              : u.status === "pending"
                                ? "Chờ duyệt"
                                : u.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 ? (
                <nav
                  className="mt-4 flex flex-col gap-3 border-t border-border-default pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
                  aria-label="Phân trang"
                >
                  <p className="text-sm text-text-muted" aria-live="polite">
                    Hiển thị {rangeStart}-{rangeEnd} trong {total} user
                  </p>
                  <div className="grid grid-cols-3 items-center gap-2 sm:flex sm:items-center">
                    <button
                      type="button"
                      className="min-h-11 rounded-md border border-border-default bg-bg-surface px-3 py-2.5 text-sm font-medium text-text-primary transition-colors duration-200 hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-50 sm:py-2"
                      disabled={currentPage <= 1}
                      aria-label="Trang trước"
                      onClick={() => replacePage(currentPage - 1)}
                    >
                      Trước
                    </button>
                    <span className="text-center text-sm tabular-nums text-text-secondary">
                      {currentPage}/{totalPages}
                    </span>
                    <button
                      type="button"
                      className="min-h-11 rounded-md border border-border-default bg-bg-surface px-3 py-2.5 text-sm font-medium text-text-primary transition-colors duration-200 hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-50 sm:py-2"
                      disabled={currentPage >= totalPages}
                      aria-label="Trang sau"
                      onClick={() => replacePage(currentPage + 1)}
                    >
                      Sau
                    </button>
                  </div>
                </nav>
              ) : null}
            </>
          )}
        </div>
      </div>

      {assignModalUser && (
        <AssignRoleModal
          user={detailLoading ? assignModalUser : (modalUser ?? assignModalUser)}
          onClose={handleCloseModal}
          onSaved={() => {}}
        />
      )}
    </div>
  );
}
