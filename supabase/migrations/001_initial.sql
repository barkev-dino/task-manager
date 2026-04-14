-- ============================================================
-- Task Manager — Initial Schema
-- Idempotent: safe to re-run; drops and recreates all objects.
-- ============================================================

-- ─── Extensions ──────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Enum types ──────────────────────────────────────────────
-- Drop and recreate so re-runs always have the full value set.
drop type if exists task_status   cascade;
drop type if exists task_priority cascade;
drop type if exists source_type   cascade;
drop type if exists user_role     cascade;

create type task_status   as enum ('todo','in_progress','blocked','done','cancelled');
create type task_priority as enum ('low','medium','high','urgent');
create type source_type   as enum ('paste','manual','api');
create type user_role     as enum ('member','manager','admin');

-- ─── Teams ───────────────────────────────────────────────────
create table if not exists public.teams (
  id                              uuid primary key default uuid_generate_v4(),
  name                            text not null,
  manager_name                    text,
  manager_email                   text,
  default_capacity_hours_per_week numeric(5,1) not null default 40,
  created_at                      timestamptz not null default now()
);

-- ─── Profiles ────────────────────────────────────────────────
create table if not exists public.profiles (
  id                       uuid primary key references auth.users(id) on delete cascade,
  email                    text not null,
  full_name                text,
  team_id                  uuid references public.teams(id) on delete set null,
  role                     user_role not null default 'member',
  capacity_hours_per_week  numeric(5,1) not null default 40,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

-- Auto-create a profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── Tasks ───────────────────────────────────────────────────
create table if not exists public.tasks (
  id                      uuid primary key default uuid_generate_v4(),
  title                   text not null,
  description             text,
  assignee_id             uuid references public.profiles(id) on delete set null,
  requester_id            uuid references public.profiles(id) on delete set null,
  team_id                 uuid references public.teams(id) on delete set null,
  department              text,
  project                 text,
  status                  task_status not null default 'todo',
  priority                task_priority not null default 'medium',
  due_date                date,
  estimated_effort_hours  numeric(6,1),
  source_type             source_type not null default 'manual',
  source_text             text,
  confidence              numeric(4,3) check (confidence between 0 and 1),
  is_blocked              boolean not null default false,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- Keep updated_at current
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tasks_updated_at on public.tasks;
create trigger tasks_updated_at
  before update on public.tasks
  for each row execute procedure public.touch_updated_at();

-- ─── Intake Events ────────────────────────────────────────────
create table if not exists public.intake_events (
  id                    uuid primary key default uuid_generate_v4(),
  submitted_by          uuid references public.profiles(id) on delete set null,
  raw_text              text not null,
  source_type           source_type not null default 'paste',
  extracted_task_count  integer not null default 0,
  created_at            timestamptz not null default now()
);

-- ─── RLS Policies ────────────────────────────────────────────
alter table public.teams         enable row level security;
alter table public.profiles      enable row level security;
alter table public.tasks         enable row level security;
alter table public.intake_events enable row level security;

-- Drop policies before recreating (idempotent)
drop policy if exists "teams: signed-in read"              on public.teams;
drop policy if exists "profiles: signed-in read"           on public.profiles;
drop policy if exists "profiles: own update"               on public.profiles;
drop policy if exists "tasks: signed-in read"              on public.tasks;
drop policy if exists "tasks: signed-in insert"            on public.tasks;
drop policy if exists "tasks: owner or assignee update"    on public.tasks;
drop policy if exists "intake_events: own read"            on public.intake_events;
drop policy if exists "intake_events: own insert"          on public.intake_events;

create policy "teams: signed-in read" on public.teams
  for select to authenticated using (true);

create policy "profiles: signed-in read" on public.profiles
  for select to authenticated using (true);

create policy "profiles: own update" on public.profiles
  for update to authenticated using (auth.uid() = id);

create policy "tasks: signed-in read" on public.tasks
  for select to authenticated using (true);

create policy "tasks: signed-in insert" on public.tasks
  for insert to authenticated with check (requester_id = auth.uid());

create policy "tasks: owner or assignee update" on public.tasks
  for update to authenticated
  using (requester_id = auth.uid() or assignee_id = auth.uid());

create policy "intake_events: own read" on public.intake_events
  for select to authenticated using (submitted_by = auth.uid());

create policy "intake_events: own insert" on public.intake_events
  for insert to authenticated with check (submitted_by = auth.uid());

-- ─── Workload Views ───────────────────────────────────────────
create or replace view public.person_workload as
select
  p.id                                                                    as assignee_id,
  p.full_name,
  p.email,
  t.name                                                                  as team_name,
  count(tk.id)                                                            as open_tasks,
  coalesce(sum(tk.estimated_effort_hours), 0)                            as open_effort_hours,
  p.capacity_hours_per_week,
  count(tk.id) filter (
    where tk.due_date < current_date
      and tk.status not in ('done'::task_status, 'cancelled'::task_status)
  )                                                                       as overdue_tasks
from public.profiles p
left join public.teams t on t.id = p.team_id
left join public.tasks tk
  on  tk.assignee_id = p.id
  and tk.status not in ('done'::task_status, 'cancelled'::task_status)
group by p.id, p.full_name, p.email, t.name, p.capacity_hours_per_week;

create or replace view public.team_workload as
select
  t.id                                                                          as team_id,
  t.name                                                                        as team_name,
  count(tk.id)                                                                  as open_tasks,
  coalesce(sum(tk.estimated_effort_hours), 0)                                  as open_effort_hours,
  coalesce(sum(p.capacity_hours_per_week), t.default_capacity_hours_per_week)  as total_capacity_hours,
  count(tk.id) filter (
    where tk.due_date < current_date
      and tk.status not in ('done'::task_status, 'cancelled'::task_status)
  )                                                                             as overdue_tasks,
  count(tk.id) filter (
    where tk.assignee_id is null
      and tk.priority in ('high'::task_priority, 'urgent'::task_priority)
      and tk.status not in ('done'::task_status, 'cancelled'::task_status)
  )                                                                             as unassigned_urgent_tasks
from public.teams t
left join public.profiles p on p.team_id = t.id
left join public.tasks tk
  on  tk.team_id = t.id
  and tk.status not in ('done'::task_status, 'cancelled'::task_status)
group by t.id, t.name, t.default_capacity_hours_per_week;

-- ─── Seed Data ───────────────────────────────────────────────
insert into public.teams (id, name, manager_name, manager_email, default_capacity_hours_per_week) values
  ('00000000-0000-0000-0000-000000000001', 'Engineering',  'Alex Rivera',  'alex@company.com',   160),
  ('00000000-0000-0000-0000-000000000002', 'Product',      'Jamie Lee',    'jamie@company.com',   80),
  ('00000000-0000-0000-0000-000000000003', 'Design',       'Morgan Chen',  'morgan@company.com',  40),
  ('00000000-0000-0000-0000-000000000004', 'Operations',   'Taylor Singh', 'taylor@company.com',  80)
on conflict (id) do nothing;
