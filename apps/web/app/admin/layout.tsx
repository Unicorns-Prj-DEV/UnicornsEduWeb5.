'use client';

import AdminAccessGate from "@/components/admin/AdminAccessGate";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminAccessGate>
      <div className="flex min-h-screen bg-bg-primary">
        <AdminSidebar />
        <main className="flex-1 overflow-auto pt-16 md:pt-0">{children}</main>
      </div>
    </AdminAccessGate>
  );
}
