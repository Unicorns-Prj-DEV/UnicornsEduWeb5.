"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import NotesSubjectRichEditor from "./NotesSubjectRichEditor";
import {
  getProblemTutorial,
  upsertProblemTutorial,
} from "@/lib/apis/cf-problem-tutorial.api";
import type { CfProblem } from "@/dtos/codeforces.dto";

type Props = {
  open: boolean;
  onClose: () => void;
  problem: CfProblem | null;
};

type FormValues = {
  tutorial: string;
};

export default function ProblemTutorialPopup({
  open,
  onClose,
  problem,
}: Props) {
  const queryClient = useQueryClient();
  const contestId = problem?.contestId ?? 0;
  const problemIndex = problem?.index ?? "";

  const { data, isLoading } = useQuery({
    queryKey: ["cf-problem-tutorial", contestId, problemIndex],
    queryFn: () => getProblemTutorial(contestId, problemIndex),
    enabled: open && !!problem && contestId > 0 && !!problemIndex,
  });

  const { mutate: saveTutorial, isPending: isSaving } = useMutation({
    mutationFn: (tutorial: string | null) =>
      upsertProblemTutorial(contestId, problemIndex, tutorial),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["cf-problem-tutorial", contestId, problemIndex],
      });
      toast.success("Đã lưu tutorial.");
      onClose();
    },
    onError: () => {
      toast.error("Không lưu được tutorial.");
    },
  });

  const {
    setValue,
    watch,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm<FormValues>({
    defaultValues: { tutorial: "" },
  });

  const tutorialValue = watch("tutorial");

  useEffect(() => {
    if (!open || !problem) return;
    const val = data?.tutorial ?? "";
    reset({ tutorial: val });
  }, [open, problem, data?.tutorial, reset]);

  const onFormSubmit = (values: FormValues) => {
    saveTutorial(values.tutorial || null);
  };

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50"
        aria-hidden
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="problem-tutorial-form-title"
        className="fixed inset-x-3 top-1/2 z-50 max-h-[88vh] -translate-y-1/2 overflow-y-auto rounded-xl border border-border-default bg-bg-surface p-4 shadow-xl sm:left-1/2 sm:w-full sm:max-w-2xl sm:-translate-x-1/2 sm:p-5"
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2
            id="problem-tutorial-form-title"
            className="text-lg font-semibold text-text-primary"
          >
            Tutorial: {problem?.name ?? "—"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-text-muted transition-colors duration-200 hover:bg-bg-tertiary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            aria-label="Đóng"
          >
            <svg
              className="size-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            <span>Nội dung tutorial</span>
            {isLoading ? (
              <div className="min-h-[180px] rounded-md border border-border-default bg-bg-secondary animate-pulse" />
            ) : (
              <NotesSubjectRichEditor
                value={tutorialValue}
                onChange={(html) =>
                  setValue("tutorial", html, { shouldDirty: true })
                }
                minHeight="min-h-[200px]"
              />
            )}
          </label>

          <div className="flex items-center justify-end gap-2 border-t border-border-default pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border-default bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors duration-200 hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors duration-200 hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:opacity-60"
            >
              {isSaving ? "Đang lưu…" : "Lưu"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
