import { describe, expect, it } from 'vitest';
import { GovernedSyncCoordinator, sha256Text } from '../src/core/digital-thread/GovernedSyncCoordinator.ts';

const COMMIT = '4b6bf3107abd50fec0074a98563979ca9dae9b42';

describe('M06 — B07 GitHub–Drive–Obsidian–Gemini governed sync state machine', () => {
  it('supports controlled Drive updates, sanitized GitHub index publish, tombstones, and exact-SHA rollback', () => {
    const sync = new GovernedSyncCoordinator();
    const initialSha = sha256Text('Controlled Hull Dossier v1');
    sync.registerArtifact({
      artifactId: 'DOC-HULL-01',
      canonicalMaster: 'GOOGLE_DRIVE_CONTROLLED',
      classification: 'CONTROLLED_RESTRICTED',
      sourceCommitSha: COMMIT,
      contentSha256: initialSha,
      etag: 'etag-1',
      driveUri: 'https://drive.google.com/file/d/abc123',
      obsidianWikilink: '[[DOC-HULL-01]]',
      allowedPrincipals: ['lead-engineer', 'release-bot']
    });

    // Public GitHub can receive a sanitized index entry
    const indexPub = sync.executeMutation({
      requestId: 'REQ-1',
      actorPrincipal: 'release-bot',
      targetSurface: 'GITHUB_PUBLIC_SOURCE',
      artifactId: 'DOC-HULL-01',
      operation: 'PUBLISH_INDEX',
      expectedEtag: 'etag-1',
      newPayloadText: '{"id":"DOC-HULL-01","status":"INDEX_ONLY"}',
      sourceCommitSha: COMMIT
    });
    expect(indexPub.accepted).toBe(true);
    expect(indexPub.liveRemoteAuthenticatedE2eVerified).toBe(false);

    // Tombstone & rollback to initial SHA
    const del = sync.executeMutation({
      requestId: 'REQ-2',
      actorPrincipal: 'lead-engineer',
      targetSurface: 'GOOGLE_DRIVE_CONTROLLED',
      artifactId: 'DOC-HULL-01',
      operation: 'DELETE',
      expectedEtag: indexPub.newEtag,
      sourceCommitSha: COMMIT
    });
    expect(del.accepted).toBe(true);
    expect(sync.getArtifact('DOC-HULL-01')?.deleted).toBe(true);

    const blockedReadAfterDel = sync.executeMutation({
      requestId: 'REQ-3',
      actorPrincipal: 'lead-engineer',
      targetSurface: 'GOOGLE_DRIVE_CONTROLLED',
      artifactId: 'DOC-HULL-01',
      operation: 'WRITE_ARTIFACT',
      sourceCommitSha: COMMIT
    });
    expect(blockedReadAfterDel.code).toBe('NOT_FOUND_OR_DELETED');

    const rollback = sync.executeMutation({
      requestId: 'REQ-4',
      actorPrincipal: 'lead-engineer',
      targetSurface: 'GOOGLE_DRIVE_CONTROLLED',
      artifactId: 'DOC-HULL-01',
      operation: 'ROLLBACK',
      rollbackToSha256: initialSha,
      sourceCommitSha: COMMIT
    });
    expect(rollback.accepted).toBe(true);
    expect(sync.getArtifact('DOC-HULL-01')?.contentSha256).toBe(initialSha);
    expect(sync.getArtifact('DOC-HULL-01')?.deleted).toBe(false);
  });

  it('rejects dual editable masters, restricted/secret GitHub disclosure, stale ETags, ACL violations, and bad import checksums', () => {
    const sync = new GovernedSyncCoordinator();
    const contentSha = sha256Text('Restricted Prop Spec');
    sync.registerArtifact({
      artifactId: 'PROP-RESTRICTED',
      canonicalMaster: 'GOOGLE_DRIVE_CONTROLLED',
      classification: 'CONTROLLED_RESTRICTED',
      sourceCommitSha: COMMIT,
      contentSha256: contentSha,
      etag: 'etag-1',
      allowedPrincipals: ['lead-engineer']
    });

    // Dual editable master on Obsidian rejected
    const dualMaster = sync.executeMutation({
      requestId: 'N-1',
      actorPrincipal: 'lead-engineer',
      targetSurface: 'OBSIDIAN_KNOWLEDGE_GRAPH',
      artifactId: 'PROP-RESTRICTED',
      operation: 'WRITE_ARTIFACT',
      declaredMaster: 'OBSIDIAN_KNOWLEDGE_GRAPH',
      sourceCommitSha: COMMIT
    });
    expect(dualMaster.accepted).toBe(false);
    expect(dualMaster.code).toBe('DUAL_MASTER_CONFLICT');

    // Restricted export to public GitHub blocked
    const restrictedExport = sync.executeMutation({
      requestId: 'N-2',
      actorPrincipal: 'lead-engineer',
      targetSurface: 'GITHUB_PUBLIC_SOURCE',
      artifactId: 'PROP-RESTRICTED',
      operation: 'EXPORT_PACKAGE',
      newPayloadText: 'Supplier proprietary propeller blade table',
      sourceCommitSha: COMMIT
    });
    expect(restrictedExport.accepted).toBe(false);
    expect(restrictedExport.code).toBe('PUBLIC_DISCLOSURE_BLOCKED');

    // Stale ETag blocked
    const stale = sync.executeMutation({
      requestId: 'N-3',
      actorPrincipal: 'lead-engineer',
      targetSurface: 'GOOGLE_DRIVE_CONTROLLED',
      artifactId: 'PROP-RESTRICTED',
      operation: 'WRITE_ARTIFACT',
      expectedEtag: 'etag-0-stale',
      newPayloadText: 'Updated doc',
      sourceCommitSha: COMMIT
    });
    expect(stale.code).toBe('STALE_UPDATE_CONFLICT');

    // Unauthorized actor blocked
    const acl = sync.executeMutation({
      requestId: 'N-4',
      actorPrincipal: 'unprivileged-guest',
      targetSurface: 'GOOGLE_DRIVE_CONTROLLED',
      artifactId: 'PROP-RESTRICTED',
      operation: 'WRITE_ARTIFACT',
      sourceCommitSha: COMMIT
    });
    expect(acl.code).toBe('ACL_DENIED');

    // Bad import checksum rejected
    const badImport = sync.executeMutation({
      requestId: 'N-5',
      actorPrincipal: 'lead-engineer',
      targetSurface: 'GOOGLE_DRIVE_CONTROLLED',
      artifactId: 'PROP-RESTRICTED',
      operation: 'IMPORT_PACKAGE',
      expectedEtag: 'etag-1',
      expectedSha256: 'sha256:' + 'e'.repeat(64),
      newPayloadText: 'Tampered import payload',
      sourceCommitSha: COMMIT
    });
    expect(badImport.code).toBe('CHECKSUM_MISMATCH');
  });
});
