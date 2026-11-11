/**
 * Provision (or rotate) a staff member's login credential.
 *
 *   npx tsx scripts/admin/provision-staff-credential.ts <userId>
 *
 * Run by the staff member themselves (or with them present) in an interactive terminal.
 * The passphrase is typed twice, never echoed, never accepted via argv/env/pipe, and only
 * its scrypt hash is written to the external credential store (STAFF_CREDENTIAL_STORE).
 */
import { AUTHORIZED_MEMBERS } from '../../src/core/auth/staffDirectory.ts';
import { hashCredential, resolveCredentialStorePath, saveCredential } from '../../src/core/auth/credentialStore.ts';
import { assertInteractiveTerminal, promptHidden, rejectSecretArguments } from '../governance/tty-prompt.ts';

async function main() {
  const args = process.argv.slice(2);
  rejectSecretArguments(args);
  assertInteractiveTerminal('Staff credential provisioning');

  const userId = args[0];
  const member = userId ? AUTHORIZED_MEMBERS[userId] : undefined;
  if (!member) {
    throw new Error(`Unknown userId. Allowlisted identities: ${Object.keys(AUTHORIZED_MEMBERS).join(', ')}`);
  }

  console.log(`Provisioning credential for ${member.userName} (${member.userId}, role ${member.role})`);
  const p1 = await promptHidden('New passphrase: ');
  const p2 = await promptHidden('Confirm passphrase: ');
  if (p1 !== p2) throw new Error('Passphrases do not match.');

  const storePath = resolveCredentialStorePath();
  saveCredential(member.userId, hashCredential(p1), storePath);
  console.log(`✅ scrypt credential stored for ${member.userId} in ${storePath}`);
}

main().catch(err => {
  console.error(`❌ ${err.message}`);
  process.exit(1);
});
