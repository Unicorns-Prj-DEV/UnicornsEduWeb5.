"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import type { CreateLessonOutputPayload } from "@/dtos/lesson.dto";
import * as lessonApi from "@/lib/apis/lesson.api";
import LessonWorkAddLessonForm from "./LessonWorkAddLessonForm";

function getErrorMessage(error: unknown, fallback: string) {
  return (
    (error as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ??
    (error as Error)?.message ??
    fallback
  );
}

export default function LessonWorkNewLessonPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(true);

  const createMutation = useMutation({
    mutationFn: (payload: CreateLessonOutputPayload) =>
      lessonApi.createLessonOutput(payload),
    onSuccess: (output) => {
      toast.success("Đã thêm bài.");
      void queryClient.invalidateQueries({ queryKey: ["lesson", "work"] });
      void queryClient.invalidateQueries({ queryKey: ["lesson", "exercises"] });
      void queryClient.invalidateQueries({ queryKey: ["lesson", "overview"] });
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      const tab = searchParams.get("tab");
      if (tab === "overview" || tab === "work" || tab === "exercises") {
        params.set("tab", tab);
      } else {
        params.set("tab", "work");
      }
      router.push(
        `/admin/lesson-plans/outputs/${encodeURIComponent(output.id)}?${params.toString()}`,
      );
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, "Không tạo được bài."));
    },
  });

  return (
    <div className="rounded-xl border border-dashed border-border-default bg-bg-surface shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-text-primary transition-colors hover:bg-bg-secondary/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        aria-expanded={open}
      >
        <span className="inline-flex min-w-0 items-center gap-2">
          <svg
            className="size-5 shrink-0 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
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
        <div className="border-t border-border-default px-4 pb-5 pt-4 sm:px-5">
          <LessonWorkAddLessonForm
            isSubmitting={createMutation.isPending}
            onCancel={() => setOpen(false)}
            onSubmit={async (payload) => {
              await createMutation.mutateAsync(payload);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
