"use client";

import * as React from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/lib/mock-data";
import { filterLeadsByAccess } from "@/lib/access";
import { useDemoAccess } from "@/app/providers";
import { useDemoLeads } from "@/lib/demo-leads";

function fmtJPY(amount: number) {
  return new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 }).format(amount);
}

const channelCostsJPY: Record<string, number> = {
  "ch-xhs": 65000,
  "ch-douyin": 52000,
  "ch-bilibili": 28000,
  "ch-wx-mp": 18000,
  "ch-wx-group": 12000,
  "ch-moments": 8000,
  "ch-baidu": 40000,
  "ch-zhihu": 16000,
  "ch-friend": 0,
  "ch-old": 0,
  "ch-agent": 30000,
  "ch-lecture-offline": 20000,
  "ch-lecture-online": 15000,
  "ch-other": 5000,
};

export default function ChannelsPage() {
  const { user } = useDemoAccess();
  const { leads: allLeads } = useDemoLeads(db.leads);

  const leads = React.useMemo(() => filterLeadsByAccess({ user }, allLeads), [allLeads, user]);
  const leadById = React.useMemo(() => new Map(leads.map((l) => [l.id, l])), [leads]);
  const enrollments = React.useMemo(() => db.enrollments.filter((e) => leadById.has(e.leadId)), [leadById]);

  const channelStats = React.useMemo(() => {
    const stat = new Map<
      string,
      {
        channelId: string;
        leads: number;
        valid: number;
        trial: number;
        signup: number;
        paid: number;
      }
    >();

    const ensure = (channelId: string) => {
      const cur = stat.get(channelId);
      if (cur) return cur;
      const next = { channelId, leads: 0, valid: 0, trial: 0, signup: 0, paid: 0 };
      stat.set(channelId, next);
      return next;
    };

    for (const l of leads) {
      const s = ensure(l.channelId);
      s.leads += 1;
      if (l.status !== "已流失") s.valid += 1;
      if (l.status === "已预约试听" || l.status === "已试听" || l.status === "已报价" || l.status === "已报名" || l.status === "已缴费" || l.status === "已分班" || l.status === "服务中" || l.status === "已合格")
        s.trial += 1;
      if (l.status === "已报名" || l.status === "已缴费" || l.status === "已分班" || l.status === "服务中" || l.status === "已合格") s.signup += 1;
    }

    for (const e of enrollments) {
      const l = leadById.get(e.leadId);
      if (!l) continue;
      const s = ensure(l.channelId);
      s.paid += e.paidAmount || 0;
    }

    return db.channels
      .map((c) => {
        const s = stat.get(c.id) ?? { channelId: c.id, leads: 0, valid: 0, trial: 0, signup: 0, paid: 0 };
        const cost = channelCostsJPY[c.id] ?? 0;
        const roi = cost > 0 ? s.paid / cost : s.paid > 0 ? 999 : 0;
        const conversion = s.leads > 0 ? s.signup / s.leads : 0;
        const cpa = s.leads > 0 ? cost / s.leads : 0;
        return {
          name: c.name,
          ...s,
          cost,
          roi,
          conversion,
          cpa,
        };
      })
      .filter((x) => x.leads > 0)
      .sort((a, b) => b.leads - a.leads);
  }, [enrollments, leadById, leads]);

  const chartData = React.useMemo(() => channelStats.map((x) => ({ name: x.name, value: x.leads })).slice(0, 10), [channelStats]);

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">渠道统计</h1>
          <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">线索规模、转化与 ROI（Demo：成本为模拟数据）</div>
        </div>
        <Badge className="w-fit border-transparent bg-zinc-900/5 text-zinc-700 dark:bg-zinc-50/10 dark:text-zinc-200">
          当前视图：{user.role}
        </Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>渠道线索分布</CardTitle>
            <CardDescription>Top 10 渠道（按线索数）</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={200}>
              <BarChart data={chartData} margin={{ left: 0, right: 18, top: 10, bottom: 6 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} />
                <YAxis />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid rgba(24,24,27,0.10)",
                    boxShadow: "0 16px 40px -24px rgba(0,0,0,0.35)",
                  }}
                  formatter={(v) => [v, "线索数"]}
                />
                <Bar dataKey="value" fill="rgb(24 24 27)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle>渠道指标明细</CardTitle>
            <CardDescription>线索 → 试听 → 报名 → 缴费（按当前权限范围）</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table className="min-w-[980px]">
              <TableHeader>
                <TableRow>
                  <TableHead>渠道</TableHead>
                  <TableHead>线索数</TableHead>
                  <TableHead>有效线索</TableHead>
                  <TableHead>试听人数</TableHead>
                  <TableHead>报名人数</TableHead>
                  <TableHead>缴费金额</TableHead>
                  <TableHead>转化率</TableHead>
                  <TableHead>获客成本</TableHead>
                  <TableHead>ROI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {channelStats.map((c) => (
                  <TableRow key={c.channelId}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.leads}</TableCell>
                    <TableCell>{c.valid}</TableCell>
                    <TableCell>{c.trial}</TableCell>
                    <TableCell>{c.signup}</TableCell>
                    <TableCell>{fmtJPY(c.paid)}</TableCell>
                    <TableCell>{Math.round(c.conversion * 100)}%</TableCell>
                    <TableCell>{fmtJPY(c.cost)}（CPA {fmtJPY(c.cpa)}）</TableCell>
                    <TableCell>{c.roi >= 999 ? "—" : c.roi.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                {channelStats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
                      当前范围内没有渠道数据
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
