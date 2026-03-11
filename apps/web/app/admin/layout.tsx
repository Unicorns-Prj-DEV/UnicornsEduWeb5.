'use client';

import AdminSidebar from "@/components/admin/AdminSidebar";
import { useAuth } from "@/context/AuthContext";
import { Role } from "@/dtos/Auth.dto";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log(user);
    if (user.roleType !== Role.admin) {
      router.push("/");
    }
  }, [user]);

  return (
    <div className="flex min-h-screen bg-bg-primary">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
