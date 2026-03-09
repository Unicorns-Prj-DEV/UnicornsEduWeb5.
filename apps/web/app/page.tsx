"use client";

import Link from "next/link";

/**
 * Landing page – Unicorns Edu 5.0
 * Refs: docs/pages/landing.md, backup/frontend/src/pages/Home.tsx
 * Sections: Hero, Intro/Teams, Features, Khóa học, Cuộc thi, Liên hệ (footer)
 * Tokens: UE semantic (bg-bg-primary, text-text-primary, etc.)
 */

const HOME_MENU = [
  { id: "intro", label: "Giới thiệu" },
  { id: "news", label: "Khóa học" },
  { id: "docs", label: "Cuộc thi" },
  { id: "policy", label: "Liên hệ" },
];

const HOME_TEAMS = [
  {
    id: "it",
    icon: "💻",
    name: "Team Tin học",
    description:
      "Đồng hành trong lập trình, thuật toán và ứng dụng CNTT với các lớp chuyên sâu & luyện thi.",
    link: "https://www.facebook.com/profile.php?id=61577992693085",
  },
  {
    id: "japanese",
    icon: "🇯🇵",
    name: "Team Tiếng Nhật",
    description:
      "Đào tạo từ sơ cấp đến JLPT, giao tiếp và hiểu sâu văn hóa Nhật với giáo trình chuẩn bản xứ.",
    link: "https://www.facebook.com/unicornstiengnhat",
  },
  {
    id: "math",
    icon: "📐",
    name: "Team Toán học",
    description:
      "Phát triển tư duy logic, luyện thi chuyên và thi HSG với lộ trình cá nhân hoá theo năng lực.",
    link: "https://www.facebook.com/profile.php?id=61578074894066",
  },
];

const HOME_CONTACT = {
  email: "unicornseducvp@gmail.com",
  phone: "0911 589 217 • 0336 755 856",
  address: "Đại học Bách khoa Hà Nội",
};

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  el?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border-default bg-bg-primary/95 backdrop-blur supports-[backdrop-filter]:bg-bg-primary/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <button
            type="button"
            onClick={() => scrollToSection("hero")}
            className="flex items-center gap-2 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--ue-border-focus)]"
            aria-label="Về đầu trang"
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              aria-hidden
              className="text-primary"
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
            {HOME_MENU.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToSection(`section-${item.id}`)}
                className="rounded-md px-3 py-2 text-sm font-medium text-text-secondary transition hover:bg-bg-tertiary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-[var(--ue-border-focus)]"
              >
                {item.label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-md px-3 py-2 text-sm font-medium text-text-primary hover:bg-bg-tertiary focus:outline-none focus:ring-2 focus:ring-[var(--ue-border-focus)]"
            >
              Đăng nhập
            </Link>
            <Link
              href="/login?mode=register"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-text-inverse hover:bg-[var(--ue-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--ue-border-focus)]"
            >
              Đăng ký
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section
          id="hero"
          className="border-b border-border-subtle bg-bg-secondary px-4 py-16 sm:px-6 sm:py-24"
        >
          <div className="mx-auto max-w-6xl">
            <p className="mb-4 inline-block rounded-full border border-border-default bg-bg-surface px-4 py-1.5 text-sm text-text-secondary">
              #1 Education Management Platform
            </p>
            <h1 className="mb-4 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              Nền tảng quản lý giáo dục & luyện thi hiện đại
            </h1>
            <p className="mb-8 max-w-xl text-lg text-text-secondary">
              Quản lý lớp học, giáo án, học sinh và nhân sự trong một hệ thống
              duy nhất. Dành cho các trung tâm luyện thi, bồi dưỡng văn hoá và
              lập trình.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-base font-medium text-text-inverse hover:bg-[var(--ue-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--ue-border-focus)]"
              >
                Bắt đầu ngay
              </Link>
              <button
                type="button"
                onClick={() => scrollToSection("section-intro")}
                className="inline-flex items-center gap-2 rounded-lg border border-border-default bg-bg-surface px-5 py-2.5 text-base font-medium text-text-primary hover:bg-bg-tertiary focus:outline-none focus:ring-2 focus:ring-[var(--ue-border-focus)]"
              >
                Tìm hiểu thêm
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </button>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-3">
              {[
                { label: "Học sinh đang theo học", value: "150+" },
                { label: "Lớp học đang vận hành", value: "25+" },
                { label: "Nhân sự Sale & CSKH", value: "12+" },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  className="rounded-xl border border-border-default bg-bg-surface p-4"
                >
                  <p className="text-sm text-text-muted">{kpi.label}</p>
                  <p className="mt-1 text-2xl font-bold text-text-primary">
                    {kpi.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Intro / Teams */}
        <section
          id="section-intro"
          className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20"
        >
          <div className="mx-auto max-w-6xl">
            <p className="mb-2 text-sm font-medium uppercase tracking-wide text-text-muted">
              Giới thiệu
            </p>
            <h2 className="mb-2 text-2xl font-bold sm:text-3xl">
              Teams Unicorns Edu
            </h2>
            <p className="mb-10 text-text-secondary">
              Đồng hành cùng bạn trên hành trình học tập
            </p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {HOME_TEAMS.map((team) => (
                <article
                  key={team.id}
                  className="flex flex-col rounded-xl border border-border-default bg-bg-surface p-6 shadow-sm"
                >
                  <div className="mb-4 text-3xl" aria-hidden>
                    {team.icon}
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">{team.name}</h3>
                  <p className="mb-4 flex-1 text-sm text-text-secondary">
                    {team.description}
                  </p>
                  <a
                    href={team.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-fit items-center rounded-lg border border-border-default px-4 py-2 text-sm font-medium text-text-primary hover:bg-bg-tertiary focus:outline-none focus:ring-2 focus:ring-[var(--ue-border-focus)]"
                  >
                    Xem Fanpage
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Khóa học (news) */}
        <section
          id="section-news"
          className="scroll-mt-20 border-t border-border-subtle bg-bg-secondary px-4 py-16 sm:px-6 sm:py-20"
        >
          <div className="mx-auto max-w-6xl">
            <p className="mb-2 text-sm font-medium uppercase tracking-wide text-text-muted">
              Khóa học
            </p>
            <h2 className="mb-4 text-2xl font-bold sm:text-3xl">
              Chương trình học cá nhân hoá theo trình độ
            </h2>
            <div className="prose prose-lg max-w-none text-text-secondary">
              <p>
                Hệ thống hỗ trợ xây dựng khóa học theo gói buổi, tự động nhắc
                lịch và cập nhật tình trạng học phí. Học sinh có ứng dụng riêng
                để theo dõi tiến độ, nhận tài liệu và tương tác với giáo viên.
              </p>
            </div>
          </div>
        </section>

        {/* Cuộc thi (docs) */}
        <section
          id="section-docs"
          className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20"
        >
          <div className="mx-auto max-w-6xl">
            <p className="mb-2 text-sm font-medium uppercase tracking-wide text-text-muted">
              Cuộc thi
            </p>
            <h2 className="mb-4 text-2xl font-bold sm:text-3xl">
              Cuộc thi lập trình & học thuật mỗi tháng
            </h2>
            <div className="prose prose-lg max-w-none text-text-secondary">
              <p>
                Unicorns Edu tích hợp module contest để trung tâm tạo đề, chấm
                điểm và công bố bảng xếp hạng. Lịch sử cuộc thi được lưu lại
                giúp học sinh theo dõi sự tiến bộ.
              </p>
            </div>
          </div>
        </section>

        {/* Footer / Liên hệ */}
        <footer
          id="section-policy"
          className="scroll-mt-20 border-t border-border-default bg-bg-secondary px-4 py-16 sm:px-6 sm:py-20"
        >
          <div className="mx-auto max-w-6xl">
            <p className="mb-2 text-sm font-medium uppercase tracking-wide text-text-muted">
              Liên hệ
            </p>
            <h2 className="mb-4 text-2xl font-bold sm:text-3xl">
              Kết nối với Unicorns Edu
            </h2>
            <p className="mb-8 text-text-secondary">
              Đội ngũ CSKH luôn sẵn sàng hỗ trợ bạn.
            </p>
            <div className="grid gap-6 sm:grid-cols-3">
              <div>
                <p className="text-sm text-text-muted">Email</p>
                <a
                  href={`mailto:${HOME_CONTACT.email}`}
                  className="font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--ue-border-focus)]"
                >
                  {HOME_CONTACT.email}
                </a>
              </div>
              <div>
                <p className="text-sm text-text-muted">Hotline</p>
                <a
                  href={`tel:${HOME_CONTACT.phone.replace(/\s/g, "").replace(/•/g, "")}`}
                  className="font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--ue-border-focus)]"
                >
                  {HOME_CONTACT.phone}
                </a>
              </div>
              <div>
                <p className="text-sm text-text-muted">Địa chỉ</p>
                <p className="font-medium text-text-primary">
                  {HOME_CONTACT.address}
                </p>
              </div>
            </div>
            <p className="mt-10 text-sm text-text-muted">
              © {new Date().getFullYear()} Unicorns Edu • Bản quyền thuộc Unicorns
              Edu.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
