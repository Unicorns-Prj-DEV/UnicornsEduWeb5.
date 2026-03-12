"use client";

import Link from "next/link";

import {
  BulletList,
  FeatureCard,
  LandingMetricPreview,
  TeamCard,
} from "@/components/landing";
import { Navbar } from "@/components/Navbar";

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  el?.scrollIntoView({ behavior: "smooth", block: "start" });
}

const HOME_TEAMS = [
  {
    id: "it",
    icon: "💻",
    name: "Team Tin học",
    description:
      "Đồng hành trong lập trình, thuật toán và ứng dụng CNTT với các lớp chuyên sâu & luyện thi.",
    link: "https://www.facebook.com/profile.php?id=61577992693085",
    focus: "Lập trình • Thuật toán • Dự án thực chiến",
  },
  {
    id: "japanese",
    icon: "🇯🇵",
    name: "Team Tiếng Nhật",
    description:
      "Đào tạo từ sơ cấp đến JLPT, giao tiếp và hiểu sâu văn hóa Nhật với giáo trình chuẩn bản xứ.",
    link: "https://www.facebook.com/unicornstiengnhat",
    focus: "JLPT • Giao tiếp • Văn hóa Nhật",
  },
  {
    id: "math",
    icon: "📐",
    name: "Team Toán học",
    description:
      "Phát triển tư duy logic, luyện thi chuyên và thi HSG với lộ trình cá nhân hoá theo năng lực.",
    link: "https://www.facebook.com/profile.php?id=61578074894066",
    focus: "Toán tư duy • Luyện thi • Chuyên sâu",
  },
] as const;

const HOME_INSIGHTS = [
  { label: "Học sinh đang theo học", value: "150+" },
  { label: "Lớp học đang vận hành", value: "25+" },
  { label: "Nhân sự Sale & CSKH", value: "12+" },
] as const;

const HOME_FEATURES = [
  {
    title: "Quản lý lớp học tập trung",
    description:
      "Theo dõi lớp, sĩ số, lịch học và điểm danh trong một bảng điều phối thống nhất.",
  },
  {
    title: "Giáo án và tài liệu đồng bộ",
    description:
      "Bài giảng, lesson notes, tài liệu và lịch sử học tập được lưu trữ có cấu trúc.",
  },
  {
    title: "Vận hành học phí minh bạch",
    description:
      "Ghi nhận thanh toán, công nợ và trạng thái thu phí rõ ràng cho từng học sinh.",
  },
  {
    title: "Báo cáo trực quan theo vai trò",
    description:
      "Admin, mentor, assistant và student đều có dashboard phù hợp hành trình công việc.",
  },
] as const;

const WORKFLOW_STEPS = [
  {
    id: "01",
    title: "Khởi tạo lớp & lộ trình",
    detail: "Thiết lập khóa học, phân nhóm trình độ và lịch học cá nhân hoá.",
  },
  {
    id: "02",
    title: "Theo dõi học tập theo phiên",
    detail: "Điểm danh, lesson notes và tiến độ được cập nhật liên tục theo buổi học.",
  },
  {
    id: "03",
    title: "Đánh giá & tối ưu",
    detail: "Dựa trên báo cáo để điều chỉnh kế hoạch học, mục tiêu và chất lượng vận hành.",
  },
] as const;

const COURSE_POINTS = [
  "Lộ trình được cá nhân hóa theo năng lực đầu vào.",
  "Tự động nhắc lịch học và đồng bộ tài liệu cho từng lớp.",
  "Giáo viên theo dõi tiến độ theo thời gian thực.",
] as const;

const CONTEST_POINTS = [
  "Tạo đề thi theo chuyên đề với nhiều mức độ.",
  "Chấm điểm, tổng hợp kết quả và lưu lịch sử thi.",
  "Công bố bảng xếp hạng và theo dõi sự tiến bộ dài hạn.",
] as const;

const HOME_CONTACT = {
  email: "unicornseducvp@gmail.com",
  phoneDisplay: "0911 589 217 • 0336 755 856",
  phoneHref: "0911589217",
  address: "Đại học Bách khoa Hà Nội",
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <Navbar />

      <main>
        <section
          id="hero"
          className="border-b border-border-subtle bg-bg-secondary px-4 py-16 sm:px-6 sm:py-24"
        >
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
            <div>
              <p className="motion-fade-up mb-4 inline-block rounded-full border border-border-default bg-bg-surface px-4 py-1.5 text-sm text-text-secondary">
                #1 Education Management Platform
              </p>
              <h1 className="motion-fade-up mb-4 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                Nền tảng quản lý giáo dục & luyện thi hiện đại
              </h1>
              <p className="motion-fade-up mb-8 max-w-xl text-lg text-text-secondary">
                Quản lý lớp học, giáo án, học sinh và nhân sự trong một hệ thống duy
                nhất. Dành cho các trung tâm luyện thi, bồi dưỡng văn hoá và lập trình.
              </p>

              <div className="motion-fade-up flex flex-wrap gap-3">
                <Link
                  href="/auth/login"
                  className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-base font-medium text-text-inverse transition-colors transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[var(--ue-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--ue-border-focus)]"
                >
                  Bắt đầu ngay
                </Link>
                <button
                  type="button"
                  onClick={() => scrollToSection("section-intro")}
                  className="inline-flex items-center gap-2 rounded-lg border border-border-default bg-bg-surface px-5 py-2.5 text-base font-medium text-text-primary transition-colors transition-transform duration-200 hover:-translate-y-0.5 hover:bg-bg-tertiary focus:outline-none focus:ring-2 focus:ring-[var(--ue-border-focus)]"
                >
                  Tìm hiểu thêm
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </button>
              </div>

              <div className="mt-12 grid gap-4 sm:grid-cols-3">
                {HOME_INSIGHTS.map((insight, index) => (
                  <div
                    key={insight.label}
                    className="motion-fade-up motion-hover-lift rounded-xl border border-border-default bg-bg-surface p-4 shadow-sm"
                    style={{ animationDelay: `${index * 60}ms` }}
                  >
                    <p className="text-sm text-text-muted">{insight.label}</p>
                    <p className="mt-1 text-2xl font-bold text-text-primary">
                      {insight.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <LandingMetricPreview />
          </div>
        </section>

        <section
          id="section-intro"
          className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20"
        >
          <div className="mx-auto max-w-6xl">
            <p className="mb-2 text-sm font-medium uppercase tracking-wide text-text-muted">
              Giới thiệu
            </p>
            <h2 className="mb-2 text-2xl font-bold sm:text-3xl">Teams Unicorns Edu</h2>
            <p className="mb-10 max-w-2xl text-text-secondary">
              Mỗi team tập trung một năng lực cốt lõi để xây dựng lộ trình học tập phù
              hợp từng học sinh.
            </p>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {HOME_TEAMS.map((team, index) => (
                <TeamCard
                  key={team.id}
                  icon={team.icon}
                  name={team.name}
                  description={team.description}
                  link={team.link}
                  focus={team.focus}
                  animationDelay={`${index * 80}ms`}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-border-subtle bg-bg-secondary px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <p className="mb-2 text-sm font-medium uppercase tracking-wide text-text-muted">
              Năng lực nền tảng
            </p>
            <h2 className="mb-8 text-2xl font-bold sm:text-3xl">
              Trải nghiệm vận hành thống nhất cho toàn bộ trung tâm
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              {HOME_FEATURES.map((feature, index) => (
                <FeatureCard
                  key={feature.title}
                  title={feature.title}
                  description={feature.description}
                  animationDelay={`${index * 60}ms`}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <p className="mb-2 text-sm font-medium uppercase tracking-wide text-text-muted">
              Quy trình
            </p>
            <h2 className="mb-8 text-2xl font-bold sm:text-3xl">Vận hành gọn trong 3 bước</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {WORKFLOW_STEPS.map((step, index) => (
                <article
                  key={step.id}
                  className="motion-fade-up motion-hover-lift flex flex-col rounded-xl border border-border-default bg-bg-surface p-6 shadow-sm"
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  <p className="mb-2 text-sm font-semibold text-primary">Bước {step.id}</p>
                  <h3 className="mb-2 text-lg font-semibold">{step.title}</h3>
                  <p className="text-text-secondary">{step.detail}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="section-news"
          className="scroll-mt-20 border-y border-border-subtle bg-bg-secondary px-4 py-16 sm:px-6 sm:py-20"
        >
          <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-2 md:items-start">
            <div>
              <p className="mb-2 text-sm font-medium uppercase tracking-wide text-text-muted">
                Khóa học
              </p>
              <h2 className="mb-4 text-2xl font-bold sm:text-3xl">
                Chương trình học cá nhân hoá theo trình độ
              </h2>
              <p className="text-text-secondary">
                Mỗi lộ trình được cấu hình theo mục tiêu học tập và năng lực thực tế của
                học sinh, giúp tăng hiệu quả tiếp thu theo từng giai đoạn.
              </p>
            </div>
            <div className="motion-fade-up motion-hover-lift flex flex-col rounded-xl border border-border-default bg-bg-surface p-6 shadow-sm md:my-auto">
              <BulletList points={COURSE_POINTS} />
            </div>
          </div>
        </section>

        <section
          id="section-docs"
          className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20"
        >
          <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-2 md:items-start">
            <div>
              <p className="mb-2 text-sm font-medium uppercase tracking-wide text-text-muted">
                Cuộc thi
              </p>
              <h2 className="mb-4 text-2xl font-bold sm:text-3xl">
                Cuộc thi lập trình & học thuật mỗi tháng
              </h2>
              <p className="text-text-secondary">
                Module contest giúp tổ chức thi định kỳ, ghi nhận kết quả minh bạch và tạo
                động lực phát triển kỹ năng cho học sinh.
              </p>
            </div>
            <div className="motion-fade-up motion-hover-lift flex flex-col rounded-xl border border-border-default bg-bg-surface p-6 shadow-sm md:my-auto">
              <BulletList points={CONTEST_POINTS} />
            </div>
          </div>
        </section>

        <footer
          id="section-policy"
          className="scroll-mt-20 border-t border-border-default bg-bg-secondary px-4 py-16 sm:px-6 sm:py-20"
        >
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
              <div>
                <p className="mb-2 text-sm font-medium uppercase tracking-wide text-text-muted">
                  Liên hệ
                </p>
                <h2 className="mb-4 text-2xl font-bold sm:text-3xl">Kết nối với Unicorns Edu</h2>
                <p className="mb-6 max-w-xl text-text-secondary">
                  Đội ngũ CSKH luôn sẵn sàng hỗ trợ bạn trong việc xây dựng lộ trình học phù
                  hợp và triển khai hệ thống quản lý vận hành trung tâm.
                </p>
                <Link
                  href="/auth/login"
                  className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-base font-medium text-text-inverse transition-colors duration-200 hover:bg-[var(--ue-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--ue-border-focus)]"
                >
                  Trải nghiệm ngay
                </Link>
              </div>

              <div className="motion-fade-up motion-hover-lift flex flex-col rounded-xl border border-border-default bg-bg-surface p-6 shadow-sm">
                <div className="space-y-5">
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
                      href={`tel:${HOME_CONTACT.phoneHref}`}
                      className="font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--ue-border-focus)]"
                    >
                      {HOME_CONTACT.phoneDisplay}
                    </a>
                  </div>
                  <div>
                    <p className="text-sm text-text-muted">Địa chỉ</p>
                    <p className="font-medium text-text-primary">{HOME_CONTACT.address}</p>
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-10 text-sm text-text-muted">
              © {new Date().getFullYear()} Unicorns Edu • Bản quyền thuộc Unicorns Edu.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
