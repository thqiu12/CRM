import type { CRMUser, Lead } from "@/lib/types";

export type AccessContext = {
  user: CRMUser;
};

export function canViewLead(ctx: AccessContext, lead: Lead) {
  const { user } = ctx;

  if (user.role === "超级管理员") return true;

  if (user.role === "校区负责人") return lead.campusId === user.campusId;

  if (user.role === "销售顾问") return lead.ownerId === user.id;

  if (user.role === "市场人员") {
    const allowed = new Set(user.channelIds ?? []);
    return allowed.has(lead.channelId);
  }

  if (user.role === "教务" || user.role === "进学指导") {
    return (
      lead.status === "已报名" ||
      lead.status === "已缴费" ||
      lead.status === "已分班" ||
      lead.status === "服务中" ||
      lead.status === "已合格"
    );
  }

  if (user.role === "财务") {
    return lead.status === "已报名" || lead.status === "已缴费" || lead.status === "已分班" || lead.status === "服务中";
  }

  return false;
}

export function filterLeadsByAccess(ctx: AccessContext, leads: Lead[]) {
  return leads.filter((l) => canViewLead(ctx, l));
}
