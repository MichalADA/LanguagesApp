# Lexodromia backend

NestJS + Prisma + PostgreSQL. JWT auth (access + refresh), Swagger at `/api/docs`.

## Endpoints (MVP)

| Method | Path                                            | Auth | Purpose                          |
| ------ | ----------------------------------------------- | ---- | -------------------------------- |
| POST   | `/auth/register`                                | —    | Create account, receive tokens   |
| POST   | `/auth/login`                                   | —    | Log in, receive tokens           |
| POST   | `/auth/refresh`                                 | —    | Rotate refresh token             |
| POST   | `/auth/logout`                                  | JWT  | Revoke refresh token(s)          |
| GET    | `/auth/me`                                      | JWT  | Current user (from JWT)          |
| GET    | `/me`                                           | JWT  | Same as /auth/me                 |
| PATCH  | `/me`                                           | JWT  | Update displayName               |
| GET    | `/me/progress`                                  | JWT  | Progress rows per course         |
| GET    | `/me/statistics?courseId=<id or slug>`          | JWT  | Aggregated stats (scoped to me)  |
| GET    | `/me/learning/sessions`                         | JWT  | List my sessions                 |
| POST   | `/me/learning/sessions`                         | JWT  | Start a session for a course     |
| POST   | `/me/learning/sessions/:id/answers`             | JWT  | Record one answer                |
| POST   | `/me/learning/sessions/:id/finish`              | JWT  | Finalize + roll into progress    |
| GET    | `/languages`                                    | —    | List supported languages         |
| GET    | `/courses`                                      | —    | List courses                     |
| GET    | `/courses/:slug`                                | —    | One course                       |

All `/me/*` endpoints derive `userId` from the JWT — never from the request body.

## Local development

```bash
# 1. Start Postgres
docker compose up -d postgres

# 2. Install + configure
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed

# 3. Run
npm run start:dev            # http://localhost:3000 (docs: /api/docs)
```

## Testing

```bash
npm run test         # unit
npm run test:e2e     # e2e — requires DATABASE_URL to point at a real Postgres
```

The e2e suite covers the required security minimums: register, login, invalid
password, protected endpoint without token, and cross-user data isolation.

## Docker

```bash
docker compose up -d --build   # postgres + backend + frontend
```

Backend applies pending migrations on container start (`prisma migrate deploy`),
so the DB is always up-to-date with the code.

## Environment variables

See `.env.example`. Real secrets never live in the repo — the values there are
placeholders. In production, override `JWT_SECRET`, `JWT_REFRESH_SECRET`,
`DATABASE_URL`, and `CORS_ORIGIN`.
