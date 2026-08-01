import { BeforeApplicationShutdown, Injectable, Logger } from '@nestjs/common';

/**
 * Registry for the fire-and-forget background writes this app deliberately
 * never awaits inline — audit logging (AuditInterceptor) and notification
 * firing (NotificationsService.fireTrigger) both follow "must never fail the
 * request it's describing," which means the request can finish and the
 * connection pool can start tearing down while one of these writes is still
 * in flight. Without this, a real graceful shutdown (or, as observed in the
 * e2e suite, a spec's `afterAll` closing the app right after a mutating
 * request) can silently drop the write — previously just a caught-and-logged
 * "Connection terminated," but the same failure mode in production would
 * mean a real audit entry or notification never lands, with no trace.
 *
 * Implements `beforeApplicationShutdown`, not `onApplicationShutdown` —
 * `@nestjs/typeorm`'s own connection teardown runs in `onApplicationShutdown`
 * (same phase this class originally used), and Nest doesn't guarantee
 * ordering between two unrelated providers' hooks within the same phase.
 * `beforeApplicationShutdown` is a strictly earlier phase, so draining there
 * is guaranteed to finish before the pool closes, however the two happen to
 * be ordered relative to each other.
 *
 * Any of this only actually runs if `app.enableShutdownHooks()` was called
 * at bootstrap (see main.ts) — Nest doesn't wire shutdown lifecycle hooks by
 * default.
 */
@Injectable()
export class BackgroundTaskTracker implements BeforeApplicationShutdown {
  private readonly logger = new Logger(BackgroundTaskTracker.name);
  private readonly inFlight = new Set<Promise<unknown>>();
  private readonly drainTimeoutMs = 5000;

  track(promise: Promise<unknown>): void {
    this.inFlight.add(promise);
    void promise.finally(() => this.inFlight.delete(promise));
  }

  /** Exposed for tests — how many background writes are still pending right now. */
  get pendingCount(): number {
    return this.inFlight.size;
  }

  async beforeApplicationShutdown(): Promise<void> {
    if (this.inFlight.size === 0) return;

    const pending = this.inFlight.size;
    this.logger.log(`Waiting for ${pending} in-flight background write(s) before shutdown...`);

    let timedOut = false;
    const timeout = new Promise<void>((resolve) => {
      setTimeout(() => {
        timedOut = true;
        resolve();
      }, this.drainTimeoutMs);
    });

    await Promise.race([Promise.allSettled([...this.inFlight]), timeout]);

    if (timedOut) {
      this.logger.warn(
        `Shutdown proceeding after ${this.drainTimeoutMs}ms with ${this.inFlight.size} background write(s) still unresolved.`,
      );
    }
  }
}
