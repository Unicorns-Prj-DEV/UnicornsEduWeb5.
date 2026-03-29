"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import UpgradedSelect from "@/components/ui/UpgradedSelect";
import * as userApi from "@/lib/apis/user.api";
import {
  type UserListItem,
  type UserRoleType,
  type UserDetailWithStaff,
  type StaffRole,
} from "@/dtos/user.dto";
import { USER_ROLE_LABELS } from "@/lib/user.constants";
import { ROLE_LABELS } from "@/lib/staff.constants";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 1000;
const ROLE_TYPE_OPTIONS: Array<{ value: UserRoleType; label: string }> = [
  { value: "guest", label: USER_ROLE_LABELS.guest },
  { value: "staff", label: USER_ROLE_LABELS.staff },
  { value: "student", label: USER_ROLE_LABELS.student },
  { value: "admin", label: USER_ROLE_LABELS.admin },
];

const STAFF_ROLES: StaffRole[] = [
  "admin",
  "teacher",
  "assistant",
  "lesson_plan",
  "lesson_plan_head",
  "accountant",
  "communication",
  "customer_care",
];

function parsePage(value: string | null): number {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

function buildUrl(pathname: string, params: URLSearchParams) {
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
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

function statusDotColor(status: string): string {
  return status === "active" ? "bg-success" : "bg-error";
}

function userStatusLabel(status: string): string {
  if (status === "active") return "Hoạt động";
  if (status === "inactive") return "Ngừng";
  if (status === "pending") return "Chờ duyệt";
  return status;
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
    mutationFn: (payload: {
      id: string;
      roleType: UserRoleType;
      staffRoles?: StaffRole[];
    }) =>
      userApi.updateUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", "list"] });
      queryClient.invalidateQueries({ queryKey: ["user", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      queryClient.invalidateQueries({ queryKey: ["student"] });
      queryClient.invalidateQueries({ queryKey: ["auth", "full-profile"] });
    },
  });

  useEffect(() => {
    if (user) {
      setRoleType(user.roleType);
      setStaffRoles(user.staffInfo?.roles ?? []);
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateUserMutation.mutateAsync({
        id: user.id,
        roleType,
        ...(roleType === "staff" ? { staffRoles } : {}),
      });
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
  const hasStudentInfo = !!user?.studentInfo;
  const showStaffRoles = roleType === "staff";
  const willAutoCreateStaffProfile = showStaffRoles && !hasStaffInfo;
  const willAutoCreateStudentProfile = roleType === "student" && !hasStudentInfo;
  const hasExistingLinkedProfile =
    roleType === "staff" ? hasStaffInfo : roleType === "student" ? hasStudentInfo : false;

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
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="block text-sm font-medium text-text-secondary">
                  Role nhân sự
                </span>
                <span className="rounded-full border border-border-default bg-bg-secondary px-2.5 py-1 text-xs font-medium text-text-secondary">
                  {staffRoles.length} role
                </span>
              </div>
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-border-default bg-bg-secondary/50 p-3">
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
                          setStaffRoles((prev) =>
                            prev.includes(role) ? prev : [...prev, role],
                          );
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
              <p className="mt-2 text-xs leading-5 text-text-muted">
                {willAutoCreateStaffProfile
                  ? "Nếu user chưa có staff profile, hệ thống sẽ tạo mới và gắn các role đã chọn ngay trong lần lưu này."
                  : "Các role chi tiết sẽ được cập nhật thẳng vào staff profile hiện có."}
                {" "}
                Bạn có thể để trống rồi bổ sung sau.
              </p>
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
  const search = searchParams.get("search") ?? "";
  const [searchInput, setSearchInput] = useState(search);
  const [assignModalUser, setAssignModalUser] =
    useState<UserDetailWithStaff | null>(null);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  const replaceWithParams = (params: URLSearchParams) => {
    router.replace(buildUrl(pathname, params));
  };

  const applySearchToUrl = useDebouncedCallback((value: string) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    const trimmed = value.trim();

    params.set("page", "1");
    if (trimmed) params.set("search", trimmed);
    else params.delete("search");

    replaceWithParams(params);
  }, SEARCH_DEBOUNCE_MS);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    applySearchToUrl(value);
  };

  const replacePage = (newPage: number) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("page", String(newPage));
    replaceWithParams(params);
  };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["user", "list", page, PAGE_SIZE, search],
    queryFn: () =>
      userApi.getUserList({
        page,
        limit: PAGE_SIZE,
        search: search.trim() || undefined,
      }),
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
  const hasActiveSearch = Boolean(search.trim());

  useEffect(() => {
    if (currentPage === page) return;

    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("page", String(currentPage));
    router.replace(buildUrl(pathname, params));
  }, [currentPage, page, pathname, router, searchParams]);

  const handleRowClick = (u: UserListItem) => {
    setAssignModalUser({
      ...u,
      staffInfo: undefined,
      studentInfo: undefined,
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
          <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-primary/10 blur-2xl" aria-hidden />
          <div className="pointer-events-none absolute -bottom-10 left-16 size-28 rounded-full bg-warning/10 blur-2xl" aria-hidden />

          <div className="relative">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h1 className="text-xl font-semibold text-text-primary sm:text-2xl">User</h1>
                <p className="mt-1 text-sm text-text-secondary">
                  Quản lý tài khoản hệ thống, tìm nhanh theo user, email, số điện thoại và mở popup phân quyền tập trung.
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="block min-w-0 flex-1" htmlFor="user-search-input">
                <span className="text-sm font-medium text-text-secondary">Tìm kiếm</span>
                <div className="mt-1 flex items-center rounded-md border border-border-default bg-bg-surface/90 px-3 focus-within:border-border-focus focus-within:ring-2 focus-within:ring-border-focus">
                  <svg className="size-4 shrink-0 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-4.35-4.35m1.85-5.15a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
                  </svg>
                  <input
                    id="user-search-input"
                    type="search"
                    value={searchInput}
                    onChange={(event) => handleSearchChange(event.target.value)}
                    placeholder="Theo user, email, số điện thoại, tên…"
                    className="min-w-0 flex-1 border-0 bg-transparent px-2 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-0"
                    aria-label="Tìm theo user, email, số điện thoại hoặc tên"
                    name="search"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
              </label>
            </div>
          </div>
        </section>

        {hasActiveSearch ? (
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary ring-1 ring-primary/25">
              Tìm kiếm: {search}
            </span>
          </div>
        ) : null}

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
              <p className="text-sm">
                {hasActiveSearch ? "Không có user nào khớp từ khóa tìm kiếm." : "Chưa có user nào."}
              </p>
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
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <span
                          className={`inline-block size-2 shrink-0 rounded-full ${statusDotColor(u.status)}`}
                          title={userStatusLabel(u.status)}
                          aria-hidden
                        />
                        <span className="min-w-0 truncate font-semibold text-text-primary">
                          {u.accountHandle}
                        </span>
                      </div>
                      <span
                        className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${roleBadgeClass(u.roleType as UserRoleType)}`}
                      >
                        {USER_ROLE_LABELS[u.roleType as UserRoleType] ?? u.roleType}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-col gap-1 text-sm text-text-secondary">
                      <span className="truncate">Email: {u.email}</span>
                      <span className="truncate">Tên: {(u.first_name || u.last_name)?.trim() || "—"}</span>
                      <span className="truncate">Trạng thái: {userStatusLabel(u.status)}</span>
                    </div>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[640px] table-fixed border-collapse text-left text-sm">
                  <caption className="sr-only">Danh sách user</caption>
                  <thead>
                    <tr className="border-b border-border-default bg-bg-secondary/80">
                      <th
                        scope="col"
                        className="w-[3%] min-w-10 px-2 py-3 overflow-x-hidden"
                        aria-label="Trạng thái"
                      />
                      <th
                        scope="col"
                        className="w-[26%] min-w-0 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-secondary overflow-x-hidden"
                      >
                        User
                      </th>
                      <th
                        scope="col"
                        className="w-[28%] min-w-0 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-secondary overflow-x-hidden"
                      >
                        Email
                      </th>
                      <th
                        scope="col"
                        className="w-[21%] min-w-0 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-secondary overflow-x-hidden"
                      >
                        Loại tài khoản
                      </th>
                      <th
                        scope="col"
                        className="w-[22%] min-w-0 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-secondary overflow-x-hidden"
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
                        <td className="w-[3%] min-w-10 px-2 py-3 align-middle">
                          <span
                            className={`inline-block size-2 shrink-0 rounded-full ${statusDotColor(u.status)}`}
                            title={userStatusLabel(u.status)}
                            aria-hidden
                          />
                        </td>
                        <td className="w-[26%] min-w-0 px-4 py-3 text-text-primary">
                          <span className="block truncate font-medium">
                            {u.accountHandle}
                          </span>
                          <span className="mt-0.5 block truncate text-text-secondary">
                            {(u.first_name || u.last_name)?.trim() || "—"}
                          </span>
                        </td>
                        <td className="w-[28%] min-w-0 px-4 py-3 text-text-primary">
                          <span className="block truncate">{u.email}</span>
                        </td>
                        <td className="w-[21%] min-w-0 px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${roleBadgeClass(u.roleType as UserRoleType)}`}
                          >
                            {USER_ROLE_LABELS[u.roleType as UserRoleType] ?? u.roleType}
                          </span>
                        </td>
                        <td className="w-[22%] min-w-0 px-4 py-3 text-text-secondary">
                          <span className="block truncate">{userStatusLabel(u.status)}</span>
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
                      className="min-h-11 rounded-md border border-border-default bg-bg-surface px-3 py-2.5 text-sm font-medium text-text-primary transition-colors duration-200 hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface disabled:cursor-not-allowed disabled:opacity-50 sm:py-2"
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
                      className="min-h-11 rounded-md border border-border-default bg-bg-surface px-3 py-2.5 text-sm font-medium text-text-primary transition-colors duration-200 hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface disabled:cursor-not-allowed disabled:opacity-50 sm:py-2"
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
          onSaved={() => { }}
        />
      )}
    </div>
  );
}
