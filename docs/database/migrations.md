# Database Migrations

## Prisma Migration Workflow

This project uses Prisma migrations to manage database schema changes.

### Prerequisites

- PostgreSQL running (via Docker or external)
- `DATABASE_URL` environment variable set
- Prisma CLI installed: `pnpm add -D prisma`

### Creating a Migration

1. **Update the schema** in `prisma/schema.prisma`

2. **Create and apply migration**:
   ```bash
   npx prisma migrate dev --name <description>
   ```

   This command:
   - Creates a migration file in `prisma/migrations/<timestamp>-<description>/`
   - Applies the migration to your database
   - Regenerates the Prisma client

3. **Review generated files**:
   - Migration SQL: `prisma/migrations/<timestamp>-<description>/migration.sql`
   - Regenerated client: `prisma/generated/client.ts`

### Common Migration Scenarios

#### Adding a New Model
```prisma
model Product {
  id    String @id @default(uuid())
  name  String
}
```

#### Adding a Field to Existing Model
```prisma
model User {
  id          String   @id @default(uuid())
  email       String   @unique
  phoneNumber String?  // ← Added field
}
```

#### Creating a Many-to-Many Relationship
```prisma
model User {
  id       String   @id @default(uuid())
  roles    UserRole[]
}

model Role {
  id    String   @id @default(uuid())
  users UserRole[]
}

model UserRole {
  userId String @map("user_id")
  roleId String @map("role_id")
  user   User   @relation(fields: [userId], references: [id])
  role   Role   @relation(fields: [roleId], references: [id])
  
  @@id([userId, roleId])
}
```

### Rolling Back a Migration

**Warning**: This will delete data! Use only in development.

```bash
# Roll back the last migration
npx prisma migrate resolve --rolled-back <migration-name>

# Or reset entire database (destructive!)
npx prisma migrate reset
```

### Production Migrations

For production environments, use `prisma migrate deploy`:

```bash
# Apply pending migrations to production database
npx prisma migrate deploy
```

This command:
- Checks the migration history in the database
- Applies any pending migrations
- Does NOT prompt for confirmation (safe for CI/CD)

### Migration Files Structure

```
prisma/
├── migrations/
│   ├── migration_lock.toml           # Lock file for migrations
│   └── <timestamp>-<description>/
│       ├── migration.sql             # SQL to apply
│       └── README.md                 # Optional description
```

### Migration Lock File

The `migration_lock.toml` file tracks applied migrations. **Do not edit manually**.

### Troubleshooting

#### Migration Already Applied
```
Error: P1009: Migration '<name>' was not applied to the database
```
**Solution**: Mark as applied without running:
```bash
npx prisma migrate resolve --applied <migration-name>
```

#### Database Schema Mismatch
```
Error: P3006: Migration failed to apply cleanly
```
**Solution**: Reset database in development:
```bash
npx prisma migrate reset
```

#### Cannot Drop Column (foreign key constraint)
```sql
-- migration.sql
ALTER TABLE "users" DROP COLUMN "old_field";
-- Error: cannot drop column because of foreign key
```
**Solution**: Drop foreign key first, then column:
```sql
ALTER TABLE "users" DROP CONSTRAINT "users_old_field_fkey";
ALTER TABLE "users" DROP COLUMN "old_field";
```

### Best Practices

1. **Name migrations descriptively**: `add_user_phone_number`, `create_subscription_model`
2. **Test migrations locally** before deploying to production
3. **Use `prisma migrate deploy` in CI/CD**, never `prisma migrate reset`
4. **Keep migrations small** - one change per migration when possible
5. **Backup production database** before running migrations

### Regenerating Prisma Client (No Schema Change)

If the generated client becomes out of sync:
```bash
npx prisma generate
```

This regenerates the client without creating a migration.