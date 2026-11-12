"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import StaffMeetActionButton from "@/components/admin/staff/StaffMeetActionButton";
import TutorStatusBadge from "@/components/staff/tutors/TutorStatusBadge";
import { useConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { TrainingTutorDetail } from "@/dtos/training-tutor.dto";
import { regenerateStaffMeetLink } from "@/lib/apis/staff.api";
import {
  trainingTutorKeys,
  updateTrainingTutorAccountStatus,
  updateTrainingTutorStatus,
} from "@/lib/apis/training-tutor.api";
import { getMutationErrorMessage } from "@/lib/mutation-feedback";

const ACTION_CLASS =
  "min-h-10 rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-50";

/**
 * Thông tin công việc Trưởng ban Đào tạo quản lý trên cấp dưới (#278): trạng
 * thái đang làm / đã nghỉ, khoá tài khoản, link Meet (xem + tạo lại). Nút chỉ
 * hiện theo `management.permissions`; backend vẫn chặn cuối (403).
 */
export default function TrainingTutorWorkSection({
  tutor,
}: {
  tutor: TrainingTutorDetail;
}) {
  const queryClient = useQueryClient();
  const { confirm, dialog } = useConfirmDialog();
  const management = tutor.management;
  const name = tutor.fullName.trim() || "nhân sự này";

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: trainingTutorKeys.all });

  const statusMutation = useMutation({
    mutationFn: (status: TrainingTutorDetail["status"]) =>
      updateTrainingTutorStatus(tutor.id, { status }),
    onSuccess: async (result) => {
      toast.success(
        result.status === "inactive"
          ? "Đã chuyển sang đã nghỉ."
          : "Đã chuyển sang đang làm.",
      );
      await invalidate();
    },
    onError: (error) => {
      toast.error(getMutationErrorMessage(error, "Không đổi được trạng thái."));
    },
  });

  const lockMutation = useMutation({
    mutationFn: (locked: boolean) =>
      updateTrainingTutorAccountStatus(tutor.id, locked),
    onSuccess: async (result) => {
      toast.success(
        result.accountLocked ? "Đã khoá tài khoản." : "Đã mở khoá tài khoản.",
      );
      await invalidate();
    },
    onError: (error) => {
      toast.error(
        getMutationErrorMessage(
          error,
          "Không cập nhật được trạng thái tài khoản.",
        ),
      );
    },
  });

  const meetMutation = useMutation({
    mutationFn: () => regenerateStaffMeetLink(tutor.id),
    onSuccess: async () => {
      toast.success("Đã tạo lại link Meet.");
      await invalidate();
    },
    onError: (error) => {
      toast.error(getMutationErrorMessage(error, "Không tạo lại được link Meet."));
    },
  });

  if (!management?.isSubordinate) return null;
  const { permissions } = management;
  const busy =
    statusMutation.isPending || lockMutation.isPending || meetMutation.isPending;

  const requestStatusToggle = async () => {
    if (busy) return;
    const toInactive = tutor.status !== "inactive";
    const ok = await confirm(
      toInactive
        ? {
            title: "Chuyển sang đã nghỉ?",
            description: `${name} sẽ được đánh dấu đã nghỉ; lịch dạy sắp tới bị gỡ.`,
            confirmLabel: "Chuyển sang đã nghỉ",
            variant: "destructive",
          }
        : {
            title: "Chuyển sang đang làm?",
            description: `${name} sẽ được đánh dấu đang làm.`,
            confirmLabel: "Chuyển sang đang làm",
          },
    );
    if (ok) statusMutation.mutate(toInactive ? "inactive" : "active");
  };

  const requestLockToggle = async () => {
    if (busy || management.accountLocked == null) return;
    const locking = !management.accountLocked;
    const ok = await confirm(
      locking
        ? {
            title: "Khoá tài khoản?",
            description: `${name} sẽ không đăng nhập được cho tới khi được mở khoá.`,
            confirmLabel: "Khoá",
            variant: "destructive",
          }
        : {
            title: "Mở khoá tài khoản?",
            description: `${name} sẽ đăng nhập lại được.`,
            confirmLabel: "Mở khoá",
          },
    );
    if (ok) lockMutation.mutate(locking);
  };

  const requestMeetRegenerate = async () => {
    if (busy) return;
    const ok = await confirm({
      title: "Tạo lại link Meet?",
      description:
        "Link cũ sẽ ngừng dùng; lịch dạy và buổi bù của nhân sự được cập nhật sang link mới.",
      confirmLabel: "Tạo lại",
    });
    if (ok) meetMutation.mutate();
  };

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border-default bg-bg-surface p-4">
      <h2 className="text-base font-semibold text-text-primary">
        Thông tin công việc
      </h2>

      <dl className="flex flex-col gap-3 text-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <dt className="text-text-muted">Trạng thái</dt>
          <dd className="flex flex-wrap items-center gap-2">
            <TutorStatusBadge status={tutor.status} />
            {permissions.canChangeStatus ? (
              <button
                type="button"
                className={ACTION_CLASS}
                disabled={busy}
                onClick={() => void requestStatusToggle()}
              >
                {tutor.status === "inactive"
                  ? "Chuyển sang đang làm"
                  : "Chuyển sang đã nghỉ"}
              </button>
            ) : null}
          </dd>
        </div>

        {management.accountLocked != null ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <dt className="text-text-muted">Tài khoản</dt>
            <dd className="flex flex-wrap items-center gap-2">
              <span className="text-text-primary">
                {management.accountLocked ? "Đã khoá" : "Đang mở"}
              </span>
              {permissions.canLockAccount ? (
                <button
                  type="button"
                  className={ACTION_CLASS}
                  disabled={busy}
                  onClick={() => void requestLockToggle()}
                >
                  {management.accountLocked ? "Mở khoá" : "Khoá tài khoản"}
                </button>
              ) : null}
            </dd>
          </div>
        ) : null}

        {management.hasOtherRoles ? (
          <p className="text-xs text-text-muted">
            Nhân sự kiêm role ngoài Gia sư / Ban Chuyên môn / Đào tạo: đổi trạng
            thái và khoá tài khoản do Admin thực hiện.
          </p>
        ) : null}

        {permissions.canManageMeetLink ? (
          <div className="flex flex-col gap-2">
            <dt className="text-text-muted">Link Google Meet</dt>
            <dd className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <span className="min-w-0 flex-1 truncate text-text-primary">
                {management.googleMeetLink?.trim() || "Chưa có link."}
              </span>
              <div className="flex items-center gap-2">
                <StaffMeetActionButton meetLink={management.googleMeetLink} />
                <button
                  type="button"
                  className={ACTION_CLASS}
                  disabled={busy}
                  onClick={() => void requestMeetRegenerate()}
                >
                  {meetMutation.isPending ? "Đang tạo…" : "Tạo lại link"}
                </button>
              </div>
            </dd>
          </div>
        ) : null}
      </dl>
      {dialog}
    </section>
  );
}
