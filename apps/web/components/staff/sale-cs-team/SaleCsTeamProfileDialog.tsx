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
import type {
  SaleCsTeamMember,
  UpdateSaleCsTeamProfilePayload,
} from "@/dtos/sale-cs-team.dto";
import {
  saleCsTeamKeys,
  updateSaleCsTeamProfile,
} from "@/lib/apis/sale-cs-team.api";
import { getMutationErrorMessage } from "@/lib/mutation-feedback";

type FieldKey = keyof Required<UpdateSaleCsTeamProfilePayload>;

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

function initialValues(member: SaleCsTeamMember): Record<FieldKey, string> {
  return {
    lastName: member.lastName ?? "",
    firstName: member.firstName ?? "",
    university: member.university ?? "",
    highSchool: member.highSchool ?? "",
  };
}

/**
 * Hồ sơ chuyên môn thành viên đội (#271): chỉ họ tên + trường. Không có liên
 * hệ, giấy tờ, ngân hàng, lương — backend cũng không nhận các field đó.
 */
export default function SaleCsTeamProfileDialog({
  member,
  onClose,
}: {
  member: SaleCsTeamMember;
  onClose: () => void;
}) {
  const titleId = useId();
  const descId = useId();
  const queryClient = useQueryClient();
  const { confirm, dialog } = useConfirmDialog();
  const [initial] = useState(() => initialValues(member));
  const [values, setValues] = useState(initial);

  const changed = FIELDS.filter(
    ({ key }) => values[key].trim() !== initial[key].trim(),
  );
  const isDirty = changed.length > 0;
  const firstNameEmpty = values.firstName.trim() === "";

  const mutation = useMutation({
    mutationFn: () => {
      const payload: UpdateSaleCsTeamProfilePayload = {};
      for (const { key } of changed) payload[key] = values[key].trim();
      return updateSaleCsTeamProfile(member.id, payload);
    },
    onSuccess: async () => {
      toast.success("Đã cập nhật hồ sơ chuyên môn.");
      await queryClient.invalidateQueries({ queryKey: saleCsTeamKeys.all });
      onClose();
    },
    onError: (error) => {
      toast.error(
        getMutationErrorMessage(error, "Không cập nhật được hồ sơ chuyên môn."),
      );
    },
  });

  const requestClose = async () => {
    if (mutation.isPending) return;
    if (await confirmUnsavedClose(confirm, isDirty)) onClose();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isDirty || firstNameEmpty || mutation.isPending) return;
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
            Chỉ họ tên và trường học. Thông tin cá nhân, ngân hàng, lương do
            Admin quản lý.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <ResponsiveDialogBody>
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
                      disabled={mutation.isPending}
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
              disabled={mutation.isPending}
              className="min-h-11 rounded-xl border border-border-default bg-bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!isDirty || firstNameEmpty || mutation.isPending}
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
