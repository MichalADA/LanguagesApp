# Lexodromia backend

NestJS + Prisma + PostgreSQL. JWT auth (access + refresh), Swagger at `/api/docs`.

## Endpoints (MVP)

| Method | Path                                            | Auth | Purpose                          |
| ------ | ----------------------------------------------- | ---- | -------------------------------- |
| POST   | `/auth/register`                                | —    | Create account + set refresh cookie |
| POST   | `/auth/login`                                   | —    | Log in + set refresh cookie      |
| POST   | `/auth/refresh`                                 | Cookie | Rotate refresh cookie          |
| POST   | `/auth/logout`                                  | Cookie | Revoke and clear refresh cookie |
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
| GET    | `/health/live`                                  | —    | Process liveness                 |
| GET    | `/health/ready`                                 | —    | API + PostgreSQL readiness       |

All `/me/*` endpoints derive `userId` from the JWT — never from the request body.
Responses expose only the short-lived access token. The refresh token is stored in an
`HttpOnly`, `SameSite=Lax` cookie and is not accessible to frontend JavaScript.

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

The e2e suite covers registration, cookie rotation/logout, invalid passwords,
rate limiting, session integrity, statistics and cross-user data isolation.

## Docker

```bash
docker compose up -d --build   # postgres + backend + frontend
```

Backend applies pending migrations on container start (`prisma migrate deploy`),
so the DB is always up-to-date with the code.

## Environment variables

See `.env.example`. Real secrets never live in the repo — the values there are
development placeholders. Production startup fails for weak/default secrets or
insecure refresh cookies. Override `JWT_SECRET`, `JWT_REFRESH_SECRET`, `DATABASE_URL`,
`AUTH_COOKIE_SECURE=true`, and `CORS_ORIGIN`.
