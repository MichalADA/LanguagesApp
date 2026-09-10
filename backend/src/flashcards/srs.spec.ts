import { scheduleNext } from './srs';

describe('SRS scheduler', () => {
  const initial = { repetitions: 0, easeFactor: 2.5, intervalDays: 0 };

  it('AGAIN resets repetitions and re-shows within the session', () => {
    const next = scheduleNext({ repetitions: 4, easeFactor: 2.5, intervalDays: 15 }, 'AGAIN');
    expect(next.repetitions).toBe(0);
    expect(next.intervalDays).toBe(0);
    expect(next.correct).toBe(false);
    expect(next.nextDelayMs).toBeLessThan(5 * 60_000);
    expect(next.easeFactor).toBeLessThan(2.5);
  });

  it('GOOD on a brand-new card schedules a short in-day review', () => {
    const next = scheduleNext(initial, 'GOOD');
    expect(next.repetitions).toBe(1);
    expect(next.intervalDays).toBe(0);
    expect(next.correct).toBe(true);
    expect(next.nextDelayMs).toBeGreaterThan(10 * 60_000);
  });

  it('two consecutive GOODs place the card multiple days out', () => {
    const first = scheduleNext(initial, 'GOOD');
    const second = scheduleNext(first, 'GOOD');
    expect(second.repetitions).toBe(2);
    expect(second.intervalDays).toBeGreaterThanOrEqual(3);
  });

  it('EASY is more aggressive than GOOD', () => {
    const good = scheduleNext({ repetitions: 3, easeFactor: 2.5, intervalDays: 8 }, 'GOOD');
    const easy = scheduleNext({ repetitions: 3, easeFactor: 2.5, intervalDays: 8 }, 'EASY');
    expect(easy.intervalDays).toBeGreaterThan(good.intervalDays);
    expect(easy.easeFactor).toBeGreaterThan(good.easeFactor);
  });

  it('HARD keeps the card in short review even with high ease', () => {
    const next = scheduleNext({ repetitions: 3, easeFactor: 2.9, intervalDays: 10 }, 'HARD');
    expect(next.intervalDays).toBeGreaterThan(0);
    expect(next.easeFactor).toBeLessThan(2.9);
  });

  it('ease is floored at 1.3', () => {
    let s = { repetitions: 10, easeFactor: 1.35, intervalDays: 10 };
    for (let i = 0; i < 5; i++) s = scheduleNext(s, 'AGAIN');
    expect(s.easeFactor).toBeGreaterThanOrEqual(1.3);
  });
});
