# Signup Flow

## Overview

This flow describes how a new user signs up and gets access to the application.

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Clerk
    participant API
    participant Database

    User->>Frontend: Visit signup page
    Frontend->>Clerk: Show Clerk signup widget
    User->>Clerk: Fill signup form (email, password)
    Clerk-->>Frontend: Return JWT token
    Frontend->>API: POST /signup with JWT + body
    
    Note over API,Database: Clerk middleware validates JWT<br/>Extracts userId and primary email
    API->>Database: Check if user exists by clerk_user_id
    
    alt User doesn't exist
        Database-->>API: Create new user record
        API-->>Frontend: 201 Created with user data
    else User exists
        Database-->>API: Return existing user record
        API-->>Frontend: 200 OK with user data
    end
    
    Frontend->>User: Show success message
```

## Step-by-Step

### 1. User Signs Up with Clerk

The frontend uses Clerk's signup widget to handle authentication:

```typescript
// Frontend (React example)
import { SignUp } from '@clerk/clerk-react'

function SignupPage() {
  return <SignUp path="/signup" routing="path" />
}
```

Clerk creates a user account and returns a JWT token.

### 2. Frontend Calls API

After Clerk authentication, the frontend calls the API:

```typescript
// Frontend code
const clerkUser = await clerk.users.getUser(userId)
const primaryEmail = clerkUser.emailAddresses.find(
  e => e.id === clerkUser.primaryEmailAddressId
)?.emailAddress

const response = await fetch('http://localhost:3000/signup', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${clerkJwtToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    clerkUserId: userId,
    email: primaryEmail,
    displayName: 'John Doe'
  })
})

const data = await response.json()
```

### 3. API Validates Request

The route handler validates the request:

```typescript
// src/routes/userRoutes.ts
const CreateUserBody = z.object({
  clerkUserId: z.string().min(1),
  email: z.email(),
  displayName: z.string().max(100).optional(),
})

router.post('/signup', async (req, res) => {
  const { userId, isAuthenticated } = getAuth(req)
  
  // Validate JWT
  if (!isAuthenticated || !userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }
  
  // Validate request body
  const parse = CreateUserBody.safeParse(req.body)
  if (!parse.success) {
    return res.status(400).json({ success: false, error: parse.error.issues[0].message })
  }
  
  // Verify clerkUserId matches JWT
  if (parse.data.clerkUserId !== userId) {
    return res.status(403).json({ success: false, error: 'Forbidden' })
  }
  
  // Verify email matches Clerk user's primary email
  const clerkUser = await clerkClient.users.getUser(userId)
  const primaryEmail = clerkUser.emailAddresses.find(
    e => e.id === clerkUser.primaryEmailAddressId
  )?.emailAddress
  
  if (parse.data.email !== primaryEmail) {
    return res.status(403).json({ success: false, error: 'Forbidden' })
  }
  
  // Create or retrieve user in database
  const { user, created } = await userService.createUser(parse.data)
  
  res.status(created ? 201 : 200).json({ success: true, data: user })
})
```

### 4. Database Operation

The service handles the database operation:

```typescript
// src/services/userService.ts
export async function createUser(data: {
  clerkUserId: string
  email: string
  displayName?: string
}): Promise<{ user: Prisma.UserModel; created: boolean }> {
  const db = getPrismaClient()
  
  try {
    // Try to create new user
    const user = await db.user.create({
      data: {
        clerkUserId: data.clerkUserId,
        email: data.email,
        displayName: data.displayName,
      },
    })
    return { user, created: true }
  } catch (err) {
    // If duplicate error, user already exists
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const user = await db.user.findUniqueOrThrow({ 
        where: { clerkUserId: data.clerkUserId } 
      })
      return { user, created: false }
    }
    throw err
  }
}
```

## Request/Response Examples

### Successful Signup (New User)

**Request**:
```bash
curl -X POST http://localhost:3000/signup \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6..." \
  -H "Content-Type: application/json" \
  -d '{
    "clerkUserId": "user_3CIoLIb5xgmpOP4yUiJST7CBPd8",
    "email": "ppywmjr@gmail.com",
    "displayName": "John Doe"
  }'
```

**Response (201 Created)**:
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

### User Already Exists

**Request**: Same as above, but user already in database

**Response (200 OK)**:
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

### Error Cases

**401 Unauthorized** - Invalid JWT:
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

**403 Forbidden** - clerkUserId mismatch:
```json
{
  "success": false,
  "error": "Forbidden"
}
```

**403 Forbidden** - Email mismatch:
```json
{
  "success": false,
  "error": "Forbidden"
}
```

**400 Bad Request** - Invalid body:
```json
{
  "success": false,
  "error": "Invalid email"
}
```

## Post-Signup

After successful signup, the user can:
1. Access protected endpoints (e.g., `/me/courses`)
2. View their profile
3. Browse available courses
4. Subscribe to a plan (if applicable)