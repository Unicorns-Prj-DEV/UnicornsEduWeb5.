"use client";

import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
} from "framer-motion";
import { toast } from "sonner";
import type { CreateRegulationPayload } from "@/dtos/regulation.dto";
import RulePostFormPopup, {
  type RulePostFormValues,
} from "@/components/admin/notes-subject/RulePostFormPopup";
import RegulationsTabPanel from "@/components/admin/notes-subject/RegulationsTabPanel";
import DocsTab from "@/components/admin/notes-subject/DocsTab";
import {
  createRegulation,
  getRegulations,
  updateRegulation,
} from "@/lib/apis/regulation.api";

type TabId = "quy-dinh" | "tai-lieu";

const TAB_LABELS: Record<TabId, string> = {
  "quy-dinh": "Quy định",
  "tai-lieu": "Tài liệu",
};
const TAB_INDICATOR_TRANSITION: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 34,
  mass: 0.8,
};
const TAB_PANEL_TRANSITION: Transition = {
  duration: 0.24,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
};

export default function AdminNotesSubjectPage() {
  const queryClient = useQueryClient();
  const prefersReducedMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState<TabId>("quy-dinh");
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
  const indicatorTransition = prefersReducedMotion
    ? { duration: 0 }
    : TAB_INDICATOR_TRANSITION;
  const panelMotionProps = prefersReducedMotion
    ? {
        initial: { opacity: 1, y: 0 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 1, y: 0 },
        transition: { duration: 0 },
      }
    : {
        initial: { opacity: 0, y: 14 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -10 },
        transition: TAB_PANEL_TRANSITION,
      };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-3 pb-8 sm:p-6">
      <div className="flex min-w-0 flex-1 flex-col rounded-xl border border-border-default bg-bg-surface p-3 shadow-sm sm:rounded-lg sm:p-5">
        <section className="relative mb-4 overflow-hidden rounded-2xl border border-border-default bg-gradient-to-br from-bg-secondary via-bg-surface to-bg-secondary/70 p-4 sm:p-5">
          <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-primary/10 blur-2xl" aria-hidden />
          <div className="pointer-events-none absolute -bottom-10 left-16 size-28 rounded-full bg-warning/10 blur-2xl" aria-hidden />

          <div className="relative">
            <h1 className="text-xl font-semibold text-text-primary sm:text-2xl">Ghi chú môn học</h1>


            <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <nav
                className="inline-flex w-full gap-2 overflow-x-auto rounded-2xl border border-border-default bg-bg-surface/90 p-1.5 shadow-sm lg:w-auto"
                role="tablist"
                aria-label="Các tab"
              >
                {(Object.keys(TAB_LABELS) as TabId[]).map((tabId) => {
                  const isActive = activeTab === tabId;

                  return (
                    <button
                      key={tabId}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      aria-controls={`panel-${tabId}`}
                      id={`tab-${tabId}`}
                      onClick={() => setActiveTab(tabId)}
                      className={`relative isolate min-h-11 min-w-fit touch-manipulation overflow-hidden rounded-[0.9rem] px-4 py-2.5 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus ${isActive
                        ? "font-medium text-text-inverse"
                        : "text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
                        }`}
                    >
                      {isActive ? (
                        <motion.span
                          layoutId="notes-subject-tab-pill"
                          aria-hidden
                          className="absolute inset-0 rounded-[0.9rem] bg-primary shadow-sm ring-1 ring-primary/10"
                          transition={indicatorTransition}
                        />
                      ) : null}
                      <span className="relative z-10">{TAB_LABELS[tabId]}</span>
                    </button>
                  );
                })}
              </nav>

              {activeTab === "quy-dinh" ? (
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
              ) : (
                <div className="rounded-md border border-border-default bg-bg-surface px-4 py-2.5 text-sm text-text-secondary shadow-sm">
                  Chọn group rồi mở contest để xem tutorial.
                </div>
              )}
            </div>
          </div>
        </section>

        <div className="min-w-0 flex-1 overflow-auto">
          <AnimatePresence mode="wait" initial={false}>
            {activeTab === "quy-dinh" ? (
            <motion.section
              key="quy-dinh"
              id="panel-quy-dinh"
              role="tabpanel"
              aria-labelledby="tab-quy-dinh"
              className="space-y-6"
              {...panelMotionProps}
            >
              <RegulationsTabPanel
                rulePosts={rulePosts}
                isLoading={regulationsLoading}
                isError={regulationsError}
                onRetry={() => refetchRegulations()}
                onUpdateRule={handleUpdateRulePost}
              />
            </motion.section>
          ) : (
            <motion.section
              key="tai-lieu"
              id="panel-tai-lieu"
              role="tabpanel"
              aria-labelledby="tab-tai-lieu"
              className="space-y-4"
              {...panelMotionProps}
            >

              <div className="rounded-xl border border-border-default bg-bg-surface p-4 shadow-sm sm:p-5">
                <DocsTab />
              </div>
            </motion.section>
          )}
          </AnimatePresence>
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
