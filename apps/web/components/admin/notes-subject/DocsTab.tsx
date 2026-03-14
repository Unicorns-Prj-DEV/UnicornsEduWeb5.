"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getCodeforcesDocGroups,
  getCodeforcesContests,
  getCodeforcesContestProblems,
} from "@/lib/apis/codeforces.api";
import type { CfContest, CfDocGroup, CfProblem } from "@/dtos/codeforces.dto";
import ProblemTutorialPopup from "./ProblemTutorialPopup";

export default function DocsTab() {
  const [selectedGroup, setSelectedGroup] = useState<CfDocGroup | null>(null);
  const [expandedContestId, setExpandedContestId] = useState<number | null>(null);
  const [selectedProblem, setSelectedProblem] = useState<CfProblem | null>(
    null
  );
  const [tutorialPopupOpen, setTutorialPopupOpen] = useState(false);

  const { data: docGroups, isLoading: docGroupsLoading } = useQuery({
    queryKey: ["codeforces", "doc-groups"],
    queryFn: getCodeforcesDocGroups,
  });

  const {
    data: contests,
    isLoading: contestsLoading,
    error: contestsError,
    refetch: refetchContests,
  } = useQuery({
    queryKey: ["codeforces", "contests", selectedGroup?.groupCode],
    queryFn: () =>
      getCodeforcesContests(selectedGroup?.groupCode ?? ""),
    enabled: !!selectedGroup?.groupCode,
  });

  const {
    data: problems,
    isLoading: problemsLoading,
    error: problemsError,
  } = useQuery({
    queryKey: ["codeforces", "contests", expandedContestId, "problems"],
    queryFn: () =>
      getCodeforcesContestProblems(expandedContestId as number),
    enabled: expandedContestId != null,
  });

  const handleDocGroupClick = (group: CfDocGroup) => {
    setSelectedGroup(group);
    setExpandedContestId(null);
  };

  const handleBack = () => {
    setSelectedGroup(null);
    setExpandedContestId(null);
  };

  const handleContestClick = (contest: CfContest) => {
    setExpandedContestId((prev) =>
      prev === contest.id ? null : contest.id
    );
  };

  const handleProblemClick = (problem: CfProblem, contestId: number) => {
    setSelectedProblem({
      ...problem,
      contestId: problem.contestId ?? contestId,
    });
    setTutorialPopupOpen(true);
  };

  const handleCloseTutorialPopup = () => {
    setTutorialPopupOpen(false);
    setSelectedProblem(null);
  };

  const cfUrl = (contestId: number, problemIndex?: string) => {
    const baseUrl = selectedGroup?.websiteUrl ?? "https://codeforces.com";
    const groupCode = selectedGroup?.groupCode ?? "QMLH5CiNY0";
    const base = `${baseUrl}/group/${groupCode}/contest/${contestId}`;
    return problemIndex ? `${base}/problem/${problemIndex}` : base;
  };

  // Màn hình 1: Danh sách 3 dòng tài liệu
  if (!selectedGroup) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-text-muted">
          Chọn một nhóm tài liệu để xem danh sách contest và chỉnh sửa tutorial.
        </p>

        {docGroupsLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 rounded-xl border border-border-default bg-bg-surface animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {docGroups?.map((group) => (
              <button
                key={group.id}
                type="button"
                onClick={() => handleDocGroupClick(group)}
                className="flex w-full items-center justify-between gap-4 rounded-xl border border-border-default bg-bg-surface px-4 py-4 text-left transition-colors hover:border-border-focus hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                <span className="font-medium text-text-primary">
                  {group.title}
                </span>
                <span className="shrink-0 text-text-muted">→</span>
              </button>
            ))}
          </div>
        )}

        <ProblemTutorialPopup
          open={tutorialPopupOpen}
          onClose={handleCloseTutorialPopup}
          problem={selectedProblem}
        />
      </div>
    );
  }

  // Màn hình 2: Danh sách contest của group đã chọn
  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={handleBack}
        className="flex items-center gap-1 text-sm text-text-muted transition-colors hover:text-primary"
      >
        <svg
          className="size-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Quay lại
      </button>

      <h3 className="text-base font-semibold text-text-primary">
        {selectedGroup.title}
      </h3>

      {selectedGroup.websiteUrl && (
        <a
          href={selectedGroup.websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-2 inline-flex items-center gap-1 rounded-md border border-border-default bg-bg-surface px-3 py-2 text-sm text-primary transition-colors hover:bg-bg-secondary hover:border-border-focus"
        >
          <svg
            className="size-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
          Website: {selectedGroup.websiteUrl}
        </a>
      )}

      {contestsError ? (
        <div className="rounded-xl border border-border-default border-warning/50 bg-bg-surface p-6 text-center">
          <p className="mb-3 text-text-muted">
            Không tải được danh sách contest. Kiểm tra cấu hình API.
          </p>
          <button
            type="button"
            onClick={() => refetchContests()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-text-inverse hover:bg-primary-hover"
          >
            Thử lại
          </button>
        </div>
      ) : contestsLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-14 rounded-xl border border-border-default bg-bg-surface animate-pulse"
            />
          ))}
        </div>
      ) : !contests || contests.length === 0 ? (
        <div className="rounded-xl border border-border-default bg-bg-surface p-8 text-center text-text-muted">
          Chưa có contest nào trong nhóm này.
        </div>
      ) : (
        <div className="space-y-2">
          {contests.map((contest) => (
            <div
              key={contest.id}
              className="overflow-hidden rounded-xl border border-border-default bg-bg-surface"
            >
              <button
                type="button"
                onClick={() => handleContestClick(contest)}
                className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
              >
                <span className="font-medium text-text-primary">
                  {contest.name}
                </span>
                <span className="text-text-muted">
                  {expandedContestId === contest.id ? "−" : "+"}
                </span>
              </button>

              {expandedContestId === contest.id && (
                <div className="border-t border-border-default bg-bg-secondary/50 p-3">
                  {problemsLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="h-10 rounded-md bg-bg-surface animate-pulse"
                        />
                      ))}
                    </div>
                  ) : problemsError ? (
                    <p className="text-sm text-danger">
                      Không tải được danh sách bài.
                    </p>
                  ) : !problems || problems.length === 0 ? (
                    <p className="text-sm text-text-muted">
                      Chưa có bài trong contest này.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {problems.map((problem) => (
                        <li key={problem.index}>
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => handleProblemClick(problem, contest.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handleProblemClick(problem, contest.id);
                              }
                            }}
                            className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-md border border-border-subtle bg-bg-surface p-3 transition-colors hover:border-border-default hover:bg-bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                          >
                            <span className="min-w-[2.5rem] shrink-0 text-sm font-medium text-primary">
                              {problem.index}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-sm text-text-primary">
                              {problem.name}
                            </span>
                            <a
                              href={cfUrl(contest.id, problem.index)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 rounded px-2 py-1 text-xs text-info hover:bg-info/10 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Mở trên CF
                            </a>
                            <span className="shrink-0 rounded px-2 py-1 text-xs font-medium text-primary">
                              Tutorial
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ProblemTutorialPopup
        open={tutorialPopupOpen}
        onClose={handleCloseTutorialPopup}
        problem={selectedProblem}
      />
    </div>
  );
}
