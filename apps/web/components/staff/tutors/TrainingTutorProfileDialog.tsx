"use client";

import { useId, useRef, useState, type FormEvent } from "react";
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
import type {
  TrainingTutorDetail,
  UpdateTrainingTutorProfilePayload,
} from "@/dtos/training-tutor.dto";
import {
  trainingTutorKeys,
  updateTrainingTutorProfile,
  uploadTrainingTutorAvatar,
} from "@/lib/apis/training-tutor.api";
import { getMutationErrorMessage } from "@/lib/mutation-feedback";

type FieldKey = keyof Required<UpdateTrainingTutorProfilePayload>;

const FIELDS: {
  key: FieldKey;
  label: string;
  maxLength: number;
  required?: boolean;
}[] = [
  { key: "lastName", label: "Họ", maxLength: 100 },
  { key: "firstName", label: "Tên", maxLength: 100, required: true },
  { key: "university", label: "Trường đại học", maxLength: 255 },
  { key: "highSchool", label: "Trường THPT", maxLength: 255 },
];

const INPUT_CLASS =
  "min-h-11 w-full rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:opacity-50 aria-invalid:border-error";

function initialValues(tutor: TrainingTutorDetail): Record<FieldKey, string> {
  return {
    lastName: tutor.management?.lastName ?? "",
    firstName: tutor.management?.firstName ?? "",
    university: tutor.university ?? "",
    highSchool: tutor.highSchool ?? "",
  };
}

/**
 * Hồ sơ chuyên môn của cấp dưới (#278): họ tên, ảnh đại diện, trường. Không có
 * liên hệ, giấy tờ, ngân hàng, lương — backend cũng không nhận các field đó.
 * Thành tích sửa qua popup thành tích riêng.
 */
export default function TrainingTutorProfileDialog({
  tutor,
  onClose,
}: {
  tutor: TrainingTutorDetail;
  onClose: () => void;
}) {
  const titleId = useId();
  const descId = useId();
  const avatarInputId = useId();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { confirm, dialog } = useConfirmDialog();
  const [initial] = useState(() => initialValues(tutor));
  const [values, setValues] = useState(initial);

  const changed = FIELDS.filter(
    ({ key }) => values[key].trim() !== initial[key].trim(),
  );
  const isDirty = changed.length > 0;
  const firstNameEmpty = values.firstName.trim() === "";

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: trainingTutorKeys.all });

  const mutation = useMutation({
    mutationFn: () => {
      const payload: UpdateTrainingTutorProfilePayload = {};
      for (const { key } of changed) payload[key] = values[key].trim();
      return updateTrainingTutorProfile(tutor.id, payload);
    },
    onSuccess: async () => {
      toast.success("Đã cập nhật hồ sơ chuyên môn.");
      await invalidate();
      onClose();
    },
    onError: (error) => {
      toast.error(
        getMutationErrorMessage(error, "Không cập nhật được hồ sơ chuyên môn."),
      );
    },
  });

  const avatarMutation = useMutation({
    mutationFn: (file: File) => uploadTrainingTutorAvatar(tutor.id, file),
    onSuccess: async () => {
      toast.success("Đã đổi ảnh đại diện.");
      await invalidate();
    },
    onError: (error) => {
      toast.error(
        getMutationErrorMessage(error, "Không đổi được ảnh đại diện."),
      );
    },
    onSettled: () => {
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    },
  });

  const busy = mutation.isPending || avatarMutation.isPending;

  const requestClose = async () => {
    if (busy) return;
    if (await confirmUnsavedClose(confirm, isDirty)) onClose();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isDirty || firstNameEmpty || busy) return;
    mutation.mutate();
  };

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
            Sửa hồ sơ chuyên môn
          </h2>
          <p id={descId} className="mt-1 text-sm text-text-secondary">
            Họ tên, ảnh đại diện và trường học. Thông tin cá nhân, ngân hàng,
            lương do Admin quản lý.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <ResponsiveDialogBody>
            <div className="mb-4 flex flex-col gap-1.5">
              <label
                htmlFor={avatarInputId}
                className="text-sm font-medium text-text-primary"
              >
                Ảnh đại diện
              </label>
              <input
                ref={avatarInputRef}
                id={avatarInputId}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={busy}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) avatarMutation.mutate(file);
                }}
                className="min-h-11 w-full text-sm text-text-secondary file:mr-3 file:min-h-10 file:rounded-md file:border file:border-border-default file:bg-bg-secondary file:px-3 file:text-sm file:text-text-primary disabled:opacity-50"
              />
              <p className="text-xs text-text-muted">
                {avatarMutation.isPending
                  ? "Đang tải ảnh lên…"
                  : "JPG, PNG hoặc WebP, tối đa 5 MB. Ảnh được lưu ngay khi chọn."}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {FIELDS.map(({ key, label, maxLength, required }) => {
                const inputId = `${titleId}-${key}`;
                return (
                  <div key={key} className="flex flex-col gap-1.5">
                    <label
                      htmlFor={inputId}
                      className="text-sm font-medium text-text-primary"
                    >
                      {label}
                      {required ? <span className="text-error"> *</span> : null}
                    </label>
                    <input
                      id={inputId}
                      type="text"
                      className={INPUT_CLASS}
                      value={values[key]}
                      maxLength={maxLength}
                      disabled={busy}
                      aria-invalid={required && firstNameEmpty}
                      onChange={(event) =>
                        setValues((prev) => ({
                          ...prev,
                          [key]: event.target.value,
                        }))
                      }
                    />
                  </div>
                );
              })}
            </div>
            {firstNameEmpty ? (
              <p className="mt-2 text-xs text-error">
                Tên không được để trống.
              </p>
            ) : null}
          </ResponsiveDialogBody>
          <ResponsiveActionFooter>
            <button
              type="button"
              onClick={() => void requestClose()}
              disabled={busy}
              className="min-h-11 rounded-xl border border-border-default bg-bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-50"
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled={!isDirty || firstNameEmpty || busy}
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
