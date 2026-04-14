-- ============================================================
-- Migration 003: Add sort_order to tasks
-- Enables within-column ranking on the kanban board.
-- ============================================================

alter table public.tasks
  add column if not exists sort_order float8
  not null default extract(epoch from now());

-- Backfill existing rows so their order matches creation time
update public.tasks
  set sort_order = extract(epoch from created_at)
  where sort_order = 0;

-- Index speeds up the ORDER BY sort_order in the kanban query
create index if not exists tasks_sort_order_idx on public.tasks(sort_order);
