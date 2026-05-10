create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null,
  campus_id text not null,
  channel_ids text[] not null default '{}'::text[],
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  student_name text not null,
  wechat text,
  phone text,
  email text,
  location_country text not null,
  location_city text,
  current_school text,
  current_grade text,
  target_track text not null,
  target_year int,
  target_school text,
  target_major text,
  japanese_level text,
  english_level text,
  eju_score text,
  toefl_toeic_score text,
  budget int,
  channel_id text not null,
  campus_id text not null,
  owner_id uuid references public.profiles(id),
  customer_level text not null,
  status text not null,
  tag_ids text[] not null default '{}'::text[],
  notes text,
  next_follow_up_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists leads_wechat_unique on public.leads (lower(trim(wechat))) where wechat is not null and trim(wechat) <> '';

create table if not exists public.followups (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  follow_up_at timestamptz not null,
  method text not null,
  content text not null,
  feedback text,
  next_action text,
  next_follow_up_at timestamptz,
  operator_id uuid not null references public.profiles(id),
  level_change_from text,
  level_change_to text,
  status_change_from text,
  status_change_to text,
  created_at timestamptz not null default now()
);

create table if not exists public.crm_tasks (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete set null,
  assignee_id uuid not null references public.profiles(id),
  type text not null,
  title text not null,
  status text not null default '待处理',
  due_at timestamptz,
  done_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.leads enable row level security;
alter table public.followups enable row level security;
alter table public.crm_tasks enable row level security;

create policy "profiles_read" on public.profiles for select to authenticated using (true);
create policy "profiles_write_self" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy "leads_read" on public.leads for select to authenticated using (true);
create policy "leads_write" on public.leads for insert to authenticated with check (true);
create policy "leads_update" on public.leads for update to authenticated using (true) with check (true);
create policy "leads_delete" on public.leads for delete to authenticated using (true);

create policy "followups_read" on public.followups for select to authenticated using (true);
create policy "followups_write" on public.followups for insert to authenticated with check (true);
create policy "followups_update" on public.followups for update to authenticated using (true) with check (true);
create policy "followups_delete" on public.followups for delete to authenticated using (true);

create policy "tasks_read" on public.crm_tasks for select to authenticated using (true);
create policy "tasks_write" on public.crm_tasks for insert to authenticated with check (true);
create policy "tasks_update" on public.crm_tasks for update to authenticated using (true) with check (true);
create policy "tasks_delete" on public.crm_tasks for delete to authenticated using (true);

