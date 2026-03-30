"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
} from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import AdminNotesSubjectPage from "@/app/admin/notes-subject/page";
import DocsTab from "@/components/admin/notes-subject/DocsTab";
import { getFullProfile } from "@/lib/apis/auth.api";

const MOCK_RULE_POSTS = [
  {
    id: "1",
    title: "Quy định nộp bài",
    description: "Hướng dẫn và thời hạn nộp bài",
    content:
      "Học viên cần nộp bài **đúng thời hạn**. Bài nộp trễ sẽ bị trừ điểm.\n\nVí dụ: nếu bài được chấm theo thang điểm \\(10\\), nộp trễ 1 ngày trừ \\(1\\) điểm.",
  },
  {
    id: "2",
    title: "Quy định điểm danh",
    description: "Cách thức điểm danh và vắng có phép",
    content:
      "Điểm danh trước **15 phút** sau giờ học. Vắng có phép cần báo trước *24h*.\n\nCông thức minh họa: $$\\text{Tỉ lệ chuyên cần} = \\frac{\\text{số buổi có mặt}}{\\text{tổng số buổi}} \\times 100\\%.$$",
  },
];

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

export default function StaffNotesSubjectPage() {
  const { data: profile } = useQuery({
    queryKey: ["auth", "full-profile"],
    queryFn: getFullProfile,
    retry: false,
    staleTime: 60_000,
  });
  const prefersReducedMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState<TabId>("quy-dinh");
  const isAssistant =
    profile?.roleType === "staff" &&
    (profile.staffInfo?.roles ?? []).includes("assistant");

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

  if (isAssistant) {
    return <AdminNotesSubjectPage />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-bg-primary p-3 pb-8 sm:p-6">
      <div className="flex min-w-0 flex-1 flex-col rounded-xl border border-border-default bg-bg-surface p-3 shadow-sm sm:rounded-lg sm:p-5">
        <section className="relative mb-4 overflow-hidden rounded-2xl border border-border-default bg-gradient-to-br from-bg-secondary via-bg-surface to-bg-secondary/70 p-4 sm:p-5">
          <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-primary/10 blur-2xl" aria-hidden />
          <div className="pointer-events-none absolute -bottom-10 left-16 size-28 rounded-full bg-warning/10 blur-2xl" aria-hidden />

          <div className="relative">
            <h1 className="text-xl font-semibold text-text-primary sm:text-2xl">Ghi chú môn học</h1>
            <p className="mt-1 text-sm text-text-muted">Quy định và tài liệu (chỉ xem)</p>

            <div className="mt-4">
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
                          layoutId="staff-notes-tab-pill"
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
                <div className="rounded-md border border-border-default bg-bg-secondary/60 px-3 py-2 text-sm text-text-secondary">
                  {MOCK_RULE_POSTS.length} bài quy định
                </div>

                {MOCK_RULE_POSTS.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border-default bg-bg-surface py-16 text-center">
                    <p className="text-base font-medium text-text-primary">Chưa có bài quy định nào.</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {MOCK_RULE_POSTS.map((post, index) => (
                      <article
                        key={post.id}
                        className="rounded-xl border border-border-default bg-bg-surface p-4 shadow-sm transition-colors duration-200 hover:border-border-focus hover:bg-bg-elevated sm:p-5"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex rounded-full bg-bg-secondary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary ring-1 ring-border-default">
                            Bài {String(index + 1).padStart(2, "0")}
                          </span>
                        </div>
                        <h2 className="mt-4 text-xl font-semibold text-text-primary">{post.title}</h2>
                        {post.description ? (
                          <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">{post.description}</p>
                        ) : null}
                        <div className="prose prose-sm mt-4 max-w-none text-text-secondary [&_.katex-display]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-6">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkMath]}
                            rehypePlugins={[[rehypeKatex, { strict: "ignore" }]]}
                          >
                            {post.content}
                          </ReactMarkdown>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
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
    </div>
  );
}
