import { StaffAccessGate, StaffSidebar } from "@/components/staff";

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StaffAccessGate>
      <div className="min-h-screen bg-bg-primary">
        <div
          className="pointer-events-none fixed inset-0 opacity-70"
          aria-hidden
          style={{
            background:
              "radial-gradient(circle at top left, color-mix(in srgb, var(--ue-primary) 14%, transparent) 0, transparent 34%), radial-gradient(circle at bottom right, color-mix(in srgb, var(--ue-warning) 12%, transparent) 0, transparent 28%)",
          }}
        />
        <div className="relative flex min-h-screen">
          <StaffSidebar />
          <main className="min-w-0 flex-1 overflow-auto px-4 pb-4 pt-16 md:py-4 md:pt-4 lg:px-6 lg:py-6">
            {children}
          </main>
        </div>
      </div>
    </StaffAccessGate>
  );
}
