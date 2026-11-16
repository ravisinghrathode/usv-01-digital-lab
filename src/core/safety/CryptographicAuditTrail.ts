import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface AuditTrailEntry {
  id: string;
  timestamp: string;
  actor: string;
  role: string;
  action:
    | 'CHANGE_REQUEST_CREATED'
    | 'CHANGE_REQUEST_SUBMITTED'
    | 'PULL_REQUEST_CLASSIFIED'
    | 'STAGE_B_TESTS_VERIFIED'
    | 'STAGE_C_AI_REVIEW_COMPLETED'
    | 'HUMAN_APPROVAL_RECORDED'
    | 'SECURITY_GATE_EVALUATED'
    | 'BASELINE_PROMOTED'
    | 'PRIVILEGED_OVERRIDE_RECORDED'
    | 'RELEASE_MANIFEST_GENERATED';
  changeId?: string;
  details: Record<string, any>;
  previousHash: string;
  hash: string;
}

export class CryptographicAuditTrail {
  private static instance: CryptographicAuditTrail;
  private entries: AuditTrailEntry[] = [];
  private logFilePath: string;
  private readonly genesisHash = 'GENESIS_BLOCK_0000000000000000000000000000000000000000000000000000';

  private constructor() {
    this.logFilePath = path.join(process.cwd(), 'data', 'cryptographic_audit_trail.json');
    this.loadFromDisk();
  }

  public static getInstance(): CryptographicAuditTrail {
    if (!CryptographicAuditTrail.instance) {
      CryptographicAuditTrail.instance = new CryptographicAuditTrail();
    }
    return CryptographicAuditTrail.instance;
  }

  private loadFromDisk(): void {
    if (!fs.existsSync(this.logFilePath)) return;
    // A corrupt or truncated audit trail must never be replaced by a new genesis.
    const raw = fs.readFileSync(this.logFilePath, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('Audit trail must be an array');
    const integrity = CryptographicAuditTrail.verifyChain(parsed as AuditTrailEntry[]);
    if (!integrity.valid) throw new Error(`Audit trail integrity failure: ${integrity.error}`);
    this.entries = parsed as AuditTrailEntry[];
  }

  private persistToDisk(entries: AuditTrailEntry[]): void {
    const dir = path.dirname(this.logFilePath);
    fs.mkdirSync(dir, { recursive: true });
    const tmp = path.join(dir, `.${path.basename(this.logFilePath)}.${process.pid}.${crypto.randomBytes(8).toString('hex')}.tmp`);
    try {
      const fd = fs.openSync(tmp, 'wx', 0o600);
      try {
        fs.writeFileSync(fd, JSON.stringify(entries, null, 2), 'utf8');
        fs.fsyncSync(fd);
      } finally {
        fs.closeSync(fd);
      }
      fs.renameSync(tmp, this.logFilePath);
      // Best-effort directory durability; unsupported platforms may reject directory fsync.
      try {
        const dirFd = fs.openSync(dir, 'r');
        try { fs.fsyncSync(dirFd); } finally { fs.closeSync(dirFd); }
      } catch { /* directory fsync unavailable */ }
    } finally {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    }
  }

  /**
   * Computes SHA-256 block hash chaining previousHash to current record contents
   */
  public static computeEntryHash(entry: Omit<AuditTrailEntry, 'hash'>): string {
    const payload = `${entry.id}:${entry.timestamp}:${entry.actor}:${entry.role}:${entry.action}:${entry.changeId || ''}:${entry.previousHash}:${JSON.stringify(entry.details)}`;
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  /**
   * Appends an immutable, hash-chained entry to the audit trail
   */
  public appendEntry(data: {
    actor: string;
    role: string;
    action: AuditTrailEntry['action'];
    changeId?: string;
    details: Record<string, any>;
  }): AuditTrailEntry {
    const previousEntry = this.entries[this.entries.length - 1];
    const previousHash = previousEntry ? previousEntry.hash : 'GENESIS_BLOCK_0000000000000000000000000000000000000000000000000000000000000000';
    const id = `AUDIT-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const timestamp = new Date().toISOString();

    const recordSansHash: Omit<AuditTrailEntry, 'hash'> = {
      id,
      timestamp,
      actor: data.actor,
      role: data.role,
      action: data.action,
      changeId: data.changeId,
      details: data.details,
      previousHash
    };

    const hash = CryptographicAuditTrail.computeEntryHash(recordSansHash);
    const completeEntry: AuditTrailEntry = {
      ...recordSansHash,
      hash
    };

    // Commit to disk before exposing the record in memory or returning success.
    this.persistToDisk([...this.entries, completeEntry]);
    this.entries.push(completeEntry);
    return completeEntry;
  }

  public getEntries(): AuditTrailEntry[] {
    return structuredClone(this.entries);
  }

  /**
   * Cryptographically verifies the entire hash chain from genesis block to tip.
   * Detects any altered data, retroactively inserted records, or broken hash pointers.
   */
  public verifyIntegrity(): { valid: boolean; compromisedAtIndex?: number; error?: string } {
    return CryptographicAuditTrail.verifyChain(this.entries);
  }

  public static verifyChain(chain: AuditTrailEntry[]): { valid: boolean; compromisedAtIndex?: number; error?: string } {
    let expectedPrevHash = 'GENESIS_BLOCK_0000000000000000000000000000000000000000000000000000000000000000';

    for (let i = 0; i < chain.length; i++) {
      const entry = chain[i];
      if (!entry || typeof entry !== 'object' || typeof entry.hash !== 'string' ||
          typeof entry.previousHash !== 'string' || typeof entry.details !== 'object' ||
          entry.details === null || Array.isArray(entry.details)) {
        return { valid: false, compromisedAtIndex: i, error: 'Malformed audit entry' };
      }

      // 1. Verify previous hash pointer
      if (entry.previousHash !== expectedPrevHash) {
        return {
          valid: false,
          compromisedAtIndex: i,
          error: `Broken chain pointer at index ${i}: expected previousHash '${expectedPrevHash}', found '${entry.previousHash}'`
        };
      }

      // 2. Recompute SHA-256 and verify block hash
      const recomputed = CryptographicAuditTrail.computeEntryHash(entry);
      if (recomputed !== entry.hash) {
        return {
          valid: false,
          compromisedAtIndex: i,
          error: `Tamper detected at index ${i}: record content does not match cryptographic hash. Computed: '${recomputed}', Recorded: '${entry.hash}'`
        };
      }

      expectedPrevHash = entry.hash;
    }

    return { valid: true };
  }
}
