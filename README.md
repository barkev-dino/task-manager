# Task Manager

Lightweight internal task intake and workload app for employees and managers.

## What it does

1. **Capture** — Paste a messy meeting recap, Slack thread, or hallway note. The app extracts candidate action items with priority and due-date guesses.
2. **Review** — Fill in required fields (team, effort, assignee, due date, priority, status) and save.
3. **My Tasks** — See your tasks grouped by overdue, due today, blocked, and high priority.
4. **Dashboard** — Managers see open effort by person and team, overdue counts, and overload indicators.

## Architecture

```
src/
  app/                 Next.js App Router pages + API routes
    api/extract/       Server extraction endpoint
    auth/callback/     Supabase OAuth callback
    capture/           Task intake flow (Server + Client components)
    dashboard/         Manager workload view (Server Component)
    login/             Auth page (Client Component)
    tasks/             My Tasks Today (Server Component)
  components/          NavBar, TaskCard, TaskForm
  lib/
    supabase/          client.ts (browser) · server.ts (SSR + service role)
    extractor/         types.ts · mock.ts · index.ts (LLM-ready interface)
  types/               Shared TypeScript types
supabase/
  migrations/          001_initial.sql — tables, RLS, views, seed teams
middleware.ts          Route protection
```

**Extraction layer** — v1 uses a deterministic heuristic parser (no LLM). To swap in a real model, implement `ExtractorAdapter` in `src/lib/extractor/openai.ts` and set `EXTRACTOR=openai` in `.env.local`.

## Local Setup

### Prerequisites
- Node.js 20+
- A [Supabase](https://supabase.com) project

### Steps

```bash
# 1. Clone
git clone https://github.com/YOUR_USERNAME/task-manager.git
cd task-manager

# 2. Install
npm install

# 3. Configure env
cp .env.example .env.local
# Fill in your Supabase credentials in .env.local

# 4. Run the database migration
# Open Supabase dashboard → SQL editor → paste supabase/migrations/001_initial.sql → Run

# 5. Enable email auth
# Supabase dashboard → Authentication → Providers → Email → Enable

# 6. Set redirect URLs
# Supabase dashboard → Authentication → URL Configuration
#   Site URL: http://localhost:3000
#   Redirect URLs: http://localhost:3000/auth/callback

# 7. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Where to find it | Required |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard → Settings → API | Yes |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Same page — **anon/public** key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page — **service_role** key (**server only**) | Yes |
| `OPENAI_API_KEY` | OpenAI platform | No (v1 uses mock) |
| `EXTRACTOR` | Set to `openai` to use LLM extractor | No (default: `mock`) |

> **Security note:** `SUPABASE_SERVICE_ROLE_KEY` must never be exposed to the browser. It is used only in server-side API routes.

## Run Commands

```bash
npm run dev          # dev server
npm run build        # production build
npm run start        # production server
npm run lint         # ESLint
npm run typecheck    # TypeScript (tsc --noEmit)
```

## Supabase Setup Details

The migration in `supabase/migrations/001_initial.sql` creates:
- **tables**: `teams`, `profiles`, `tasks`, `intake_events`
- **trigger**: auto-creates a `profiles` row when a user signs up
- **RLS policies**: signed-in users can read all tasks, insert their own, update tasks they own or are assigned to
- **views**: `person_workload`, `team_workload` (used by the dashboard)
- **seed data**: 4 starter teams (Engineering, Product, Design, Operations)

## Current Limitations / Known Gaps

- Extraction uses keyword heuristics only — no LLM in v1
- No inline task editing or status change from the task list (coming next)
- No email notifications on assignment
- No pagination on the dashboard
- No test suite yet
- Manager role is not enforced on the dashboard — any signed-in user can view it
- Profile name is set from email on signup; no profile edit page yet

## Tech Stack

- **Next.js 15** (App Router, TypeScript)
- **Tailwind CSS**
- **Supabase** (Auth + PostgreSQL + RLS)
