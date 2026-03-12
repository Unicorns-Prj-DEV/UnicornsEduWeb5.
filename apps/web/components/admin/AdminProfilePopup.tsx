"use client";

import { useState } from "react";
import * as authApi from "@/lib/apis/auth.api";

export type AdminProfile = {
  sub?: string;
  id?: string;
  accountHandle?: string;
  roleType?: string;
  role?: string;
  name?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  profile: AdminProfile | null;
};

export default function AdminProfilePopup({ open, onClose, profile }: Props) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    if (newPassword.length < 6) {
      setNotice({ type: "error", text: "Mật khẩu mới cần ít nhất 6 ký tự." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setNotice({ type: "error", text: "Mật khẩu mới và xác nhận không khớp." });
      return;
    }
    setLoading(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      setNotice({ type: "success", text: "Đổi mật khẩu thành công." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } };
      setNotice({
        type: "error",
        text: ax.response?.data?.message ?? "Đổi mật khẩu thất bại. Kiểm tra mật khẩu hiện tại.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const role = profile?.roleType ?? profile?.role ?? "—";

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" aria-hidden onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-profile-title"
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border-default bg-bg-surface p-6 shadow-xl"
        style={{ overscrollBehavior: "contain" }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="admin-profile-title" className="text-lg font-semibold text-text-primary">
            Thông tin cá nhân
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-text-muted transition-colors duration-200 hover:bg-bg-tertiary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            aria-label="Đóng"
          >
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-6 rounded-lg border border-border-default bg-bg-secondary/50 p-4">
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-text-muted">Email</dt>
              <dd className="font-medium text-text-primary break-words">{profile?.accountHandle ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Vai trò</dt>
              <dd className="font-medium text-text-primary">{role}</dd>
            </div>
          </dl>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <h3 className="text-sm font-medium text-text-primary">Đổi mật khẩu</h3>

          <div aria-live="polite" aria-atomic="true">
            {notice && (
              <div
                className={`rounded-lg border px-3 py-2 text-sm ${
                  notice.type === "success"
                    ? "border-success bg-success/10 text-success"
                    : "border-danger bg-danger/10 text-danger"
                }`}
              >
                {notice.text}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="current-password" className="mb-1 block text-sm text-text-muted">
              Mật khẩu hiện tại
            </label>
            <input
              id="current-password"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus/30"
              placeholder="Nhập mật khẩu hiện tại…"
              required
            />
          </div>

          <div>
            <label htmlFor="new-password" className="mb-1 block text-sm text-text-muted">
              Mật khẩu mới
            </label>
            <input
              id="new-password"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus/30"
              placeholder="Ít nhất 6 ký tự…"
              required
            />
          </div>

          <div>
            <label htmlFor="confirm-password" className="mb-1 block text-sm text-text-muted">
              Xác nhận mật khẩu mới
            </label>
            <input
              id="confirm-password"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus/30"
              placeholder="Nhập lại mật khẩu mới…"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary py-2 font-medium text-text-inverse transition-colors duration-200 hover:bg-primary-hover disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            {loading ? "Đang xử lý…" : "Đổi mật khẩu"}
          </button>
        </form>
      </div>
    </>
  );
}
