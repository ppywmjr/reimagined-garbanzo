# Copilot Instructions

## Project overview

Express 5 REST API with Prisma 7 ORM, PostgreSQL (via `@prisma/adapter-pg`), and TypeScript. Auth is handled externally by Clerk — the `clerkUserId` field on `User` is the link between Clerk and the database.

## Architecture

Code is separated into three layers. Keep concerns in their layer:

- **Routes** (`src/routes/`) — parse request params/body, call a service, return JSON. No Prisma imports.
- **Services** (`src/services/`) — all Prisma queries and business logic. No `req`/`res` references.
- **DB** (`src/db.ts`) — single Prisma client instance shared across the app. Import `prisma` from here.

## Prisma workflow

After any change to `prisma/schema.prisma`:

1. `npx prisma migrate dev --name <description>` — creates a migration file and applies it; also regenerates the client.
2. `npx prisma db seed` — optional, resets seed data.

Never run `prisma migrate reset` against production. Use `prisma migrate deploy` in CI/CD.

The generated client is output to `prisma/generated/` — do not edit those files manually.

## Models

```
User
  id          String (UUID)  PK
  clerkUserId String         unique — Clerk user ID
  email       String         unique
  displayName String?
  createdAt   DateTime
  updatedAt   DateTime
```

## Conventions

- Use `async/await` throughout — no `.then()` chains.
- Route handlers should not contain try/catch unless the error response differs per route.
