# Copilot Instructions

## Project overview

Express 5 REST API with Prisma 7 ORM, PostgreSQL, and TypeScript. Auth is handled by Clerk (`clerkUserId` links to `User`).

**Note:** For a comprehensive overview of the application's architecture, tech stack, and documentation structure, always consult `docs/README.md`.

## Architecture

Follow the layered architecture (Routes → Services → DB). See `docs/architecture.md` for details.
- **Routes** (`src/routes/`): No Prisma imports.
- **Services** (`src/services/`): No `req`/`res` references.
- **DB** (`src/db.ts`): Import `prisma` from here.

## Prisma database workflow

See `docs/database/migrations.md` for the full workflow.
- Use `npx prisma migrate dev` for local changes.
- Use `npx prisma migrate deploy` in CI/CD.
- Never run `prisma migrate reset` against production.
- Do not edit files in `prisma/generated/` manually.

## Conventions

- Use `async/await` throughout — no `.then()` chains.
- Route handlers should not contain try/catch unless the error response differs per route.
- All request body and path values must be `safeParsed` by Zod.