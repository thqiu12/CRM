"use client";

import * as React from "react";
import { ShieldCheck, UserRoundCog } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { campuses, users } from "@/lib/mock-data";
import type { Role } from "@/lib/types";
import { useDemoAccess } from "@/app/providers";

const roles: Role[] = ["超级管理员", "校区负责人", "销售顾问", "市场人员", "教务", "进学指导", "财务"];

export default function AccessSettingsPage() {
  const { mode, user, setRole, setUserId } = useDemoAccess();
  const campusName = campuses.find((c) => c.id === user.campusId)?.name ?? user.campusId;

  const roleUsers = React.useMemo(() => {
    const map = new Map<Role, typeof users>();
    for (const r of roles) map.set(r, []);
    for (const u of users) {
      const arr = map.get(u.role) ?? [];
      arr.push(u);
      map.set(u.role, arr);
    }
    return map;
  }, []);

  if (mode === "supabase") {
    return (
      <div className="space-y-4 pb-20 md:pb-0">
        <h1 className="text-2xl font-semibold tracking-tight">权限与身份</h1>
        <Card>
          <CardHeader>
            <CardTitle>已启用 Supabase 登录</CardTitle>
            <CardDescription>当前身份由登录账号决定；请在 Supabase 的 profiles 表中维护 role/campus_id/channel_ids 等字段</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const roleExplanation: Record<Role, string> = {
    超级管理员: "查看全部数据与所有模块（Demo 中用于演示全量视图）。",
    校区负责人: "仅查看本校区数据与业绩。",
    销售顾问: "仅查看自己负责的客户线索；可以新增跟进与推进状态。",
    市场人员: "仅查看自己渠道来源的线索与渠道统计。",
    教务: "仅查看已报名/服务中学生；推进交接与分班。",
    进学指导: "仅查看负责学生（Demo 简化为已报名/服务中可见）。",
    财务: "仅查看与缴费相关的学生与付款状态。",
  };

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">权限与身份（Demo）</h1>
          <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">用于模拟权限控制：切换身份后，数据可见范围会变化</div>
        </div>
        <Badge className="w-fit border-transparent bg-zinc-900/5 text-zinc-700 dark:bg-zinc-50/10 dark:text-zinc-200">
          当前：{user.name}（{user.role}）
        </Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserRoundCog className="h-5 w-5" />
              切换角色
            </CardTitle>
            <CardDescription>选择角色后，会自动切换到该角色下的默认账号</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={user.role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 dark:border-zinc-900 dark:bg-black/40 dark:text-zinc-200">
              <div className="font-medium text-zinc-900 dark:text-zinc-50">说明</div>
              <div className="mt-2">{roleExplanation[user.role]}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              切换具体账号
            </CardTitle>
            <CardDescription>适合演示“同一角色不同校区/不同负责人”的数据差异</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={user.id} onValueChange={setUserId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.flatMap((r) => {
                  const list = roleUsers.get(r) ?? [];
                  return list.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}（{u.role}）
                    </SelectItem>
                  ));
                })}
              </SelectContent>
            </Select>

            <div className="grid gap-2 md:grid-cols-2">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-900 dark:bg-black/40">
                <div className="text-xs font-medium text-zinc-600 dark:text-zinc-300">角色</div>
                <div className="mt-1 text-sm font-semibold">{user.role}</div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-900 dark:bg-black/40">
                <div className="text-xs font-medium text-zinc-600 dark:text-zinc-300">校区</div>
                <div className="mt-1 text-sm font-semibold">{campusName}</div>
              </div>
            </div>

            <Button variant="secondary" onClick={() => setUserId("u-admin")}>
              切换到超级管理员
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>生产环境建议（Supabase）</CardTitle>
          <CardDescription>把 Demo 的“身份切换”替换为 Supabase Auth + RLS（行级权限）</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-zinc-700 dark:text-zinc-200">
          <div>1. 用户登录后在 crm_user 表中维护 role/campus_id/channelIds 等字段。</div>
          <div>2. 对 lead / follow_up / enrollment / payment 等表开启 RLS，按 role 过滤可见行。</div>
          <div>3. Dashboard、渠道、漏斗等统计建议用 View/RPC 统一计算，避免前端聚合导致越权。</div>
        </CardContent>
      </Card>
    </div>
  );
}
