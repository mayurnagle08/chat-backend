# Chat Backend API

A backend chat application built using **Node.js, TypeScript, Express.js, PostgreSQL, Prisma ORM, and Firebase Cloud Firestore**.

The application supports 1:1 conversations, message delivery, message history, read receipts, and last-seen tracking.

## Features

- 1:1 chat creation with duplicate conversation prevention.
- User registration and login using bcrypt and JWT authentication.
- PostgreSQL with Prisma for users, chats, and chat memberships.
- Firebase Firestore for message storage and read receipts.
- Timestamp-based message ordering.
- Cursor-based message pagination.
- Message read status tracking.
- Per-user last-seen message tracking.
- Message editing and soft deletion (bonus features).
- Request validation using Zod.
- Centralized error handling and protected API routes.

## Technology Stack

| Technology | Purpose |
|---|---|
| Node.js | Backend runtime |
| TypeScript | Type-safe development |
| Express.js | REST API framework |
| PostgreSQL | Relational data storage |
| Prisma ORM | Database access |
| Firebase Firestore | Message and read-receipt storage |
| JWT | Authentication |
| bcrypt | Password hashing |
| Zod | Request validation |

## Architecture

The application uses two databases, each responsible for a specific type of data.

**PostgreSQL**

Stores:
- User accounts
- Direct chat records
- Chat membership records

**Firebase Cloud Firestore**

Stores:
- Chat messages
- Message timestamps
- Read receipts
- Per-member last-seen information

### Firestore Structure

```text
chats/
  {chatId}/
    messages/
      {messageId}
        chatId
        senderId
        text
        sentAt
        editedAt
        deletedAt
        readBy[]

    members/
      {userId}
        lastSeenMessageId
        lastSeenAt
```

Messages are soft-deleted. The Firestore document remains available, but its text is cleared and `deletedAt` is updated.

## Prerequisites

- Node.js 22+
- npm
- PostgreSQL 14+
- Firebase project with Cloud Firestore enabled
- Firebase service account credentials

## Local Setup

### 1. Clone the repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd chat-backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file using `.env.example` as a reference.

Configure the following values:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/chatdb"
JWT_SECRET="your_secure_jwt_secret"
FIREBASE_PROJECT_ID="your_firebase_project_id"
```

Configure your Firebase service account credentials according to `src/config/firebase.ts`.

For local development, keep the service account JSON at the configured project path. Never commit Firebase credentials or `.env` files.

### 4. Configure PostgreSQL and Prisma

Create the PostgreSQL database, then run:

```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 5. Start the application

```bash
npm run dev
```

The API runs at:

```text
http://localhost:3000
```

Health check:

```http
GET http://localhost:3000/health
```

## API Documentation

All chat and user endpoints require JWT authentication.

Include the following headers in protected requests:

```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

### Authentication

**Register**

```http
POST /auth/register
```

Request:

```json
{
  "name": "Asha",
  "email": "asha@example.com",
  "password": "password123"
}
```

**Login**

```http
POST /auth/login
```

Request:

```json
{
  "email": "asha@example.com",
  "password": "password123"
}
```

Both endpoints return the user details and JWT token.

### 1. Create or Get a 1:1 Chat

```http
POST /chat/create
```

Request:

```json
{
  "userAId": "USER_UUID_1",
  "userBId": "USER_UUID_2"
}
```

The authenticated user must be one of the two participants.

Response:

```json
{
  "chatId": "CHAT_UUID",
  "created": true
}
```

The API prevents duplicate direct conversations between the same two users.

### 2. Send a Message

```http
POST /chat/:chatId/message/send
```

Request:

```json
{
  "senderId": "AUTHENTICATED_USER_UUID",
  "text": "Hello!"
}
```

Returns the created message with its ID, sender, text, timestamp, and read status.

### 3. Get Chat Messages

```http
GET /chat/:chatId/messages?limit=50
```

Optional query parameters:

- `limit`: Number of messages to retrieve (default: 50, maximum: 100).
- `cursor`: Message ID used to retrieve the next page of older messages.

Messages are ordered by timestamp. Each page is returned in chronological order.

Response includes:

```json
{
  "messages": [],
  "nextCursor": "MESSAGE_ID"
}
```

### 4. Mark a Message as Read

```http
POST /chat/:chatId/message/:messageId/read
```

Request:

```json
{
  "userId": "AUTHENTICATED_USER_UUID"
}
```

Updates the message's `readBy` array with the authenticated user's ID.

### 5. Update Last Seen

```http
POST /chat/:chatId/lastseen
```

Request:

```json
{
  "userId": "AUTHENTICATED_USER_UUID",
  "messageId": "FIRESTORE_MESSAGE_ID"
}
```

Stores the user's last-seen message ID and timestamp.

### 6. Get User Chats

```http
GET /user/:userId/chats
```

Returns the user's conversations, participant details, and chat timestamps.

### 7. Edit a Message (Bonus)

```http
PATCH /chat/:chatId/message/:messageId
```

Request:

```json
{
  "userId": "AUTHENTICATED_USER_UUID",
  "text": "Updated message"
}
```

Only the original sender can edit a message. Deleted messages cannot be edited.

### 8. Delete a Message (Bonus)

```http
DELETE /chat/:chatId/message/:messageId
```

Request:

```json
{
  "userId": "AUTHENTICATED_USER_UUID"
}
```

Only the original sender can delete a message. Deletion is implemented as a soft delete.

## Testing

Run the TypeScript build:

```bash
npm run build
```

Run the test suite:

```bash
npm test
```

Run test coverage:

```bash
npm run test:coverage
```

## API Specification

The project includes `swagger.yaml`, an OpenAPI specification that can be imported into Swagger Editor or Postman to explore the API endpoints.

## Implementation Notes

- Direct chat participants are sorted before chat creation to maintain a consistent user pair.
- A database unique constraint prevents duplicate direct chats.
- JWT authentication identifies the current user.
- User IDs supplied in requests are checked against the authenticated user to prevent identity spoofing.
- Chat membership is verified before message operations.
- Firestore `arrayUnion` is used to update read receipts without adding duplicate user IDs.
- Message pagination uses timestamp and document ID ordering.

## Scope

This implementation focuses on 1:1 chat functionality as specified in the assignment. Message editing and soft deletion are included as additional features.

