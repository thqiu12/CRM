"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import {
  BarChart3,
  BriefcaseBusiness,
  CircleUser,
  LayoutDashboard,
  ListChecks,
  Megaphone,
  Settings,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { users } from "@/lib/mock-data";
import { useDemoAccess } from "@/app/providers";

const navItems = [
  { href: "/dashboard", label: "首页看板", icon: LayoutDashboard },
  { href: "/leads", label: "客户线索", icon: Users },
  { href: "/tasks", label: "任务提醒", icon: ListChecks },
  { href: "/channels", label: "渠道统计", icon: Megaphone },
  { href: "/funnel", label: "销售漏斗", icon: BarChart3 },
  { href: "/settings/access", label: "权限与身份", icon: Settings },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, setUserId } = useDemoAccess();
  const [q, setQ] = React.useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = q.trim();
    router.push(query ? `/leads?query=${encodeURIComponent(query)}` : "/leads");
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto flex min-h-screen w-full max-w-[1400px]">
        <aside className="hidden w-[260px] shrink-0 border-r border-zinc-200 bg-white px-4 py-5 dark:border-zinc-900 dark:bg-zinc-950 md:block">
          <div className="flex items-center gap-3 px-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900">
              <BriefcaseBusiness className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold tracking-tight">升学私塾 CRM</div>
              <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">内部 Demo</div>
            </div>
          </div>

          <nav className="mt-6 flex flex-col gap-1">
            {navItems.map((it) => {
              const active = pathname === it.href || (it.href !== "/dashboard" && pathname?.startsWith(it.href));
              const Icon = it.icon;
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-50",
                    active && "bg-zinc-100 text-zinc-950 dark:bg-zinc-900 dark:text-zinc-50",
                  )}
                >
                  <Icon className="h-4 w-4 opacity-80" />
                  <span>{it.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto pt-6">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600 dark:border-zinc-900 dark:bg-black/40 dark:text-zinc-300">
              <div className="font-medium text-zinc-900 dark:text-zinc-50">当前身份</div>
              <div className="mt-1 flex items-center gap-2">
                <CircleUser className="h-4 w-4" />
                <span className="truncate">{user.name}</span>
              </div>
              <div className="mt-1 truncate">角色：{user.role}</div>
              <div className="mt-2">
                <Link className="text-zinc-900 underline underline-offset-4 dark:text-zinc-50" href="/settings/access">
                  切换身份
                </Link>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:border-zinc-900 dark:bg-zinc-950/70">
            <div className="flex items-center gap-3 px-4 py-3 md:px-6">
              <form className="flex flex-1 items-center gap-2" onSubmit={onSubmit}>
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="搜索：姓名 / 微信 / 手机 / 邮箱"
                  className="max-w-[520px]"
                />
                <Button type="submit" variant="secondary">
                  搜索
                </Button>
              </form>

              <div className="hidden items-center gap-2 md:flex">
                <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950">
                  <CircleUser className="h-4 w-4 opacity-70" />
                  <span className="max-w-[160px] truncate">{user.name}</span>
                </div>
                <Select value={user.id} onValueChange={setUserId}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="切换身份" />
                  </SelectTrigger>
                  <SelectContent>
                    {users
                      .filter((u) => u.active)
                      .map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name}（{u.role}）
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </header>

          <div className="flex-1 px-4 py-6 md:px-6">{children}</div>
        </main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-900 dark:bg-zinc-950/80 md:hidden">
        <div className="mx-auto grid max-w-[640px] grid-cols-5 gap-1 px-3 py-2">
          {navItems.slice(0, 5).map((it) => {
            const active = pathname === it.href || (it.href !== "/dashboard" && pathname?.startsWith(it.href));
            const Icon = it.icon;
            return (
              <Link
                key={it.href}
                href={it.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-lg px-2 py-1 text-[11px] text-zinc-600 dark:text-zinc-300",
                  active && "bg-zinc-100 text-zinc-950 dark:bg-zinc-900 dark:text-zinc-50",
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="truncate">{it.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
