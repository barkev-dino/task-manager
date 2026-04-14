# Task Manager — Build TODO

## Status: In Progress

### Phase 1 — Scaffold ✅
- [x] package.json, tsconfig, next.config, tailwind, postcss, eslint
- [x] TODO.md, CLAUDE.md

### Phase 2 — Core Types & Infrastructure ✅
- [x] src/types/index.ts
- [x] src/lib/supabase/client.ts
- [x] src/lib/supabase/server.ts
- [x] src/lib/extractor/types.ts
- [x] src/lib/extractor/mock.ts
- [x] src/lib/extractor/index.ts

### Phase 3 — Database ✅
- [x] supabase/migrations/001_initial.sql

### Phase 4 — App Pages ✅
- [x] src/app/layout.tsx
- [x] src/app/page.tsx (landing)
- [x] src/app/login/page.tsx
- [x] src/app/capture/page.tsx
- [x] src/app/tasks/page.tsx
- [x] src/app/dashboard/page.tsx
- [x] src/app/api/extract/route.ts

### Phase 5 — Components ✅
- [x] src/components/NavBar.tsx
- [x] src/components/TaskCard.tsx
- [x] src/components/TaskForm.tsx

### Phase 6 — Auth & Middleware ✅
- [x] middleware.ts
- [x] src/app/auth/callback/route.ts

### Phase 7 — Repo & CI ✅
- [x] .env.example
- [x] .gitignore
- [x] README.md
- [x] CLAUDE.md
- [x] .github/workflows/ci.yml
- [x] Git init, commit, push

## Known Gaps / Next Steps
- Replace mock extractor with real LLM (OpenAI adapter ready to wire in)
- Add team management UI
- Add task editing / status updates inline
- Email notifications
- Pagination on dashboard
- Tests
