# Hackathon Backend (MVP)

Minimal backend for:
- user creation
- pair invite/join
- wish CRUD + filtering
- nudge trigger logic (manual + scheduled)

## Stack

- Node.js
- Fastify
- SQLite (`better-sqlite3`)
- Optional Expo Push API

## Run

```bash
cd backend
npm install
cp .env.example .env
npm run start
```

Default API base URL: `http://localhost:8787`

## DB Schema

Schema lives in `./schema.sql` and auto-initializes on server start.

Tables:
- `users`
  - `id`, `email` or `device_id`, `push_token`, `nudge_level`
- `pairs`
  - `id`, `user1_id`, `user2_id`, `invite_code`, `status`
- `wishes`
  - `id`, `pair_id`, `created_by`, `title`, `category`, `priority`, `timing`, `budget_range`, `budget_min`, `budget_max`, `memo`, `status`
- `pair_nudge_state`
  - `pair_id`, `last_nudged_at`, `last_wish_id`

## REST Endpoints

### User

- `POST /users`
- `GET /users/:userId`
- `PATCH /users/:userId`

### Pairing

- `POST /pairs/invite`
- `POST /pairs/join`
- `GET /users/:userId/pair`

### Wishes

- `POST /pairs/:pairId/wishes`
- `GET /pairs/:pairId/wishes`
- `PATCH /wishes/:wishId`
- `POST /wishes/:wishId/complete`
- `DELETE /wishes/:wishId`

### Nudge

- `POST /nudges/trigger`
- `GET /nudges/config`

## Nudge Logic (Demo)

On trigger:
1. find active pairs
2. choose cadence from max(user1.nudge_level, user2.nudge_level)
   - `0`: weekly
   - `1`: every 3 days
   - `2`: daily
   - `3`: twice daily
3. select random wish where:
   - `status = pending`
   - `priority = high`
   - `created_at <= now - minAgeDays`
4. notify both users (Expo push if enabled, otherwise simulated)
5. update `pair_nudge_state.last_nudged_at`

Manual demo trigger:

```bash
curl -X POST http://localhost:8787/nudges/trigger \
  -H 'content-type: application/json' \
  -d '{"pairId":"pair_xxx","force":true,"minAgeDays":3}'
```

Scheduled mode:
- set `NUDGE_CRON_ENABLED=true`
- server runs hourly checks and only nudges when pair cadence is due

## Frontend Integration Examples

### 1) Create user

Request:

```http
POST /users
Content-Type: application/json

{
  "email": "a@example.com",
  "nudgeLevel": 2,
  "pushToken": "ExponentPushToken[xxxxx]"
}
```

Response:

```json
{
  "id": "usr_a1b2c3",
  "email": "a@example.com",
  "device_id": null,
  "push_token": "ExponentPushToken[xxxxx]",
  "nudge_level": 2,
  "created_at": "2026-02-14 05:23:10",
  "updated_at": "2026-02-14 05:23:10"
}
```

### 2) Create invite code

Request:

```http
POST /pairs/invite
Content-Type: application/json

{ "userId": "usr_a1b2c3" }
```

Response:

```json
{
  "id": "pair_x1y2z3",
  "user1_id": "usr_a1b2c3",
  "user2_id": null,
  "invite_code": "Q7H2LM",
  "status": "awaiting",
  "created_at": "2026-02-14 05:24:02",
  "updated_at": "2026-02-14 05:24:02",
  "shareText": "Invite code: Q7H2LM"
}
```

### 3) Join pair

Request:

```http
POST /pairs/join
Content-Type: application/json

{ "userId": "usr_other", "inviteCode": "Q7H2LM" }
```

### 4) Create wish

Request:

```http
POST /pairs/pair_x1y2z3/wishes
Content-Type: application/json

{
  "createdBy": "usr_a1b2c3",
  "title": "焼肉に行く",
  "category": "date",
  "priority": "high",
  "timing": "this_month",
  "budgetRange": "~5000",
  "budgetMin": 2000,
  "budgetMax": 5000,
  "memo": "金曜の夜候補"
}
```

### 5) Filter wishes

```http
GET /pairs/pair_x1y2z3/wishes?status=pending&priority=high&maxBudget=5000&sortBy=createdAt&order=desc
```

Response shape:

```json
{
  "total": 1,
  "limit": 50,
  "offset": 0,
  "items": [
    {
      "id": "wish_xxx",
      "pair_id": "pair_x1y2z3",
      "created_by": "usr_a1b2c3",
      "title": "焼肉に行く",
      "priority": "high",
      "status": "pending"
    }
  ]
}
```

### 6) Complete wish

```http
POST /wishes/wish_xxx/complete
Content-Type: application/json

{ "completed": true }
```

## Expo push notes

- Set `EXPO_PUSH_ENABLED=true` to send real push requests.
- Save each device token in `users.push_token`.
- If missing/invalid token, API falls back to simulated delivery in response payload.
