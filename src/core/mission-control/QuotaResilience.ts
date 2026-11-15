/**
 * One shared quota circuit for ALL subscription Codex calls, regardless of
 * agent. We cannot inspect a ChatGPT subscription's true remaining tokens:
 * this is a conservative local request budget plus an error-driven breaker.
 * It never rotates accounts, invokes a paid API or synthesizes fake output.
 */
import os from 'node:os';
import path from 'node:path';
import { mutateDurableState, readDurableState } from './DurableJsonState.ts';

interface QuotaState {
  schemaVersion: 1;
  windowStartedAt: number;
  attemptsInWindow: number;
  blockedUntil: number;
  consecutiveQuotaFailures: number;
  lastReason: string;
  updatedAt: string;
}
export interface QuotaSnapshot {
  state: 'AVAILABLE' | 'WAITING_FOR_QUOTA';
  reason: string;
  remainingLocalAttempts: number;
  attemptsInWindow: number;
  windowEndsAt: string;
  retryAfter: string | null;
  // Not provider-reported remaining tokens or verified account allowance.
  providerAllowanceKnown: false;
}
export class QuotaHoldError extends Error {
  constructor(public readonly retryAfter: string | null, reason: string) {
    super('USV_QUOTA_WAIT: ' + reason + (retryAfter ? '; retry after ' + retryAfter : ''));
    this.name = 'QuotaHoldError';
  }
}

export function isQuotaFailure(message: string): boolean {
  return /USV_QUOTA_WAIT|QUOTA_EXHAUSTED|(?:reached|hit|exceeded|exhausted)[\\s\\S]{0,60}(?:usage|rate|request|message|token|credit)[ -]?(?:limit|quota|allowance)|(?:usage|rate|request|subscription|account|message|token|credit)[ -]?(?:limit|quota|allowance|cap)[\s\S]{0,90}(?:reach|exceed|exhaust|reset|deplet|hit|unavail)|(?:limit|quota|allowance)[\s\S]{0,70}(?:reached|exceeded|exhausted)|too many requests|http\s*429|\b429\s*(?:too many|rate limit)/i.test(message);
}
function positiveInteger(value: string | undefined, fallback: number, ceiling: number): number {
  const number = Number(value);
  return value !== undefined && Number.isSafeInteger(number) && number > 0 && number <= ceiling
    ? number : fallback;
}
function emptyQuota(): QuotaState {
  return { schemaVersion: 1, windowStartedAt: 0, attemptsInWindow: 0,
    blockedUntil: 0, consecutiveQuotaFailures: 0, lastReason: '',
    updatedAt: '' };
}
export function defaultQuotaFile(): string {
  return process.env.USV_QUOTA_STATE_PATH ||
    path.join(os.homedir(), '.usv01', 'runtime', 'codex-quota.json');
}
export class QuotaResilience {
  private readonly maxCalls: number;
  private readonly windowMs: number;
  private readonly cooldownMs: number;
  constructor(
    private readonly file: string = defaultQuotaFile(),
    private readonly clock: () => number = Date.now,
    env: NodeJS.ProcessEnv = process.env
  ) {
    this.maxCalls = positiveInteger(env.USV_MODEL_REQUESTS_PER_WINDOW, 12, 1000);
    this.windowMs = positiveInteger(env.USV_MODEL_WINDOW_MINUTES, 360, 1440) * 60_000;
    this.cooldownMs = positiveInteger(env.USV_QUOTA_COOLDOWN_MINUTES, 60, 1440) * 60_000;
  }
  private validate(state: QuotaState): void {
    if (state.schemaVersion !== 1 || !Number.isSafeInteger(state.attemptsInWindow) ||
      state.attemptsInWindow < 0 || !Number.isFinite(state.blockedUntil) ||
      !Number.isFinite(state.windowStartedAt) ||
      !Number.isSafeInteger(state.consecutiveQuotaFailures)) {
      throw new Error('QUOTA_LEDGER_CORRUPT: manual inspection required; never reset automatically');
    }
  }
  private rollover(state: QuotaState, now: number): void {
    if (!state.windowStartedAt || now - state.windowStartedAt >= this.windowMs) {
      state.windowStartedAt = now;
      state.attemptsInWindow = 0;
    }
  }
  private snapshot(state: QuotaState, now: number): QuotaSnapshot {
    this.validate(state);
    const windowStartedAt = !state.windowStartedAt || now - state.windowStartedAt >= this.windowMs
      ? now : state.windowStartedAt;
    const spent = windowStartedAt === state.windowStartedAt ? state.attemptsInWindow : 0;
    const windowEnds = windowStartedAt + this.windowMs;
    const retryAt = Math.max(state.blockedUntil > now ? state.blockedUntil : 0,
      spent >= this.maxCalls ? windowEnds : 0);
    return {
      state: retryAt > now ? 'WAITING_FOR_QUOTA' : 'AVAILABLE',
      reason: state.blockedUntil > now ? (state.lastReason || 'PROVIDER_QUOTA_EXHAUSTED') :
        spent >= this.maxCalls ? 'LOCAL_REQUEST_BUDGET_EXHAUSTED' : 'AVAILABLE',
      remainingLocalAttempts: Math.max(0, this.maxCalls - spent),
      attemptsInWindow: spent,
      windowEndsAt: new Date(windowEnds).toISOString(),
      retryAfter: retryAt > now ? new Date(retryAt).toISOString() : null,
      providerAllowanceKnown: false
    };
  }
  async status(): Promise<QuotaSnapshot> {
    return this.snapshot(await readDurableState(this.file, emptyQuota), this.clock());
  }
  async reserve(): Promise<QuotaSnapshot> {
    const now = this.clock();
    return mutateDurableState(this.file, emptyQuota, state => {
      this.validate(state);
      this.rollover(state, now);
      const before = this.snapshot(state, now);
      if (before.state === 'WAITING_FOR_QUOTA') throw new QuotaHoldError(before.retryAfter, before.reason);
      // Count BEFORE the subprocess starts. Crashes consume the reservation
      // conservatively; no implicit retry or unlimited calls after restart.
      state.attemptsInWindow++;
      state.updatedAt = new Date(now).toISOString();
      return this.snapshot(state, now);
    });
  }
  async recordQuotaFailure(): Promise<QuotaSnapshot> {
    const now = this.clock();
    return mutateDurableState(this.file, emptyQuota, state => {
      this.validate(state);
      state.consecutiveQuotaFailures = Math.min(10, state.consecutiveQuotaFailures + 1);
      const delay = Math.min(12 * 60 * 60 * 1000,
        this.cooldownMs * 2 ** (state.consecutiveQuotaFailures - 1));
      state.blockedUntil = Math.max(state.blockedUntil, now + delay);
      state.lastReason = 'PROVIDER_QUOTA_EXHAUSTED';
      state.updatedAt = new Date(now).toISOString();
      return this.snapshot(state, now);
    });
  }
  async recordSuccess(): Promise<void> {
    const now = this.clock();
    await mutateDurableState(this.file, emptyQuota, state => {
      this.validate(state);
      state.consecutiveQuotaFailures = 0;
      state.blockedUntil = 0;
      state.lastReason = '';
      state.updatedAt = new Date(now).toISOString();
    });
  }
}
