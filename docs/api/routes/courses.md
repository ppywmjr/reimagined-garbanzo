# Course Endpoints

## GET /courses

Get all published courses with pagination.

### Authentication
- **Not required** (public endpoint)

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | integer | Number of results (default: 10, max: 100) |
| `offset` | integer | Number of results to skip (default: 0) |

### Request Example

```bash
curl "http://localhost:3000/courses?limit=10&offset=0"
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

**Note**: Only published courses (`is_published = true`) are returned.

## GET /courses/:id

Get a specific published course by ID.

### Authentication
- **Not required** (public endpoint)

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Course's database ID |

### Request Example

```bash
curl http://localhost:3000/courses/a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "title": "Introduction to Video Production",
    "description": "Learn the basics of video production",
    "thumbnail": "https://example.com/thumb1.jpg",
    "sortOrder": 0,
    "isPublished": true,
    "createdAt": "2026-06-19T08:00:00.000Z",
    "updatedAt": "2026-06-19T08:00:00.000Z"
  }
}
```

### Error Responses

**400 Bad Request** - Invalid UUID format:
```json
{
  "success": false,
  "error": "Invalid course ID format"
}
```

**404 Not Found** - Course doesn't exist or is not published:
```json
{
  "success": false,
  "error": "Course not found"
}
```

## GET /courses/:id/videos

Get all videos in a course with pagination. Includes user's watch progress if authenticated.

### Authentication
- **Optional**: Clerk JWT token for personalized progress data

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
# Without authentication (no progress data)
curl "http://localhost:3000/courses/a1b2c3d4-e5f6-7890-abcd-ef1234567890/videos?limit=10&offset=0"

# With authentication (includes progress data)
curl -H "Authorization: Bearer <clerk-jwt-token>" \
  "http://localhost:3000/courses/a1b2c3d4-e5f6-7890-abcd-ef1234567890/videos?limit=10&offset=0"
```

### Success Response (200 OK) - Without Authentication

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
        "userProgress": []
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
        "userProgress": []
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

### Success Response (200 OK) - With Authentication

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

## Implementation

See [`src/routes/courseRoutes.ts`](../../src/routes/courseRoutes.ts) for the route handler and [`src/services/courseService.ts`](../../src/services/courseService.ts) for business logic.