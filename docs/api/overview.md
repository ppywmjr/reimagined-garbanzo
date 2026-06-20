# API Overview

## Base URL

```
http://localhost:3000
```

For production, see your deployment URL (e.g., `https://api.example.com`)

## Authentication

### Clerk Authentication

Most endpoints require authentication via Clerk JWT tokens.

**How it works**:
1. Frontend authenticates user with Clerk
2. Clerk returns JWT token
3. Include token in `Authorization` header

```bash
curl -H "Authorization: Bearer <clerk-jwt-token>" \
  http://localhost:3000/me/courses
```

**In Express routes**:
```typescript
import { getAuth } from '@clerk/express'

router.get('/me/courses', async (req, res) => {
  const { userId, isAuthenticated } = getAuth(req)
  
  if (!isAuthenticated || !userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }
  
  // Proceed with authenticated request
})
```

### Internal API Key

Some endpoints (e.g., Stripe webhooks) require an internal API key.

**Header**: `x-internal-api-key`

```bash
curl -H "x-internal-api-key: <your-secret-key>" \
  http://localhost:3000/webhooks/stripe
```

**Configuration**: Set `INTERNAL_API_SECRET` in `.env`

## Request Format

### JSON Body

All request bodies are JSON with `application/json` content type.

```bash
curl -X POST http://localhost:3000/plans \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Pro Plan",
    "stripeProductId": "prod_123",
    "stripePriceId": "price_123",
    "billingInterval": "month",
    "pricePence": 999,
    "isActive": true
  }'
```

### Query Parameters

Pagination uses `limit` and `offset`:

```bash
curl "http://localhost:3000/courses?limit=10&offset=20"
```

## Response Format

### Success Response

```json
{
  "success": true,
  "data": { /* response data */ }
}
```

### Pagination Response

```json
{
  "success": true,
  "data": [
    { "id": "...", "title": "Course 1" },
    { "id": "...", "title": "Course 2" }
  ],
  "pagination": {
    "total": 100,
    "limit": 2,
    "offset": 0,
    "hasMore": true
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message"
}
```

## Error Codes

| Status | Code | Description |
|--------|------|-------------|
| 400 | Validation error | Invalid request body/parameters |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 500 | Server error | Internal server error |

## Validation

All request bodies are validated using Zod schemas before processing.

**Example validation error**:
```json
{
  "success": false,
  "error": "Required"
}
```

See individual endpoint docs for validation rules.

## Rate Limiting

Not currently implemented. Consider adding with `express-rate-limit` for production.

## CORS

CORS is enforced in production based on `ALLOWED_ORIGIN` environment variable.
Development and staging environments bypass CORS.

## Webhooks

Stripe webhooks are handled at `/webhooks/stripe`. These endpoints:
- Skip `express.json()` parsing (raw body required)
- Require internal API key authentication
- Validate webhook signature from Stripe

See [`src/routes/webhookRoutes.ts`](../src/routes/webhookRoutes.ts) for implementation.