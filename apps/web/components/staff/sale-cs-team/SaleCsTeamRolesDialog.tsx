"use client";

import { useId, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  confirmUnsavedClose,
  useConfirmDialog,
} from "@/components/ui/ConfirmDialog";
import {
  ResponsiveActionFooter,
  ResponsiveDialog,
  ResponsiveDialogBody,
} from "@/components/ui/ResponsiveDialog";
import { Switch } from "@/components/ui/switch";
import type { SaleCsTeamRole } from "@/dtos/sale-cs-team.dto";
import {
  saleCsTeamKeys,
  updateSaleCsTeamRoles,
} from "@/lib/apis/sale-cs-team.api";
import { getMutationErrorMessage } from "@/lib/mutation-feedback";
import {
  SALE_CS_TEAM_ROLES,
  getNonTeamRoles,
  getSaleCsTeamRoles,
  hasAnyRoleAfterTeamChange,
  isRemovingCustomerCareWithStudents,
} from "@/lib/sale-cs-team";
import { ROLE_LABELS } from "@/lib/staff.constants";

type Props = {
  staff: {
    id: string;
    fullName: string;
    roles: string[];
    customerCareStudentCount: number;
  };
  onClose: () => void;
};

/**
 * Trưởng phòng Sale & CSKH bật/tắt role Sale / CSKH (#271). Role khác chỉ đọc.
 * Backend chặn: tự sửa mình, Admin, người mang role trưởng; tắt CSKH còn học sinh.
 */
export default function SaleCsTeamRolesDialog({ staff, onClose }: Props) {
  const titleId = useId();
  const descId = useId();
  const queryClient = useQueryClient();
  const { confirm, dialog } = useConfirmDialog();
  const initial = getSaleCsTeamRoles(staff.roles);
  const readOnlyRoles = getNonTeamRoles(staff.roles);
  const [selected, setSelected] = useState<SaleCsTeamRole[]>(initial);

  const isDirty =
    selected.length !== initial.length ||
    selected.some((role) => !initial.includes(role));
  const hasAnyRole = hasAnyRoleAfterTeamChange(staff.roles, selected);
  const blockedByStudents = isRemovingCustomerCareWithStudents({
    currentRoles: staff.roles,
    selected,
    customerCareStudentCount: staff.customerCareStudentCount,
  });
  const canSubmit = isDirty && hasAnyRole && !blockedByStudents;

  const mutation = useMutation({
    mutationFn: () => updateSaleCsTeamRoles(staff.id, { roles: selected }),
    onSuccess: async () => {
      toast.success("Đã cập nhật role nhân sự.");
      await queryClient.invalidateQueries({ queryKey: saleCsTeamKeys.all });
      onClose();
    },
    onError: (error) => {
      toast.error(
        getMutationErrorMessage(error, "Không cập nhật được role nhân sự."),
      );
    },
  });

  const toggle = (role: SaleCsTeamRole, checked: boolean) => {
    setSelected((prev) =>
      checked
        ? SALE_CS_TEAM_ROLES.filter(
            (item) => item === role || prev.includes(item),
          )
        : prev.filter((item) => item !== role),
    );
  };

  const requestClose = async () => {
    if (mutation.isPending) return;
    if (await confirmUnsavedClose(confirm, isDirty)) onClose();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || mutation.isPending) return;
    mutation.mutate();
  };

  const removed = initial.filter((role) => !selected.includes(role));

  return (
    <>
      <ResponsiveDialog
        size="sm"
        labelledBy={titleId}
        describedBy={descId}
        onBackdropClick={() => void requestClose()}
      >
        <div className="border-b border-border-default px-4 py-3 sm:px-5">
          <h2
            id={titleId}
            className="text-base font-semibold text-text-primary"
          >
            Bật/tắt role Sale & CSKH
          </h2>
          <p
            id={descId}
            className="mt-1 text-sm text-text-secondary wrap-anywhere"
          >
            {staff.fullName.trim() || "Nhân sự"}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <ResponsiveDialogBody>
            <ul className="divide-y divide-border-subtle">
              {SALE_CS_TEAM_ROLES.map((role) => {
                const switchId = `${titleId}-${role}`;
                return (
                  <li
                    key={role}
                    className="flex min-h-12 items-center justify-between gap-3 py-2"
                  >
                    <label
                      htmlFor={switchId}
                      className="text-sm font-medium text-text-primary"
                    >
                      {ROLE_LABELS[role] ?? role}
                    </label>
                    <Switch
                      id={switchId}
                      checked={selected.includes(role)}
                      onCheckedChange={(checked) => toggle(role, checked)}
                      disabled={mutation.isPending}
                    />
                  </li>
                );
              })}
            </ul>

            {readOnlyRoles.length > 0 ? (
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium text-text-muted">
                  Role khác (giữ nguyên)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {readOnlyRoles.map((role) => (
                    <span
                      key={role}
                      className="rounded-full border border-border-default bg-bg-secondary px-2.5 py-1 text-xs text-text-secondary"
                    >
                      {ROLE_LABELS[role] ?? role}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {removed.length > 0 && !blockedByStudents ? (
              <p className="mt-4 rounded-lg bg-warning/10 px-3 py-2 text-xs text-text-secondary">
                Tắt role sẽ xoá mức đè lương cứng riêng của role đó (nếu có).
              </p>
            ) : null}
            {blockedByStudents ? (
              <p className="mt-4 rounded-lg bg-error/10 px-3 py-2 text-xs text-error">
                CSKH này còn {staff.customerCareStudentCount} học sinh. Chuyển
                học sinh sang CSKH khác trước khi tắt role CSKH.
              </p>
            ) : null}
            {!hasAnyRole ? (
              <p className="mt-2 text-xs text-error">
                Nhân sự phải còn ít nhất một role.
              </p>
            ) : null}
          </ResponsiveDialogBody>
          <ResponsiveActionFooter>
            <button
              type="button"
              onClick={() => void requestClose()}
              disabled={mutation.isPending}
              className="min-h-11 rounded-xl border border-border-default bg-bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!canSubmit || mutation.isPending}
              className="min-h-11 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-text-inverse transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-50"
            >
              {mutation.isPending ? "Đang lưu…" : "Lưu"}
            </button>
          </ResponsiveActionFooter>
        </form>
      </ResponsiveDialog>
      {dialog}
    </>
  );
}
