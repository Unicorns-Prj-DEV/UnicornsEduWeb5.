"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useDebouncedCallback } from "use-debounce";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import UpgradedSelect from "@/components/ui/UpgradedSelect";
import * as userApi from "@/lib/apis/user.api";
import {
  type CreateUserPayload,
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

const CREATE_USER_FIELD_ORDER = [
  "last_name",
  "first_name",
  "accountHandle",
  "phone",
  "email",
  "province",
  "password",
  "confirmPassword",
] as const;

type CreateUserField = (typeof CREATE_USER_FIELD_ORDER)[number];

type CreateUserFormState = Omit<
  CreateUserPayload,
  "province" | "roleType" | "staffRoles"
> & {
  province: string;
  roleType: UserRoleType;
  staffRoles: StaffRole[];
  confirmPassword: string;
};

type CreateUserFormErrors = Partial<Record<CreateUserField, string>>;

const EMPTY_CREATE_USER_FORM: CreateUserFormState = {
  email: "",
  phone: "",
  password: "",
  accountHandle: "",
  first_name: "",
  last_name: "",
  province: "",
  roleType: "guest",
  staffRoles: [],
  confirmPassword: "",
};

const CREATE_USER_INPUT_CLASS =
  "mt-1 min-h-11 w-full rounded-xl border border-border-default bg-bg-surface px-3.5 py-2.5 text-sm text-text-primary shadow-sm transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-text-muted focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus/40";

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

function getUserDisplayName(user: {
  first_name?: string | null;
  last_name?: string | null;
}) {
  return [user.last_name, user.first_name].filter(Boolean).join(" ").trim();
}

function validateCreateUserForm(
  form: CreateUserFormState,
): CreateUserFormErrors {
  const errors: CreateUserFormErrors = {};
  const email = form.email.trim();

  if (!form.last_name.trim()) errors.last_name = "Vui lòng nhập họ.";
  if (!form.first_name.trim()) errors.first_name = "Vui lòng nhập tên.";
  if (!form.accountHandle.trim()) {
    errors.accountHandle = "Vui lòng nhập account handle.";
  }
  if (!form.phone.trim()) errors.phone = "Vui lòng nhập số điện thoại.";
  if (!email) {
    errors.email = "Vui lòng nhập email.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Email không hợp lệ.";
  }
  if (!form.password) {
    errors.password = "Vui lòng nhập mật khẩu.";
  } else if (form.password.length < 6) {
    errors.password = "Mật khẩu cần ít nhất 6 ký tự.";
  }
  if (!form.confirmPassword) {
    errors.confirmPassword = "Vui lòng nhập xác nhận mật khẩu.";
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = "Mật khẩu xác nhận không khớp.";
  }

  return errors;
}

function AssignRoleModal({
  user,
  onClose,
  onSaved,
  hideAdminOptions = false,
}: {
  user: UserDetailWithStaff | null;
  onClose: () => void;
  onSaved: () => void;
  hideAdminOptions?: boolean;
}) {
  const queryClient = useQueryClient();
  const [roleType, setRoleType] = useState<UserRoleType>(user?.roleType ?? "guest");
  const [staffRoles, setStaffRoles] = useState<StaffRole[]>(
    user?.staffInfo?.roles ?? []
  );
  const [saving, setSaving] = useState(false);

  const visibleRoleTypeOptions = hideAdminOptions
    ? ROLE_TYPE_OPTIONS.filter((opt) => opt.value !== "admin")
    : ROLE_TYPE_OPTIONS;
  const visibleStaffRoles = hideAdminOptions
    ? STAFF_ROLES.filter((role) => role !== "admin")
    : STAFF_ROLES;

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
  const showStaffRoles = roleType === "staff";
  const willAutoCreateStaffProfile = showStaffRoles && !hasStaffInfo;

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
          {getUserDisplayName(user) ? ` · ${getUserDisplayName(user)}` : ""}
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
              options={visibleRoleTypeOptions}
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
                {visibleStaffRoles.map((role) => (
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
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const isStaffShell = pathname?.startsWith("/staff") ?? false;
  const searchParams = useSearchParams();
  const page = parsePage(searchParams.get("page"));
  const search = searchParams.get("search") ?? "";
  const isCreatePanelOpen = searchParams.get("create") === "1";
  const [searchInput, setSearchInput] = useState(search);
  const [createUserForm, setCreateUserForm] =
    useState<CreateUserFormState>(EMPTY_CREATE_USER_FORM);
  const [createUserErrors, setCreateUserErrors] =
    useState<CreateUserFormErrors>({});
  const createUserFieldRefs = useRef<
    Partial<Record<CreateUserField, HTMLInputElement | null>>
  >({});
  const [assignModalUser, setAssignModalUser] =
    useState<UserDetailWithStaff | null>(null);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  const replaceWithParams = (params: URLSearchParams) => {
    router.replace(buildUrl(pathname, params));
  };

  const setCreatePanelOpen = (open: boolean) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");

    if (open) params.set("create", "1");
    else params.delete("create");

    replaceWithParams(params);
  };

  const resetCreateUserForm = () => {
    setCreateUserForm(EMPTY_CREATE_USER_FORM);
    setCreateUserErrors({});
  };

  const focusFirstCreateUserError = (errors: CreateUserFormErrors) => {
    const firstField = CREATE_USER_FIELD_ORDER.find((field) => errors[field]);
    if (!firstField) return;

    createUserFieldRefs.current[firstField]?.focus();
  };

  const setCreateUserFieldValue = (
    field: CreateUserField,
    value: string,
  ) => {
    setCreateUserForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    setCreateUserErrors((prev) => {
      const next = { ...prev };
      if (field === "password" || field === "confirmPassword") {
        delete next.password;
        delete next.confirmPassword;
        return next;
      }

      delete next[field];
      return next;
    });
  };

  const setCreateUserRoleType = (value: UserRoleType) => {
    setCreateUserForm((prev) => ({
      ...prev,
      roleType: value,
      staffRoles: value === "staff" ? prev.staffRoles : [],
    }));
  };

  const toggleCreateUserStaffRole = (role: StaffRole, checked: boolean) => {
    setCreateUserForm((prev) => {
      if (checked) {
        return {
          ...prev,
          staffRoles: prev.staffRoles.includes(role)
            ? prev.staffRoles
            : [...prev.staffRoles, role],
        };
      }

      return {
        ...prev,
        staffRoles: prev.staffRoles.filter((item) => item !== role),
      };
    });
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

  const handleCreatePanelToggle = () => {
    if (isCreatePanelOpen) {
      resetCreateUserForm();
      setCreatePanelOpen(false);
      return;
    }

    setCreatePanelOpen(true);
  };

  const replacePage = (newPage: number) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("page", String(newPage));
    replaceWithParams(params);
  };

  const createUserMutation = useMutation({
    mutationFn: userApi.createUser,
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ["user", "list"] });
      toast.success(
        response.message || "Tạo user thành công. Email xác thực đã được gửi.",
      );
      resetCreateUserForm();

      const params = new URLSearchParams(searchParams?.toString() ?? "");
      params.set("page", "1");
      params.delete("create");
      replaceWithParams(params);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ??
        (err as Error)?.message ??
        "Không tạo được user. Vui lòng kiểm tra dữ liệu và thử lại.";
      toast.error(msg);
    },
  });

  const handleCreateUserSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const errors = validateCreateUserForm(createUserForm);
    setCreateUserErrors(errors);

    if (Object.keys(errors).length > 0) {
      focusFirstCreateUserError(errors);
      return;
    }

    createUserMutation.mutate({
      email: createUserForm.email.trim(),
      phone: createUserForm.phone.trim(),
      password: createUserForm.password,
      accountHandle: createUserForm.accountHandle.trim(),
      first_name: createUserForm.first_name.trim(),
      last_name: createUserForm.last_name.trim(),
      province: createUserForm.province.trim() || undefined,
      roleType: createUserForm.roleType,
      ...(createUserForm.roleType === "staff"
        ? { staffRoles: createUserForm.staffRoles }
        : {}),
    });
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
  const createUserFirstErrorField =
    CREATE_USER_FIELD_ORDER.find((field) => createUserErrors[field]) ?? null;
  const createUserFirstErrorMessage = createUserFirstErrorField
    ? createUserErrors[createUserFirstErrorField]
    : null;
  const showCreateUserStaffRoles = createUserForm.roleType === "staff";
  const createRoleTypeOptions = isStaffShell
    ? ROLE_TYPE_OPTIONS.filter((opt) => opt.value !== "admin")
    : ROLE_TYPE_OPTIONS;
  const createStaffRoles = isStaffShell
    ? STAFF_ROLES.filter((role) => role !== "admin")
    : STAFF_ROLES;

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
                <h1 className="text-xl font-semibold text-text-primary sm:text-2xl">
                  User
                </h1>
                <p className="mt-1 text-sm text-text-secondary">
                  Quản lý tài khoản hệ thống, tạo mới user theo đúng payload register và phân quyền tập trung.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCreatePanelToggle}
                aria-expanded={isCreatePanelOpen}
                aria-controls="create-user-dialog"
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-text-inverse shadow-[0_14px_35px_-18px_rgba(37,99,235,0.7)] transition-[background-color,box-shadow] duration-200 hover:bg-primary-hover hover:shadow-[0_18px_40px_-18px_rgba(37,99,235,0.8)] focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                <svg className="size-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {isCreatePanelOpen ? "Đóng form" : "Thêm user"}
              </button>
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

        {isCreatePanelOpen ? (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px]"
              aria-hidden
              onClick={handleCreatePanelToggle}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
              <div
                id="create-user-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="create-user-dialog-title"
                aria-describedby="create-user-dialog-description"
                className="w-full max-w-3xl overflow-hidden rounded-2xl border border-border-default bg-bg-surface shadow-[0_32px_80px_-40px_rgba(15,23,42,0.45)] overscroll-contain"
              >
                <form
                  onSubmit={handleCreateUserSubmit}
                  className="max-h-[calc(100vh-1.5rem)] overflow-y-auto"
                  noValidate
                >
                  <div className="border-b border-border-default/80 bg-bg-surface px-4 py-4 sm:px-6 sm:py-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <span className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                          Tạo user
                        </span>
                        <h3
                          id="create-user-dialog-title"
                          className="mt-3 text-lg font-semibold text-text-primary sm:text-xl"
                        >
                          Tạo tài khoản mới
                        </h3>

                      </div>

                      <button
                        type="button"
                        onClick={handleCreatePanelToggle}
                        className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-border-default bg-bg-surface text-text-secondary transition-[background-color,border-color,color] duration-200 hover:border-border-focus hover:bg-bg-secondary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                        aria-label="Đóng popup tạo user"
                      >
                        <svg
                          className="size-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          aria-hidden
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="m6 6 12 12M18 6 6 18"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-5 px-4 py-4 sm:px-6 sm:py-5">
                    {createUserFirstErrorMessage ? (
                      <div
                        className="rounded-xl border border-error/20 bg-error/10 px-3.5 py-3 text-sm text-error"
                        aria-live="polite"
                      >
                        {createUserFirstErrorMessage}
                      </div>
                    ) : null}

                    <section className="rounded-2xl border border-border-default bg-bg-secondary/40 p-4 sm:p-5">
                      <div className="flex flex-col gap-4 ">
                        <label className="block">
                          <span
                            id="create-user-role-type-label"
                            className="mb-1.5 block text-sm font-medium text-text-secondary"
                          >
                            Loại tài khoản
                          </span>
                          <UpgradedSelect
                            value={createUserForm.roleType}
                            onValueChange={(value) =>
                              setCreateUserRoleType(value as UserRoleType)
                            }
                            options={createRoleTypeOptions}
                            labelId="create-user-role-type-label"
                            ariaLabel="Chọn loại tài khoản khi tạo user"
                            buttonClassName="min-h-11 rounded-xl border border-border-default bg-bg-surface px-3.5 py-2.5 text-sm font-medium text-text-primary shadow-sm transition-[border-color,background-color,box-shadow] duration-200 hover:border-border-focus hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                            menuClassName="rounded-2xl border border-border-default bg-bg-surface p-1.5 shadow-2xl"
                          />
                        </label>

                        {showCreateUserStaffRoles ? (
                          <div className="block">
                            <div className="mb-2 flex items-center justify-between gap-3">
                              <span className="block text-sm font-medium text-text-secondary">
                                Role nhân sự
                              </span>
                              <span className="rounded-full border border-border-default bg-bg-surface px-2.5 py-1 text-xs font-medium text-text-secondary">
                                {createUserForm.staffRoles.length} role
                              </span>
                            </div>
                            <div className="grid gap-2 rounded-xl border border-border-default bg-bg-surface p-3 sm:grid-cols-2">
                              {createStaffRoles.map((role) => (
                                <label
                                  key={role}
                                  className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm text-text-primary transition-colors duration-200 hover:bg-bg-secondary/70"
                                >
                                  <input
                                    type="checkbox"
                                    checked={createUserForm.staffRoles.includes(role)}
                                    onChange={(event) =>
                                      toggleCreateUserStaffRole(role, event.target.checked)
                                    }
                                    className="h-4 w-4 rounded border-border-default text-primary focus:ring-border-focus"
                                  />
                                  {ROLE_LABELS[role] ?? role}
                                </label>
                              ))}
                            </div>
                            <p className="mt-2 text-xs leading-5 text-text-muted">
                              Nếu để trống, hồ sơ staff vẫn được tạo nhưng chưa gán role chi tiết.
                            </p>
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed border-border-default bg-bg-surface px-4 py-3 text-sm leading-6 text-text-secondary">
                            Chọn <span className="font-medium text-text-primary">staff</span> nếu
                            cần gán vai trò nhân sự ngay trong lúc tạo tài khoản.
                          </div>
                        )}
                      </div>
                    </section>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-sm font-medium text-text-secondary">
                          Họ
                        </span>
                        <input
                          ref={(node) => {
                            createUserFieldRefs.current.last_name = node;
                          }}
                          id="create-user-last-name"
                          name="last_name"
                          type="text"
                          autoComplete="family-name"
                          value={createUserForm.last_name}
                          onChange={(event) =>
                            setCreateUserFieldValue("last_name", event.target.value)
                          }
                          placeholder="Nguyễn…"
                          className={CREATE_USER_INPUT_CLASS}
                          aria-invalid={Boolean(createUserErrors.last_name)}
                          aria-describedby={
                            createUserErrors.last_name
                              ? "create-user-last-name-error"
                              : undefined
                          }
                        />
                        {createUserErrors.last_name ? (
                          <p
                            id="create-user-last-name-error"
                            className="mt-1 text-sm text-error"
                            aria-live="polite"
                          >
                            {createUserErrors.last_name}
                          </p>
                        ) : null}
                      </label>

                      <label className="block">
                        <span className="text-sm font-medium text-text-secondary">
                          Tên
                        </span>
                        <input
                          ref={(node) => {
                            createUserFieldRefs.current.first_name = node;
                          }}
                          id="create-user-first-name"
                          name="first_name"
                          type="text"
                          autoComplete="given-name"
                          value={createUserForm.first_name}
                          onChange={(event) =>
                            setCreateUserFieldValue("first_name", event.target.value)
                          }
                          placeholder="Văn A…"
                          className={CREATE_USER_INPUT_CLASS}
                          aria-invalid={Boolean(createUserErrors.first_name)}
                          aria-describedby={
                            createUserErrors.first_name
                              ? "create-user-first-name-error"
                              : undefined
                          }
                        />
                        {createUserErrors.first_name ? (
                          <p
                            id="create-user-first-name-error"
                            className="mt-1 text-sm text-error"
                            aria-live="polite"
                          >
                            {createUserErrors.first_name}
                          </p>
                        ) : null}
                      </label>

                      <label className="block">
                        <span className="text-sm font-medium text-text-secondary">
                          Account handle
                        </span>
                        <input
                          ref={(node) => {
                            createUserFieldRefs.current.accountHandle = node;
                          }}
                          id="create-user-account-handle"
                          name="accountHandle"
                          type="text"
                          autoComplete="username"
                          value={createUserForm.accountHandle}
                          onChange={(event) =>
                            setCreateUserFieldValue("accountHandle", event.target.value)
                          }
                          placeholder="nguyenvana…"
                          className={CREATE_USER_INPUT_CLASS}
                          aria-invalid={Boolean(createUserErrors.accountHandle)}
                          aria-describedby={
                            createUserErrors.accountHandle
                              ? "create-user-account-handle-error"
                              : undefined
                          }
                          spellCheck={false}
                        />
                        {createUserErrors.accountHandle ? (
                          <p
                            id="create-user-account-handle-error"
                            className="mt-1 text-sm text-error"
                            aria-live="polite"
                          >
                            {createUserErrors.accountHandle}
                          </p>
                        ) : null}
                      </label>

                      <label className="block">
                        <span className="text-sm font-medium text-text-secondary">
                          Số điện thoại
                        </span>
                        <input
                          ref={(node) => {
                            createUserFieldRefs.current.phone = node;
                          }}
                          id="create-user-phone"
                          name="phone"
                          type="tel"
                          autoComplete="tel"
                          inputMode="tel"
                          value={createUserForm.phone}
                          onChange={(event) =>
                            setCreateUserFieldValue("phone", event.target.value)
                          }
                          placeholder="0901234567…"
                          className={CREATE_USER_INPUT_CLASS}
                          aria-invalid={Boolean(createUserErrors.phone)}
                          aria-describedby={
                            createUserErrors.phone
                              ? "create-user-phone-error"
                              : undefined
                          }
                        />
                        {createUserErrors.phone ? (
                          <p
                            id="create-user-phone-error"
                            className="mt-1 text-sm text-error"
                            aria-live="polite"
                          >
                            {createUserErrors.phone}
                          </p>
                        ) : null}
                      </label>

                      <label className="block">
                        <span className="text-sm font-medium text-text-secondary">
                          Email
                        </span>
                        <input
                          ref={(node) => {
                            createUserFieldRefs.current.email = node;
                          }}
                          id="create-user-email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          inputMode="email"
                          value={createUserForm.email}
                          onChange={(event) =>
                            setCreateUserFieldValue("email", event.target.value)
                          }
                          placeholder="user@example.com…"
                          className={CREATE_USER_INPUT_CLASS}
                          aria-invalid={Boolean(createUserErrors.email)}
                          aria-describedby={
                            createUserErrors.email
                              ? "create-user-email-error"
                              : undefined
                          }
                          spellCheck={false}
                        />
                        {createUserErrors.email ? (
                          <p
                            id="create-user-email-error"
                            className="mt-1 text-sm text-error"
                            aria-live="polite"
                          >
                            {createUserErrors.email}
                          </p>
                        ) : null}
                      </label>

                      <label className="block">
                        <span className="text-sm font-medium text-text-secondary">
                          Tỉnh / Thành phố
                        </span>
                        <input
                          ref={(node) => {
                            createUserFieldRefs.current.province = node;
                          }}
                          id="create-user-province"
                          name="province"
                          type="text"
                          autoComplete="off"
                          value={createUserForm.province}
                          onChange={(event) =>
                            setCreateUserFieldValue("province", event.target.value)
                          }
                          placeholder="TP.HCM…"
                          className={CREATE_USER_INPUT_CLASS}
                        />
                      </label>

                      <label className="block">
                        <span className="text-sm font-medium text-text-secondary">
                          Mật khẩu
                        </span>
                        <input
                          ref={(node) => {
                            createUserFieldRefs.current.password = node;
                          }}
                          id="create-user-password"
                          name="password"
                          type="password"
                          autoComplete="new-password"
                          value={createUserForm.password}
                          onChange={(event) =>
                            setCreateUserFieldValue("password", event.target.value)
                          }
                          placeholder="Ít nhất 6 ký tự…"
                          className={CREATE_USER_INPUT_CLASS}
                          aria-invalid={Boolean(createUserErrors.password)}
                          aria-describedby={
                            createUserErrors.password
                              ? "create-user-password-error"
                              : undefined
                          }
                        />
                        {createUserErrors.password ? (
                          <p
                            id="create-user-password-error"
                            className="mt-1 text-sm text-error"
                            aria-live="polite"
                          >
                            {createUserErrors.password}
                          </p>
                        ) : null}
                      </label>

                      <label className="block">
                        <span className="text-sm font-medium text-text-secondary">
                          Xác nhận mật khẩu
                        </span>
                        <input
                          ref={(node) => {
                            createUserFieldRefs.current.confirmPassword = node;
                          }}
                          id="create-user-confirm-password"
                          name="confirmPassword"
                          type="password"
                          autoComplete="new-password"
                          value={createUserForm.confirmPassword}
                          onChange={(event) =>
                            setCreateUserFieldValue("confirmPassword", event.target.value)
                          }
                          placeholder="Nhập lại mật khẩu…"
                          className={CREATE_USER_INPUT_CLASS}
                          aria-invalid={Boolean(createUserErrors.confirmPassword)}
                          aria-describedby={
                            createUserErrors.confirmPassword
                              ? "create-user-confirm-password-error"
                              : undefined
                          }
                        />
                        {createUserErrors.confirmPassword ? (
                          <p
                            id="create-user-confirm-password-error"
                            className="mt-1 text-sm text-error"
                            aria-live="polite"
                          >
                            {createUserErrors.confirmPassword}
                          </p>
                        ) : null}
                      </label>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-border-default/80 bg-bg-surface px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <p className="text-sm leading-6 text-text-secondary">
                      Tài khoản mới sẽ ở trạng thái chờ xác thực email sau khi tạo.
                    </p>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={handleCreatePanelToggle}
                        className="min-h-11 touch-manipulation rounded-xl border border-border-default bg-bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition-[background-color,border-color] duration-200 hover:border-border-focus hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        disabled={createUserMutation.isPending}
                        className="min-h-11 touch-manipulation rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-text-inverse transition-[background-color,transform,box-shadow] duration-200 hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {createUserMutation.isPending ? "Đang tạo…" : "Tạo user"}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </>
        ) : null}

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
                    className="rounded-xl"
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => handleRowClick(u)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleRowClick(u);
                        }
                      }}
                      aria-label={`Mở form phân quyền cho ${u.accountHandle}`}
                      className="group cursor-pointer rounded-xl border border-border-default bg-bg-surface p-4 shadow-sm transition-[border-color,background-color,box-shadow] duration-200 hover:border-border-focus hover:bg-bg-secondary/70 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
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
                        <span className="truncate">Tên: {getUserDisplayName(u) || "—"}</span>
                        <span className="truncate">Trạng thái: {userStatusLabel(u.status)}</span>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-border-default/80 pt-3 text-sm text-text-secondary">
                        <span>Chạm để phân quyền</span>
                        <span
                          className="inline-flex size-8 items-center justify-center rounded-full border border-border-default bg-bg-surface text-text-muted transition-[transform,border-color,color] duration-200 group-hover:translate-x-0.5 group-hover:border-border-focus group-hover:text-text-primary"
                          aria-hidden
                        >
                          <svg
                            className="size-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="m9 6 6 6-6 6"
                            />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[700px] table-fixed border-collapse text-left text-sm">
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
                        className="w-[21%] min-w-0 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-secondary overflow-x-hidden"
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
                        onClick={() => handleRowClick(u)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleRowClick(u);
                          }
                        }}
                        aria-label={`Mở form phân quyền cho ${u.accountHandle}`}
                        className="group cursor-pointer border-b border-border-default bg-bg-surface transition-colors duration-200 hover:bg-bg-secondary/70 focus:bg-bg-secondary/70 focus:outline-none"
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
                            {getUserDisplayName(u) || "—"}
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
                        <td className="w-[21%] min-w-0 px-4 py-3 text-text-secondary">
                          <div className="flex items-center justify-between gap-3">
                            <span className="block truncate">{userStatusLabel(u.status)}</span>
                            <span
                              className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-transparent text-text-muted transition-[transform,border-color,color,background-color] duration-200 group-hover:translate-x-0.5 group-hover:border-border-default group-hover:bg-bg-surface group-hover:text-text-primary"
                              aria-hidden
                            >
                              <svg
                                className="size-4"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="m9 6 6 6-6 6"
                                />
                              </svg>
                            </span>
                          </div>
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
          hideAdminOptions={isStaffShell}
        />
      )}
    </div>
  );
}
