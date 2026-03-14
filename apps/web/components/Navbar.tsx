"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Role } from "@/dtos/Auth.dto";
import { logout } from "@/lib/apis/auth.api";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const HOME_MENU = [
  { id: "intro", label: "Giới thiệu" },
  { id: "news", label: "Khóa học" },
  { id: "docs", label: "Cuộc thi" },
  { id: "policy", label: "Liên hệ" },
] as const;

const links = {
  'admin': '/admin',
  'guest': '/',
  'student': '/student',
  'staff': '/staff',
}

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  el?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function Navbar() {
  const { user, setUser } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      setUser({ id: "", accountHandle: "", roleType: Role.guest });
      queryClient.invalidateQueries();
      toast.success("Đăng xuất thành công");
      router.push("/");
    },
  });

  return (
    <header className="sticky top-0 z-50 border-b border-border-default bg-bg-primary/90 backdrop-blur transition-colors duration-300 supports-[backdrop-filter]:bg-bg-primary/75">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <button
          type="button"
          onClick={() => scrollToSection("hero")}
          className="group flex items-center gap-2 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ue-border-focus)]"
          aria-label="Về đầu trang"
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            aria-hidden
            className="text-primary transition-transform duration-300 group-hover:rotate-12"
          >
            <path
              d="M12 2l3 6 6 3-6 3-3 6-3-6-6-3 6-3 3-6z"
              fill="currentColor"
            />
          </svg>
          <div className="text-left">
            <span className="block font-semibold leading-tight">
              Unicorns Edu
            </span>
            <span className="block text-xs text-text-muted">
              Education Platform
            </span>
          </div>
        </button>

        <nav className="hidden gap-1 sm:flex" aria-label="Trang chủ">
          {HOME_MENU.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollToSection(`section-${item.id}`)}
              className="motion-fade-up rounded-md px-3 py-2 text-sm font-medium text-text-secondary transition-colors duration-200 hover:cursor-pointer hover:bg-bg-tertiary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ue-border-focus)]"
              style={{ animationDelay: `${index * 40}ms` }}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user.roleType !== Role.guest ? (
            <>
              <Link
                href={links[user.roleType as keyof typeof links] ?? "/"}
                className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-bg-tertiary font-semibold text-text-primary ring-2 ring-border-default transition hover:bg-primary hover:text-text-inverse hover:ring-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ue-border-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
              >
                <span className="text-sm">
                  {user.accountHandle?.slice(0, 1).toUpperCase() ?? "?"}
                </span>
              </Link>

              <button
                type="button"
                onClick={() => {
                  logoutMutation.mutate();
                }}
                className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-bg-tertiary font-semibold text-text-primary ring-2 ring-border-default transition-colors duration-200 hover:cursor-pointer hover:bg-red-500 hover:text-text-inverse hover:ring-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ue-border-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
              >
                <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="rounded-md px-3 py-2 text-sm font-medium text-text-primary transition-colors duration-200 hover:bg-bg-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ue-border-focus)]"
              >
                Đăng nhập
              </Link>
              <Link
                href="/auth/register"
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-text-inverse transition-colors duration-200 hover:bg-[var(--ue-primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ue-border-focus)]"
              >
                Đăng ký
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
