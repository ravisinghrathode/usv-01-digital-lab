# PR-04 persistence durability: file and directory sync

**Phase 2 of storage remediation, not final ACID certification.**

The previous `saveProjectStore` wrote a temporary JSON file and renamed it,
but never required the temporary file to be durably flushed. On power loss,
a successful rename could be exposed without durable file bytes.

The new write path uses an exclusive 0600 temporary file, writes the validated
16-collection document, calls `fsync` on the file **before** renaming,
replaces the destination atomically, and requests a parent-directory `fsync`
to durably record the rename on filesystems where supported. It cleans up
uncommitted temporary files on all pre-rename failures.

Limitations:
- Filesystems that reject directory fsync are not certified for power-loss
  resilience. On such platforms a rename may still be lost after a crash.
- A rare error in directory fsync after rename can make the commit outcome
  ambiguous; operators must inspect disk before retrying.
- A JSON snapshot is NOT a WAL/SQLite transaction engine. Interprocess writer
  coordination, migrations, a cryptographic outbox and restore/fault injection
  are still required.
- Backup encryption, access controls and naval engineering sign-off remain
  separate mandatory gates.

No tested real power-loss claim or independent acceptance is implied.
