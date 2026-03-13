"use client";

const QR_API = "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=";

function isImageUrl(url: string): boolean {
  const u = url.toLowerCase();
  return /\.(png|jpg|jpeg|gif|webp)(\?|$)/i.test(u) || u.includes("imgur") || u.includes("drive.google.com/file");
}

type Props = {
  qrLink: string | null;
  onEditClick: () => void;
  className?: string;
};

export default function StaffQrCard({ qrLink, onEditClick, className = "" }: Props) {
  const hasLink = Boolean(qrLink?.trim());
  const displayUrl = qrLink?.trim() || "";

  const qrImageSrc = hasLink
    ? isImageUrl(displayUrl)
      ? displayUrl
      : `${QR_API}${encodeURIComponent(displayUrl)}`
    : null;

  return (
    <section
      className={`relative flex flex-col items-center justify-center rounded-lg border border-border-default bg-bg-surface p-4 shadow-sm transition-colors duration-200 sm:p-5 ${className}`}
      aria-label="QR thanh toán"
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onEditClick();
        }}
        className="absolute right-2 top-2 z-10 rounded p-1.5 text-text-muted transition-colors hover:bg-bg-tertiary hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
        title="Chỉnh sửa link QR"
        aria-label="Chỉnh sửa link QR thanh toán"
      >
        <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => {
          if (hasLink && displayUrl) {
            window.open(displayUrl, "_blank");
          } else {
            onEditClick();
          }
        }}
        className={`relative flex min-h-[140px] w-full min-w-[140px] max-w-[160px] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed transition-all duration-200 ${
          hasLink
            ? "cursor-pointer border-primary/30 bg-primary/5 hover:border-primary/50 hover:bg-primary/10"
            : "cursor-pointer border-border-default bg-bg-secondary/50 opacity-70 hover:bg-bg-tertiary hover:opacity-90"
        }`}
        title={hasLink ? "Nhấn để mở link" : "Chưa có link QR – nhấn để thêm"}
      >
        {hasLink && qrImageSrc ? (
          <img
            src={qrImageSrc}
            alt="QR thanh toán"
            className="size-28 object-contain"
          />
        ) : (
          <svg
            className="size-14 text-text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        )}
        <span className="text-center text-xs font-medium text-text-muted">
          {hasLink ? "Đã có QR – nhấn để mở" : "Chưa có link – nhấn để thêm"}
        </span>
      </button>
    </section>
  );
}
