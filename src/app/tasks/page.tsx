"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, Clock, ExternalLink, Filter } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { db } from "@/lib/mock-data";
import { filterLeadsByAccess } from "@/lib/access";
import { DEMO_NOW, DEMO_TODAY_START } from "@/lib/demo-clock";
import { cn } from "@/lib/utils";
import { useDemoAccess } from "@/app/providers";
import type { TaskType } from "@/lib/types";
import { useDemoLeads } from "@/lib/demo-leads";
import { useDemoTasks } from "@/lib/demo-tasks";

const taskTypes: TaskType[] = [
  "今日待跟进",
  "逾期未跟进",
  "试听提醒",
  "报价后未回复提醒",
  "缴费提醒",
  "分班提醒",
  "材料提交提醒",
  "考试日期提醒",
  "志望理由书截止提醒",
  "面试练习提醒",
];

export default function TasksPage() {
  const { user } = useDemoAccess();
  const { leads } = useDemoLeads(db.leads);
  const { tasks, markDone } = useDemoTasks(db.tasks);
  const accessibleLeads = React.useMemo(() => filterLeadsByAccess({ user }, leads), [leads, user]);
  const accessibleLeadIds = React.useMemo(() => new Set(accessibleLeads.map((l) => l.id)), [accessibleLeads]);
  const accessibleLeadById = React.useMemo(() => new Map(accessibleLeads.map((l) => [l.id, l])), [accessibleLeads]);

  const scopedTasks = React.useMemo(() => {
    if (user.role === "销售顾问" || user.role === "教务" || user.role === "进学指导" || user.role === "财务") {
      return tasks.filter((t) => t.assigneeId === user.id && (!t.leadId || accessibleLeadIds.has(t.leadId)));
    }
    return tasks.filter((t) => !t.leadId || accessibleLeadIds.has(t.leadId));
  }, [accessibleLeadIds, tasks, user]);

  const [view, setView] = React.useState<"today" | "overdue" | "all">("today");
  const [type, setType] = React.useState<string>("all");

  const filtered = React.useMemo(() => {
    return scopedTasks
      .filter((t) => (type === "all" ? true : t.type === type))
      .filter((t) => t.status === "待处理")
      .filter((t) => {
        if (!t.dueAt) return view === "all";
        const due = new Date(t.dueAt).getTime();
        if (view === "all") return true;
        if (view === "today") return due >= DEMO_TODAY_START && due <= DEMO_NOW;
        return due < DEMO_TODAY_START;
      })
      .sort((a, b) => (a.dueAt ?? "").localeCompare(b.dueAt ?? ""));
  }, [scopedTasks, type, view]);

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">任务提醒</h1>
          <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">聚合今日待办、逾期与关键节点提醒</div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="border-transparent bg-zinc-900/5 text-zinc-700 dark:bg-zinc-50/10 dark:text-zinc-200">
            待处理：{filtered.length} 条
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-base">筛选</CardTitle>
            <CardDescription>按任务类型与时间视图过滤</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={view}
              onValueChange={(v) => {
                if (v === "today" || v === "overdue" || v === "all") setView(v);
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">今日待处理</SelectItem>
                <SelectItem value="overdue">逾期未处理</SelectItem>
                <SelectItem value="all">全部待处理</SelectItem>
              </SelectContent>
            </Select>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-[240px]">
                <SelectValue placeholder="任务类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                {taskTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="secondary" onClick={() => (setView("today"), setType("all"))}>
              <Filter className="h-4 w-4" />
              重置
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-3">
        {filtered.map((t) => {
          const due = t.dueAt ? new Date(t.dueAt) : null;
          const overdue = due ? due.getTime() < DEMO_TODAY_START : false;
          const lead = t.leadId ? accessibleLeadById.get(t.leadId) : undefined;
          const assignee = db.users.find((u) => u.id === t.assigneeId);
          return (
            <Card key={t.id}>
              <CardContent className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={cn("border-transparent", overdue ? "bg-rose-500/15 text-rose-700" : "bg-emerald-500/15 text-emerald-700")}>
                      {overdue ? "逾期" : "待处理"}
                    </Badge>
                    <div className="min-w-0 truncate text-sm font-semibold">{t.title}</div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      截止：{due ? due.toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
                    </span>
                    <span>·</span>
                    <span>类型：{t.type}</span>
                    <span>·</span>
                    <span>负责人：{assignee?.name || "—"}</span>
                    {lead ? (
                      <>
                        <span>·</span>
                        <span>
                          关联客户：{lead.studentName}（{lead.status}）
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {lead ? (
                    <Button asChild variant="outline">
                      <Link href={`/leads/${lead.id}`}>
                        查看客户
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  ) : null}
                  <Button
                    variant="secondary"
                    onClick={() => {
                      markDone(t.id);
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    标记完成
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filtered.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>当前没有任务</CardTitle>
              <CardDescription>尝试切换视图或任务类型</CardDescription>
            </CardHeader>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
