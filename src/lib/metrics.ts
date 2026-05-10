import type { CRMTask, Enrollment, Lead } from "@/lib/types";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek() {
  const d = startOfToday();
  const day = d.getDay() === 0 ? 7 : d.getDay();
  d.setDate(d.getDate() - (day - 1));
  return d;
}

function startOfMonth() {
  const d = startOfToday();
  d.setDate(1);
  return d;
}

export function getDashboardKpis(params: {
  leads: Lead[];
  tasks: CRMTask[];
  enrollments: Enrollment[];
}) {
  const { leads, tasks, enrollments } = params;
  const today = startOfToday();
  const week = startOfWeek();
  const month = startOfMonth();
  const now = new Date();

  const todayNewLeads = leads.filter((l) => new Date(l.createdAt) >= today).length;
  const weekNewLeads = leads.filter((l) => new Date(l.createdAt) >= week).length;

  const todayDue = tasks.filter((t) => t.status === "待处理" && t.dueAt && new Date(t.dueAt) >= today && new Date(t.dueAt) <= now).length;
  const overdue = tasks.filter((t) => t.status === "待处理" && t.dueAt && new Date(t.dueAt) < today).length;

  const monthEnrollments = enrollments.filter((e) => new Date(e.enrolledAt) >= month);
  const monthSignupCount = monthEnrollments.length;
  const monthPaid = monthEnrollments.reduce((sum, e) => sum + (e.paidAmount || 0), 0);

  return {
    todayNewLeads,
    weekNewLeads,
    todayDue,
    overdue,
    monthSignupCount,
    monthPaid,
  };
}

export function getFunnel(leads: Lead[]) {
  const stageOrder = ["新线索", "已初次沟通", "已试听", "已报价", "已报名", "已缴费", "已分班"] as const;

  const stageMap: Record<(typeof stageOrder)[number], Lead[]> = {
    新线索: [],
    已初次沟通: [],
    已试听: [],
    已报价: [],
    已报名: [],
    已缴费: [],
    已分班: [],
  };

  for (const lead of leads) {
    if (lead.status === "新线索") stageMap["新线索"].push(lead);
    if (lead.status === "已初次沟通") stageMap["已初次沟通"].push(lead);
    if (lead.status === "已试听") stageMap["已试听"].push(lead);
    if (lead.status === "已报价") stageMap["已报价"].push(lead);
    if (lead.status === "已报名" || lead.status === "已缴费" || lead.status === "已分班" || lead.status === "服务中" || lead.status === "已合格")
      stageMap["已报名"].push(lead);
    if (lead.status === "已缴费" || lead.status === "已分班" || lead.status === "服务中" || lead.status === "已合格") stageMap["已缴费"].push(lead);
    if (lead.status === "已分班" || lead.status === "服务中" || lead.status === "已合格") stageMap["已分班"].push(lead);
  }

  const stages = stageOrder.map((s, idx) => {
    const count = stageMap[s].length;
    const prev = idx === 0 ? undefined : stageMap[stageOrder[idx - 1]].length;
    const rate = prev ? count / prev : 1;
    return { stage: s, count, rate };
  });

  return stages;
}

export function groupBy<T extends { [k: string]: unknown }>(items: T[], key: keyof T) {
  const map = new Map<string, T[]>();
  for (const it of items) {
    const v = String(it[key] ?? "");
    const arr = map.get(v) ?? [];
    arr.push(it);
    map.set(v, arr);
  }
  return map;
}
