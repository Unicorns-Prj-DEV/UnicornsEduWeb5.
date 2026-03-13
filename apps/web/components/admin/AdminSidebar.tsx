"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState, useEffect } from "react";
import { animate, stagger } from "animejs";
import * as authApi from "@/lib/apis/auth.api";
import AdminProfilePopup, { type AdminProfile } from "./AdminProfilePopup";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Role } from "@/dtos/Auth.dto";

const MENU_ITEMS: { href: string; label: string; icon: React.ReactNode }[] = [
  { href: "/admin", label: "Dashboard", icon: <IconDashboard /> },
  { href: "/admin/staffs", label: "Nhân sự", icon: <IconStaff /> },
  { href: "/admin/classes", label: "Lớp học", icon: <IconClasses /> },
  { href: "/admin/notes-subject", label: "Ghi chú môn học", icon: <IconNotesSubject /> },
  { href: "/admin/students", label: "Học sinh", icon: <IconStudents /> },
  { href: "/admin/costs", label: "Chi phí", icon: <IconCosts /> },
  { href: "/admin/categories", label: "Phân loại lớp", icon: <IconCategories /> },
  { href: "/admin/lesson-plans", label: "Giáo Án", icon: <IconLessonPlans /> },
  { href: "/admin/history", label: "Lịch sử", icon: <IconHistory /> },
];

const SIDEBAR_WIDTH_EXPANDED = 224;
const SIDEBAR_WIDTH_COLLAPSED = 72;

function IconDashboard() {
  return (
    <svg className="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  );
}
function IconHome() {
  return (
    <svg className="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}
function IconStaff() {
  return (
    <svg className="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}
function IconClasses() {
  return (
    <svg className="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}
function IconNotesSubject() {
  return (
    <svg className="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}
function IconStudents() {
  return (
    <svg className="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
    </svg>
  );
}
function IconCosts() {
  return (
    <svg className="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
function IconCategories() {
  return (
    <svg className="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  );
}
function IconLessonPlans() {
  return (
    <svg className="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}
function IconHistory() {
  return (
    <svg className="size-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const router = useRouter();
  const asideRef = useRef<HTMLElement>(null);
  const navListRef = useRef<HTMLUListElement>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const { user, setUser } = useAuth();

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq?.matches ?? false);
    const handler = () => setPrefersReducedMotion(mq?.matches ?? false);
    mq?.addEventListener("change", handler);
    return () => mq?.removeEventListener("change", handler);
  }, []);

  const openProfile = async () => {
    try {
      const data = (await authApi.getProfile()) as { sub?: string; accountHandle?: string; roleType?: string; role?: string };
      setProfile(data as AdminProfile);
      setProfileOpen(true);
    } catch {
      setProfile(null);
      setProfileOpen(true);
    }
  };

  useEffect(() => {
    if (!mounted || !navListRef.current) return;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;
    const items = navListRef.current.querySelectorAll(".sidebar-item");
    animate(items, {
      opacity: [0, 1],
      translateX: [-12, 0],
      delay: stagger(40, { start: 100 }),
      duration: 380,
      ease: "easeOutQuad",
    });
  }, [mounted]);

  const toggleCollapse = () => {
    setCollapsed((c) => !c);
  };

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      queryClient.invalidateQueries();
      setUser({ id: "", accountHandle: "", roleType: Role.guest });
      router.push("/");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
  };

  return (
    <aside
      ref={asideRef}
      style={{
        width: collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED,
        transition: prefersReducedMotion ? "none" : "width 0.28s ease-out",
      }}
      className="h-screen sticky top-0 flex shrink-0 flex-col overflow-hidden border-r border-border-default bg-bg-secondary text-text-secondary"
      aria-label="Menu admin"
    >
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border-default px-3">
        {!collapsed && (
          <span className="truncate pl-1 font-semibold text-text-primary">
            Unicorns Edu
          </span>
        )}
        <button
          type="button"
          onClick={toggleCollapse}
          className="flex size-9 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors duration-200 hover:bg-bg-tertiary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary"
          aria-label={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
        >
          <svg
            className={`size-5 transition-transform duration-280 ${collapsed ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 overscroll-contain">
        <ul ref={navListRef} className="space-y-0.5 px-2" role="list">
          {MENU_ITEMS.map((item) => {
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            return (
              <li key={item.href} className="sidebar-item">
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary ${isActive
                    ? "bg-primary text-text-inverse"
                    : "hover:bg-bg-tertiary hover:text-text-primary"
                    }`}
                  aria-label={collapsed ? item.label : undefined}
                  title={collapsed ? item.label : undefined}
                >
                  <span className="flex size-5 shrink-0 items-center justify-center [&>svg]:size-5">
                    {item.icon}
                  </span>
                  {!collapsed && (
                    <span className="truncate">{item.label}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="shrink-0 border-t border-border-default p-2">
        <Link
          href="/"
          className={`sidebar-item flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary ${pathname === "/"
            ? "bg-primary text-text-inverse"
            : "text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
            }`}
          aria-label={collapsed ? "Trang chủ" : undefined}
          title={collapsed ? "Trang chủ" : undefined}
        >
          <span className="flex size-5 shrink-0 items-center justify-center [&>svg]:size-5">
            <IconHome />
          </span>
          {!collapsed && <span className="truncate">Trang chủ</span>}
        </Link>
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={openProfile}
            className="sidebar-item flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-bg-tertiary text-text-primary transition-colors duration-200 hover:bg-primary hover:text-text-inverse focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary"
            aria-label="Thông tin cá nhân"
            title="Thông tin cá nhân"
          >
            <span className="text-sm font-semibold">
              {profile?.accountHandle?.slice(0, 1).toUpperCase() ?? "?"}
            </span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="sidebar-item flex size-10 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors duration-200 hover:bg-red-500 hover:ring-red-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary"
            aria-label="Đăng xuất"
            title="Đăng xuất"
          >
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
      <AdminProfilePopup
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        profile={profile}
      />
    </aside>
  );
}
