# CLAUDE.md — Task Manager

## Project Summary
Lightweight internal task intake and workload app. Employees paste messy conversation text; the app extracts candidate tasks, fills required fields, and saves them. Managers get a workload dashboard.

## Commands
```bash
npm install          # install deps
npm run dev          # dev server on http://localhost:3000
npm run build        # production build
npm run lint         # eslint check
npm run typecheck    # tsc --noEmit
```

## Folder Structure
```
src/
  app/               # Next.js App Router pages & API routes
    api/extract/     # Server-side extraction endpoint
    auth/callback/   # Supabase OAuth callback
    capture/         # Task intake flow
    dashboard/       # Manager workload view
    login/           # Auth page
    tasks/           # My Tasks Today
  components/        # Reusable React components
  lib/
    supabase/        # Supabase client (browser + server)
    extractor/       # Extraction layer (mock v1, LLM-ready interface)
  types/             # Shared TypeScript types
supabase/
  migrations/        # SQL migrations (run via Supabase dashboard or CLI)
```

## Architecture Notes

### Extraction Layer
The extractor lives in `src/lib/extractor/`. The public interface is `ExtractorAdapter` in `types.ts`. The mock implementation (`mock.ts`) uses simple regex/keyword heuristics. To plug in a real LLM:
1. Create `src/lib/extractor/openai.ts` implementing `ExtractorAdapter`
2. Update `src/lib/extractor/index.ts` to export it based on env
3. No UI changes required

### Auth
- Supabase email auth via `@supabase/ssr`
- `middleware.ts` protects `/capture`, `/tasks`, `/dashboard`
- `profiles` table auto-created via database trigger on `auth.users` insert

### Data Flow
```
User pastes text
  → POST /api/extract (server action, calls extractor)
  → Returns CandidateTask[]
  → User reviews / fills missing fields in TaskForm cards
  → Save calls Supabase insert directly from client (RLS protected)
```

### Supabase Setup
- Run `supabase/migrations/001_initial.sql` in Supabase SQL editor
- Enable Email auth in Supabase dashboard → Authentication → Providers
- Set Site URL and Redirect URLs in Supabase Auth settings

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=          # your project URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=  # anon/publishable key (safe for browser)
SUPABASE_SERVICE_ROLE_KEY=         # service role key — server only, never exposed to browser
OPENAI_API_KEY=                    # optional, for future LLM extractor
```

## Conventions
- TypeScript strict mode throughout
- Tailwind for all styling — no CSS modules
- Server Components by default; add `"use client"` only when needed
- Supabase `server.ts` for server components/routes; `client.ts` (createBrowserClient) for client components
- Never import `server.ts` in client components
- All privileged operations (service role key) stay in API routes or Server Actions

## Next Iteration Ideas
- Replace mock extractor with OpenAI structured output
- Add task editing, comments, status transitions
- Slack / email notifications on assignment
- Recurring tasks
- Export to CSV
- Mobile-responsive polish
- E2E tests with Playwright
