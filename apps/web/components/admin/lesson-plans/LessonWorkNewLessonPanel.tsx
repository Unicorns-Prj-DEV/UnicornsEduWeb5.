"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import type { CreateLessonOutputPayload } from "@/dtos/lesson.dto";
import * as lessonApi from "@/lib/apis/lesson.api";
import LessonOutputEditorForm from "./LessonOutputEditorForm";
import LessonOutputQuickPopup from "./LessonOutputQuickPopup";

function getErrorMessage(error: unknown, fallback: string) {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ??
    (error as Error)?.message ??
    fallback
  );
}

export default function LessonWorkNewLessonPanel() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedOutputId, setSelectedOutputId] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (payload: CreateLessonOutputPayload) =>
      lessonApi.createLessonOutput(payload),
    onSuccess: async (output) => {
      toast.success("Đã thêm bài.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["lesson", "work"] }),
        queryClient.invalidateQueries({ queryKey: ["lesson", "exercises"] }),
        queryClient.invalidateQueries({ queryKey: ["lesson", "overview"] }),
      ]);
      setOpen(false);
      setSelectedOutputId(output.id);
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, "Không tạo được bài."));
    },
  });

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-border-default bg-bg-surface shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-text-primary transition-colors hover:bg-bg-secondary/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus sm:px-5"
        aria-expanded={open}
      >
        <span className="inline-flex min-w-0 items-center gap-2">
          <svg
            className="size-4 shrink-0 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span className="truncate">Thêm bài mới</span>
        </span>

        <svg
          className={`size-5 shrink-0 text-text-muted transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 15l7-7 7 7"
          />
        </svg>
      </button>

      {open ? (
        <div className="border-t border-border-default px-4 pb-5 pt-4 sm:px-5 sm:pb-6">
          <LessonOutputEditorForm
            mode="create"
            showParentTaskBanner={false}
            hideStaffFields
            forceSharedLayout
            allowTasklessOutput
            isSubmitting={createMutation.isPending}
            onCancel={() => setOpen(false)}
            onSubmit={async (payload) => {
              await createMutation.mutateAsync(payload);
            }}
          />
        </div>
      ) : null}

      <LessonOutputQuickPopup
        open={Boolean(selectedOutputId)}
        outputId={selectedOutputId}
        forceSharedLayout
        onClose={() => setSelectedOutputId(null)}
      />
    </div>
  );
}
