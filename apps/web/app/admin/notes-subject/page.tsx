"use client";

import { useState } from "react";
import { toast } from "sonner";
import RulePostFormPopup, { type RulePostFormValues, type RulePostItem } from "@/components/admin/notes-subject/RulePostFormPopup";
import DocsTab from "@/components/admin/notes-subject/DocsTab";

const INITIAL_MOCK_RULE_POSTS: RulePostItem[] = [
  {
    id: "1",
    title: "Quy định nộp bài",
    description: "Hướng dẫn và thời hạn nộp bài",
    content: "<p>Học viên cần nộp bài đúng thời hạn. Bài nộp trễ sẽ bị trừ điểm.</p>",
  },
  {
    id: "2",
    title: "Quy định điểm danh",
    description: "Cách thức điểm danh và vắng có phép",
    content: "<p>Điểm danh trước 15 phút sau giờ học. Vắng có phép cần báo trước 24h.</p>",
  },
];

type TabId = "quy-dinh" | "tai-lieu";

export default function AdminNotesSubjectPage() {
  const [activeTab, setActiveTab] = useState<TabId>("quy-dinh");
  const [rulePosts, setRulePosts] = useState<RulePostItem[]>(INITIAL_MOCK_RULE_POSTS);
  const [formPopupOpen, setFormPopupOpen] = useState(false);

  const handleAddRulePost = (values: RulePostFormValues) => {
    const newPost: RulePostItem = {
      id: crypto.randomUUID(),
      title: values.title,
      description: values.description,
      content: values.content,
    };
    setRulePosts((prev) => [newPost, ...prev]);
    toast.success("Đã thêm bài quy định");
    setFormPopupOpen(false);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-xl font-semibold text-text-primary sm:text-2xl">
        Ghi chú môn học
      </h1>

      {/* Tabs */}
      <div className="border-b border-border-default">
        <nav className="flex gap-1" role="tablist" aria-label="Các tab">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "quy-dinh"}
            aria-controls="panel-quy-dinh"
            id="tab-quy-dinh"
            onClick={() => setActiveTab("quy-dinh")}
            className={`rounded-t-md px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus ${
              activeTab === "quy-dinh"
                ? "border-b-2 border-primary bg-bg-surface text-primary -mb-px"
                : "text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
            }`}
          >
            Quy định
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "tai-lieu"}
            aria-controls="panel-tai-lieu"
            id="tab-tai-lieu"
            onClick={() => setActiveTab("tai-lieu")}
            className={`rounded-t-md px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus ${
              activeTab === "tai-lieu"
                ? "border-b-2 border-primary bg-bg-surface text-primary -mb-px"
                : "text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
            }`}
          >
            Tài liệu
          </button>
        </nav>
      </div>

      {/* Tab panels */}
      <div className="rounded-xl border border-border-default bg-bg-surface p-4 sm:p-6">
        {activeTab === "quy-dinh" && (
          <div
            id="panel-quy-dinh"
            role="tabpanel"
            aria-labelledby="tab-quy-dinh"
            className="space-y-4"
          >
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-text-muted">
                Các bài quy định môn học. Bấm &quot;Thêm bài quy định&quot; để tạo mới.
              </p>
              <button
                type="button"
                onClick={() => setFormPopupOpen(true)}
                className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                Thêm bài quy định
              </button>
            </div>

            {rulePosts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border-default bg-bg-secondary/50 py-12 text-center">
                <p className="text-text-muted">
                  Chưa có bài quy định nào. Bấm &quot;Thêm bài quy định&quot; để bắt đầu.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {rulePosts.map((post) => (
                  <li key={post.id}>
                    <article className="rounded-xl border border-border-default bg-bg-surface p-4 transition-colors hover:border-border-focus hover:bg-bg-elevated">
                      <h3 className="font-semibold text-text-primary">
                        {post.title}
                      </h3>
                      {post.description && (
                        <p className="mt-1 text-sm text-text-secondary">
                          {post.description}
                        </p>
                      )}
                      <div
                        className="mt-3 text-sm text-text-secondary [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_strong]:font-bold"
                        dangerouslySetInnerHTML={{ __html: post.content }}
                      />
                    </article>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {activeTab === "tai-lieu" && (
          <div
            id="panel-tai-lieu"
            role="tabpanel"
            aria-labelledby="tab-tai-lieu"
          >
            <DocsTab />
          </div>
        )}
      </div>

      <RulePostFormPopup
        open={formPopupOpen}
        onClose={() => setFormPopupOpen(false)}
        onSubmit={handleAddRulePost}
      />
    </div>
  );
}
