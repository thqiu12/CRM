"use client";

import * as React from "react";
import dynamic from "next/dynamic";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/lib/mock-data";
import { filterLeadsByAccess } from "@/lib/access";
import { getFunnel } from "@/lib/metrics";
import { useDemoAccess } from "@/app/providers";
import { useDemoLeads } from "@/lib/demo-leads";

const RechartsBarChart = dynamic(() => import("@/components/charts/recharts-bar"), { ssr: false });

function daysBetween(a: string, b: string) {
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  return Math.max(0, Math.round((db - da) / (24 * 60 * 60 * 1000)));
}

export default function FunnelPage() {
  const { user } = useDemoAccess();
  const { leads: allLeads } = useDemoLeads(db.leads);
  const leads = React.useMemo(() => filterLeadsByAccess({ user }, allLeads), [allLeads, user]);
  const stages = React.useMemo(() => getFunnel(leads), [leads]);

  const lost = React.useMemo(() => leads.filter((l) => l.status === "已流失"), [leads]);
  const lostReasons = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const l of lost) {
      const reason = l.notes?.includes("预算") ? "预算原因" : l.notes?.includes("对比") ? "竞品对比" : "未响应/其他";
      m.set(reason, (m.get(reason) ?? 0) + 1);
    }
    return Array.from(m.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);
  }, [lost]);

  const stageRows = React.useMemo(() => {
    return stages.map((s, idx) => {
      const avgDays =
        idx === 0
          ? Math.round(leads.reduce((sum, l) => sum + daysBetween(l.createdAt, l.updatedAt), 0) / Math.max(leads.length, 1))
          : Math.round((s.count ? (idx + 2) * 2 : 0) * 1.2);
      const prev = idx === 0 ? undefined : stages[idx - 1]?.count ?? 0;
      const churn = prev ? Math.max(0, prev - s.count) : 0;
      return { ...s, avgDays, churn };
    });
  }, [leads, stages]);

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">销售漏斗</h1>
          <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">新线索 → 沟通 → 试听 → 报价 → 报名 → 缴费 → 分班</div>
        </div>
        <Badge className="w-fit border-transparent bg-zinc-900/5 text-zinc-700 dark:bg-zinc-50/10 dark:text-zinc-200">
          当前视图：{user.role}
        </Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>漏斗阶段人数</CardTitle>
            <CardDescription>基于线索当前状态映射</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            <RechartsBarChart data={stages} xKey="stage" valueKey="count" tooltipLabel="人数" />
          </CardContent>
        </Card>

        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle>阶段明细</CardTitle>
            <CardDescription>人数、转化率、平均停留天数（Demo 估算）、流失人数</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table className="min-w-[820px]">
              <TableHeader>
                <TableRow>
                  <TableHead>阶段</TableHead>
                  <TableHead>人数</TableHead>
                  <TableHead>转化率</TableHead>
                  <TableHead>平均停留天数</TableHead>
                  <TableHead>流失人数</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stageRows.map((s, idx) => (
                  <TableRow key={s.stage}>
                    <TableCell className="font-medium">{s.stage}</TableCell>
                    <TableCell>{s.count}</TableCell>
                    <TableCell>{idx === 0 ? "—" : `${Math.round(s.rate * 100)}%`}</TableCell>
                    <TableCell>{s.avgDays} 天</TableCell>
                    <TableCell>{idx === 0 ? "—" : s.churn}</TableCell>
                  </TableRow>
                ))}
                {stageRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
                      暂无数据
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>流失原因汇总</CardTitle>
          <CardDescription>Demo 根据备注关键词做简单归类（生产建议使用“流失原因字典”+必填）</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {lostReasons.length ? (
            lostReasons.map((r) => (
              <div key={r.reason} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-900 dark:bg-black/40">
                <div className="text-sm font-medium">{r.reason}</div>
                <div className="mt-1 text-2xl font-semibold">{r.count}</div>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-900 dark:bg-black/40 dark:text-zinc-400 md:col-span-3">
              当前范围内暂无“已流失”线索
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
