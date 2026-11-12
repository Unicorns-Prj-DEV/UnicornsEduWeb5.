"use client";

import { useState, type SyntheticEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  ResponsiveActionFooter,
  ResponsiveDialog,
  ResponsiveDialogBody,
} from "@/components/ui/ResponsiveDialog";
import { MoneyInput } from "@/components/ui/MoneyInput";
import type { ClassDetail, UpdateClassTuitionPayload } from "@/dtos/class.dto";
import * as classApi from "@/lib/apis/class.api";
import {
  compactTuitionPerSessionLine,
  computeStudentTuitionPerSessionFromPackage,
  parseTuitionPackageInputs,
} from "@/lib/class.helpers";
import {
  classRateFieldLabels,
  compactTuitionChargeLine,
  displayedClassRate,
  oneTimePackageError,
  standardBlockCountFromClassSchedule,
  toPerBlockTuitionForApi,
} from "@/lib/class-pricing-mode";
import {
  moneyInputInitialFromNumber,
  parseOptionalMoneyInt,
} from "@/lib/money-input.helpers";
import { getMutationErrorMessage } from "@/lib/mutation-feedback";
import {
  classEditorModalPrimaryButtonClassName,
  classEditorModalSecondaryButtonClassName,
} from "./classEditorModalStyles";

const TITLE_ID = "edit-class-tuition-title";
const DESCRIPTION_ID = "edit-class-tuition-description";

const INPUT_CLASS =
  "min-h-11 w-full rounded-md border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus";

type Props = {
  open: boolean;
  onClose: () => void;
  classDetail: ClassDetail;
};

/**
 * **Học phí lớp** (#272): tổng gói / số buổi của lớp, và học phí / 30 phút khi
 * lớp tính theo block. Admin và Trưởng phòng Sale & CSKH sửa — tách khỏi
 * Thông tin lớp (chỉ Admin).
 */
export default function EditClassTuitionPopup({ open, onClose, classDetail }: Props) {
  if (!open) return null;
  // Mount lại mỗi lần mở để form lấy số mới nhất của lớp.
  return <EditClassTuitionForm onClose={onClose} classDetail={classDetail} />;
}

function EditClassTuitionForm({ onClose, classDetail }: Omit<Props, "open">) {
  const queryClient = useQueryClient();
  const pricingMode = classDetail.pricingMode ?? "per_session";
  const standardBlockCount = standardBlockCountFromClassSchedule(classDetail.schedule ?? []);

  const initialTotal = moneyInputInitialFromNumber(classDetail.tuitionPackageTotal);
  const initialSessions =
    classDetail.tuitionPackageSession == null ? "" : String(classDetail.tuitionPackageSession);
  const initialPerBlock = moneyInputInitialFromNumber(
    displayedClassRate({
      mode: "per_block",
      perSession: classDetail.studentTuitionPerSession,
      perBlock: classDetail.studentTuitionPerBlock,
      standardBlockCount,
    }),
  );

  const [totalInput, setTotalInput] = useState(initialTotal);
  const [sessionsInput, setSessionsInput] = useState(initialSessions);
  const [perBlockInput, setPerBlockInput] = useState(initialPerBlock);
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);

  const isDirty =
    totalInput !== initialTotal ||
    sessionsInput !== initialSessions ||
    (pricingMode === "per_block" && perBlockInput !== initialPerBlock);

  const mutation = useMutation({
    mutationFn: (payload: UpdateClassTuitionPayload) =>
      classApi.updateClassTuition(classDetail.id, payload),
    onSuccess: async () => {
      toast.success("Đã lưu học phí lớp.");
      onClose();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["class", "detail", classDetail.id] }),
        queryClient.invalidateQueries({ queryKey: ["class", "list"] }),
      ]);
    },
    onError: (error: unknown) => {
      toast.error(getMutationErrorMessage(error, "Không thể cập nhật học phí lớp."));
    },
  });

  const requestClose = () => {
    if (mutation.isPending) return;
    if (isDirty) {
      setConfirmDiscardOpen(true);
      return;
    }
    onClose();
  };

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mutation.isPending) return;
    if (!isDirty) {
      onClose();
      return;
    }

    const pkg = parseTuitionPackageInputs(totalInput, sessionsInput);
    if (!pkg.ok) {
      toast.error(pkg.message);
      return;
    }
    const oneTimeError = oneTimePackageError(
      pricingMode,
      pkg.mode === "empty" ? undefined : pkg.total,
    );
    if (oneTimeError) {
      toast.error(oneTimeError);
      return;
    }

    const perBlock = toPerBlockTuitionForApi({
      mode: pricingMode,
      displayedAmount: parseOptionalMoneyInt(perBlockInput),
    });
    const payload: UpdateClassTuitionPayload =
      pkg.mode === "empty"
        ? {}
        : {
            tuition_package_total: pkg.total,
            tuition_package_session: pkg.sessions,
            student_tuition_per_session: computeStudentTuitionPerSessionFromPackage(
              pkg.total,
              pkg.sessions,
            ),
          };
    if (perBlock !== undefined) {
      payload.student_tuition_per_block = perBlock;
    }
    mutation.mutate(payload);
  };

  const tuitionBrief = compactTuitionChargeLine({
    mode: pricingMode,
    totalInput,
    sessionsInput,
    standardBlockCount,
    perSessionLine: compactTuitionPerSessionLine(totalInput, sessionsInput),
  });

  return (
    <>
      <ResponsiveDialog
        size="lg"
        labelledBy={TITLE_ID}
        describedBy={DESCRIPTION_ID}
        onBackdropClick={requestClose}
      >
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col" noValidate>
          <ResponsiveDialogBody className="flex flex-col gap-4">
            <div>
              <h2 id={TITLE_ID} className="text-base font-semibold text-text-primary">
                Học phí lớp
              </h2>
              <p id={DESCRIPTION_ID} className="mt-1 text-sm text-text-secondary">
                Học phí chung của lớp. Học sinh có học phí riêng giữ nguyên số riêng.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm text-text-secondary">
                <span>Tổng gói</span>
                <MoneyInput
                  value={totalInput}
                  onValueChange={setTotalInput}
                  className={INPUT_CLASS}
                  placeholder="VNĐ"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-text-secondary">
                <span>Số buổi</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={sessionsInput}
                  onChange={(e) => setSessionsInput(e.target.value)}
                  className={INPUT_CLASS}
                  placeholder="Số buổi"
                />
              </label>
              {pricingMode === "per_block" ? (
                <label className="flex flex-col gap-1 text-sm text-text-secondary sm:col-span-2">
                  <span>{classRateFieldLabels(pricingMode).tuition}</span>
                  <MoneyInput
                    value={perBlockInput}
                    onValueChange={setPerBlockInput}
                    className={INPUT_CLASS}
                    placeholder="Để trống = suy từ gói"
                  />
                </label>
              ) : null}
              {tuitionBrief ? (
                <p className="text-xs tabular-nums text-text-muted sm:col-span-2">{tuitionBrief}</p>
              ) : null}
            </div>
          </ResponsiveDialogBody>

          <ResponsiveActionFooter>
            <button
              type="button"
              onClick={requestClose}
              disabled={mutation.isPending}
              className={classEditorModalSecondaryButtonClassName}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className={classEditorModalPrimaryButtonClassName}
            >
              {mutation.isPending ? "Đang lưu..." : "Lưu"}
            </button>
          </ResponsiveActionFooter>
        </form>
      </ResponsiveDialog>
      <ConfirmDialog
        open={confirmDiscardOpen}
        onOpenChange={setConfirmDiscardOpen}
        title="Bỏ thay đổi học phí?"
        description="Học phí lớp vừa nhập chưa được lưu."
        confirmLabel="Bỏ"
        cancelLabel="Tiếp tục sửa"
        variant="destructive"
        onConfirm={onClose}
      />
    </>
  );
}
