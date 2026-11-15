# Chat Backend

A TypeScript chat API built with Express, PostgreSQL + Prisma, and Firebase Firestore.

## Features

- 1:1 chat creation with duplicate-pair protection.
- User registration/login with bcrypt password hashing and JWT authentication.
- PostgreSQL stores users, chats, and chat memberships.
- Firestore stores messages, read receipts, and per-member last-seen state.
- Timestamp-ordered message history with cursor pagination.
- Read receipts, last-seen updates, sender-only message edit and soft-delete.
- Request validation with Zod, centralized errors, Helmet, CORS, rate limiting.
- OpenAPI specification, Jest tests, and Docker Compose.

## Architecture and data ownership

**PostgreSQL:** users, direct chat records, membership records.

**Firestore:**
```text
chats/{chatId}/messages/{messageId}
  chatId, senderId, text, sentAt, editedAt, deletedAt, readBy[]

chats/{chatId}/members/{userId}
  lastSeenMessageId, lastSeenAt
```

Message deletion is a soft delete: the document remains for consistent pagination and receipts, but `text` is cleared and `deletedAt` is set. Read receipts are stored as a unique `readBy` user ID array on the message document.

## Requirements

- Node.js 22+
- npm
- PostgreSQL 14+
- Firebase project with Cloud Firestore enabled
- Firebase service account credentials with Firestore access

## Setup

1. Clone the repository and install dependencies:

   ```bash
   npm install
   cp .env.example .env
   ```

2. Configure `.env`:
   - `DATABASE_URL`: PostgreSQL connection string.
   - `JWT_SECRET`: at least 32 random characters.
   - `FIREBASE_PROJECT_ID`: Firebase project ID.
   - `GOOGLE_APPLICATION_CREDENTIALS`: absolute path to the service account JSON.

   Never commit `.env` or the service-account JSON.

3. Create the PostgreSQL database, then generate Prisma client and run migrations:

   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   ```

4. Start the API:

   ```bash
   npm run dev
   ```

   Health check: `GET http://localhost:3000/health`

## Docker

The Compose file starts PostgreSQL and the API. Put a Firebase service account file at `./firebase-service-account.json` (or set `GOOGLE_APPLICATION_CREDENTIALS_HOST` to its path), create `.env`, then run:

```bash
docker compose up --build
```

The API container runs `prisma migrate deploy` before starting. The service-account file is mounted read-only and must not be committed.

For deployments, use a secrets manager rather than baking credentials into the image. Configure database backups, Firebase IAM least privilege, TLS termination, and production CORS origins.

## API

All `/chat/*` and `/user/*` endpoints require:

```http
Authorization: Bearer <JWT>
Content-Type: application/json
```

### Authentication

**POST `/auth/register`**
```json
{ "name": "Asha", "email": "asha@example.com", "password": "password123" }
```

**POST `/auth/login`**
```json
{ "email": "asha@example.com", "password": "password123" }
```

Both return `{ "user": { "id": "...", "name": "...", "email": "..." }, "token": "..." }`.

### Create or get chat

**POST `/chat/create`**

The authenticated user must be one of the two users.

```json
{ "userAId": "USER_UUID_1", "userBId": "USER_UUID_2" }
```

Response:
```json
{ "chatId": "CHAT_UUID", "created": true }
```

### Send message

**POST `/chat/:chatId/message/send**
```json
{ "senderId": "AUTHENTICATED_USER_UUID", "text": "Hello!" }
```

Response includes `id`, `chatId`, `senderId`, `text`, `sentAt`, `editedAt`, `deletedAt`, and `readBy`.

### Get messages

**GET `/chat/:chatId/messages?limit=50&cursor=MESSAGE_ID`**

- `limit` defaults to 50 and must be between 1 and 100.
- Results are returned oldest-first within each page.
- `nextCursor` is supplied when another page may exist. Pass it as `cursor` to fetch the next (older) page.
- Deleted messages are returned with empty text and a `deletedAt` timestamp.

### Mark message read

**POST `/chat/:chatId/message/:messageId/read**
```json
{ "userId": "AUTHENTICATED_USER_UUID" }
```

### Update last seen

**POST `/chat/:chatId/lastseen**
```json
{ "userId": "AUTHENTICATED_USER_UUID", "messageId": "FIRESTORE_MESSAGE_ID" }
```

### List chats

**GET `/user/:userId/chats**

Returns chat IDs, member IDs, member profiles, and created/updated timestamps from PostgreSQL.

### Edit message (bonus)

**PATCH `/chat/:chatId/message/:messageId**
```json
{ "userId": "AUTHENTICATED_USER_UUID", "text": "Corrected text" }
```

Only the original sender can edit a non-deleted message.

### Delete message (bonus)

**DELETE `/chat/:chatId/message/:messageId**
```json
{ "userId": "AUTHENTICATED_USER_UUID" }
```

Only the original sender can delete. This is a soft delete.

## Swagger / OpenAPI

The OpenAPI 3.0 specification is in `swagger.yaml`. Import it into Swagger Editor or Postman to explore and try the API. To host Swagger UI, use an approved static Swagger UI deployment or add `swagger-ui-express` and serve this file.

## Tests

```bash
npm test
npm run test:coverage
```

The current suite covers schema validation, health checks, and authentication middleware behavior. For full end-to-end chat tests, run PostgreSQL and the Firebase Emulator Suite, configure test credentials, and add integration scenarios for Firestore writes/transactions. Tests intentionally do not require real Firebase credentials.

## Important implementation notes / production hardening

- The authenticated JWT subject is authoritative. The request's `senderId`/`userId` is checked against it to preserve the requested API shape and prevent spoofing.
- Direct chat IDs are canonicalized by sorting UUIDs; a database unique constraint protects against concurrent duplicate creation.
- Every message operation checks relational chat membership before accessing Firestore.
- `readBy` is an array on each message, updated with Firestore `arrayUnion` in a transaction. For very large group chats, move receipts to a per-message subcollection or per-user read cursor to avoid Firestore document growth.
- Cursor pagination uses Firestore document snapshots and stable ordering by `sentAt` plus document ID. For the first page, newest messages are queried and then reversed into chronological order.
- Firebase Admin uses Application Default Credentials. The local emulator can be enabled with `FIRESTORE_EMULATOR_HOST`.
- Consider adding account verification, refresh-token rotation/revocation, per-user rate limits, message attachment handling, abuse controls, observability, and retention policies before production use.
- Firestore composite index requirements may be shown by Firebase when queries evolve; the current messages query orders by timestamp and document ID.

## Repository submission

Create a public GitHub repository, then:

```bash
git init
git add .
git commit -m "Build chat backend with PostgreSQL and Firestore"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/chat-backend.git
git push -u origin main
```

Do not commit `.env`, Firebase service-account JSON, credentials, or secrets.
