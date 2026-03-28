"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";

export type LessonTagGroup = {
  key: string;
  label: string;
  toneClassName: string;
  tags: string[];
};

const CUSTOM_TAGS_STORAGE_KEY = "lesson.custom-tags.v1";

const TAG_GROUPS: LessonTagGroup[] = [
  {
    key: "level-0",
    label: "LEVEL 0: NỀN TẢNG",
    toneClassName: "bg-slate-100 text-slate-600",
    tags: [
      "Nhập/Xuất",
      "Input/Output",
      "I/O",
      "Câu lệnh rẽ nhánh",
      "Conditional Statement",
      "if-else",
      "Vòng lặp",
      "Loop",
    ],
  },
  {
    key: "level-1",
    label: "LEVEL 1: THUẬT TOÁN CƠ BẢN",
    toneClassName: "bg-emerald-50 text-emerald-700",
    tags: [
      "Đệ quy",
      "Recursion",
      "Mảng 1 chiều",
      "Array",
      "Xâu",
      "String",
      "Sắp xếp",
      "Sorting",
    ],
  },
  {
    key: "level-2",
    label: "LEVEL 2: CẤU TRÚC DỮ LIỆU",
    toneClassName: "bg-sky-50 text-sky-700",
    tags: [
      "Stack",
      "Queue",
      "Linked List",
      "Hashing",
      "Binary Search",
      "Prefix Sum",
      "Two Pointers",
      "Greedy",
    ],
  },
  {
    key: "level-3",
    label: "LEVEL 3: NÂNG CAO",
    toneClassName: "bg-violet-50 text-violet-700",
    tags: [
      "Dynamic Programming",
      "DFS",
      "BFS",
      "Shortest Path",
      "Disjoint Set Union",
      "Segment Tree",
      "Fenwick Tree",
      "LCA",
    ],
  },
  {
    key: "level-4",
    label: "LEVEL 4: OLYMPIC",
    toneClassName: "bg-amber-50 text-amber-700",
    tags: [
      "Bitmask",
      "Combinatorics",
      "Number Theory",
      "Graph Theory",
      "Game Theory",
      "Meet in the Middle",
      "Digit DP",
      "Backtracking",
    ],
  },
  {
    key: "level-5",
    label: "LEVEL 5: CHUYÊN SÂU",
    toneClassName: "bg-rose-50 text-rose-700",
    tags: [
      "2-SAT",
      "Centroid",
      "Flow",
      "FFT",
      "Matrix Exponentiation",
      "State Elimination",
      "Suffix Array",
      "Persistent Segment Tree",
    ],
  },
  {
    key: "others",
    label: "KHÁC",
    toneClassName: "bg-slate-100 text-slate-600",
    tags: [],
  },
];

const ALL_TAGS = Array.from(
  new Set(TAG_GROUPS.flatMap((group) => group.tags.map((tag) => tag.trim()))),
);

function normalizeTagText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function areTagsEqualIgnoreCase(a: string, b: string) {
  return a.toLocaleLowerCase() === b.toLocaleLowerCase();
}

export function saveCustomLessonTag(tag: string) {
  const normalized = normalizeTagText(tag);
  if (!normalized) return;
  if (typeof window === "undefined") return;

  const raw = window.localStorage.getItem(CUSTOM_TAGS_STORAGE_KEY);
  const parsed = raw ? (JSON.parse(raw) as unknown) : [];
  const list = Array.isArray(parsed)
    ? parsed
        .map((item) => (typeof item === "string" ? normalizeTagText(item) : ""))
        .filter(Boolean)
    : [];

  if (list.some((item) => areTagsEqualIgnoreCase(item, normalized))) {
    return;
  }

  window.localStorage.setItem(
    CUSTOM_TAGS_STORAGE_KEY,
    JSON.stringify([...list, normalized]),
  );
}

export function loadCustomLessonTags(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_TAGS_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return Array.from(
      new Set(
        parsed
          .map((item) => (typeof item === "string" ? normalizeTagText(item) : ""))
          .filter(Boolean),
      ),
    );
  } catch {
    return [];
  }
}

export function buildLessonTagGroups(customTags: string[]): LessonTagGroup[] {
  return TAG_GROUPS.map((group) => {
    if (group.key !== "others") return group;
    return {
      ...group,
      tags: customTags,
    };
  });
}

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
};

type PickerPanelPosition = {
  left: number;
  width: number;
  maxHeight: number;
  top?: number;
  bottom?: number;
};

export default function LessonTagPicker({
  value,
  onChange,
  placeholder = "Tìm kiếm và chọn tag...",
}: Props) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [panelPosition, setPanelPosition] = useState<PickerPanelPosition | null>(
    null,
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = useMemo(() => new Set(value), [value]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      setCustomTags(loadCustomLessonTags());
    } catch {
      setCustomTags([]);
    }
  }, []);

  const groupsWithDynamicOthers = useMemo(() => {
    return buildLessonTagGroups(customTags);
  }, [customTags]);

  const visibleGroups = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return groupsWithDynamicOthers.map((group) => ({
      ...group,
      totalCount: group.tags.length,
      tags: group.tags.filter((tag) =>
        keyword ? tag.toLowerCase().includes(keyword) : true,
      ),
    })).filter((group) => group.tags.length > 0);
  }, [groupsWithDynamicOthers, search]);

  const canCreateCustom = useMemo(() => {
    const keyword = search.trim();
    if (!keyword) return false;
    return !ALL_TAGS.some((tag) => tag.toLowerCase() === keyword.toLowerCase());
  }, [search]);

  const toggleTag = (tag: string) => {
    if (selected.has(tag)) {
      onChange(value.filter((item) => item !== tag));
      return;
    }
    onChange([...value, tag]);
  };

  const addCustomFromSearch = () => {
    const custom = normalizeTagText(search);
    if (!custom) return;
    if (![...selected].some((item) => areTagsEqualIgnoreCase(item, custom))) {
      onChange([...value, custom]);
    }
    if (!ALL_TAGS.some((item) => areTagsEqualIgnoreCase(item, custom))) {
      saveCustomLessonTag(custom);
      setCustomTags((prev) =>
        prev.some((item) => areTagsEqualIgnoreCase(item, custom))
          ? prev
          : [...prev, custom],
      );
    }
    setSearch("");
  };

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (canCreateCustom) {
        addCustomFromSearch();
      }
    }
  };

  useEffect(() => {
    if (!open) {
      setPanelPosition(null);
      return;
    }

    const updatePanelPosition = () => {
      const input = inputRef.current;
      if (!input) return;

      const rect = input.getBoundingClientRect();
      const viewportPadding = 16;
      const gap = 8;
      const preferredMaxHeight = 320;
      const maxWidth = window.innerWidth - viewportPadding * 2;
      const width = Math.min(rect.width, maxWidth);
      const left = Math.min(
        Math.max(rect.left, viewportPadding),
        window.innerWidth - width - viewportPadding,
      );
      const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
      const spaceAbove = rect.top - viewportPadding;
      const shouldOpenUpward = spaceBelow < 220 && spaceAbove > spaceBelow;
      const availableSpace = shouldOpenUpward ? spaceAbove : spaceBelow;
      const maxHeight = Math.max(
        160,
        Math.min(
          preferredMaxHeight,
          availableSpace - (shouldOpenUpward ? 0 : gap),
        ),
      );

      setPanelPosition({
        left,
        width,
        maxHeight,
        ...(shouldOpenUpward
          ? { bottom: window.innerHeight - rect.top }
          : { top: rect.bottom + gap }),
      });
    };

    let frameId = window.requestAnimationFrame(updatePanelPosition);
    const syncPanelPosition = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(updatePanelPosition);
    };

    window.addEventListener("resize", syncPanelPosition);
    window.addEventListener("scroll", syncPanelPosition, true);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", syncPanelPosition);
      window.removeEventListener("scroll", syncPanelPosition, true);
    };
  }, [open, search, value, customTags]);

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={search}
        onFocus={() => setOpen(true)}
        onChange={(event) => setSearch(event.target.value)}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={onInputKeyDown}
        placeholder={placeholder}
        className="min-h-11 w-full rounded-xl border border-border-default bg-bg-surface px-3 py-2.5 text-sm text-text-primary shadow-sm placeholder:text-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
      />

      {value.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/15"
            >
              {tag}
              <span aria-hidden>×</span>
            </button>
          ))}
        </div>
      ) : null}

      {open && panelPosition && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed z-[80] overflow-y-auto rounded-xl border border-border-default bg-bg-surface shadow-lg"
              style={{
                left: panelPosition.left,
                width: panelPosition.width,
                maxHeight: panelPosition.maxHeight,
                top: panelPosition.top,
                bottom: panelPosition.bottom,
              }}
            >
              {visibleGroups.map((group) => (
                <div key={group.key}>
                  <div
                    className={`px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] ${group.toneClassName}`}
                  >
                    {group.label} ({group.totalCount})
                  </div>
                  {group.tags.map((tag) => {
                    const active = selected.has(tag);
                    return (
                      <button
                        key={`${group.key}-${tag}`}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => toggleTag(tag)}
                        className={`flex w-full items-center justify-between border-t border-border-default/60 px-3 py-2.5 text-left text-sm transition-colors ${
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-text-primary hover:bg-bg-secondary/60"
                        }`}
                      >
                        <span className="inline-flex items-center gap-2">
                          <svg
                            className="size-4 shrink-0 text-primary/70"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.8}
                              d="M7 7h7l5 5-7 7-5-5V7z"
                            />
                          </svg>
                          {tag}
                        </span>
                        {active ? <span className="text-xs">Đã chọn</span> : null}
                      </button>
                    );
                  })}
                </div>
              ))}
              {canCreateCustom ? (
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={addCustomFromSearch}
                  className="flex w-full items-center justify-center border-t border-border-default px-3 py-2.5 text-sm font-medium text-primary hover:bg-primary/5"
                >
                  Thêm tag mới: {search.trim()}
                </button>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
