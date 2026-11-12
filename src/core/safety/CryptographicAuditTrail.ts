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
    if (fs.existsSync(this.logFilePath)) {
      try {
        const raw = fs.readFileSync(this.logFilePath, 'utf8');
        this.entries = JSON.parse(raw);
      } catch (err) {
        console.warn('Could not parse existing audit trail file; initializing fresh chain.', err);
        this.entries = [];
      }
    }
  }

  private persistToDisk(): void {
    try {
      const dir = path.dirname(this.logFilePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.logFilePath, JSON.stringify(this.entries, null, 2), 'utf8');
    } catch (err) {
      console.warn('Could not persist audit trail to disk:', err);
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

    this.entries.push(completeEntry);
    this.persistToDisk();
    return completeEntry;
  }

  public getEntries(): AuditTrailEntry[] {
    return [...this.entries];
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
