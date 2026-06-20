# Plan Endpoints

## POST /plans

Create a new subscription plan.

### Authentication
- **Required**: Internal API key (via `x-internal-api-key` header)
- **Note**: This is an admin-only endpoint for managing plans

### Request Body

```typescript
{
  name: string;                    // Plan name (1-200 chars)
  stripeProductId?: string;        // Stripe product ID
  stripePriceId?: string;          // Stripe price ID
  billingInterval: 'month' \| 'year';
  pricePence?: number;             // Price in pence (null for free plans)
  isActive?: boolean;              // Default: true
}
```

**Zod Schema**:
```typescript
const CreatePlanBody = z.object({
  name: z.string().min(1).max(200),
  stripeProductId: z.string().min(1),
  stripePriceId: z.string().min(1),
  billingInterval: z.enum(['month', 'year']),
  pricePence: z.number().int().nonnegative(),
  isActive: z.boolean().default(true),
})
```

### Request Example

```bash
curl -X POST http://localhost:3000/plans \
  -H "x-internal-api-key: <your-secret-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Pro Plan",
    "stripeProductId": "prod_123abc",
    "stripePriceId": "price_123abc",
    "billingInterval": "month",
    "pricePence": 999,
    "isActive": true
  }'
```

### Success Response (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Pro Plan",
    "description": null,
    "isFree": false,
    "stripeProductId": "prod_123abc",
    "stripePriceId": "price_123abc",
    "billingInterval": "month",
    "pricePence": 999,
    "isActive": true,
    "createdAt": "2026-06-20T10:30:00.000Z",
    "deactivatedAt": null
  }
}
```

### Error Responses

**401 Unauthorized** - Missing or invalid internal API key:
```json
{
  "error": "Unauthorised"
}
```

**400 Bad Request** - Invalid request body:
```json
{
  "success": false,
  "error": "Required"
}
```

## GET /plans

Get all plans with pagination.

### Authentication
- **Not required** (public endpoint)

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | integer | Number of results (default: 10, max: 100) |
| `offset` | integer | Number of results to skip (default: 0) |

### Request Example

```bash
curl "http://localhost:3000/plans?limit=10&offset=0"
```

### Success Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Free Plan",
      "description": null,
      "isFree": true,
      "stripeProductId": null,
      "stripePriceId": null,
      "billingInterval": null,
      "pricePence": null,
      "isActive": true,
      "createdAt": "2026-06-19T08:00:00.000Z",
      "deactivatedAt": null
    },
    {
      "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "name": "Pro Plan",
      "description": null,
      "isFree": false,
      "stripeProductId": "prod_123abc",
      "stripePriceId": "price_123abc",
      "billingInterval": "month",
      "pricePence": 999,
      "isActive": true,
      "createdAt": "2026-06-20T10:30:00.000Z",
      "deactivatedAt": null
    }
  ],
  "pagination": {
    "total": 2,
    "limit": 10,
    "offset": 0,
    "hasMore": false
  }
}
```

## GET /plans/:id

Get a specific plan by ID.

### Authentication
- **Not required** (public endpoint)

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Plan's database ID |

### Request Example

```bash
curl http://localhost:3000/plans/a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Free Plan",
    "description": null,
    "isFree": true,
    "stripeProductId": null,
    "stripePriceId": null,
    "billingInterval": null,
    "pricePence": null,
    "isActive": true,
    "createdAt": "2026-06-19T08:00:00.000Z",
    "deactivatedAt": null
  }
}
```

### Error Responses

**400 Bad Request** - Invalid UUID format:
```json
{
  "success": false,
  "error": "Invalid plan ID format"
}
```

**404 Not Found** - Plan doesn't exist:
```json
{
  "success": false,
  "error": "Plan not found"
}
```

## Implementation

See [`src/routes/planRoutes.ts`](../../src/routes/planRoutes.ts) for the route handler and [`src/services/planService.ts`](../../src/services/planService.ts) for business logic.