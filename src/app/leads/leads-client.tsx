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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { db } from "@/lib/mock-data";
import { filterLeadsByAccess } from "@/lib/access";
import { DEMO_NOW } from "@/lib/demo-clock";
import type { CustomerLevel, Lead, LeadStatus, TargetTrack } from "@/lib/types";
import { useDemoAccess } from "@/app/providers";
import { cn } from "@/lib/utils";
import { normalizeWechat, useDemoLeads } from "@/lib/demo-leads";

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
const tracks: TargetTrack[] = ["学部", "大学院", "美术", "就职", "日语", "其他"];
const countries: Lead["locationCountry"][] = ["中国", "日本"];

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (inQuotes) {
      if (ch === '"') {
        const next = text[i + 1];
        if (next === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    if (ch === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (ch === "\n") {
      row.push(field);
      field = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
      continue;
    }

    if (ch === "\r") continue;
    field += ch;
  }
  row.push(field);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

function normHeader(value: string) {
  return value.trim().toLowerCase().replaceAll(" ", "");
}

function pickCell(row: string[], idx: number | undefined) {
  if (idx === undefined) return "";
  return row[idx] ?? "";
}

function mapById<T extends { id: string }>(items: T[]) {
  const m = new Map<string, T>();
  for (const it of items) m.set(it.id, it);
  return m;
}

export default function LeadsClient({ seedQuery }: { seedQuery: string }) {
  const { user } = useDemoAccess();
  const router = useRouter();
  const { leads, replaceLeads, findByWechat } = useDemoLeads(db.leads);

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

  const accessibleLeads = React.useMemo(() => filterLeadsByAccess({ user }, leads), [leads, user]);

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

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [importOpen, setImportOpen] = React.useState(false);
  const [importResult, setImportResult] = React.useState<{ added: number; skippedDup: number; skippedInvalid: number } | null>(null);
  const [importError, setImportError] = React.useState<string>("");

  const [createOpen, setCreateOpen] = React.useState(false);
  const [studentName, setStudentName] = React.useState("");
  const [wechat, setWechat] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [locationCountry, setLocationCountry] = React.useState<Lead["locationCountry"]>("中国");
  const [targetTrack, setTargetTrack] = React.useState<TargetTrack>("大学院");
  const [createCampusId, setCreateCampusId] = React.useState<string>(user.campusId ?? db.campuses[0]!.id);
  const [createChannelId, setCreateChannelId] = React.useState<string>(db.channels[0]!.id);
  const [createOwnerId, setCreateOwnerId] = React.useState<string>(user.id);
  const [createLevel, setCreateLevel] = React.useState<CustomerLevel>("B");
  const [createStatus, setCreateStatus] = React.useState<LeadStatus>("新线索");
  const [createError, setCreateError] = React.useState("");

  const duplicateLead = React.useMemo(() => findByWechat(wechat), [findByWechat, wechat]);

  const resetCreate = React.useCallback(() => {
    setStudentName("");
    setWechat("");
    setPhone("");
    setEmail("");
    setLocationCountry("中国");
    setTargetTrack("大学院");
    setCreateCampusId(user.campusId ?? db.campuses[0]!.id);
    setCreateChannelId(db.channels[0]!.id);
    setCreateOwnerId(user.id);
    setCreateLevel("B");
    setCreateStatus("新线索");
    setCreateError("");
  }, [user.campusId, user.id]);

  const submitCreate = () => {
    setCreateError("");
    const w = wechat.trim();
    if (!w) {
      setCreateError("微信号不能为空");
      return;
    }
    if (duplicateLead) {
      setCreateError(`微信号已存在：${duplicateLead.studentName}（${duplicateLead.id}）`);
      return;
    }
    const now = new Date().toISOString();
    const created: Lead = {
      id: `l-${crypto.randomUUID()}`,
      studentName: studentName.trim() || "未命名",
      wechat: w,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      locationCountry,
      locationCity: "",
      currentSchool: "",
      currentGrade: "",
      targetTrack,
      targetYear: undefined,
      targetSchool: "",
      targetMajor: "",
      japaneseLevel: "",
      englishLevel: "",
      ejuScore: "",
      toeflToeicScore: "",
      budget: undefined,
      channelId: createChannelId,
      campusId: createCampusId,
      ownerId: createOwnerId,
      customerLevel: createLevel,
      status: createStatus,
      tagIds: [],
      notes: "",
      nextFollowUpAt: undefined,
      createdAt: now,
      updatedAt: now,
    };
    replaceLeads([created, ...leads]);
    setCreateOpen(false);
    resetCreate();
    router.push(`/leads/${created.id}`);
  };

  const onImportFile = async (file: File) => {
    setImportError("");
    setImportResult(null);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (rows.length < 2) {
        setImportError("CSV 内容为空或没有数据行");
        return;
      }

      const headers = rows[0]!.map((h) => normHeader(h));
      const headerIndex = new Map<string, number>();
      for (let i = 0; i < headers.length; i++) headerIndex.set(headers[i]!, i);

      const pickIndex = (candidates: string[]) => {
        for (const c of candidates) {
          const idx = headerIndex.get(normHeader(c));
          if (idx !== undefined) return idx;
        }
        return undefined;
      };

      const idxWechat = pickIndex(["wechat", "微信", "微信号", "微信id", "微信ID", "wx"]);
      const idxName = pickIndex(["studentname", "学生姓名", "姓名", "name"]);
      const idxPhone = pickIndex(["phone", "手机", "手机号", "电话"]);
      const idxEmail = pickIndex(["email", "邮箱"]);
      const idxCampus = pickIndex(["campus", "校区"]);
      const idxChannel = pickIndex(["channel", "渠道"]);
      const idxOwner = pickIndex(["owner", "顾问", "负责顾问"]);
      const idxTrack = pickIndex(["targettrack", "方向", "申请方向", "赛道"]);
      const idxCountry = pickIndex(["locationcountry", "国家", "所在国家"]);

      if (idxWechat === undefined) {
        setImportError("缺少必需列：微信号（wechat/微信/微信号/wx）");
        return;
      }

      const now = new Date().toISOString();
      const campusByName = new Map(db.campuses.map((c) => [c.name, c.id] as const));
      const channelByName = new Map(db.channels.map((c) => [c.name, c.id] as const));
      const userByName = new Map(db.users.map((u) => [u.name, u.id] as const));

      let added = 0;
      let skippedDup = 0;
      let skippedInvalid = 0;
      const nextLeads: Lead[] = [...leads];
      const seenWechat = new Set(nextLeads.map((l) => normalizeWechat(l.wechat)));

      for (let r = 1; r < rows.length; r++) {
        const row = rows[r]!;
        const wechat = pickCell(row, idxWechat).trim();
        if (!wechat) {
          skippedInvalid++;
          continue;
        }
        const wechatKey = normalizeWechat(wechat);
        if (!wechatKey || seenWechat.has(wechatKey)) {
          skippedDup++;
          continue;
        }
        seenWechat.add(wechatKey);

        const studentName = pickCell(row, idxName).trim() || "未命名";
        const phone = pickCell(row, idxPhone).trim() || undefined;
        const email = pickCell(row, idxEmail).trim() || undefined;

        const campusName = pickCell(row, idxCampus).trim();
        const channelName = pickCell(row, idxChannel).trim();
        const ownerName = pickCell(row, idxOwner).trim();
        const trackRaw = pickCell(row, idxTrack).trim();
        const countryRaw = pickCell(row, idxCountry).trim();

        const campusId = campusByName.get(campusName) ?? user.campusId ?? db.campuses[0]!.id;
        const channelId = channelByName.get(channelName) ?? db.channels[0]!.id;
        const ownerId = userByName.get(ownerName) ?? user.id ?? db.users[0]!.id;
        const targetTrack = tracks.includes(trackRaw as TargetTrack) ? (trackRaw as TargetTrack) : "大学院";
        const locationCountry = countries.includes(countryRaw as Lead["locationCountry"])
          ? (countryRaw as Lead["locationCountry"])
          : "中国";

        const created: Lead = {
          id: `l-${crypto.randomUUID()}`,
          studentName,
          wechat,
          phone,
          email,
          locationCountry,
          locationCity: "",
          currentSchool: "",
          currentGrade: "",
          targetTrack,
          targetYear: undefined,
          targetSchool: "",
          targetMajor: "",
          japaneseLevel: "",
          englishLevel: "",
          ejuScore: "",
          toeflToeicScore: "",
          budget: undefined,
          channelId,
          campusId,
          ownerId,
          customerLevel: "B",
          status: "新线索",
          tagIds: [],
          notes: "",
          nextFollowUpAt: undefined,
          createdAt: now,
          updatedAt: now,
        };

        nextLeads.unshift(created);
        added++;
      }

      replaceLeads(nextLeads);
      setImportResult({ added, skippedDup, skippedInvalid });
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "导入失败");
    }
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
          <Dialog open={createOpen} onOpenChange={(v) => (setCreateOpen(v), v ? null : resetCreate())}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  setCreateError("");
                }}
              >
                新增线索
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>新增线索</DialogTitle>
                <DialogDescription>录入微信号后会即时查重，重复则禁止提交。</DialogDescription>
              </DialogHeader>

              <div className="mt-4 grid gap-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="grid gap-2">
                    <div className="text-sm font-medium">学生姓名</div>
                    <Input value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="可选" />
                  </div>
                  <div className="grid gap-2">
                    <div className="text-sm font-medium">微信号</div>
                    <Input value={wechat} onChange={(e) => setWechat(e.target.value)} placeholder="必填" />
                    {wechat.trim() && duplicateLead ? (
                      <div className="text-sm text-rose-700 dark:text-rose-400">
                        已存在：{duplicateLead.studentName}（{duplicateLead.id}）
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="grid gap-2">
                    <div className="text-sm font-medium">手机</div>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="可选" />
                  </div>
                  <div className="grid gap-2">
                    <div className="text-sm font-medium">邮箱</div>
                    <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="可选" />
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="grid gap-2">
                    <div className="text-sm font-medium">所在国家</div>
                    <Select value={locationCountry} onValueChange={(v) => setLocationCountry(v as Lead["locationCountry"])}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <div className="text-sm font-medium">申请方向</div>
                    <Select value={targetTrack} onValueChange={(v) => setTargetTrack(v as TargetTrack)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {tracks.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="grid gap-2">
                    <div className="text-sm font-medium">校区</div>
                    <Select value={createCampusId} onValueChange={setCreateCampusId}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {db.campuses.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <div className="text-sm font-medium">渠道</div>
                    <Select value={createChannelId} onValueChange={setCreateChannelId}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {db.channels.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="grid gap-2">
                    <div className="text-sm font-medium">负责顾问</div>
                    <Select value={createOwnerId} onValueChange={setCreateOwnerId}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
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
                  <div className="grid gap-2">
                    <div className="text-sm font-medium">客户等级</div>
                    <Select value={createLevel} onValueChange={(v) => setCreateLevel(v as CustomerLevel)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {levels.map((l) => (
                          <SelectItem key={l} value={l}>
                            {l}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-2">
                  <div className="text-sm font-medium">当前状态</div>
                  <Select value={createStatus} onValueChange={(v) => setCreateStatus(v as LeadStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {createError ? <div className="text-sm text-rose-700 dark:text-rose-400">{createError}</div> : null}
              </div>

              <DialogFooter>
                <Button variant="secondary" onClick={() => setCreateOpen(false)}>
                  取消
                </Button>
                <Button onClick={submitCreate} disabled={!!duplicateLead || !wechat.trim()}>
                  保存
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={importOpen} onOpenChange={setImportOpen}>
            <DialogTrigger asChild>
              <Button
                variant="secondary"
                onClick={() => {
                  setImportError("");
                  setImportResult(null);
                }}
              >
                导入 CSV
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>导入线索（CSV）</DialogTitle>
                <DialogDescription>以“微信号”作为唯一查重字段；重复行会被跳过。</DialogDescription>
              </DialogHeader>

              <div className="mt-4 grid gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    onImportFile(f);
                    e.target.value = "";
                  }}
                />
                <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                  选择 CSV 文件
                </Button>
                {importError ? <div className="text-sm text-rose-700 dark:text-rose-400">{importError}</div> : null}
                {importResult ? (
                  <div className="grid gap-1 text-sm text-zinc-600 dark:text-zinc-300">
                    <div>新增：{importResult.added} 条</div>
                    <div>重复跳过：{importResult.skippedDup} 条</div>
                    <div>无微信号跳过：{importResult.skippedInvalid} 条</div>
                  </div>
                ) : null}
              </div>

              <DialogFooter>
                <Button variant="secondary" onClick={() => setImportOpen(false)}>
                  关闭
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
