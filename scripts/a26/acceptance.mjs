/**
 * A26 discovery acceptance gate: source identity != engineering verification.
 * Run against the actual evidence index, never against seed counts alone.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root=path.resolve('.local-concept-research/a26-global-usv');
const args=process.argv.slice(2);const i=args.indexOf('--index');
const location=path.resolve(i>=0?args[i+1]:path.join(root,'evidence-index.json'));
async function main(){
  const index=JSON.parse(await readFile(location,'utf8'));
  if(index.schemaVersion!==1||!Array.isArray(index.records))throw Error('INVALID_A26_INDEX');
  const accepted=index.records.filter(r=>r.evidenceStatus==='SOURCE_CORROBORATED_REVIEW_REQUIRED'
    && r.sources?.some(s=>s.identityConfirmed && /^sha256:[a-f0-9]{64}$/.test(s.sha256||'')));
  const countries=[...new Set(accepted.map(r=>r.country))];
  const identityGate=accepted.length>=10&&countries.length>=5;
  const brokenFieldClaims=index.records.flatMap(r=>Object.values(r.fields||{}).flat()).filter(c=>
    !c.sha256||!c.sourceUrl||!c.quotation||c.evidenceStatus!=='QUOTE_MATCHED_UNREVIEWED');
  const result={agent:'INTEL-USV-26',evaluatedAt:new Date().toISOString(),
    gate:'A26_PUBLIC_SOURCE_DISCOVERY_10x5',identityGatePassed:identityGate,
    corroboratedModels:accepted.length,countriesRepresented:countries.length,
    eligibleCountries:countries,failedEvidenceClaims:brokenFieldClaims.length,
    passed:identityGate && brokenFieldClaims.length===0,
    engineeringEvidenceCertified:false,independentEngineeringAcceptance:false,
    globalCoverageClaimed:false,releaseAuthorized:false,
    limitations:['Corroboration is not independent engineering validation',
      'One manufacturer claim does not establish independent verification',
      'A PDF snapshot without reviewed text cannot corroborate model identity',
      'Global completeness is not measurable from a finite seed catalogue']};
  console.log(JSON.stringify(result,null,2));
  if(!result.passed)process.exitCode=1;
}
main().catch(e=>{console.error('A26 acceptance failed closed:',e.message);process.exitCode=1;});
