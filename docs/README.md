# Video Subscription API

An Express + Prisma REST API for managing video course subscriptions, built with PostgreSQL, Clerk authentication, and Stripe integration.

## Overview

This application provides a layered architecture for managing:
- **Users** - Authentication via Clerk with Stripe customer integration
- **Plans** - Subscription plans with Stripe product/price mapping
- **Courses** - Published video courses organized by instructors
- **Videos** - Video content linked to courses with watch progress tracking
- **Subscriptions** - Active subscriptions linking users to plans

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 24+ |
| Framework | Express 5.1.0 |
| ORM | Prisma 7.0.0 with PostgreSQL adapter |
| Database | PostgreSQL 16 (via Docker) |
| Auth | Clerk (JWT-based authentication) |
| Payments | Stripe (webhooks for subscription management) |
| Testing | Vitest + Supertest |
| Logging | Custom middleware for request/response logging |

## Quick Start

```bash
# Clone the repository
git clone <repo-url>
cd reimagined-garbanzo

# Install dependencies
pnpm install

# Start PostgreSQL database
docker compose up -d

# Set environment variables (see .env.example)
cp .env.example .env
# Edit .env with your configuration

# Run migrations and seed database
npx prisma migrate dev --name init
npx prisma db seed

# Start development server
pnpm run dev
```

Server runs at `http://localhost:3000`

## Documentation Structure

```
docs/
├── README.md              # This file
├── architecture.md        # System design & layer structure
├── database/
│   ├── schema.md          # Database models & ERD
│   └── migrations.md      # Migration workflow
├── api/
│   ├── overview.md        # API conventions & authentication
│   ├── routes/            # Endpoint documentation
│   │   ├── users.md
│   │   ├── plans.md
│   │   ├── courses.md
│   │   └── me.md
│   ├── flows/             # Business flow documentation
│   │   ├── signup.md
│   │   ├── subscription_flow.md
│   │   └── video_progress.md
│   └── openapi.yaml       # OpenAPI/Swagger specification
├── dependencies.md        # Tech stack details
├── development.md         # Local setup & contributing
└── mutation-testing.md    # Mutation testing baseline & delta tracking
```

## API Reference

See the [API Overview](./api/overview.md) for authentication, pagination, and error handling. Full endpoint documentation is available in the [API Routes](./api/routes/) section.

## Development

See the [Development Guide](./development.md) for local setup, environment variables, and testing instructions.

## License

MIT