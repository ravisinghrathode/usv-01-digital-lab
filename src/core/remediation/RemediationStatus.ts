export const REMEDIATION_IDS = Array.from(
  { length: 12 }, (_, index) => 'PR-' + String(index + 1).padStart(2, '0')
) as readonly string[];

export interface RemediationSummary {
  schemaVersion: 'USV-REMEDIATION-1';
  total: 12;
  completeAndIndependentlyVerified: 0;
  partiallyImplemented: number;
  notVerified: number;
  issues: Array<{
    id: string;
    status: 'PARTIAL_IMPLEMENTATION' | 'NOT_VERIFIED';
    pullRequest: string | null;
    blocker: string;
  }>;
  conclusion: 'NO_INDEPENDENT_COMPLETION_EVIDENCE';
  warning: 'A repository status declaration is not a verified GitHub merge, CI run, independent reviewer signature, or naval engineering release';
}

// Reject bidirectional controls, invisible fillers and variation selectors that can disguise provenance text.
const UNSAFE_STATUS_TEXT = /[\x00-\x1f\x7f-\x9f\u00ad\u034f\u061c\u115f\u1160\u180e\u3164\uffa0\u200b-\u200f\u2028-\u202e\u2060\u2066-\u206f\ufe00-\ufe0f\ufeff\u{e0000}-\u{e007f}\u{e0100}-\u{e01ef}]/u;

// Variation selectors can conceal visually distinct provenance strings while
// preserving otherwise ordinary text; reject both BMP and supplementary ranges.
// JSON permits escaped lone UTF-16 surrogates, but their replacement glyphs can
// obscure provenance or review wording in downstream terminals and dashboards.
function hasUnpairedSurrogate(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const unit = text.charCodeAt(i);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = text.charCodeAt(++i);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return true;
    }
  }
  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// Inspect all own keys before reading any values: Object.keys omits hidden
// approval assertions, and getters can change claims during validation.
function assertPlainDataRecord(value: unknown, allowed: ReadonlySet<string>, scope: string): asserts value is Record<string, unknown> {
  if (!isRecord(value) || (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) {
    throw new Error('REMEDIATION_LEDGER_INVALID: malformed ' + scope);
  }
  for (const required of allowed) {
    if (!Object.prototype.hasOwnProperty.call(value, required)) {
      throw new Error('REMEDIATION_LEDGER_INVALID: missing ' + scope + ' field');
    }
  }
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || !allowed.has(key)) {
      throw new Error('REMEDIATION_LEDGER_INVALID: unsupported ' + scope + ' field');
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, 'value') || !descriptor.enumerable) {
      throw new Error('REMEDIATION_LEDGER_INVALID: accessor-backed ' + scope + ' field');
    }
  }
}

// Arrays can carry hidden approval claims or accessor-backed indices even when
// their visible elements look like ordinary JSON. Reject non-JSON array shapes.
function assertPlainDataArray(value: unknown, scope: string): asserts value is unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    throw new Error('REMEDIATION_LEDGER_INVALID: malformed ' + scope + ' array');
  }
  for (const key of Reflect.ownKeys(value)) {
    if (key === 'length') continue;
    if (typeof key !== 'string' || !/^(0|[1-9][0-9]*)$/.test(key) ||
        Number(key) >= value.length) {
      throw new Error('REMEDIATION_LEDGER_INVALID: unsupported ' + scope + ' array field');
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, 'value') || !descriptor.enumerable) {
      throw new Error('REMEDIATION_LEDGER_INVALID: accessor-backed ' + scope + ' array field');
    }
  }
  for (let index = 0; index < value.length; index++) {
    if (!Object.prototype.hasOwnProperty.call(value, index)) {
      throw new Error('REMEDIATION_LEDGER_INVALID: sparse ' + scope + ' array');
    }
  }
}

/**
 * Explicitly rejects any claimed accepted/complete state until a separately
 * authenticated verifier can validate CI, human review, exact SHA and E2E
 * acceptance. This legacy status file CANNOT certify itself.
 */
export function summarizeUnverifiedRemediationLedger(value: unknown): RemediationSummary {
  // Validate descriptors before accessing any root field. Otherwise an
  // attacker-controlled schemaVersion/items getter executes before rejection.
  const rootFields = new Set(['schemaVersion', 'baseline', 'updatedAt', 'items', 'constraints']);
  assertPlainDataRecord(value, rootFields, 'root');
  if (value.schemaVersion !== 'USV-REMEDIATION-1' ||
      !Array.isArray(value.items) || value.items.length !== REMEDIATION_IDS.length) {
    throw new Error('REMEDIATION_LEDGER_INVALID: expected 12 canonical tasks');
  }
  assertPlainDataArray(value.items, 'items');
  // Bound array traversal before enumerating keys or checking for holes. A
  // hostile sparse array can advertise billions of slots without allocating
  // them; validation must reject it in constant time.
  if (!Array.isArray(value.constraints)) {
    throw new Error('REMEDIATION_LEDGER_INVALID: malformed constraints array');
  }
  if (value.constraints.length === 0 || value.constraints.length > 32) {
    throw new Error('REMEDIATION_LEDGER_INVALID: malformed provenance metadata');
  }
  assertPlainDataArray(value.constraints, 'constraints');
  // Metadata must be structurally valid; otherwise malformed or injected
  // provenance fields can masquerade as a trustworthy remediation ledger.
  if (typeof value.baseline !== 'string' || !/^[0-9a-f]{40}$/.test(value.baseline) ||
      typeof value.updatedAt !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(value.updatedAt) ||
      !Number.isFinite(Date.parse(value.updatedAt + 'T00:00:00Z')) ||
      new Date(value.updatedAt + 'T00:00:00Z').toISOString().slice(0, 10) !== value.updatedAt ||
      !Array.isArray(value.constraints) || value.constraints.length === 0 ||
      value.constraints.length > 32 ||
      new Set(value.constraints.filter((entry): entry is string => typeof entry === 'string').map(entry => entry.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US'))).size !== value.constraints.length ||
      value.constraints.some(constraint => typeof constraint !== 'string' ||
        !constraint.trim() || constraint.length > 1000 || (UNSAFE_STATUS_TEXT.test(constraint) || hasUnpairedSurrogate(constraint) || constraint.normalize('NFC') !== constraint))) {
    throw new Error('REMEDIATION_LEDGER_INVALID: malformed provenance metadata');
  }
  const itemFields = new Set(['id', 'state', 'pullRequest', 'verification']);
  const issues: RemediationSummary['issues'] = [];
  const seen = new Set<string>();
  for (const [index, unknownItem] of value.items.entries()) {
    assertPlainDataRecord(unknownItem, itemFields, 'item');
    const id = unknownItem.id;
    if (id !== REMEDIATION_IDS[index] || seen.has(id as string)) {
      throw new Error('REMEDIATION_LEDGER_INVALID: duplicate or out-of-order item');
    }
    seen.add(id as string);
    const state = unknownItem.state;
    const isPartial = state === 'partial-implementation-awaiting-review';
    if (!isPartial && state !== 'not-verified') {
      throw new Error('REMEDIATION_LEDGER_UNVERIFIED_COMPLETION_CLAIM: unsupported unsigned item state');
    }
    const link = unknownItem.pullRequest;
    // Bound untrusted URLs before regex validation; GitHub PR identifiers are
    // decimal integers, not arbitrarily long strings supplied by a ledger.
    if (typeof link !== 'string' || link.length > 150 ||
        (link.length > 0 &&
          !/^https:\/\/github\.com\/ravisinghrathode\/usv-01-digital-lab\/pull\/[1-9][0-9]*$/.test(link) ||
          !Number.isSafeInteger(Number(link.slice(link.lastIndexOf('/') + 1))))) {
      throw new Error('REMEDIATION_LEDGER_INVALID: noncanonical PR link');
    }
    // A partial implementation must identify inspectable work and an explicit
    // outstanding verification note. Otherwise the dashboard could display
    // progress based solely on an unsubstantiated state string.
    // Any cited PR, even on a not-yet-verified workstream, must carry an
    // explicit blocker. A bare URL is not evidence of technical progress.
    if ((isPartial || link.length > 0) &&
        (!link || typeof unknownItem.verification !== 'string' ||
          !unknownItem.verification.trim())) {
      throw new Error('REMEDIATION_LEDGER_INVALID: partial item lacks PR or blocker');
    }
    if (unknownItem.verification !== null &&
        (typeof unknownItem.verification !== 'string' ||
          unknownItem.verification.length > 4000 ||
          (UNSAFE_STATUS_TEXT.test(unknownItem.verification) || hasUnpairedSurrogate(unknownItem.verification) || unknownItem.verification.normalize('NFC') !== unknownItem.verification))) {
      throw new Error('REMEDIATION_LEDGER_INVALID: invalid verification note');
    }
    issues.push({
      id: id as string,
      status: isPartial ? 'PARTIAL_IMPLEMENTATION' : 'NOT_VERIFIED',
      pullRequest: link || null,
      blocker: typeof unknownItem.verification === 'string' && unknownItem.verification.trim()
        ? unknownItem.verification : 'No evidence of complete independent acceptance recorded'
    });
  }
  const partiallyImplemented = issues.filter(i => i.status === 'PARTIAL_IMPLEMENTATION').length;
  return {
    schemaVersion: 'USV-REMEDIATION-1',
    total: 12,
    completeAndIndependentlyVerified: 0,
    partiallyImplemented,
    notVerified: 12 - partiallyImplemented,
    issues,
    conclusion: 'NO_INDEPENDENT_COMPLETION_EVIDENCE',
    warning: 'A repository status declaration is not a verified GitHub merge, CI run, independent reviewer signature, or naval engineering release'
  };
}
