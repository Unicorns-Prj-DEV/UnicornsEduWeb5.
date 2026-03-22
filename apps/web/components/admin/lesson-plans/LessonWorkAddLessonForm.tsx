"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import UpgradedSelect from "@/components/ui/UpgradedSelect";
import type { CreateLessonOutputPayload } from "@/dtos/lesson.dto";

const REQUIRED_MARK = (
  <span className="text-error" aria-hidden>
    {" "}
    *
  </span>
);

const LEVEL_OPTIONS = [
  { value: "", label: "-- Chọn --" },
  { value: "Level 0", label: "Level 0" },
  { value: "Level 1", label: "Level 1" },
  { value: "Level 2", label: "Level 2" },
  { value: "Level 3", label: "Level 3" },
  { value: "Level 4", label: "Level 4" },
  { value: "Level 5", label: "Level 5" },
];

const PAYMENT_OPTIONS = [
  { value: "unpaid", label: "Chưa thanh toán" },
  { value: "paid", label: "Đã thanh toán" },
];

function sectionTitle(text: string, id?: string) {
  return (
    <h3
      id={id}
      className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-muted"
    >
      {text}
    </h3>
  );
}

function FormSection({
  sectionId,
  title,
  children,
}: {
  sectionId: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={sectionId}
      className="rounded-xl border border-border-default/80 bg-bg-tertiary/25 p-4 shadow-sm sm:p-5"
    >
      <div className="mb-4 border-b border-border-default/50 pb-3">
        {sectionTitle(title, sectionId)}
      </div>
      {children}
    </section>
  );
}

function FieldLabel({
  children,
  required,
}: {
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <span className="text-sm text-text-secondary">
      {children}
      {required ? REQUIRED_MARK : null}
    </span>
  );
}

function inputClass() {
  return "min-h-11 w-full rounded-xl border border-border-default bg-bg-surface px-3 py-2.5 text-sm text-text-primary shadow-sm placeholder:text-text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus";
}

function validateHttpUrl(value: string, label: string) {
  const t = value.trim();
  if (!t) {
    return true;
  }
  try {
    const u = new URL(t);
    if (!["http:", "https:"].includes(u.protocol)) {
      toast.error(`${label} phải bắt đầu bằng http hoặc https.`);
      return false;
    }
    return true;
  } catch {
    toast.error(`${label} không hợp lệ.`);
    return false;
  }
}

type Props = {
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (payload: CreateLessonOutputPayload) => Promise<void>;
};

/**
 * Form “Thêm bài mới” tab Công việc — bố cục 4 khối (backup UI),
 * map sang `POST /lesson-outputs` (output có thể chưa gắn task).
 */
export default function LessonWorkAddLessonForm({
  isSubmitting,
  onCancel,
  onSubmit,
}: Props) {
  const defaultDate = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [lessonName, setLessonName] = useState("");
  const [originalLink, setOriginalLink] = useState("");
  const [originalTitle, setOriginalTitle] = useState("");
  const [source, setSource] = useState("");
  const [level, setLevel] = useState("");

  const [tagSearch, setTagSearch] = useState("");
  const [tagNew, setTagNew] = useState("");

  const [date, setDate] = useState(defaultDate);
  const [tagChecker, setTagChecker] = useState(false);
  const [tagCode, setTagCode] = useState(false);
  const [payment, setPayment] = useState<"unpaid" | "paid">("unpaid");
  const [costInput, setCostInput] = useState("0");

  const [linkExtra, setLinkExtra] = useState("");
  const [contestUploaded, setContestUploaded] = useState("");

  const buildTags = (): string[] => {
    const fromSearch = tagSearch
      .split(/[,;]/)
      .map((t) => t.trim())
      .filter(Boolean);
    const fromNew = tagNew.trim();
    const extra: string[] = [];
    if (tagChecker) {
      extra.push("Checker");
    }
    if (tagCode) {
      extra.push("Code");
    }
    return Array.from(
      new Set([...fromSearch, ...(fromNew ? [fromNew] : []), ...extra]),
    );
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const name = lessonName.trim();
    const oLink = originalLink.trim();
    const oTitle = originalTitle.trim();
    const src = source.trim();

    if (!name) {
      toast.error("Nhập tên bài.");
      return;
    }
    if (!oLink) {
      toast.error("Nhập link gốc.");
      return;
    }
    if (!validateHttpUrl(oLink, "Link gốc")) {
      return;
    }
    if (!oTitle) {
      toast.error("Nhập tên gốc.");
      return;
    }
    if (!src) {
      toast.error("Nhập nguồn.");
      return;
    }
    if (!date.trim()) {
      toast.error("Chọn ngày.");
      return;
    }

    let cost = 0;
    if (payment === "paid") {
      cost = 0;
    } else {
      const parsed = Number(costInput.trim().replace(/\s/g, ""));
      if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) {
        toast.error("Chi phí phải là số nguyên không âm.");
        return;
      }
      if (parsed === 0) {
        toast.error('Trạng thái "Chưa thanh toán" cần nhập chi phí > 0.');
        return;
      }
      cost = parsed;
    }

    const linkTrim = linkExtra.trim();
    if (linkTrim && !validateHttpUrl(linkTrim, "Link (bổ sung)")) {
      return;
    }

    const tags = buildTags();
    const levelVal = level.trim() || null;

    const payload: CreateLessonOutputPayload = {
      lessonTaskId: null,
      lessonName: name,
      originalLink: oLink,
      originalTitle: oTitle,
      source: src,
      level: levelVal,
      tags,
      cost,
      date: date.trim(),
      contestUploaded: contestUploaded.trim() || null,
      link: linkTrim || null,
      staffId: null,
      status: "pending",
    };

    await onSubmit(payload);
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5 sm:space-y-6">
      {/* THÔNG TIN BÀI — tên full width; cặp link/tên gốc; cặp nguồn/level */}
      <FormSection sectionId="lesson-work-add-section-info" title="Thông tin bài">
        <div className="grid grid-cols-1 gap-3 sm:gap-4">
          <label className="flex flex-col gap-1.5">
            <FieldLabel required>Tên bài</FieldLabel>
            <input
              type="text"
              value={lessonName}
              onChange={(e) => setLessonName(e.target.value)}
              placeholder="Tên bài giáo án"
              className={inputClass()}
              autoComplete="off"
              required
            />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <label className="flex min-w-0 flex-col gap-1.5">
              <FieldLabel required>Link gốc</FieldLabel>
              <input
                type="url"
                value={originalLink}
                onChange={(e) => setOriginalLink(e.target.value)}
                placeholder="https://..."
                className={inputClass()}
              />
            </label>
            <label className="flex min-w-0 flex-col gap-1.5">
              <FieldLabel required>Tên gốc</FieldLabel>
              <input
                type="text"
                value={originalTitle}
                onChange={(e) => setOriginalTitle(e.target.value)}
                placeholder="LIGHT, DOSI, …"
                className={inputClass()}
              />
            </label>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <label className="flex min-w-0 flex-col gap-1.5">
              <FieldLabel required>Nguồn</FieldLabel>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="codeforces, Unicorns, …"
                className={inputClass()}
              />
            </label>
            <div className="flex min-w-0 flex-col gap-1.5">
              <FieldLabel>Level</FieldLabel>
              <UpgradedSelect
                value={level}
                onValueChange={(v) => setLevel(v ?? "")}
                options={LEVEL_OPTIONS}
                ariaLabel="Level"
                placeholder="-- Chọn --"
                buttonClassName={`${inputClass()} flex items-center justify-between text-left`}
              />
            </div>
          </div>
        </div>
      </FormSection>

      {/* PHÂN LOẠI */}
      <FormSection sectionId="lesson-work-add-section-tags" title="Phân loại">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          <label className="flex min-w-0 flex-col gap-1.5">
            <FieldLabel>Tag</FieldLabel>
            <input
              type="text"
              value={tagSearch}
              onChange={(e) => setTagSearch(e.target.value)}
              placeholder="Tìm kiếm và chọn tag (phân tách bằng dấu phẩy)"
              className={inputClass()}
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1.5">
            <FieldLabel>Tag mới</FieldLabel>
            <input
              type="text"
              value={tagNew}
              onChange={(e) => setTagNew(e.target.value)}
              placeholder="Tag mới…"
              className={inputClass()}
            />
          </label>
        </div>
      </FormSection>

      {/* THỜI GIAN & THANH TOÁN — hàng 1: ngày + thanh toán + chi phí; hàng 2: tag nhanh */}
      <FormSection
        sectionId="lesson-work-add-section-time"
        title="Thời gian & thanh toán"
      >
        <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3 md:items-end">
          <label className="flex min-w-0 flex-col gap-1.5">
            <FieldLabel required>Ngày</FieldLabel>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass()}
              required
            />
          </label>
          <div className="flex min-w-0 flex-col gap-1.5">
            <FieldLabel>Trạng thái thanh toán</FieldLabel>
            <UpgradedSelect
              value={payment}
              onValueChange={(v) => {
                const next = v === "paid" ? "paid" : "unpaid";
                setPayment(next);
                if (next === "paid") {
                  setCostInput("0");
                }
              }}
              options={PAYMENT_OPTIONS}
              ariaLabel="Trạng thái thanh toán"
              buttonClassName={`${inputClass()} flex items-center justify-between text-left`}
            />
          </div>
          <label className="flex min-w-0 flex-col gap-1.5">
            <FieldLabel>Chi phí (VNĐ)</FieldLabel>
            <input
              type="number"
              min={0}
              step={1}
              value={costInput}
              disabled={payment === "paid" || isSubmitting}
              onChange={(e) => setCostInput(e.target.value)}
              className={`${inputClass()} disabled:cursor-not-allowed disabled:opacity-60`}
              inputMode="numeric"
            />
            <span className="text-xs leading-snug text-text-muted">
              {payment === "paid" ? (
                <>Đã thanh toán — cố định 0 đ.</>
              ) : (
                <>
                  Chưa thanh toán — nhập số nguyên {">"} 0 (đồng).
                </>
              )}
            </span>
          </label>
        </div>

        <div className="mt-4 rounded-lg border border-border-default/60 bg-bg-surface/80 p-3 sm:p-3.5">
          <p className="mb-2.5 text-xs font-medium text-text-secondary">
            Gắn tag nhanh
          </p>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-text-primary">
              <input
                type="checkbox"
                checked={tagChecker}
                onChange={(e) => setTagChecker(e.target.checked)}
                className="size-4 rounded border-border-default text-primary focus:ring-border-focus"
              />
              Checker
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-text-primary">
              <input
                type="checkbox"
                checked={tagCode}
                onChange={(e) => setTagCode(e.target.checked)}
                className="size-4 rounded border-border-default text-primary focus:ring-border-focus"
              />
              Code
            </label>
          </div>
        </div>
      </FormSection>

      {/* BỔ SUNG */}
      <FormSection sectionId="lesson-work-add-section-extra" title="Bổ sung">
        <div className="grid grid-cols-1 gap-3 sm:gap-4">
          <label className="flex flex-col gap-1.5">
            <FieldLabel>Link</FieldLabel>
            <input
              type="url"
              value={linkExtra}
              onChange={(e) => setLinkExtra(e.target.value)}
              placeholder="https://example.com/lesson"
              className={inputClass()}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <FieldLabel>Contest</FieldLabel>
            <textarea
              value={contestUploaded}
              onChange={(e) => setContestUploaded(e.target.value)}
              placeholder="VD: Bài đã đưa vào contest ABC…"
              rows={4}
              className={`${inputClass()} min-h-[6rem] resize-y py-3`}
            />
          </label>
        </div>
      </FormSection>

      <div className="flex flex-col-reverse gap-2 border-t border-border-default pt-4 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border-default bg-bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:opacity-60"
        >
          Hủy
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:opacity-60"
        >
          {isSubmitting ? "Đang lưu…" : "Thêm bài"}
        </button>
      </div>
    </form>
  );
}
