import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * These tests require a running Postgres and a fresh database.
 * See backend/README.md for `docker compose up -d postgres && npm run prisma:migrate:dev`.
 *
 * They cover the security minimums the spec calls out:
 *   1. register, 2. login, 3. wrong password rejected,
 *   4. protected endpoint without token → 401,
 *   5. user A cannot read user B data,
 *   6. statistics only return the caller's data.
 */
describe('Auth + data isolation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let aliceAgent: ReturnType<typeof request.agent>;
  let bobAgent: ReturnType<typeof request.agent>;

  const alice = {
    email: `alice+${Date.now()}@example.com`,
    password: 'AliceStrongPass1!',
    displayName: 'Alice',
  };
  const bob = {
    email: `bob+${Date.now()}@example.com`,
    password: 'BobStrongPass1!',
    displayName: 'Bob',
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
    aliceAgent = request.agent(app.getHttpServer());
    bobAgent = request.agent(app.getHttpServer());
  });

  afterAll(async () => {
    await prisma.learningAnswer.deleteMany({ where: { user: { email: { in: [alice.email, bob.email] } } } });
    await prisma.learningSession.deleteMany({ where: { user: { email: { in: [alice.email, bob.email] } } } });
    await prisma.userCourseProgress.deleteMany({ where: { user: { email: { in: [alice.email, bob.email] } } } });
    await prisma.refreshToken.deleteMany({ where: { user: { email: { in: [alice.email, bob.email] } } } });
    await prisma.user.deleteMany({ where: { email: { in: [alice.email, bob.email] } } });
    await app.close();
  });

  it('reports liveness and database readiness', async () => {
    await request(app.getHttpServer()).get('/health/live').expect(200, { status: 'ok' });
    await request(app.getHttpServer()).get('/health/ready').expect(200, { status: 'ok' });
  });

  it('registers a new user', async () => {
    const res = await aliceAgent.post('/auth/register').send(alice).expect(201);
    expect(res.body.user.email).toBe(alice.email);
    expect(res.body.tokens.accessToken).toBeDefined();
    expect(res.body.tokens.refreshToken).toBeUndefined();
    expect(res.headers['set-cookie']?.[0]).toContain('HttpOnly');
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('rejects duplicate email registration', async () => {
    await request(app.getHttpServer()).post('/auth/register').send(alice).expect(409);
  });

  it('restores a session by rotating the HttpOnly refresh cookie', async () => {
    const res = await aliceAgent.post('/auth/refresh').expect(200);
    expect(res.body.tokens.accessToken).toBeDefined();
    expect(res.body.tokens.refreshToken).toBeUndefined();
    expect(res.headers['set-cookie']?.[0]).toContain('lexodromia_refresh=');
    await request(app.getHttpServer()).post('/auth/refresh').expect(401);
  });

  it('logs in with correct password', async () => {
    const res = await aliceAgent
      .post('/auth/login')
      .send({ email: alice.email, password: alice.password })
      .expect(200);
    expect(res.body.tokens.accessToken).toBeDefined();
  });

  it('rejects login with wrong password', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: alice.email, password: 'wrong-password' })
      .expect(401);
  });

  it('rejects /me without token', async () => {
    await request(app.getHttpServer()).get('/me').expect(401);
    await request(app.getHttpServer()).get('/me/statistics').expect(401);
    await request(app.getHttpServer()).get('/me/progress').expect(401);
  });

  it('isolates user data: Bob cannot see Alice statistics', async () => {
    // Register Bob.
    await bobAgent.post('/auth/register').send(bob).expect(201);

    // Log both in fresh.
    const aliceLogin = await aliceAgent
      .post('/auth/login')
      .send({ email: alice.email, password: alice.password })
      .expect(200);
    const bobLogin = await bobAgent
      .post('/auth/login')
      .send({ email: bob.email, password: bob.password })
      .expect(200);

    const aliceToken = aliceLogin.body.tokens.accessToken;
    const bobToken = bobLogin.body.tokens.accessToken;

    // Ensure a course exists (from seed) — grab first one.
    const courses = await request(app.getHttpServer()).get('/courses').expect(200);
    expect(courses.body.length).toBeGreaterThan(0);
    const courseSlug: string = courses.body[0].slug;

    // Alice runs a small session with 2 correct + 1 wrong answers.
    const startAlice = await request(app.getHttpServer())
      .post('/me/learning/sessions')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ course: courseSlug })
      .expect(201);
    const aliceSessionId: string = startAlice.body.id;

    for (const correct of [true, true, false]) {
      await request(app.getHttpServer())
        .post(`/me/learning/sessions/${aliceSessionId}/answers`)
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ wordRef: 'w1', answer: 'foo', correct })
        .expect(201);
    }
    await request(app.getHttpServer())
      .post(`/me/learning/sessions/${aliceSessionId}/finish`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .expect(201);

    // Finishing is idempotent and closed sessions reject late answers.
    await request(app.getHttpServer())
      .post(`/me/learning/sessions/${aliceSessionId}/finish`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .expect(201);
    await request(app.getHttpServer())
      .post(`/me/learning/sessions/${aliceSessionId}/answers`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ wordRef: 'late', answer: 'late', correct: true })
      .expect(409);

    // Alice stats should reflect her session.
    const aliceStats = await request(app.getHttpServer())
      .get('/me/statistics')
      .set('Authorization', `Bearer ${aliceToken}`)
      .expect(200);
    expect(aliceStats.body.totalAnswers).toBe(3);
    expect(aliceStats.body.correctAnswers).toBe(2);
    expect(aliceStats.body.wrongAnswers).toBe(1);
    expect(aliceStats.body.totalSessions).toBe(1);
    expect(aliceStats.body.wordsLearned).toBe(0);

    // Bob stats must be zero — no leakage.
    const bobStats = await request(app.getHttpServer())
      .get('/me/statistics')
      .set('Authorization', `Bearer ${bobToken}`)
      .expect(200);
    expect(bobStats.body.totalAnswers).toBe(0);
    expect(bobStats.body.correctAnswers).toBe(0);
    expect(bobStats.body.totalSessions).toBe(0);

    // Bob's progress list must be empty.
    const bobProgress = await request(app.getHttpServer())
      .get('/me/progress')
      .set('Authorization', `Bearer ${bobToken}`)
      .expect(200);
    expect(bobProgress.body).toEqual([]);

    // Bob cannot touch Alice's session directly.
    await request(app.getHttpServer())
      .post(`/me/learning/sessions/${aliceSessionId}/answers`)
      .set('Authorization', `Bearer ${bobToken}`)
      .send({ wordRef: 'w1', answer: 'foo', correct: true })
      .expect(403);
  });

  it('counts completed sessions without granting mastery for immediate repeated answers', async () => {
    const login = await aliceAgent
      .post('/auth/login')
      .send({ email: alice.email, password: alice.password })
      .expect(200);
    const token = login.body.tokens.accessToken;
    const course = (await request(app.getHttpServer()).get('/courses').expect(200)).body[0];

    const unfinished = await request(app.getHttpServer())
      .post('/me/learning/sessions')
      .set('Authorization', `Bearer ${token}`)
      .send({ course: course.slug })
      .expect(201);

    const before = await request(app.getHttpServer())
      .get('/me/statistics')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(before.body.totalSessions).toBe(1);

    await request(app.getHttpServer())
      .post(`/me/learning/sessions/${unfinished.body.id}/answers`)
      .set('Authorization', `Bearer ${token}`)
      .send({ wordRef: 'w1', answer: 'foo', correct: true })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/me/learning/sessions/${unfinished.body.id}/finish`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    const after = await request(app.getHttpServer())
      .get('/me/statistics')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(after.body.totalSessions).toBe(2);
    expect(after.body.wordsLearned).toBe(0);
  });

  it('logs out by revoking and clearing the refresh cookie', async () => {
    const logout = await aliceAgent.post('/auth/logout').expect(204);
    expect(logout.headers['set-cookie']?.[0]).toContain('lexodromia_refresh=;');
    await aliceAgent.post('/auth/refresh').expect(401);
  });

  it('rate limits repeated login attempts', async () => {
    let rateLimited = false;
    for (let attempt = 0; attempt < 21; attempt += 1) {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nobody@example.com', password: 'wrong-password' });
      if (response.status === 429) {
        rateLimited = true;
        break;
      }
      expect(response.status).toBe(401);
    }
    expect(rateLimited).toBe(true);
  });
});
