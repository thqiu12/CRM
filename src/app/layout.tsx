import type { Metadata } from "next";
import "./globals.css";
import { JetBrains_Mono, Noto_Sans_SC } from "next/font/google";

import { DemoProviders } from "@/app/providers";
import { AppShell } from "@/components/app/app-shell";

const sans = Noto_Sans_SC({
  variable: "--font-noto-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const mono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "升学私塾 CRM Demo",
  description: "面向中国留学生日本升学私塾的内部 CRM Demo（Next.js + Tailwind + shadcn/ui + Recharts）",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <DemoProviders>
          <AppShell>{children}</AppShell>
        </DemoProviders>
      </body>
    </html>
  );
}
