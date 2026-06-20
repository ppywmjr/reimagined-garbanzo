# Subscription Management

An Express + Prisma API with PostgreSQL, structured in layers (routes → services → db).

## Prerequisites

- Node.js 24+
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
pnpm install

# Seed the database with sample data
npx prisma db seed

# Start the development server
pnpm run dev
```

## Documentation

Detailed documentation is available in the `/docs` directory:

- [Architecture & Project Structure](./docs/architecture.md)
- [Database Schema & Migrations](./docs/database/migrations.md)
- [API Reference](./docs/api/README.md)

## Working with Prisma

For detailed instructions on managing the database schema and migrations, see the [Database Migrations Guide](./docs/database/migrations.md).

Quick commands:
- `npx prisma studio`: Open browser-based GUI at `http://localhost:5555`
- `npx prisma db seed`: Seed the database with sample data

## Project structure

This project follows a layered architecture (Routes → Services → DB). For a detailed breakdown of the layers and request flow, see the [Architecture Documentation](./docs/architecture.md).
