# 升学私塾 CRM Demo（内部）

技术栈：Next.js + React + TypeScript + Tailwind CSS + shadcn/ui 风格组件 + Recharts（图表）+ Supabase（预留接入）

## 模块与页面

- /dashboard：首页看板（关键指标 + 渠道/校区/顾问排行 + 漏斗概览）
- /leads：客户线索列表（搜索/筛选/排序）
- /leads/[id]：客户详情（基本信息、跟进记录、报名与缴费、教务交接、任务、合格结果）
- /tasks：任务提醒（今日/逾期/全部待处理）
- /channels：渠道统计（指标表 + 图表）
- /funnel：销售漏斗（阶段人数 + 明细表 + 流失原因汇总）
- /settings/access：权限与身份（Demo：身份切换模拟权限范围）

## 本地运行

在本目录执行：

```bash
npm install
npm run dev -- --port 3005
```

打开：

- http://localhost:3005

## 数据说明

- 当前 Demo 使用本地假数据（src/lib/mock-data.ts），无需数据库即可运行。
- 身份权限为 Demo 模式（src/app/providers.tsx），可在“权限与身份”页面切换角色来观察数据范围变化。

## 接入 Supabase（后续）

1. 创建 Supabase 项目，开启 Database + Auth。
2. 按 `.trae/documents/技术架构-升学私塾CRM.md` 中的 DDL 建表。
3. 增加环境变量（建议在 `.env.local`）：

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

4. 使用 `@supabase/supabase-js` 初始化 client，并把本地 mock repository 替换为 Supabase 查询封装。
5. 开启 RLS（行级权限），按 role/campus_id/owner_id 等字段限制 lead 与相关表的可见范围。
