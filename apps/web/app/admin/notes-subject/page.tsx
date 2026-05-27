"use client";

import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { CreateRegulationPayload } from "@/dtos/regulation.dto";
import RulePostFormPopup, {
  type RulePostFormValues,
} from "@/components/admin/notes-subject/RulePostFormPopup";
import RegulationsTabPanel from "@/components/admin/notes-subject/RegulationsTabPanel";
import {
  createRegulation,
  deleteRegulation,
  getRegulations,
  updateRegulation,
} from "@/lib/apis/regulation.api";

export default function AdminNotesSubjectPage() {
  const queryClient = useQueryClient();
  const [formPopupOpen, setFormPopupOpen] = useState(false);

  const {
    data: rulePosts = [],
    isLoading: regulationsLoading,
    isError: regulationsError,
    refetch: refetchRegulations,
  } = useQuery({
    queryKey: ["regulations"],
    queryFn: getRegulations,
    staleTime: 60_000,
  });

  const createMutation = useMutation({
    mutationFn: createRegulation,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["regulations"] });
    },
    onError: () => {
      toast.error("Không thêm được bài quy định");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: CreateRegulationPayload;
    }) => updateRegulation(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["regulations"] });
    },
    onError: () => {
      toast.error("Không cập nhật được quy định");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRegulation,
    onSuccess: async () => {
      toast.success("Đã xóa quy định");
      await queryClient.invalidateQueries({ queryKey: ["regulations"] });
    },
    onError: () => {
      toast.error("Không xóa được quy định");
    },
  });

  useEffect(() => {
    if (typeof document === "undefined") return;

    const existing = document.getElementById("katex-styles");
    if (existing) return;

    const link = document.createElement("link");
    link.id = "katex-styles";
    link.rel = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css";
    link.crossOrigin = "anonymous";
    document.head.appendChild(link);
  }, []);

  const handleAddRulePost = useCallback(async (values: RulePostFormValues) => {
    await createMutation.mutateAsync(buildRegulationPayload(values));
    toast.success("Đã thêm bài quy định");
    setFormPopupOpen(false);
  }, [createMutation]);

  const handleUpdateRulePost = useCallback(
    async (id: string, values: RulePostFormValues) => {
      await updateMutation.mutateAsync({
        id,
        payload: buildRegulationPayload(values),
      });
    },
    [updateMutation],
  );

  const handleDeleteRulePost = useCallback(
    async (id: string) => {
      await deleteMutation.mutateAsync(id);
    },
    [deleteMutation],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-3 pb-8 sm:p-6">
      <div className="flex min-w-0 flex-1 flex-col rounded-xl border border-border-default bg-bg-surface p-3 shadow-sm sm:rounded-lg sm:p-5">
        <section className="relative mb-4 overflow-hidden rounded-2xl border border-border-default bg-gradient-to-br from-bg-secondary via-bg-surface to-bg-secondary/70 p-4 sm:p-5">
          <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-primary/10 blur-2xl" aria-hidden />
          <div className="pointer-events-none absolute -bottom-10 left-16 size-28 rounded-full bg-warning/10 blur-2xl" aria-hidden />

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-xl font-semibold text-text-primary sm:text-2xl">Quy định</h1>

            <button
              type="button"
              onClick={() => setFormPopupOpen(true)}
              className="inline-flex size-11 items-center justify-center rounded-md bg-primary text-text-inverse transition-colors duration-200 hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus sm:size-10"
              aria-label="Thêm bài quy định"
              title="Thêm bài quy định"
            >
              <svg
                className="size-4 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="sr-only">Thêm bài quy định</span>
            </button>
          </div>
        </section>

        <div className="min-w-0 flex-1 overflow-auto">
          <section className="space-y-6">
            <RegulationsTabPanel
              rulePosts={rulePosts}
              isLoading={regulationsLoading}
              isError={regulationsError}
              onRetry={() => refetchRegulations()}
              onUpdateRule={handleUpdateRulePost}
              onDeleteRule={handleDeleteRulePost}
              deletingRuleId={
                deleteMutation.isPending ? deleteMutation.variables ?? null : null
              }
            />
          </section>
        </div>
      </div>

      <RulePostFormPopup
        open={formPopupOpen}
        onClose={() => setFormPopupOpen(false)}
        onSubmit={handleAddRulePost}
      />
    </div>
  );
}

function buildRegulationPayload(values: RulePostFormValues): CreateRegulationPayload {
  const description = values.description.trim();
  const resourceLink = values.resourceLink.trim();
  const resourceLinkLabel = values.resourceLinkLabel.trim();

  return {
    title: values.title.trim(),
    description: description || null,
    content: values.content,
    audiences: values.audiences,
    resourceLink: resourceLink || null,
    resourceLinkLabel: resourceLinkLabel || null,
  };
}
