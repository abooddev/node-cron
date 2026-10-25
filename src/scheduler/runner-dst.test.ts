import { Runner, nowWithoutMs } from './runner';
import { TimeMatcher } from '../time/time-matcher';

// Regression test for a process TZ that observes DST: inside the repeated
// fall-back hour, "now" must not jump back by the DST shift.
describe('scheduler/runner across a DST fall-back in the process TZ', function(){
  const originalTZ = process.env.TZ;

  beforeEach(function(){
    // Asia/Beirut falls back at 2026-10-24T21:00Z (00:00 EEST -> 23:00 EET),
    // so 21:00Z-22:00Z is the second pass of the 23:xx local hour.
    process.env.TZ = 'Asia/Beirut';
  });

  afterEach(function(){
    vi.useRealTimers();
    if (originalTZ === undefined) delete process.env.TZ;
    else process.env.TZ = originalTZ;
  });

  it('nowWithoutMs keeps the instant inside the repeated hour', function(){
    vi.useFakeTimers({ now: new Date('2026-10-24T21:30:00.500Z') });
    expect(nowWithoutMs().toISOString()).toBe('2026-10-24T21:30:00.000Z');
  });

  it('keeps firing an every-minute task through the repeated hour', async function(){
    vi.useFakeTimers({ now: new Date('2026-10-24T21:00:00.000Z') });

    const fired: number[] = [];
    const runner = new Runner(new TimeMatcher('* * * * *', 'Etc/UTC'), async () => {
      fired.push(Date.now());
    });
    runner.start();

    // 60 minutes, one tick per minute.
    for (let i = 0; i < 60; i++) {
      await vi.advanceTimersByTimeAsync(60_000);
    }
    runner.stop();

    expect(fired.length).toBeGreaterThanOrEqual(59);
  });
});
