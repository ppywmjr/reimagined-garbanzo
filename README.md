# Subscription Management

A Node.js/Express API for managing users and their subscriptions, backed by PostgreSQL.

## Prerequisites

- [Node.js](https://nodejs.org/) v20+
- [Docker](https://www.docker.com/) (for local development database)
- [npm](https://npmjs.com/)

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/ppywmjr/reimagined-garbanzo.git
cd reimagined-garbanzo
```

### 2. Install dependencies

```bash
npm ci
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` if you need to change any defaults (the defaults match the Docker Compose setup).

### 4. Start the database

```bash
docker compose up
```

This starts a PostgreSQL 16 instance on port `5432` and automatically creates the `users` table with seed data on first run.

> **Note:** If you need to reset the database (e.g. to re-run initialisation), stop the container and remove the volume:
> ```bash
> docker compose down && docker volume rm subscription-managent_pgdata
> ```

### 5. Start the app

```bash
npm start
```

The API is now available at `http://localhost:3000`.

## API

See [API.md](API.md) for full endpoint documentation.

### Quick reference

| Method | Path         | Description               |
|--------|--------------|---------------------------|
| GET    | `/users`     | List all users (paginated) |
| GET    | `/users/:id` | Get a single user by UUID  |

## Running Tests

Integration tests spin up a real PostgreSQL container automatically — no manual setup needed:

```bash
npm test
```

## Environment Variables

| Variable       | Default       | Description                                         |
|----------------|---------------|-----------------------------------------------------|
| `DATABASE_URL` | —             | Full connection string (overrides individual fields) |
| `DB_USER`      | `dev`         | PostgreSQL username                                 |
| `DB_PASSWORD`  | `dev`         | PostgreSQL password                                 |
| `DB_HOST`      | `localhost`   | PostgreSQL host                                     |
| `DB_PORT`      | `5432`        | PostgreSQL port                                     |
| `DB_NAME`      | `myapp`       | PostgreSQL database name                            |
| `NODE_ENV`     | `development` | Application environment                             |
| `PORT`         | `3000`        | HTTP server port                                    |
