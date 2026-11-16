/**
 * Exact-source, no-model precheck of campaign-level cross-provider data rights.
 * Do not publish catalog contents or accept an unreviewed source label as
 * permission to transfer naval/client data to another model provider.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  dualProviderEnabled, geminiTransferAuthorized, geminiCatalogTransferPermitted
} from '../../src/core/models/DualSubscriptionRoutingPolicy.ts';

function fail(message: string): never {
  throw new Error('USV_GEMINI_CATALOG_BLOCKED: ' + message);
}
const args = process.argv.slice(2);
const opt = args.indexOf('--catalog');
const candidate = opt >= 0 ? args[opt + 1] : undefined;
if (!dualProviderEnabled()) fail('Protected-main dual-provider research mode not authorized.');
// If ANY of the Gemini authorization switches is supplied, refuse incomplete
// or contradictory operator approvals instead of quietly ignoring mistakes.
const requested = [
  'USV_GEMINI_FALLBACK_APPROVED', 'USV_GEMINI_OAUTH_REVIEWED',
  'USV_GEMINI_DATA_CLASSIFICATION'
].some(name => Boolean(process.env[name]));
if (!requested) {
  console.log('PASS primary Sol research route; Gemini fallback disabled by default.');
} else {
  if (!geminiTransferAuthorized()) fail('Independent Google OAuth and public-data approval incomplete.');
  if (!candidate || path.isAbsolute(candidate)) fail('Controlled repository-relative catalog is required.');
  const root = fs.realpathSync(process.cwd());
  const catalog = fs.realpathSync(path.resolve(root, candidate));
  const allowedDir = ['evidence','references'].some(p => catalog.startsWith(
    path.join(root,p) + path.sep));
  if (!allowedDir || !catalog.endsWith('.json')) fail('Catalog outside controlled evidence/references JSON folders.');
  if (fs.statSync(catalog).size > 2 * 1024 * 1024) fail('Catalog exceeds allowed size.');
  let record: Record<string, unknown>;
  try { record = JSON.parse(fs.readFileSync(catalog, 'utf8')); }
  catch { fail('Catalog is not valid JSON.'); }
  if (!geminiCatalogTransferPermitted(record.dataClassification)) {
    fail('Catalog is not declared publicly transferable (external approval still required).');
  }
  console.log('PASS public-data transfer flags and reviewed catalog-classification precondition; ' +
    'operator remains responsible for source rights, actual Google OAuth, and zero restricted content.');
}
