/**
 * Independent reviewer tool. It never validates the physical truth of a
 * document automatically. A qualified human reviewer must first inspect the
 * source record and intentionally sign their own findings using a private
 * key outside Git. Same-model agent review is not independent.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash, createPrivateKey, createPublicKey, sign } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  EXTERNAL_REVIEW_SCHEMA, canonicalExternalReview,
  type ExternalEngineeringReview, type LiveCampaignEvidence
} from '../../src/core/verification/EngineeringCampaignAcceptance.ts';

const args = process.argv.slice(2);
function arg(key: string): string {
  const i = args.indexOf(key);
  if (i < 0 || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error('Missing ' + key);
  return args[i + 1];
}
const requireControlledReference = (relative: string): string => {
  const root = process.cwd();
  const target = path.resolve(root, relative);
  if (!relative.startsWith('evidence/independent/') ||
      !target.startsWith(root + path.sep) ||
      !fs.existsSync(target) || !fs.statSync(target).isFile() ||
      fs.statSync(target).size > 5 * 1024 * 1024) {
    throw new Error('Reference must be a controlled evidence/independent/ file under 5 MiB');
  }
  return target;
};

try {
  const agreement = arg('--ack');
  if (agreement !== 'INDEPENDENT_REVIEW_COMPLETED') {
    throw new Error('Review is not automated: the qualified reviewer must explicitly confirm independent review completion');
  }
  const canonicalId = arg('--agent');
  const verifierId = arg('--verifier');
  const reviewerQualification = arg('--qualification');
  const method = arg('--method');
  const finding = arg('--finding');
  if (!/^A(0[1-9]|1[0-9]|2[0-6])$/.test(canonicalId) ||
      !verifierId.trim() || !reviewerQualification.trim() ||
      !method.trim() || !['ACCEPT', 'REJECT'].includes(finding)) {
    throw new Error('Invalid reviewer, specialist or evidence method');
  }
  const source = path.resolve(arg('--report'));
  if (!fs.existsSync(source) || fs.statSync(source).size > 5 * 1024 * 1024) {
    throw new Error('Live campaign report not found');
  }
  const campaign = JSON.parse(fs.readFileSync(source, 'utf8')) as LiveCampaignEvidence;
  const gitSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  if (campaign.implementationSha !== gitSha ||
      campaign.dataClassification !== 'CONTROLLED_ENGINEERING_EVIDENCE' ||
      !campaign.controlledVesselConfigurationId ||
      !campaign.providerOperationalMatrixComplete) {
    throw new Error('Independent engineering review must reference a complete, exact-commit controlled campaign');
  }
  const executed = campaign.findings.filter(row =>
    row.canonicalId === canonicalId && row.provider === 'codex_cli' &&
    row.status === 'LIVE_PROVIDER_EXECUTED_UNCERTIFIED' &&
    row.requiredToolsVerified === true);
  if (executed.length !== 1 || !executed[0].outputDigestSha256?.startsWith('sha256:')) {
    throw new Error('Specialist has no complete live provider output to review');
  }
  const referencePath = arg('--reference');
  const target = requireControlledReference(referencePath);
  const referenceSha256 = 'sha256:' + createHash('sha256').update(fs.readFileSync(target)).digest('hex');
  const privateKeyFile = path.resolve(arg('--key'));
  if (privateKeyFile === process.cwd() ||
      privateKeyFile.startsWith(process.cwd() + path.sep)) {
    throw new Error('Independent reviewer private key must never live in the repository');
  }
  const keyStat = fs.statSync(privateKeyFile);
  if (!keyStat.isFile() || (keyStat.mode & 0o077) !== 0) {
    throw new Error('Independent reviewer private key must be 0600/0400');
  }
  const privateKey = createPrivateKey(fs.readFileSync(privateKeyFile, 'utf8'));
  const trusted = process.env.USV_INDEPENDENT_REVIEWER_PUBLIC_KEY;
  if (!trusted) throw new Error('Independent reviewer trust anchor is not provisioned');
  const actual = createPublicKey(privateKey).export({ type: 'spki', format: 'der' }) as Buffer;
  const expected = createPublicKey(trusted).export({ type: 'spki', format: 'der' }) as Buffer;
  if (!actual.equals(expected)) throw new Error('Signing key does not match the independent reviewer trust anchor');

  const review: ExternalEngineeringReview = {
    schema: EXTERNAL_REVIEW_SCHEMA, canonicalId,
    implementationSha: gitSha,
    agentOutputSha256: executed[0].outputDigestSha256,
    referencePath, referenceSha256, verifierId,
    reviewerQualification, method,
    finding: finding as 'ACCEPT' | 'REJECT',
    signedAt: new Date().toISOString(), signatureBase64: ''
  };
  review.signatureBase64 = sign(null, Buffer.from(canonicalExternalReview(review)), privateKey).toString('base64');
  const out = path.resolve('data/independent-reviews.json');
  const existing: ExternalEngineeringReview[] = fs.existsSync(out)
    ? JSON.parse(fs.readFileSync(out, 'utf8')) : [];
  if (!Array.isArray(existing)) throw new Error('Existing review pack is invalid');
  if (existing.some(row => row.canonicalId === canonicalId)) {
    throw new Error('Existing review for this agent: independent reviewer must explicitly remove/replace it');
  }
  existing.push(review);
  existing.sort((a, b) => a.canonicalId.localeCompare(b.canonicalId));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(existing, null, 2) + '\n', { mode: 0o600 });
  console.log(JSON.stringify({
    signed: true, canonicalId, finding, output: out,
    reviewedReferenceSha256: referenceSha256,
    engineeringReleaseApproved: false
  }, null, 2));
} catch (error) {
  console.error('Independent review signing refused:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
