"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, CalendarClock, Mail, MessageCircle, Phone, Tag as TagIcon, UserCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { db } from "@/lib/mock-data";
import { canViewLead } from "@/lib/access";
import { DEMO_NOW } from "@/lib/demo-clock";
import type { CustomerLevel, FollowUp, FollowUpMethod, Lead, LeadStatus } from "@/lib/types";
import { useDemoAccess } from "@/app/providers";
import { useDemoLeads } from "@/lib/demo-leads";

const followUpMethods: FollowUpMethod[] = ["微信", "电话", "语音", "视频", "面谈"];
const levels: CustomerLevel[] = ["A", "B", "C", "D"];
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

function fmtDateTime(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  return d.toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function fmtJPY(amount: number) {
  return new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 }).format(amount);
}

export default function LeadDetailClient({ leadId }: { leadId: string }) {
  const { user } = useDemoAccess();
  const { leads } = useDemoLeads(db.leads);

  const [lead, setLead] = React.useState<Lead | null>(() => leads.find((l) => l.id === leadId) ?? null);
  const hasAccess = React.useMemo(() => (lead ? canViewLead({ user }, lead) : false), [lead, user]);

  const [followUps, setFollowUps] = React.useState(() => db.followUps.filter((f) => f.leadId === leadId));

  const enrollment = React.useMemo(() => db.enrollments.find((e) => e.leadId === leadId), [leadId]);
  const enrollmentPayments = React.useMemo(() => db.payments.filter((p) => p.enrollmentId === enrollment?.id), [enrollment?.id]);
  const handoff = React.useMemo(() => db.handoffs.find((h) => h.leadId === leadId), [leadId]);
  const tasks = React.useMemo(() => db.tasks.filter((t) => t.leadId === leadId), [leadId]);
  const results = React.useMemo(() => db.admissionResults.filter((r) => r.leadId === leadId), [leadId]);

  const owner = React.useMemo(() => (lead ? db.users.find((u) => u.id === lead.ownerId) : null), [lead]);
  const campus = React.useMemo(() => (lead ? db.campuses.find((c) => c.id === lead.campusId) : null), [lead]);
  const channel = React.useMemo(() => (lead ? db.channels.find((c) => c.id === lead.channelId) : null), [lead]);

  if (!lead) {
    return (
      <div className="space-y-3">
        <Button asChild variant="ghost">
          <Link href="/leads">
            <ArrowLeft className="h-4 w-4" />
            返回线索列表
          </Link>
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>未找到该线索</CardTitle>
            <CardDescription>请确认链接是否正确</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="space-y-3">
        <Button asChild variant="ghost">
          <Link href="/leads">
            <ArrowLeft className="h-4 w-4" />
            返回线索列表
          </Link>
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>无权限访问</CardTitle>
            <CardDescription>当前身份：{user.role}，请在“权限与身份”中切换</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const next = lead.nextFollowUpAt ? new Date(lead.nextFollowUpAt) : null;
  const overdue = next ? next.getTime() < DEMO_NOW : false;

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link href="/leads">
              <ArrowLeft className="h-4 w-4" />
              返回
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{lead.studentName}</h1>
            <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {lead.targetTrack} · {lead.targetSchool || "未填写目标院校"} {lead.targetMajor ? `· ${lead.targetMajor}` : ""}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge className={cn("border-transparent", lead.status === "已流失" ? "bg-zinc-500/15 text-zinc-700" : "bg-emerald-500/15 text-emerald-700")}>
            {lead.status}
          </Badge>
          <Badge variant="secondary">等级 {lead.customerLevel}</Badge>
          {next ? (
            <Badge className={cn("border-transparent", overdue ? "bg-rose-500/15 text-rose-700" : "bg-zinc-900/5 text-zinc-700 dark:bg-zinc-50/10 dark:text-zinc-200")}>
              <CalendarClock className="h-3.5 w-3.5" />
              下次跟进：{fmtDateTime(lead.nextFollowUpAt)}
            </Badge>
          ) : null}
          <AddFollowUpDialog
            lead={lead}
            onCreate={(created) => {
              setFollowUps((prev) => [created, ...prev]);
              setLead((prev) =>
                prev
                  ? {
                      ...prev,
                      status: created.statusChangeTo ?? prev.status,
                      customerLevel: created.levelChangeTo ?? prev.customerLevel,
                      nextFollowUpAt: created.nextFollowUpAt ?? prev.nextFollowUpAt,
                      updatedAt: new Date().toISOString(),
                    }
                  : prev,
              );
            }}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-base">基本信息</CardTitle>
            <CardDescription>核心字段与归属信息</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoLine icon={<MessageCircle className="h-4 w-4" />} label="微信" value={lead.wechat || "—"} />
            <InfoLine icon={<Phone className="h-4 w-4" />} label="手机号" value={lead.phone || "—"} />
            <InfoLine icon={<Mail className="h-4 w-4" />} label="邮箱" value={lead.email || "—"} />
            <InfoLine icon={<UserCircle2 className="h-4 w-4" />} label="负责顾问" value={owner?.name || "—"} />
            <InfoLine icon={<TagIcon className="h-4 w-4" />} label="渠道" value={channel?.name || "—"} />
            <InfoLine icon={<TagIcon className="h-4 w-4" />} label="校区" value={campus?.name || "—"} />

            <div className="pt-2">
              <div className="text-xs font-medium text-zinc-600 dark:text-zinc-300">标签</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {lead.tagIds.length ? (
                  lead.tagIds.map((id) => {
                    const t = db.tags.find((x) => x.id === id);
                    return (
                      <Badge key={id} className={cn("border-transparent", t?.color ?? "bg-zinc-900/5 text-zinc-700")}>
                        {t?.name ?? id}
                      </Badge>
                    );
                  })
                ) : (
                  <span className="text-xs text-zinc-400">无</span>
                )}
              </div>
            </div>

            <div className="pt-2">
              <div className="text-xs font-medium text-zinc-600 dark:text-zinc-300">备注</div>
              <div className="mt-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700 dark:border-zinc-900 dark:bg-black/40 dark:text-zinc-200">
                {lead.notes || "—"}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-8">
          <CardHeader>
            <CardTitle className="text-base">客户详情</CardTitle>
            <CardDescription>跟进、报名、交接、任务与合格结果</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="followups">
              <TabsList className="flex flex-wrap">
                <TabsTrigger value="basic">详细信息</TabsTrigger>
                <TabsTrigger value="followups">跟进记录</TabsTrigger>
                <TabsTrigger value="enrollment">报名与缴费</TabsTrigger>
                <TabsTrigger value="handoff">教务交接</TabsTrigger>
                <TabsTrigger value="tasks">任务</TabsTrigger>
                <TabsTrigger value="results">合格结果</TabsTrigger>
              </TabsList>

              <TabsContent value="basic">
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="当前所在地" value={`${lead.locationCountry}${lead.locationCity ? ` · ${lead.locationCity}` : ""}`} />
                  <Field label="当前学校/年级" value={`${lead.currentSchool || "—"}${lead.currentGrade ? ` · ${lead.currentGrade}` : ""}`} />
                  <Field label="目标入学年份" value={lead.targetYear ? String(lead.targetYear) : "—"} />
                  <Field label="预算" value={lead.budget ? fmtJPY(lead.budget) : "—"} />
                  <Field label="日语水平" value={lead.japaneseLevel || "—"} />
                  <Field label="英语水平" value={lead.englishLevel || "—"} />
                  <Field label="EJU 成绩" value={lead.ejuScore || "—"} />
                  <Field label="托福/托业" value={lead.toeflToeicScore || "—"} />
                </div>
              </TabsContent>

              <TabsContent value="followups">
                <div className="space-y-3">
                  {followUps
                    .slice()
                    .sort((a, b) => b.followUpAt.localeCompare(a.followUpAt))
                    .map((f) => {
                      const operator = db.users.find((u) => u.id === f.operatorId);
                      return (
                        <div key={f.id} className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-900 dark:bg-zinc-950">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <Badge className="border-transparent bg-zinc-900/5 text-zinc-700 dark:bg-zinc-50/10 dark:text-zinc-200">{f.method}</Badge>
                              <span className="text-sm font-medium">{fmtDateTime(f.followUpAt)}</span>
                              <span className="text-xs text-zinc-500 dark:text-zinc-400">跟进人：{operator?.name || "—"}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                              {f.levelChangeTo ? <Badge variant="secondary">等级：{f.levelChangeFrom ?? "—"} → {f.levelChangeTo}</Badge> : null}
                              {f.statusChangeTo ? <Badge variant="secondary">状态：{f.statusChangeFrom ?? "—"} → {f.statusChangeTo}</Badge> : null}
                            </div>
                          </div>

                          <div className="mt-3 whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-100">{f.content}</div>
                          {f.feedback ? <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">客户反馈：{f.feedback}</div> : null}
                          {f.nextAction ? <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">下一步动作：{f.nextAction}</div> : null}
                          {f.nextFollowUpAt ? (
                            <div className={cn("mt-1 text-xs", new Date(f.nextFollowUpAt).getTime() < DEMO_NOW ? "text-rose-600" : "text-zinc-500 dark:text-zinc-400")}>
                              下次跟进时间：{fmtDateTime(f.nextFollowUpAt)}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}

                  {followUps.length === 0 ? <Empty text="暂无跟进记录" /> : null}
                </div>
              </TabsContent>

              <TabsContent value="enrollment">
                {enrollment ? (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-900 dark:bg-zinc-950">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold">{enrollment.courseName}</div>
                          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">课程类型：{enrollment.courseType}</div>
                        </div>
                        <Badge className={cn("border-transparent", enrollment.paymentStatus === "已付款" ? "bg-emerald-500/15 text-emerald-700" : "bg-amber-500/15 text-amber-700")}>
                          {enrollment.paymentStatus}
                        </Badge>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <Field label="报名金额" value={fmtJPY(enrollment.listPrice)} />
                        <Field label="优惠金额" value={fmtJPY(enrollment.discountAmount)} />
                        <Field label="实收金额" value={fmtJPY(enrollment.paidAmount)} />
                        <Field label="付款方式" value={enrollment.paymentMethod || "—"} />
                        <Field label="报名时间" value={fmtDateTime(enrollment.enrolledAt)} />
                        <Field label="服务周期" value={`${enrollment.serviceStartDate || "—"} → ${enrollment.serviceEndDate || "—"}`} />
                      </div>
                    </div>

                    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-900 dark:bg-zinc-950">
                      <div className="text-sm font-semibold">缴费记录</div>
                      <div className="mt-3 space-y-2">
                        {enrollmentPayments.map((p) => (
                          <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-900 dark:bg-black/40">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">{p.method}</Badge>
                              <span className="font-medium">{fmtJPY(p.amount)}</span>
                            </div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">
                              {fmtDateTime(p.paidAt)}{p.note ? ` · ${p.note}` : ""}
                            </div>
                          </div>
                        ))}
                        {enrollmentPayments.length === 0 ? <Empty text="暂无缴费记录" /> : null}
                      </div>
                    </div>
                  </div>
                ) : (
                  <Empty text="暂无报名信息" />
                )}
              </TabsContent>

              <TabsContent value="handoff">
                {handoff ? (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-900 dark:bg-zinc-950">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm font-semibold">教务交接单</div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">分班：{handoff.classAssignmentStatus}</Badge>
                          <Badge variant="secondary">确认：{handoff.confirmStatus}</Badge>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <Field label="学习目标" value={handoff.studyGoal || "—"} />
                        <Field label="目标院校" value={handoff.targetSchool || "—"} />
                        <Field label="当前水平" value={handoff.currentLevel || "—"} />
                        <Field label="销售承诺事项" value={handoff.salesPromises || "—"} />
                        <Field label="特殊注意事项" value={handoff.specialNotes || "—"} />
                        <Field label="需要安排课程" value={handoff.coursesToArrange || "—"} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <Empty text="暂无教务交接信息" />
                )}
              </TabsContent>

              <TabsContent value="tasks">
                <div className="space-y-2">
                  {tasks.map((t) => {
                    const due = t.dueAt ? new Date(t.dueAt) : null;
                    const isOverdue = due ? due.getTime() < DEMO_NOW && t.status === "待处理" : false;
                    const assignee = db.users.find((u) => u.id === t.assigneeId);
                    return (
                      <div key={t.id} className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-900 dark:bg-zinc-950">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">{t.title}</div>
                            <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                              类型：{t.type} · 负责人：{assignee?.name || "—"}
                            </div>
                          </div>
                          <Badge className={cn("border-transparent", t.status === "已完成" ? "bg-zinc-500/15 text-zinc-700" : isOverdue ? "bg-rose-500/15 text-rose-700" : "bg-emerald-500/15 text-emerald-700")}>
                            {t.status === "已完成" ? "已完成" : isOverdue ? "逾期" : "待处理"}
                          </Badge>
                        </div>
                        <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">截止：{fmtDateTime(t.dueAt)}</div>
                      </div>
                    );
                  })}
                  {tasks.length === 0 ? <Empty text="暂无任务" /> : null}
                </div>
              </TabsContent>

              <TabsContent value="results">
                <div className="space-y-2">
                  {results.map((r) => (
                    <div key={r.id} className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-900 dark:bg-zinc-950">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-semibold">
                            {r.school} {r.major ? `· ${r.major}` : ""}
                          </div>
                          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                            层级：{r.level} · 合格时间：{fmtDateTime(r.admittedAt)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {r.isFirstChoice ? <Badge className="border-transparent bg-emerald-500/15 text-emerald-700">第一志望</Badge> : null}
                          <Badge variant="secondary">{r.canMarketing ? "可宣传" : "不可宣传"}</Badge>
                          <Badge variant="secondary">素材：{r.marketingAssetStatus}</Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                  {results.length === 0 ? <Empty text="暂无合格结果" /> : null}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoLine({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-900 dark:bg-black/40">
      <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="min-w-0 truncate text-right text-sm text-zinc-900 dark:text-zinc-50">{value}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-900 dark:bg-black/40">
      <div className="text-xs font-medium text-zinc-600 dark:text-zinc-300">{label}</div>
      <div className="mt-1 whitespace-pre-wrap text-sm text-zinc-900 dark:text-zinc-50">{value}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-900 dark:bg-black/40 dark:text-zinc-400">{text}</div>;
}

function AddFollowUpDialog({
  lead,
  onCreate,
}: {
  lead: Pick<Lead, "id" | "status" | "customerLevel">;
  onCreate: (created: FollowUp) => void;
}) {
  const { user } = useDemoAccess();
  const [open, setOpen] = React.useState(false);
  const [method, setMethod] = React.useState<FollowUpMethod>("微信");
  const [content, setContent] = React.useState("");
  const [feedback, setFeedback] = React.useState("");
  const [nextAction, setNextAction] = React.useState("");
  const [nextFollowUpAt, setNextFollowUpAt] = React.useState("");
  const [statusTo, setStatusTo] = React.useState<string>("keep");
  const [levelTo, setLevelTo] = React.useState<string>("keep");

  const reset = () => {
    setMethod("微信");
    setContent("");
    setFeedback("");
    setNextAction("");
    setNextFollowUpAt("");
    setStatusTo("keep");
    setLevelTo("keep");
  };

  const submit = () => {
    const now = new Date().toISOString();
    const created: FollowUp = {
      id: `fu-${Math.random().toString(16).slice(2)}`,
      leadId: lead.id,
      followUpAt: now,
      method,
      content: content.trim(),
      feedback: feedback.trim() || undefined,
      nextAction: nextAction.trim() || undefined,
      nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt).toISOString() : undefined,
      operatorId: user.id,
      levelChangeFrom: levelTo !== "keep" ? lead.customerLevel : undefined,
      levelChangeTo: levelTo !== "keep" ? (levelTo as CustomerLevel) : undefined,
      statusChangeFrom: statusTo !== "keep" ? lead.status : undefined,
      statusChangeTo: statusTo !== "keep" ? (statusTo as LeadStatus) : undefined,
      createdAt: now,
    };
    if (!created.content) return;
    onCreate(created);
    setOpen(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (setOpen(v), v ? null : reset())}>
      <DialogTrigger asChild>
        <Button>新增跟进</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新增跟进记录</DialogTitle>
          <DialogDescription>支持同时更新状态/等级与下次跟进时间（Demo：仅本地生效）</DialogDescription>
        </DialogHeader>

        <div className="mt-4 grid gap-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-2">
              <div className="text-sm font-medium">跟进方式</div>
              <Select value={method} onValueChange={(v) => setMethod(v as FollowUpMethod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {followUpMethods.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <div className="text-sm font-medium">下次跟进时间</div>
              <Input type="datetime-local" value={nextFollowUpAt} onChange={(e) => setNextFollowUpAt(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-2">
            <div className="text-sm font-medium">跟进内容</div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[92px] w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-950/10 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-zinc-50/10"
              placeholder="例如：确认目标院校，解释课程组合，推进预约试听..."
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-2">
              <div className="text-sm font-medium">客户反馈</div>
              <Input value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="可选" />
            </div>
            <div className="grid gap-2">
              <div className="text-sm font-medium">下一步动作</div>
              <Input value={nextAction} onChange={(e) => setNextAction(e.target.value)} placeholder="可选" />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-2">
              <div className="text-sm font-medium">状态变化</div>
              <Select value={statusTo} onValueChange={setStatusTo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="keep">不变（保持 {lead.status}）</SelectItem>
                  {statuses.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <div className="text-sm font-medium">意向等级变化</div>
              <Select value={levelTo} onValueChange={setLevelTo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="keep">不变（保持 {lead.customerLevel}）</SelectItem>
                  {levels.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button onClick={submit} disabled={!content.trim()}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
