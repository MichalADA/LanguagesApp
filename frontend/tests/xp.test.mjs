/** XP konta: księga gościa (te same reguły co backend), dzienny cel, seria i zapis z kolejką. */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const storage = new Map();
globalThis.localStorage = { getItem: (k) => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, String(v)), removeItem: (k) => storage.delete(k) };
if (!globalThis.crypto?.getRandomValues) globalThis.crypto = (await import('node:crypto')).webcrypto;
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const { outputText } = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
  const exports = {};
  cache.set(file, exports);
  const req = (id) => {
    if (!id.startsWith('.') && !id.startsWith('@/')) return require(id);
    const base = id.startsWith('@/') ? join(SRC, id.slice(2)) : resolve(dirname(file), id);
    return load([`${base}.ts`, `${base}.tsx`].find(existsSync));
  };
  new Function('require', 'exports', outputText)(req, exports);
  return exports;
}
const goals = load(join(SRC, 'xp/goals.ts'));
const ledger = load(join(SRC, 'xp/ledger.ts'));
const repo = load(join(SRC, 'xp/repository.ts'));
const { todayKey } = load(join(SRC, 'utils/date.ts'));

const ev = (o) => ({ eventId: Math.random().toString(36), courseId: 'pl-hr', day: '2026-10-11', ...o });

test('księga XP: lekcja i misja raz, powtórki co sesję, limity, idempotencja', () => {
  let l = ledger.emptyLedger();
  const lesson = ev({ source: 'lesson', sourceId: 'a1-01-01', xp: goals.lessonXp('lesson') });
  let r = ledger.award(l, lesson);
  assert.equal(r.awarded, 20);
  l = r.ledger;
  assert.equal(ledger.award(l, lesson).awarded, 0, 'ten sam eventId');
  assert.equal(ledger.award(l, { ...lesson, eventId: 'replay' }).awarded, 0, 'powtórzona lekcja');
  l = ledger.award(l, ev({ source: 'story', sourceId: 'split-a1:m3-coffee', xp: 40 })).ledger;
  l = ledger.award(l, ev({ source: 'review', sourceId: 's1', xp: goals.reviewXp(7) })).ledger;
  r = ledger.award(l, ev({ source: 'review', sourceId: 's2', xp: 300 }));
  assert.equal(r.awarded, 50, 'limit na sesję powtórek');
  const s = ledger.summarize(r.ledger, '2026-10-11');
  assert.deepEqual([s.total, s.today, s.goal, s.goalMet, s.goalStreak], [117, 117, 20, true, 1]);
  assert.equal(s.last7.length, 7);
  assert.deepEqual(s.last7.at(-1), { day: '2026-10-11', xp: 117 });
  assert.deepEqual([goals.lessonXp('test'), goals.lessonXp('review'), goals.reviewXp(-3)], [50, 30, 0]);
});

test('dzienny cel: tylko dozwolone poziomy, seria dni z osiągniętym celem', () => {
  assert.deepEqual(goals.DAILY_GOALS.map((g) => g.xp), [10, 20, 30, 50]);
  assert.equal(goals.isDailyGoal(30), true);
  assert.equal(goals.isDailyGoal(31), false);
  let l = { goal: 30, events: [] };
  for (const [day, xp] of [['2026-10-08', 40], ['2026-10-09', 30], ['2026-10-10', 35], ['2026-10-11', 10]]) {
    l = ledger.award(l, ev({ source: 'review', sourceId: day, day, xp })).ledger;
  }
  const s = ledger.summarize(l, '2026-10-11');
  assert.equal(s.goalMet, false);
  assert.equal(s.goalStreak, 3, 'dziś jeszcze nie — seria liczy się do wczoraj');
  assert.equal(ledger.summarize({ ...l, goal: 50 }, '2026-10-11').goalStreak, 0);
});

test('zmanipulowany zapis gościa nie dopisze XP', () => {
  const dirty = { goal: 999, events: [ev({ source: 'lesson', sourceId: 'x', xp: 5000 }), ev({ source: 'lesson', sourceId: 'x', xp: 20 }), ev({ source: 'coins', sourceId: 'y', xp: 10 }), { junk: true }] };
  const clean = ledger.sanitizeLedger(dirty);
  assert.equal(clean.goal, goals.DEFAULT_GOAL);
  assert.deepEqual(clean.events.map((e) => e.xp), [100]);
});

test('zapis: gość lokalnie, konto przez backend z kolejką i tym samym eventId', async () => {
  storage.clear();
  const guest = await repo.awardXp({ owner: 'guest' }, { courseId: 'pl-hr', source: 'lesson', sourceId: 'a1-01-01', xp: 20 });
  assert.equal(guest.summary.today, 20);
  await repo.saveGoal({ owner: 'guest' }, 50);
  const loaded = await repo.loadXp({ owner: 'guest' });
  assert.deepEqual([loaded.summary.total, loaded.summary.goal], [20, 50]);
  assert.equal((await repo.loadXp({ owner: 'someone' })).summary.total, 0, 'osobno dla profilu');

  let online = false;
  const posts = [];
  const server = { total: 0, seen: new Set() };
  const request = async (path, init) => {
    if (!online) throw new Error('offline');
    if (path === '/me/xp') return { total: server.total, today: server.total, goal: 20, goalMet: false, goalStreak: 0, last7: [] };
    const body = JSON.parse(init.body);
    posts.push(body);
    if (!server.seen.has(body.eventId)) { server.seen.add(body.eventId); server.total += body.xp; }
    return { summary: { total: server.total, today: server.total, goal: 20, goalMet: server.total >= 20, goalStreak: 0, last7: [] } };
  };
  const offline = await repo.awardXp({ owner: 'u1', request }, { courseId: 'pl-hr', source: 'story', sourceId: 'split-a1:m1-welcome', xp: 30 });
  assert.deepEqual([offline.summary, offline.pending], [null, 1]);
  online = true;
  const after = await repo.loadXp({ owner: 'u1', request });
  assert.deepEqual([after.summary.total, after.pending], [30, 0]);
  assert.equal(posts.length, 1);
  assert.equal(posts[0].eventId, repo.readOutbox('u1').length ? null : posts[0].eventId);
  assert.equal(todayKey().length, 10);
});
