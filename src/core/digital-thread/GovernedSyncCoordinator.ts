import { createHash } from 'node:crypto';

export type SyncSurface =
  | 'GITHUB_PUBLIC_SOURCE'
  | 'GOOGLE_DRIVE_CONTROLLED'
  | 'OBSIDIAN_KNOWLEDGE_GRAPH'
  | 'GEMINI_INDEPENDENT_CRITIC';

export type DataClassification = 'PUBLIC_SOURCE_ONLY' | 'CONTROLLED_RESTRICTED';

export interface SyncArtifactRecord {
  artifactId: string;
  canonicalMaster: SyncSurface;
  classification: DataClassification;
  sourceCommitSha: string;
  contentSha256: string;
  etag: string;
  driveUri?: string;
  obsidianWikilink?: string;
  geminiReviewDigest?: string;
  deleted?: boolean;
  allowedPrincipals: string[];
}

export interface SyncMutationRequest {
  requestId: string;
  actorPrincipal: string;
  targetSurface: SyncSurface;
  artifactId: string;
  operation: 'PUBLISH_INDEX' | 'WRITE_ARTIFACT' | 'EXPORT_PACKAGE' | 'IMPORT_PACKAGE' | 'DELETE' | 'ROLLBACK';
  expectedEtag?: string;
  expectedSha256?: string;
  newPayloadText?: string;
  declaredMaster?: SyncSurface;
  sourceCommitSha: string;
  rollbackToSha256?: string;
}

export interface SyncOperationReceipt {
  accepted: boolean;
  code:
    | 'SYNC_OK_OFFLINE_VERIFIED'
    | 'PUBLIC_DISCLOSURE_BLOCKED'
    | 'DUAL_MASTER_CONFLICT'
    | 'STALE_UPDATE_CONFLICT'
    | 'ACL_DENIED'
    | 'CHECKSUM_MISMATCH'
    | 'NOT_FOUND_OR_DELETED'
    | 'INVALID_PROVENANCE';
  reason: string;
  newSha256?: string;
  newEtag?: string;
  // Public/export digest is distinct from the authoritative master artifact digest.
  publishedIndexSha256?: string;
  // Local/simulated coordinator checks NEVER prove live remote Drive/AI Studio uptime.
  liveRemoteAuthenticatedE2eVerified: false;
}

const GIT_SHA = /^[0-9a-f]{40}$/;
const SECRET_PATTERN = /sk-[a-z0-9]{16,}|ghp_[a-z0-9]{20,}|AIza[0-9A-Za-z_-]{20,}|BEGIN PRIVATE KEY|session[_-]?cookie/i;

export function sha256Text(text: string): string {
  return 'sha256:' + createHash('sha256').update(text, 'utf8').digest('hex');
}

/**
 * Governed digital-thread sync state machine across GitHub (public source/index),
 * Google Drive (controlled artifacts), Obsidian (linked knowledge graph), and
 * Gemini (advisory critic receipts). Prevents dual editable masters, secret/restricted
 * leaks to public GitHub, stale overwrites, and unauthorized ACL mutations.
 */
export class GovernedSyncCoordinator {
  private readonly records = new Map<string, SyncArtifactRecord>();
  private readonly history = new Map<string, SyncArtifactRecord[]>();

  public registerArtifact(record: SyncArtifactRecord): void {
    if (!record.artifactId.trim() || !GIT_SHA.test(record.sourceCommitSha)) {
      throw new Error('Artifact registration requires ID and exact 40-hex sourceCommitSha');
    }
    this.records.set(record.artifactId, { ...record, allowedPrincipals: [...record.allowedPrincipals] });
    const hist = this.history.get(record.artifactId) ?? [];
    hist.push({ ...record, allowedPrincipals: [...record.allowedPrincipals] });
    this.history.set(record.artifactId, hist);
  }

  public getArtifact(artifactId: string): SyncArtifactRecord | null {
    const rec = this.records.get(artifactId);
    return rec ? { ...rec, allowedPrincipals: [...rec.allowedPrincipals] } : null;
  }

  public executeMutation(req: SyncMutationRequest): SyncOperationReceipt {
    const fail = (code: SyncOperationReceipt['code'], reason: string): SyncOperationReceipt => ({
      accepted: false,
      code,
      reason,
      liveRemoteAuthenticatedE2eVerified: false
    });

    if (!GIT_SHA.test(req.sourceCommitSha)) {
      return fail('INVALID_PROVENANCE', 'Exact 40-hex sourceCommitSha required for sync provenance');
    }

    const existing = this.records.get(req.artifactId);
    if (!existing) {
      return fail('NOT_FOUND_OR_DELETED', `Artifact ${req.artifactId} is not registered`);
    }
    if (existing.deleted && req.operation !== 'ROLLBACK') {
      return fail('NOT_FOUND_OR_DELETED', `Artifact ${req.artifactId} is tombstoned; use explicit ROLLBACK`);
    }

    // Least-privilege ACL enforcement
    if (!existing.allowedPrincipals.includes(req.actorPrincipal)) {
      return fail('ACL_DENIED', `Principal ${req.actorPrincipal} lacks write permission on ${req.artifactId}`);
    }

    // Single canonical editable master invariant
    if (req.declaredMaster && req.declaredMaster !== existing.canonicalMaster) {
      return fail(
        'DUAL_MASTER_CONFLICT',
        `Rejected dual editable master attempt: canonical master is ${existing.canonicalMaster}, declared ${req.declaredMaster}`
      );
    }
    if (['WRITE_ARTIFACT', 'IMPORT_PACKAGE', 'DELETE', 'ROLLBACK'].includes(req.operation) &&
        req.targetSurface !== existing.canonicalMaster) {
      return fail(
        'DUAL_MASTER_CONFLICT',
        `Surface ${req.targetSurface} cannot mutate artifact owned by ${existing.canonicalMaster}`
      );
    }

    // Cross-provider data transfer is denied for restricted artifacts. Authentication
    // or a configured Gemini button never declassifies client or naval information.
    if (req.targetSurface === 'GEMINI_INDEPENDENT_CRITIC' &&
        existing.classification === 'CONTROLLED_RESTRICTED') {
      return fail('PUBLIC_DISCLOSURE_BLOCKED', 'Restricted content cannot be transferred to Gemini');
    }

    // A public index is a small, deterministic metadata record, not a copy of
    // an artifact. Strict allowlisting prevents arbitrary restricted payloads.
    if (req.operation === 'PUBLISH_INDEX') {
      if (req.targetSurface !== 'GITHUB_PUBLIC_SOURCE') {
        return fail('INVALID_PROVENANCE', 'Indexes may only be published on public source surface');
      }
      let index: unknown;
      try { index = JSON.parse(req.newPayloadText ?? ''); }
      catch { return fail('PUBLIC_DISCLOSURE_BLOCKED', 'Public index must be valid sanitized JSON'); }
      if (!/^[A-Za-z0-9._-]+$/.test(existing.artifactId) ||
          !index || typeof index !== 'object' || Array.isArray(index) ||
          Object.keys(index).sort().join(',') !== 'id,status' ||
          (index as { id?: unknown }).id !== existing.artifactId ||
          (index as { status?: unknown }).status !== 'INDEX_ONLY') {
        return fail('PUBLIC_DISCLOSURE_BLOCKED', 'Public index may contain only artifact ID and INDEX_ONLY status');
      }
    }

    // Public disclosure boundary: GitHub NEVER receives restricted content or credentials/secrets
    if (req.targetSurface === 'GITHUB_PUBLIC_SOURCE') {
      if (existing.classification === 'CONTROLLED_RESTRICTED' && req.operation !== 'PUBLISH_INDEX') {
        return fail(
          'PUBLIC_DISCLOSURE_BLOCKED',
          'CONTROLLED_RESTRICTED artifact content cannot be pushed to public GitHub; publish sanitized index only'
        );
      }
      if (req.newPayloadText && SECRET_PATTERN.test(req.newPayloadText)) {
        return fail('PUBLIC_DISCLOSURE_BLOCKED', 'Potential secret/credential detected in GitHub sync payload');
      }
    }

    // Stale update / concurrent edit conflict detection
    if (req.expectedEtag && req.expectedEtag !== existing.etag) {
      return fail(
        'STALE_UPDATE_CONFLICT',
        `Concurrent edit or stale ETag: expected ${existing.etag}, client supplied ${req.expectedEtag}`
      );
    }
    if (req.operation === 'IMPORT_PACKAGE' && req.expectedSha256 && req.newPayloadText) {
      const actual = sha256Text(req.newPayloadText);
      if (actual !== req.expectedSha256) {
        return fail('CHECKSUM_MISMATCH', `Import checksum mismatch: expected ${req.expectedSha256}, computed ${actual}`);
      }
    }

    // Publishing or exporting does not mutate the canonical master artifact.
    // In particular, the public index's hash must never replace Drive's content
    // digest or ETag; the caller receives a separately identified index digest.
    if (req.operation === 'PUBLISH_INDEX' || req.operation === 'EXPORT_PACKAGE') {
      return {
        accepted: true,
        code: 'SYNC_OK_OFFLINE_VERIFIED',
        reason: `Prepared ${req.operation} for ${req.artifactId} on ${req.targetSurface}`,
        newSha256: existing.contentSha256,
        newEtag: existing.etag,
        publishedIndexSha256: req.operation === 'PUBLISH_INDEX'
          ? sha256Text(req.newPayloadText!) : undefined,
        liveRemoteAuthenticatedE2eVerified: false
      };
    }

    if (req.operation === 'ROLLBACK') {
      const targetSha = req.rollbackToSha256;
      const hist = this.history.get(req.artifactId) ?? [];
      const prior = hist.find(h => h.contentSha256 === targetSha);
      if (!prior) {
        return fail('NOT_FOUND_OR_DELETED', `Rollback target SHA ${targetSha ?? 'none'} not found in version history`);
      }
      const restored: SyncArtifactRecord = {
        ...prior,
        deleted: false,
        etag: `etag-${hist.length + 1}`,
        sourceCommitSha: req.sourceCommitSha
      };
      this.records.set(req.artifactId, restored);
      hist.push(restored);
      return {
        accepted: true,
        code: 'SYNC_OK_OFFLINE_VERIFIED',
        reason: `Rolled back ${req.artifactId} to exact revision ${prior.contentSha256}`,
        newSha256: restored.contentSha256,
        newEtag: restored.etag,
        liveRemoteAuthenticatedE2eVerified: false
      };
    }

    if (req.operation === 'DELETE') {
      const hist = this.history.get(req.artifactId) ?? [];
      const tombstoned: SyncArtifactRecord = {
        ...existing,
        deleted: true,
        etag: `etag-${hist.length + 1}`,
        sourceCommitSha: req.sourceCommitSha
      };
      this.records.set(req.artifactId, tombstoned);
      hist.push(tombstoned);
      return {
        accepted: true,
        code: 'SYNC_OK_OFFLINE_VERIFIED',
        reason: `Tombstoned ${req.artifactId} with rollback history intact`,
        newSha256: tombstoned.contentSha256,
        newEtag: tombstoned.etag,
        liveRemoteAuthenticatedE2eVerified: false
      };
    }

    const nextSha = req.newPayloadText ? sha256Text(req.newPayloadText) : existing.contentSha256;
    const hist = this.history.get(req.artifactId) ?? [];
    const updated: SyncArtifactRecord = {
      ...existing,
      contentSha256: nextSha,
      etag: `etag-${hist.length + 1}`,
      sourceCommitSha: req.sourceCommitSha
    };
    this.records.set(req.artifactId, updated);
    hist.push(updated);

    return {
      accepted: true,
      code: 'SYNC_OK_OFFLINE_VERIFIED',
      reason: `Synchronized ${req.artifactId} (${req.operation}) on ${req.targetSurface}`,
      newSha256: updated.contentSha256,
      newEtag: updated.etag,
      liveRemoteAuthenticatedE2eVerified: false
    };
  }
}
