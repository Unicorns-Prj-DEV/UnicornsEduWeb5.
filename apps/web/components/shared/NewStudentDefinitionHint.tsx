/** Giải thích định nghĩa Học sinh mới, dùng chung ở mọi bảng/popup thống kê học sinh mới. */
export default function NewStudentDefinitionHint({ className = "" }: { className?: string }) {
  return (
    <p className={`text-xs leading-relaxed text-text-muted ${className}`.trim()}>
      Học sinh mới tính theo lần nạp ví thành công đầu tiên (QR hoặc nạp thẳng đã duyệt); ngày vào
      học là ngày của lần nạp đó.
    </p>
  );
}
