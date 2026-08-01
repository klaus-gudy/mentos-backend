// The reliability fix behind the "Connection terminated" noise seen
// throughout the e2e suite: audit logging and notification firing are
// fire-and-forget by design, so without tracking them, a graceful shutdown
// (or, in tests, a spec's `afterAll` closing the app) can race an in-flight
// write and silently drop it. These tests exercise BackgroundTaskTracker
// directly rather than relying on request timing to happen to expose a bug.

import { INestApplication } from '@nestjs/common';
import { BackgroundTaskTracker } from '../src/common/background-task-tracker.service';
import { createTestApp } from './utils/test-app';

describe('BackgroundTaskTracker (e2e)', () => {
  let app: INestApplication;
  let tracker: BackgroundTaskTracker;

  beforeAll(async () => {
    app = await createTestApp();
    tracker = app.get(BackgroundTaskTracker);
  });

  afterAll(async () => {
    await app.close();
  });

  it('tracks a promise while pending and untracks it once it settles', async () => {
    expect(tracker.pendingCount).toBe(0);

    let resolve!: () => void;
    const pending = new Promise<void>((r) => (resolve = r));
    tracker.track(pending);

    expect(tracker.pendingCount).toBe(1);
    resolve();
    await pending;
    // `.finally` runs as a microtask after the promise settles.
    await Promise.resolve();

    expect(tracker.pendingCount).toBe(0);
  });

  it('untracks a rejected promise too, not just a resolved one', async () => {
    expect(tracker.pendingCount).toBe(0);

    const failing = Promise.reject(new Error('boom')).catch(() => undefined);
    tracker.track(failing);
    expect(tracker.pendingCount).toBe(1);

    await failing;
    await Promise.resolve();
    expect(tracker.pendingCount).toBe(0);
  });

  it('beforeApplicationShutdown waits for in-flight work to finish before returning', async () => {
    let finished = false;
    const slow = new Promise<void>((resolve) =>
      setTimeout(() => {
        finished = true;
        resolve();
      }, 200),
    );
    tracker.track(slow);

    await tracker.beforeApplicationShutdown();

    expect(finished).toBe(true);
    expect(tracker.pendingCount).toBe(0);
  });
});
