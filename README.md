# Subscription Management

An Express + Prisma API with PostgreSQL, structured in layers (routes → services → db).

## Prerequisites

- Node.js 22+
- Docker (for the local PostgreSQL instance)
- A `.env` file with `DATABASE_URL` set, e.g.:
  ```
  DATABASE_URL=postgresql://user:password@localhost:5432/mydb
  ```

## Getting started

```bash
# Start the database
docker compose up -d

# Install dependencies
npm ci

# Seed the database with sample data
npx prisma db seed

# Start the development server
npm run dev
```

## Working with Prisma

### Changing the schema

Edit `prisma/schema.prisma`, then:

```bash
# Create a migration and apply it to the local database
# Also regenerates the Prisma client automatically
npx prisma migrate dev --name <short-description>
```

### Regenerating the client only (no schema change)

```bash
npx prisma generate
```

### Seeding the database

```bash
npx prisma db seed
```

The seed script lives at `prisma/seed.ts` and is configured via the `prisma.seed` field in `package.json`.

### Resetting the local database

Drops all tables, re-runs all migrations:

```bash
npx prisma migrate reset
```

> **Warning:** never run this against a production database.

### Inspecting the database

```bash
npx prisma studio
```

Opens a browser-based GUI at `http://localhost:5555`.

### Migrations in production

```bash
npx prisma migrate deploy
```

Applies any pending migrations without prompting. Run this in your CI/CD pipeline. Never delete the `prisma/migrations` folder after changes have been deployed to production.

## Project structure

```
prisma/
  schema.prisma        # Data models
  seed.ts              # Seed script
  migrations/          # Migration history — commit this to git
  generated/           # Generated Prisma client — do not edit manually
src/
  index.ts             # Express app entry point
  db.ts                # Prisma client singleton
  routes/
    userRoutes.ts      # User endpoints
    postRoutes.ts      # Post endpoints
  services/
    userService.ts     # User business logic / DB queries
    postService.ts     # Post business logic / DB queries
```
