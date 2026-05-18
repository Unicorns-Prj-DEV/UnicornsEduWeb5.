"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminNotesSubjectPage from "@/app/admin/notes-subject/page";
import RegulationAudienceBadges from "@/components/admin/notes-subject/RegulationAudienceBadges";
import RegulationResourceLink from "@/components/admin/notes-subject/RegulationResourceLink";
import { getFullProfile } from "@/lib/apis/auth.api";
import { getRegulations } from "@/lib/apis/regulation.api";
import { sanitizeRichTextContent } from "@/lib/sanitize";

export default function StaffNotesSubjectPage() {
  const { data: profile } = useQuery({
    queryKey: ["auth", "full-profile"],
    queryFn: getFullProfile,
    retry: false,
    staleTime: 60_000,
  });
  const {
    data: regulations = [],
    isLoading: regulationsLoading,
    isError: regulationsError,
    refetch: refetchRegulations,
  } = useQuery({
    queryKey: ["regulations"],
    queryFn: getRegulations,
    staleTime: 60_000,
  });
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
            <h1 className="text-xl font-semibold text-text-primary sm:text-2xl">Quy định</h1>
            <p className="mt-1 text-sm text-text-muted">Danh sách quy định dành cho vai trò của bạn.</p>
          </div>
        </section>

        <div className="min-w-0 flex-1 overflow-auto">
          <section className="space-y-6">
            <div className="rounded-md border border-border-default bg-bg-secondary/60 px-3 py-2 text-sm text-text-secondary">
              {regulations.length} quy định
            </div>

            {regulationsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-36 animate-pulse rounded-xl border border-border-default bg-bg-surface"
                  />
                ))}
              </div>
            ) : regulationsError ? (
              <div
                className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-5 text-danger"
                role="alert"
              >
                <p>Không tải được danh sách quy định.</p>
                <button
                  type="button"
                  onClick={() => refetchRegulations()}
                  className="mt-3 inline-flex rounded-md border border-danger/30 bg-bg-surface px-3 py-2 text-sm font-medium text-danger transition-colors hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  Thử lại
                </button>
              </div>
            ) : regulations.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border-default bg-bg-surface py-16 text-center">
                <p className="text-base font-medium text-text-primary">Chưa có bài quy định nào.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {regulations.map((post, index) => (
                  <article
                    key={post.id}
                    className="rounded-xl border border-border-default bg-bg-surface p-4 shadow-sm transition-colors duration-200 hover:border-border-focus hover:bg-bg-elevated sm:p-5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex rounded-full bg-bg-secondary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-text-secondary ring-1 ring-border-default">
                        Bài {String(index + 1).padStart(2, "0")}
                      </span>
                      <RegulationAudienceBadges audiences={post.audiences} />
                    </div>
                    <h2 className="mt-4 text-xl font-semibold text-text-primary">{post.title}</h2>
                    <div className="mt-3">
                      <RegulationResourceLink
                        resourceLink={post.resourceLink}
                        resourceLinkLabel={post.resourceLinkLabel}
                      />
                    </div>
                    {post.description ? (
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">{post.description}</p>
                    ) : null}
                    <div
                      className="prose prose-sm mt-4 max-w-none text-text-secondary [&_.katex-display]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-6"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeRichTextContent(post.content),
                      }}
                    />
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
