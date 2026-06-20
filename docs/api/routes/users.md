# User Endpoints

## POST /signup

Create a new user in the database after Clerk authentication.

### Authentication
- **Required**: Clerk JWT token (via `Authorization` header)
- **Validation**: 
  - JWT must be valid and not expired
  - `userId` from token must match request body
  - Email in request must match user's primary email in Clerk

### Request Body

```typescript
{
  clerkUserId: string;        // Must match JWT userId
  email: string;              // Must be valid email format
  displayName?: string;       // Optional display name (max 100 chars)
}
```

**Zod Schema**:
```typescript
const CreateUserBody = z.object({
  clerkUserId: z.string().min(1),
  email: z.email(),
  displayName: z.string().max(100).optional(),
})
```

### Request Example

```bash
curl -X POST http://localhost:3000/signup \
  -H "Authorization: Bearer <clerk-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "clerkUserId": "user_3CIoLIb5xgmpOP4yUiJST7CBPd8",
    "email": "ppywmjr@gmail.com",
    "displayName": "John Doe"
  }'
```

### Success Response (201 Created)

```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "clerkUserId": "user_3CIoLIb5xgmpOP4yUiJST7CBPd8",
    "email": "ppywmjr@gmail.com",
    "displayName": "John Doe",
    "createdAt": "2026-06-20T10:30:00.000Z",
    "updatedAt": "2026-06-20T10:30:00.000Z"
  }
}
```

### Success Response (200 OK - User Already Exists)

```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "clerkUserId": "user_3CIoLIb5xgmpOP4yUiJST7CBPd8",
    "email": "ppywmjr@gmail.com",
    "displayName": null,
    "createdAt": "2026-06-19T08:15:00.000Z",
    "updatedAt": "2026-06-19T08:15:00.000Z"
  }
}
```

### Error Responses

**401 Unauthorized** - Missing or invalid JWT:
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

**403 Forbidden** - JWT userId doesn't match request:
```json
{
  "success": false,
  "error": "Forbidden"
}
```

**403 Forbidden** - Email doesn't match Clerk user:
```json
{
  "success": false,
  "error": "Forbidden"
}
```

**400 Bad Request** - Invalid request body:
```json
{
  "success": false,
  "error": "Invalid email"
}
```

## GET /users/:id

Get a user by their database ID.

### Authentication
- **Not required** (public endpoint)

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | User's database ID |

### Request Example

```bash
curl http://localhost:3000/users/a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "clerkUserId": "user_3CIoLIb5xgmpOP4yUiJST7CBPd8",
    "email": "ppywmjr@gmail.com",
    "displayName": "John Doe",
    "createdAt": "2026-06-20T10:30:00.000Z",
    "updatedAt": "2026-06-20T10:30:00.000Z"
  }
}
```

### Error Responses

**400 Bad Request** - Invalid UUID format:
```json
{
  "success": false,
  "error": "Invalid user ID format"
}
```

**404 Not Found** - User doesn't exist:
```json
{
  "success": false,
  "error": "User not found"
}
```

## GET /users

Get all users with pagination.

### Authentication
- **Not required** (public endpoint)

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | integer | Number of results (default: 10, max: 100) |
| `offset` | integer | Number of results to skip (default: 0) |

### Request Example

```bash
curl "http://localhost:3000/users?limit=10&offset=0"
```

### Success Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "clerkUserId": "user_3CIoLIb5xgmpOP4yUiJST7CBPd8",
      "email": "ppywmjr@gmail.com",
      "displayName": "John Doe",
      "createdAt": "2026-06-20T10:30:00.000Z",
      "updatedAt": "2026-06-20T10:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 10,
    "offset": 0,
    "hasMore": false
  }
}
```

## Implementation

See [`src/routes/userRoutes.ts`](../../src/routes/userRoutes.ts) for the route handler and [`src/services/userService.ts`](../../src/services/userService.ts) for business logic.