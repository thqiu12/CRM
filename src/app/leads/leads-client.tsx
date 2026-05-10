"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Filter, Search } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { db } from "@/lib/mock-data";
import { filterLeadsByAccess } from "@/lib/access";
import { DEMO_NOW } from "@/lib/demo-clock";
import type { CustomerLevel, LeadStatus } from "@/lib/types";
import { useDemoAccess } from "@/app/providers";
import { cn } from "@/lib/utils";

const statuses: LeadStatus[] = [
  "新线索",
  "已添加微信",
  "已初次沟通",
  "已发课程介绍",
  "已预约试听",
  "已试听",
  "已报价",
  "已报名",
  "已缴费",
  "已分班",
  "服务中",
  "已合格",
  "已流失",
];

const levels: CustomerLevel[] = ["A", "B", "C", "D"];

function mapById<T extends { id: string }>(items: T[]) {
  const m = new Map<string, T>();
  for (const it of items) m.set(it.id, it);
  return m;
}

export default function LeadsClient({ seedQuery }: { seedQuery: string }) {
  const { user } = useDemoAccess();
  const router = useRouter();

  const [query, setQuery] = React.useState(seedQuery);
  const [status, setStatus] = React.useState<string>("all");
  const [level, setLevel] = React.useState<string>("all");
  const [campusId, setCampusId] = React.useState<string>("all");
  const [channelId, setChannelId] = React.useState<string>("all");
  const [ownerId, setOwnerId] = React.useState<string>("all");
  const [sortKey, setSortKey] = React.useState<"updatedAt" | "nextFollowUpAt" | "createdAt">("updatedAt");

  const byCampus = React.useMemo(() => mapById(db.campuses), []);
  const byChannel = React.useMemo(() => mapById(db.channels), []);
  const byUser = React.useMemo(() => mapById(db.users), []);

  const accessibleLeads = React.useMemo(() => filterLeadsByAccess({ user }, db.leads), [user]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return accessibleLeads
      .filter((l) => {
        if (!q) return true;
        const hay = [l.studentName, l.wechat ?? "", l.phone ?? "", l.email ?? "", l.targetSchool ?? "", l.targetMajor ?? ""]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
      .filter((l) => (status === "all" ? true : l.status === status))
      .filter((l) => (level === "all" ? true : l.customerLevel === level))
      .filter((l) => (campusId === "all" ? true : l.campusId === campusId))
      .filter((l) => (channelId === "all" ? true : l.channelId === channelId))
      .filter((l) => (ownerId === "all" ? true : l.ownerId === ownerId))
      .sort((a, b) => {
        const ax = sortKey === "nextFollowUpAt" ? a.nextFollowUpAt ?? "" : a[sortKey];
        const bx = sortKey === "nextFollowUpAt" ? b.nextFollowUpAt ?? "" : b[sortKey];
        return bx.localeCompare(ax);
      });
  }, [accessibleLeads, campusId, channelId, level, ownerId, query, sortKey, status]);

  const clearFilters = () => {
    setStatus("all");
    setLevel("all");
    setCampusId("all");
    setChannelId("all");
    setOwnerId("all");
  };

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">客户线索</h1>
          <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            当前可见：{filtered.length} / {accessibleLeads.length} 条
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={clearFilters}>
            <Filter className="h-4 w-4" />
            清空筛选
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">搜索与筛选</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-12">
          <div className="md:col-span-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="姓名 / 微信 / 手机 / 邮箱 / 目标院校" className="pl-9" />
            </div>
          </div>
          <div className="md:col-span-2">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                {statuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger>
                <SelectValue placeholder="等级" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部等级</SelectItem>
                {levels.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Select value={campusId} onValueChange={setCampusId}>
              <SelectTrigger>
                <SelectValue placeholder="校区" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部校区</SelectItem>
                {db.campuses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Select value={channelId} onValueChange={setChannelId}>
              <SelectTrigger>
                <SelectValue placeholder="渠道" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部渠道</SelectItem>
                {db.channels.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Select value={ownerId} onValueChange={setOwnerId}>
              <SelectTrigger>
                <SelectValue placeholder="顾问" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部顾问</SelectItem>
                {db.users
                  .filter((u) => u.role === "销售顾问")
                  .map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2">
            <Select
              value={sortKey}
              onValueChange={(v) => {
                if (v === "updatedAt" || v === "nextFollowUpAt" || v === "createdAt") setSortKey(v);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="排序" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updatedAt">按更新时间</SelectItem>
                <SelectItem value="nextFollowUpAt">按下次跟进</SelectItem>
                <SelectItem value="createdAt">按创建时间</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-10 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span>当前角色：{user.role}</span>
            <span>·</span>
            <span>提示：点击行可进入详情页</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-base">线索列表</CardTitle>
          <Badge className="border-transparent bg-zinc-900/5 text-zinc-700 dark:bg-zinc-50/10 dark:text-zinc-200">
            共 {filtered.length} 条
          </Badge>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table className="min-w-[980px]">
            <TableHeader>
              <TableRow>
                <TableHead>学生</TableHead>
                <TableHead>联系方式</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>等级</TableHead>
                <TableHead>渠道</TableHead>
                <TableHead>校区</TableHead>
                <TableHead>负责顾问</TableHead>
                <TableHead>下次跟进</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((l) => {
                const campus = byCampus.get(l.campusId);
                const channel = byChannel.get(l.channelId);
                const owner = byUser.get(l.ownerId);
                const next = l.nextFollowUpAt ? new Date(l.nextFollowUpAt) : null;
                const overdue = next ? next.getTime() < DEMO_NOW : false;
                return (
                  <TableRow key={l.id} className="cursor-pointer" onClick={() => router.push(`/leads/${l.id}`)}>
                    <TableCell>
                      <div className="font-medium">{l.studentName}</div>
                      <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        {l.targetTrack} · {l.targetSchool || "未填写"} {l.targetMajor ? `· ${l.targetMajor}` : ""}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{l.wechat || "—"}</div>
                      <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{l.phone || l.email || "—"}</div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("border-transparent", l.status === "已流失" ? "bg-zinc-500/15 text-zinc-700" : "bg-emerald-500/15 text-emerald-700")}>
                        {l.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{l.customerLevel}</Badge>
                    </TableCell>
                    <TableCell>{channel?.name ?? "—"}</TableCell>
                    <TableCell>{campus?.name ?? "—"}</TableCell>
                    <TableCell>{owner?.name ?? "—"}</TableCell>
                    <TableCell>
                      {next ? (
                        <div className={cn("text-sm", overdue && "text-rose-700 dark:text-rose-400")}>
                          {next.toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </div>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                      {overdue ? <div className="mt-0.5 text-xs text-rose-600">已逾期</div> : null}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" className="h-9">
                        <Link href={`/leads/${l.id}`}>
                          查看
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
                    未找到符合条件的线索
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

