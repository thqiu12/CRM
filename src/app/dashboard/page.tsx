"use client";

import * as React from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight, TrendingUp } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/mock-data";
import { filterLeadsByAccess } from "@/lib/access";
import { getDashboardKpis, getFunnel, groupBy } from "@/lib/metrics";
import { DEMO_NOW } from "@/lib/demo-clock";
import { cn } from "@/lib/utils";
import { useDemoAccess } from "@/app/providers";

function fmtJPY(amount: number) {
  return new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 }).format(amount);
}

export default function DashboardPage() {
  const { user } = useDemoAccess();

  const accessibleLeads = React.useMemo(() => filterLeadsByAccess({ user }, db.leads), [user]);
  const accessibleLeadIds = React.useMemo(() => new Set(accessibleLeads.map((l) => l.id)), [accessibleLeads]);

  const accessibleTasks = React.useMemo(() => {
    if (user.role === "销售顾问" || user.role === "教务" || user.role === "进学指导" || user.role === "财务") {
      return db.tasks.filter((t) => t.assigneeId === user.id && (!t.leadId || accessibleLeadIds.has(t.leadId)));
    }

    if (user.role === "校区负责人") {
      const campusLeadIds = new Set(db.leads.filter((l) => l.campusId === user.campusId).map((l) => l.id));
      return db.tasks.filter((t) => !t.leadId || campusLeadIds.has(t.leadId));
    }

    return db.tasks.filter((t) => !t.leadId || accessibleLeadIds.has(t.leadId));
  }, [accessibleLeadIds, user]);

  const accessibleEnrollments = React.useMemo(
    () => db.enrollments.filter((e) => accessibleLeadIds.has(e.leadId)),
    [accessibleLeadIds],
  );

  const kpis = React.useMemo(
    () =>
      getDashboardKpis({
        leads: accessibleLeads,
        tasks: accessibleTasks,
        enrollments: accessibleEnrollments,
      }),
    [accessibleEnrollments, accessibleLeads, accessibleTasks],
  );

  const channelData = React.useMemo(() => {
    const grouped = groupBy(accessibleLeads, "channelId");
    return db.channels
      .map((c) => ({ name: c.name, value: grouped.get(c.id)?.length ?? 0 }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [accessibleLeads]);

  const campusSignupData = React.useMemo(() => {
    const leadById = new Map(accessibleLeads.map((l) => [l.id, l]));
    const byCampus = new Map<string, number>();
    for (const e of accessibleEnrollments) {
      const lead = leadById.get(e.leadId);
      if (!lead) continue;
      byCampus.set(lead.campusId, (byCampus.get(lead.campusId) ?? 0) + 1);
    }
    return db.campuses
      .map((c) => ({ name: c.name, value: byCampus.get(c.id) ?? 0 }))
      .sort((a, b) => b.value - a.value);
  }, [accessibleEnrollments, accessibleLeads]);

  const consultantRanking = React.useMemo(() => {
    const paidByOwner = new Map<string, number>();
    const ownerMap = new Map<string, string>();
    for (const u of db.users) ownerMap.set(u.id, u.name);
    const leadById = new Map(accessibleLeads.map((l) => [l.id, l]));
    for (const e of accessibleEnrollments) {
      const lead = leadById.get(e.leadId);
      if (!lead) continue;
      paidByOwner.set(lead.ownerId, (paidByOwner.get(lead.ownerId) ?? 0) + (e.paidAmount || 0));
    }
    return Array.from(paidByOwner.entries())
      .map(([ownerId, value]) => ({ name: ownerMap.get(ownerId) ?? ownerId, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [accessibleEnrollments, accessibleLeads]);

  const funnel = React.useMemo(() => getFunnel(accessibleLeads), [accessibleLeads]);

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-sm text-zinc-500 dark:text-zinc-400">欢迎回来，{user.name}</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">首页看板</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="border-transparent bg-zinc-900/5 text-zinc-700 dark:bg-zinc-50/10 dark:text-zinc-200">
            当前视图：{user.role}
          </Badge>
          <Button asChild variant="outline">
            <Link href="/leads">
              进入线索列表
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <KpiCard title="今日新增线索" value={kpis.todayNewLeads} hint="按当前权限范围统计" />
        <KpiCard title="本周新增线索" value={kpis.weekNewLeads} hint="周一 00:00 起" />
        <KpiCard title="今日待跟进" value={kpis.todayDue} hint="到期时间在今日内" tone="warn" />
        <KpiCard title="逾期未跟进" value={kpis.overdue} hint="已超过今天 00:00" tone="danger" />
        <KpiCard title="本月报名人数" value={kpis.monthSignupCount} hint="按报名时间统计" />
        <KpiCard title="本月缴费金额" value={fmtJPY(kpis.monthPaid)} hint="按实收金额累计" />
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-6">
          <CardHeader>
            <CardTitle>各渠道线索数量</CardTitle>
            <CardDescription>Top 10 渠道（按线索数降序）</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            <BarBlock data={channelData} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-6">
          <CardHeader>
            <CardTitle>各校区报名情况</CardTitle>
            <CardDescription>按报名记录归属校区</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            <BarBlock data={campusSignupData} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle>销售漏斗转化率</CardTitle>
            <CardDescription>阶段人数与环比转化（基于当前状态映射）</CardDescription>
          </CardHeader>
          <CardContent className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={200}>
              <BarChart data={funnel} margin={{ left: 0, right: 18, top: 6, bottom: 6 }}>
                <XAxis dataKey="stage" tick={{ fontSize: 12 }} interval={0} />
                <YAxis />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid rgba(24,24,27,0.10)",
                    boxShadow: "0 16px 40px -24px rgba(0,0,0,0.35)",
                  }}
                  formatter={(v) => [v, "人数"]}
                />
                <Bar dataKey="count" fill="rgb(24 24 27)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              {funnel.map((s, idx) => (
                <div key={s.stage} className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-900 dark:bg-black/40">
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">{s.stage}</div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <div className="text-base font-semibold">{s.count}</div>
                    <div className={cn("text-xs", idx === 0 ? "text-zinc-500 dark:text-zinc-400" : "text-emerald-700 dark:text-emerald-400")}>
                      {idx === 0 ? "—" : `${Math.round(s.rate * 100)}%`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>各顾问业绩排行</CardTitle>
            <CardDescription>按实收金额累计（当前权限范围）</CardDescription>
          </CardHeader>
          <CardContent className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={200}>
              <BarChart data={consultantRanking} layout="vertical" margin={{ left: 6, right: 18, top: 6, bottom: 6 }}>
                <XAxis type="number" tickFormatter={(v) => `${Math.round(Number(v) / 10000)}万`} />
                <YAxis dataKey="name" type="category" width={96} tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid rgba(24,24,27,0.10)",
                    boxShadow: "0 16px 40px -24px rgba(0,0,0,0.35)",
                  }}
                  formatter={(v) => [fmtJPY(Number(v)), "实收金额"]}
                />
                <Bar dataKey="value" fill="rgb(24 24 27)" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>今日重点</CardTitle>
            <CardDescription>从任务与线索中提取的“需要立刻处理”事项</CardDescription>
          </div>
          <TrendingUp className="h-5 w-5 text-zinc-400" />
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {pickHighlights({ leadIds: accessibleLeadIds, now: DEMO_NOW }).map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="group rounded-xl border border-zinc-200 bg-white p-4 transition hover:border-zinc-300 hover:shadow-sm dark:border-zinc-900 dark:bg-zinc-950 dark:hover:border-zinc-800"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{item.title}</div>
                  <div className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-400">{item.subtitle}</div>
                </div>
                <ArrowRight className="h-4 w-4 opacity-0 transition group-hover:opacity-70" />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge className={cn("border-transparent", item.badgeClass)}>{item.badge}</Badge>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">{item.meta}</span>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard(props: { title: string; value: number | string; hint: string; tone?: "warn" | "danger" }) {
  return (
    <Card className="lg:col-span-1">
      <CardHeader className="pb-3">
        <CardDescription className="text-xs">{props.title}</CardDescription>
        <CardTitle className={cn("text-2xl", props.tone === "warn" && "text-amber-700 dark:text-amber-400", props.tone === "danger" && "text-rose-700 dark:text-rose-400")}>
          {props.value}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-xs text-zinc-500 dark:text-zinc-400">{props.hint}</div>
      </CardContent>
    </Card>
  );
}

function BarBlock(props: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={200}>
      <BarChart data={props.data} margin={{ left: 0, right: 18, top: 10, bottom: 6 }}>
        <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} />
        <YAxis />
        <Tooltip
          contentStyle={{
            borderRadius: 12,
            border: "1px solid rgba(24,24,27,0.10)",
            boxShadow: "0 16px 40px -24px rgba(0,0,0,0.35)",
          }}
          formatter={(v) => [v, "数量"]}
        />
        <Bar dataKey="value" fill="rgb(24 24 27)" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function pickHighlights(params: { leadIds: Set<string>; now: number }) {
  const items: { id: string; href: string; title: string; subtitle: string; badge: string; badgeClass: string; meta: string }[] = [];

  for (const t of db.tasks) {
    if (t.status !== "待处理") continue;
    if (t.leadId && !params.leadIds.has(t.leadId)) continue;
    const lead = t.leadId ? db.leads.find((l) => l.id === t.leadId) : undefined;
    const due = t.dueAt ? new Date(t.dueAt) : undefined;
    const overdue = due ? due.getTime() < params.now : false;
    items.push({
      id: t.id,
      href: t.leadId ? `/leads/${t.leadId}` : "/tasks",
      title: t.title,
      subtitle: lead ? `${lead.studentName} · ${lead.status}` : t.type,
      badge: overdue ? "逾期" : "待处理",
      badgeClass: overdue ? "bg-rose-500/15 text-rose-700" : "bg-emerald-500/15 text-emerald-700",
      meta: due ? `截止：${due.toLocaleString("zh-CN", { hour: "2-digit", minute: "2-digit", month: "2-digit", day: "2-digit" })}` : "无截止时间",
    });
  }

  return items.sort((a, b) => (a.badge === "逾期" ? -1 : 1) - (b.badge === "逾期" ? -1 : 1)).slice(0, 4);
}
