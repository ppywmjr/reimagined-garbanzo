# API Documentation

This directory contains documentation for the Video Subscription REST API.

## Overview

The API provides endpoints for:
- User registration and management
- Plan subscriptions (free and paid via Stripe)
- Course browsing and access control
- Video progress tracking

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend  │────▶│    API       │────▶│   Database   │
│ (React)     │     │  (Express)   │     │ (PostgreSQL) │
└─────────────┘     └──────────────┘     └──────────────┘
                         │
                         ▼
                  ┌──────────────┐
                  │   Stripe     │
                  │  (Payments)  │
                  └──────────────┘
```

## Authentication

### Clerk (User Auth)

All user-facing endpoints require a JWT token from Clerk:

```bash
curl -H "Authorization: Bearer <clerk-jwt-token>" \
  http://localhost:3000/me/courses
```

### Internal API Key

Admin endpoints require an internal API key:

```bash
curl -H "x-internal-api-key: <api-key>" \
  http://localhost:3000/plans
```

## Endpoints

### Users

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/signup` | Register new user | Clerk JWT |
| GET | `/users/{id}` | Get user by ID | None |
| GET | `/users` | List all users (admin) | API Key |

### Plans

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/plans` | Create plan (admin) | API Key |
| GET | `/plans` | List all plans | None |
| GET | `/plans/{id}` | Get plan by ID | None |

### Courses

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/courses` | List published courses | None |
| GET | `/courses/{id}` | Get course by ID | None |

### Me (Authenticated User)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/me/courses` | Get accessible courses | Clerk JWT |
| GET | `/me/courses/{id}/videos` | Get course videos with progress | Clerk JWT |
| PATCH | `/me/courses/{id}/videos/{videoId}` | Update video progress | Clerk JWT |

## Flows

See the `flows/` directory for detailed documentation:

- [Signup Flow](./flows/signup.md) - User registration process
- [Subscription Flow](./flows/subscription_flow.md) - Payment and access control
- [Video Progress Flow](./flows/video_progress.md) - Tracking watch progress

## OpenAPI Specification

The complete API specification is available in `openapi.yaml`.

You can view it using tools like:
- [Swagger UI](https://editor.swagger.io/)
- [ReDoc](https://redocly.github.io/redoc/)

## Error Handling

All errors return JSON with the following structure:

```json
{
  "success": false,
  "error": "Error message"
}
```

Common status codes:
- `200` - Success
- `201` - Created
- `400` - Bad request (invalid body)
- `401` - Unauthorized
- `403` - Forbidden (access denied)
- `404` - Not found