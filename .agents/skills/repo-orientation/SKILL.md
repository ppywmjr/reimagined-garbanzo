---
name: repo-orientation
display-name: Repo Orientation
description: Orientation map for the reimagined-garbanzo Express backend: layout, commands, layering rules. Read when starting work here or unsure where code lives.
---

This repo is the Express backend for the video subscription service ("garbanzo").

## Stack

- Node 24, pnpm, TypeScript (ESM), Express 5, Prisma 7 (PostgreSQL; Neon in production), Zod, `@clerk/express`
- Vitest (unit + integration via testcontainers), Stryker mutation testing, tsup build
- Local Postgres: `docker compose up -d`. `.env` needs `DATABASE_URL`; also `INTERNAL_API_SECRET`, `ALLOWED_ORIGIN` (CORS, enforced only outside dev/staging), Clerk keys
- Handy: `npx prisma studio` (browser DB GUI)

## Commands

<!-- AUTO:COMMANDS:BEGIN -->
- `pnpm dev` → `tsx src/index.ts`
- `pnpm clean` → `rm -rf dist`
- `pnpm clean:railpack` → `rm -rf dist && rm -rf prisma/generated`
- `pnpm build` → `npm run clean && tsup`
- `pnpm build:railpack` → `npm run clean:railpack && npx prisma generate && tsup`
- `pnpm start` → `node dist/index.cjs`
- `pnpm test` → `vitest run`
- `pnpm coverage` → `vitest run --coverage`
- `pnpm mutate` → `stryker run`
- `pnpm mutate:baseline` → `tsx scripts/update-mutation-baseline.ts`
- `pnpm mutate:compare` → `tsx scripts/compare-mutation-score.ts`
- `pnpm ai:test:all` → `vitest run tests 2>&1 | tail -100`
- `pnpm ai:test:unit` → `vitest run tests/unit 2>&1 | tail -100`
- `pnpm ai:test:unit:verbose:fail` → `pnpm vitest run tests/unit --reporter=verbose 2>&1 | grep -A 30 "FAIL"`
- `pnpm ai:coverage` → `vitest run --coverage 2>&1 | tail -100`
- `pnpm ai:mutate` → `stryker run 2>&1 | tail -100`
- `pnpm ai:mutate:survived` → `pnpm run mutate 2>&1 | grep -A 5 "\[Survived\]"`
- `pnpm db-seed` → `prisma db seed`
<!-- AUTO:COMMANDS:END -->

Prefer the `ai:*` scripts when running from an agent: they truncate output to keep agent context small.

## Layout

- `src/index.ts` — entry: env parsing, DB connectivity check, graceful shutdown
- `src/app.ts` — Express app. Middleware order: logger → raw-body routes (MUST be registered before `express.json()`) → `express.json({ limit: '100kb' })` → `/health` → `internalApiKey` → `clerkMiddleware` → route files
- `src/routes/` — parse/validate with Zod, call services, return JSON. **No Prisma imports allowed.**
- `src/services/` — ALL business logic and ALL DB access, via `getPrismaClient()`. **No req/res.**
- `src/lib/` — shared: Prisma client singleton, auth helper, validation, subscription filtering
- `src/middleware/` — `internalApiKey` (checks `x-internal-api-key` header), `logger`
- `prisma/` — `schema.prisma`, `seed.ts`, `migrations/` (`generated/` is gitignored)
- `tests/` — `unit/`, `integration/` (testcontainers Postgres), `helpers/`, `setup.ts`
- `bruno/` — API request collection for manual testing

### Current files

<!-- AUTO:SRC:BEGIN -->
- `src/lib/` — auth-helper.ts, prisma.ts, subscriptionFilter.ts, validate.ts
- `src/middleware/` — internalApiKey.ts, logger.ts
- `src/routes/` — courseRoutes.ts, meRoutes.ts, planRoutes.ts, userRoutes.ts
- `src/services/` — activationCodeService.ts, courseService.ts, planService.ts, userCoursesService.ts, userService.ts, userSubscriptionService.ts, userVideoService.ts
- `src/app.ts`
- `src/index.ts`
<!-- AUTO:SRC:END -->

### Data model

<!-- AUTO:PRISMA:BEGIN -->
- models: User, Plan, Course, PlanCourse, Video, CourseVideo, UserVideoProgress, Subscription, ActivationCode, WebhookEvent
- enums: BillingInterval, SubscriptionStatus, WebhookStatus
<!-- AUTO:PRISMA:END -->

Prices are stored in pence; access checks combine subscription `status` with `currentPeriodEnd` (access continues until the period ends after cancellation).

## Documentation

<!-- AUTO:DOCS:BEGIN -->
- `docs/api/flows/signup.md`
- `docs/api/flows/subscription_flow.md`
- `docs/api/flows/video_progress.md`
- `docs/api/openapi.yaml`
- `docs/api/overview.md`
- `docs/api/README.md`
- `docs/api/routes/courses.md`
- `docs/api/routes/me.md`
- `docs/api/routes/plans.md`
- `docs/api/routes/users.md`
- `docs/architecture.md`
- `docs/database/migrations.md`
- `docs/database/schema.md`
- `docs/mutation-baseline.json`
- `docs/mutation-testing.md`
- `docs/README.md`
<!-- AUTO:DOCS:END -->

Start with `docs/architecture.md` (layering and request flow).

## Working style

Search (`search_file_line`/`find_files`) before reading files; read line windows rather than whole files. Never edit or rely on build artifacts (`dist/`, `coverage/`, `reports/`, `prisma/generated/`) — all gitignored.

## Maintenance

- The `<!-- AUTO:* -->` sections above are **generated** by `scripts/update-orientation.mjs`, run automatically by `git-hooks/post-commit` after commits that touch `package.json`, `src/`, `prisma/`, or `docs/` (auto-committed when changed). Never hand-edit text between AUTO markers; regenerate instead.
- If you make a change that makes a **hand-written** section above stale (stack, conventions, rules), update that section in the same session and include it in your commit.
- New clones must run `git config core.hooksPath git-hooks` once to enable the automatic refresh.
