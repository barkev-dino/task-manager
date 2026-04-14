-- ============================================================
-- Task Manager — Migration 002: Task Comments
-- ============================================================

create table if not exists public.task_comments (
  id         uuid primary key default uuid_generate_v4(),
  task_id    uuid not null references public.tasks(id) on delete cascade,
  author_id  uuid references public.profiles(id) on delete set null,
  body       text not null check (char_length(body) > 0),
  created_at timestamptz not null default now()
);

create index if not exists task_comments_task_id_idx on public.task_comments(task_id);

alter table public.task_comments enable row level security;

drop policy if exists "task_comments: signed-in read"   on public.task_comments;
drop policy if exists "task_comments: own insert"        on public.task_comments;
drop policy if exists "task_comments: own delete"        on public.task_comments;

-- Any authenticated user can read comments on tasks they can already see
create policy "task_comments: signed-in read" on public.task_comments
  for select to authenticated using (true);

create policy "task_comments: own insert" on public.task_comments
  for insert to authenticated with check (author_id = auth.uid());

create policy "task_comments: own delete" on public.task_comments
  for delete to authenticated using (author_id = auth.uid());
