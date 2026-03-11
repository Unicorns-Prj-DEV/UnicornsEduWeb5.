import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { AuthProvider } from "@/context/AuthContext";
import { getProfile } from "@/lib/apis/auth.api";
import { Role } from "@/dtos/Auth.dto";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Unicorns Edu – Nền tảng quản lý giáo dục & luyện thi",
  description:
    "Quản lý lớp học, giáo án, học sinh và nhân sự trong một hệ thống duy nhất. Dành cho trung tâm luyện thi, bồi dưỡng văn hoá và lập trình.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const initialUser = {
    id: "",
    email: "",
    roleType: Role.guest,
  };

  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider initialUser={initialUser}>
          <Providers>{children}</Providers>
        </AuthProvider>
      </body>
    </html>
  );
}
