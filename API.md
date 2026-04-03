# Users API Endpoints

## GET /users
Retrieve all users with pagination support.

### Query Parameters
- `limit` (optional, default: 20, max: 100) - Number of users to return
- `offset` (optional, default: 0) - Number of users to skip

### Example Request
```
GET /users?limit=10&offset=0
```

### Success Response (200)
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "clerk_user_id": "user_123abc",
      "email": "alice@example.com",
      "display_name": "Alice Johnson",
      "created_at": "2026-04-03T17:12:38.000Z",
      "updated_at": "2026-04-03T17:12:38.000Z"
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

### Error Response (500)
```json
{
  "success": false,
  "error": "Database error"
}
```

---

## GET /users/:id
Retrieve a single user by ID.

### Path Parameters
- `id` (required) - User UUID

### Example Request
```
GET /users/550e8400-e29b-41d4-a716-446655440000
```

### Success Response (200)
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "clerk_user_id": "user_123abc",
    "email": "alice@example.com",
    "display_name": "Alice Johnson",
    "created_at": "2026-04-03T17:12:38.000Z",
    "updated_at": "2026-04-03T17:12:38.000Z"
  }
}
```

### Error Responses

**400 - Invalid ID Format**
```json
{
  "success": false,
  "error": "Invalid user ID format"
}
```

**404 - User Not Found**
```json
{
  "success": false,
  "error": "User not found"
}
```

---

## Architecture & Best Practices

### Structure
- **routes/** - Express route handlers
- **services/** - Business logic layer
- **db/** - Database client and connection management

### Production Features
- ✅ Connection pooling with pg
- ✅ Input validation and sanitization
- ✅ UUID format validation
- ✅ Pagination with limits to prevent resource exhaustion
- ✅ Structured error handling
- ✅ Debug logging throughout
- ✅ Proper HTTP status codes
- ✅ Consistent JSON response format
- ✅ Environment variable configuration
- ✅ Separation of concerns (routes → services → db)


