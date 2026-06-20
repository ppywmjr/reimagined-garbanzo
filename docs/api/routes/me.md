# User-Specific Endpoints (Me)

All endpoints under `/me/*` require Clerk authentication.

## GET /me/courses

Get all courses accessible to the authenticated user (based on their subscription).

### Authentication
- **Required**: Clerk JWT token

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | integer | Number of results (default: 10, max: 100) |
| `offset` | integer | Number of results to skip (default: 0) |

### Request Example

```bash
curl -H "Authorization: Bearer <clerk-jwt-token>" \
  "http://localhost:3000/me/courses?limit=10&offset=0"
```

### Success Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "title": "Introduction to Video Production",
      "description": "Learn the basics of video production",
      "thumbnail": "https://example.com/thumb1.jpg",
      "sortOrder": 0
    },
    {
      "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "title": "Advanced Editing Techniques",
      "description": "Master advanced editing skills",
      "thumbnail": "https://example.com/thumb2.jpg",
      "sortOrder": 1
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

**Note**: Only courses accessible via the user's active subscription are returned.

### Error Responses

**401 Unauthorized** - Missing or invalid JWT:
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

## GET /me/courses/:id/videos

Get videos in a specific course with user's watch progress.

### Authentication
- **Required**: Clerk JWT token

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Course's database ID |

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | integer | Number of results (default: 10, max: 100) |
| `offset` | integer | Number of results to skip (default: 0) |

### Request Example

```bash
curl -H "Authorization: Bearer <clerk-jwt-token>" \
  "http://localhost:3000/me/courses/a1b2c3d4-e5f6-7890-abcd-ef1234567890/videos?limit=10&offset=0"
```

### Success Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "courseId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "videoId": "c3d4e5f6-a7b8-9012-cdef-123456789012",
      "position": 1,
      "video": {
        "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
        "title": "Getting Started",
        "url": "https://youtube.com/watch?v=abc123",
        "thumbnail": "https://example.com/thumb.jpg",
        "createdAt": "2026-06-19T08:00:00.000Z",
        "updatedAt": "2026-06-19T08:00:00.000Z",
        "userProgress": [
          {
            "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            "videoId": "c3d4e5f6-a7b8-9012-cdef-123456789012",
            "watched": true,
            "progressSecs": 0,
            "updatedAt": "2026-06-20T10:30:00.000Z"
          }
        ]
      }
    },
    {
      "courseId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "videoId": "d4e5f6a7-b8c9-0123-defa-234567890123",
      "position": 2,
      "video": {
        "id": "d4e5f6a7-b8c9-0123-defa-234567890123",
        "title": "Advanced Topics",
        "url": "https://youtube.com/watch?v=def456",
        "thumbnail": "https://example.com/thumb2.jpg",
        "createdAt": "2026-06-19T08:00:00.000Z",
        "updatedAt": "2026-06-19T08:00:00.000Z",
        "userProgress": [
          {
            "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
            "videoId": "d4e5f6a7-b8c9-0123-defa-234567890123",
            "watched": false,
            "progressSecs": 60,
            "updatedAt": "2026-06-20T10:35:00.000Z"
          }
        ]
      }
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

### Error Responses

**401 Unauthorized** - Missing or invalid JWT:
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

**403 Forbidden** - User doesn't have access to this course:
```json
{
  "success": false,
  "error": "Forbidden"
}
```

**400 Bad Request** - Invalid UUID format:
```json
{
  "success": false,
  "error": "Invalid course ID format"
}
```

## PATCH /me/courses/:id/videos/:videoId

Update video watch progress for the authenticated user.

### Authentication
- **Required**: Clerk JWT token

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Course's database ID |
| `videoId` | UUID | Video's database ID |

### Request Body

```typescript
{
  watched?: boolean;      // Whether video is marked as watched
  progressSecs?: number;  // Current watch position in seconds (>= 0)
}
```

**Zod Schema**:
```typescript
const progressBodySchema = z
  .object({
    watched: z.boolean().optional(),
    progressSecs: z.number().int().min(0).optional(),
  })
  .refine((d) => d.watched !== undefined || d.progressSecs !== undefined, {
    message: 'At least one of watched or progressSecs must be provided',
  })
```

### Request Example

```bash
curl -X PATCH -H "Authorization: Bearer <clerk-jwt-token>" \
  "http://localhost:3000/me/courses/a1b2c3d4-e5f6-7890-abcd-ef1234567890/videos/c3d4e5f6-a7b8-9012-cdef-123456789012" \
  -H "Content-Type: application/json" \
  -d '{
    "watched": true,
    "progressSecs": 0
  }'
```

### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "userId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "videoId": "c3d4e5f6-a7b8-9012-cdef-123456789012",
    "watched": true,
    "progressSecs": 0,
    "updatedAt": "2026-06-20T10:45:00.000Z"
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

**403 Forbidden** - User doesn't have access to this course:
```json
{
  "success": false,
  "error": "Forbidden"
}
```

**403 Forbidden** - Video not found in course:
```json
{
  "success": false,
  "error": "Video not found in course"
}
```

**400 Bad Request** - Invalid request body:
```json
{
  "success": false,
  "error": "At least one of watched or progressSecs must be provided"
}
```

## Implementation

See [`src/routes/meRoutes.ts`](../../src/routes/meRoutes.ts) for the route handler and:
- [`src/services/userCoursesService.ts`](../../src/services/userCoursesService.ts) for course access
- [`src/services/userVideoService.ts`](../../src/services/userVideoService.ts) for video progress