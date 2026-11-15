/**
 * M03 draft engineering digital-thread, not a production vessel baseline.
 * Logical append-only, SHA256-linked journal: atomic JSON replacement provides
 * crash consistency; external signed anchors/WORM storage remain OUT OF SCOPE.
 */
import { createHash } from 'node:crypto';
import { readDurableState, mutateDurableState } from '../mission-control/DurableJsonState.ts';

export const DOMAINS = [
  'GEOMETRY', 'MASS_CG', 'HYDROSTATICS', 'RESISTANCE', 'STRUCTURES',
  'PROPULSION', 'POWER', 'THERMAL', 'SAFETY_REVIEW', 'INDEPENDENT_VV'
] as const;
export type AnalysisDomain = typeof DOMAINS[number];
export type AnalysisStatus = 'NOT_RUN' | 'BLOCKED' | 'UNVERIFIED';
export type Classification = 'PUBLIC_NON_SENSITIVE' | 'RESTRICTED_METADATA_ONLY';
export type Sha256 = `sha256:${string}`;
export type InputDigestChange = { domain: 'GEOMETRY' | 'MASS_CG'; digest: Sha256 };
export type EvidenceOutcome = 'UNVERIFIED' | 'FAILED' | 'UNKNOWN';
export type DependencyGraph = Record<AnalysisDomain, readonly AnalysisDomain[]>;

export const ENGINEERING_DEPENDENCIES: DependencyGraph = {
  GEOMETRY: [], MASS_CG: [],
  HYDROSTATICS: ['GEOMETRY', 'MASS_CG'],
  RESISTANCE: ['GEOMETRY', 'HYDROSTATICS'],
  STRUCTURES: ['GEOMETRY', 'MASS_CG'],
  PROPULSION: ['RESISTANCE'],
  POWER: ['PROPULSION'],
  THERMAL: ['POWER'],
  SAFETY_REVIEW: ['HYDROSTATICS', 'STRUCTURES', 'THERMAL'],
  INDEPENDENT_VV: ['HYDROSTATICS', 'RESISTANCE', 'STRUCTURES', 'POWER', 'SAFETY_REVIEW']
};

const NAME = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,79}$/;
const SHA = /^[a-f0-9]{40}$/;
const DIGEST = /^sha256:[a-f0-9]{64}$/;
const unique = <T>(values: readonly T[]): boolean => new Set(values).size === values.length;

export function assertEngineeringDependencyGraph(graph: DependencyGraph): void {
  if (!unique(DOMAINS) || Object.keys(graph).length !== DOMAINS.length ||
      DOMAINS.some(d => !Array.isArray(graph[d]))) {
    throw new Error('M03_INVALID_DEPENDENCY_GRAPH: missing or extra domain');
  }
  const visited = new Set<AnalysisDomain>();
  const visiting = new Set<AnalysisDomain>();
  const visit = (domain: AnalysisDomain): void => {
    if (visiting.has(domain)) throw new Error('M03_DEPENDENCY_CYCLE');
    if (visited.has(domain)) return;
    visiting.add(domain);
    for (const parent of graph[domain]) {
      if (!DOMAINS.includes(parent)) throw new Error('M03_UNKNOWN_DEPENDENCY');
      if (parent === domain) throw new Error('M03_DEPENDENCY_CYCLE');
      visit(parent);
    }
    visiting.delete(domain);
    visited.add(domain);
  };
  for (const domain of DOMAINS) visit(domain);
}

export function affectedDomains(
  changes: readonly AnalysisDomain[],
  graph: DependencyGraph = ENGINEERING_DEPENDENCIES
): AnalysisDomain[] {
  assertEngineeringDependencyGraph(graph);
  if (changes.some(d => !DOMAINS.includes(d))) throw new Error('M03_UNKNOWN_CHANGED_DOMAIN');
  const dirty = new Set(changes);
  let modified = true;
  while (modified) {
    modified = false;
    for (const domain of DOMAINS) {
      if (!dirty.has(domain) && graph[domain].some(parent => dirty.has(parent))) {
        dirty.add(domain); modified = true;
      }
    }
  }
  return DOMAINS.filter(domain => dirty.has(domain));
}

function validateId(value: unknown, label: string): void {
  if (typeof value !== 'string' || !NAME.test(value)) throw new Error('M03_INVALID_' + label);
}
function validateDigest(value: unknown, label: string): void {
  if (typeof value !== 'string' || !DIGEST.test(value)) throw new Error('M03_INVALID_' + label);
}
function validateSource(value: unknown): void {
  if (typeof value !== 'string' || !SHA.test(value)) throw new Error('M03_INVALID_SOURCE_SHA');
}
function validateClassification(value: unknown): void {
  if (value !== 'PUBLIC_NON_SENSITIVE' && value !== 'RESTRICTED_METADATA_ONLY')
    throw new Error('M03_INVALID_CLASSIFICATION');
}
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return '{' + Object.keys(obj).sort().map(k => JSON.stringify(k) + ':' +
      canonicalJson(obj[k])).join(',') + '}';
  }
  if (value === undefined || typeof value === 'function' || typeof value === 'symbol')
    throw new Error('M03_NON_CANONICAL_VALUE');
  const serialized = JSON.stringify(value);
  if (serialized === undefined) throw new Error('M03_NON_CANONICAL_VALUE');
  return serialized;
}
export function sha256(value: unknown): Sha256 {
  return ('sha256:' + createHash('sha256').update(canonicalJson(value)).digest('hex')) as Sha256;
}

export interface CreateCandidate {
  kind: 'CANDIDATE_CREATED';
  txId: string; candidateId: string; revisionId: string;
  projectId: 'USV-01'; missionId: string; configurationId: string;
  topology: 'MONOHULL' | 'CATAMARAN' | 'TRIMARAN' | 'OTHER';
  sourceSha: string; classification: Classification;
  inputDigests: InputDigestChange[];
}
export interface ReviseCandidate {
  kind: 'REVISION_PROPOSED';
  txId: string; candidateId: string; revisionId: string; parentRevisionId: string;
  expectedHeadHash: Sha256; sourceSha: string;
  changeReasonSha256: Sha256; inputDigests: InputDigestChange[];
}
export interface RecordEvidence {
  kind: 'EVIDENCE_RECORDED';
  txId: string; candidateId: string; revisionId: string;
  expectedHeadHash: Sha256; sourceSha: string; domain: AnalysisDomain;
  outcome: EvidenceOutcome; inputSha256: Sha256; outputSha256: Sha256;
  methodId: string; uncertaintySha256?: Sha256;
}
export type CandidateAction = CreateCandidate | ReviseCandidate | RecordEvidence;
export interface CandidateEvent {
  schema: 'usv01-candidate-event/v1';
  sequence: number; previousHash: Sha256 | null; candidatePreviousHash: Sha256 | null;
  timestamp: string; action: CandidateAction; actionSha256: Sha256; eventHash: Sha256;
}
export interface CandidateJournal {
  schema: 'usv01-candidate-journal/v1'; events: CandidateEvent[];
}
export interface CandidateSnapshot {
  candidateId: string; projectId: 'USV-01';
  missionId: string; configurationId: string; topology: CreateCandidate['topology'];
  classification: Classification;
  revisionId: string; sourceSha: string; headEventHash: Sha256;
  inputDigests: Partial<Record<'GEOMETRY' | 'MASS_CG', Sha256>>;
  domainStates: Record<AnalysisDomain, AnalysisStatus>;
  domainEvidence: Partial<Record<AnalysisDomain, Sha256>>;
  revisionCount: number;
  openTbdStatus: 'UNKNOWN_REQUIRES_CONTROLLED_INPUTS';
  engineeringReleaseApproved: false;
  independentEngineeringValidationSatisfied: false;
  vesselDesignCertified: false;
}
const emptyJournal = (): CandidateJournal =>
  ({schema: 'usv01-candidate-journal/v1', events: []});
const states = (): Record<AnalysisDomain, AnalysisStatus> =>
  Object.fromEntries(DOMAINS.map(domain => [domain,
    ENGINEERING_DEPENDENCIES[domain].length ? 'BLOCKED' : 'NOT_RUN']))
    as Record<AnalysisDomain, AnalysisStatus>;

function validateAction(action: CandidateAction): void {
  if (!action || typeof action !== 'object') throw new Error('M03_INVALID_ACTION');
  validateId(action.txId, 'TX_ID');
  validateId(action.candidateId, 'CANDIDATE_ID');
  validateId(action.revisionId, 'REVISION_ID');
  validateSource(action.sourceSha);
  if (action.kind === 'CANDIDATE_CREATED') {
    if (action.projectId !== 'USV-01') throw new Error('M03_WRONG_PROJECT');
    validateId(action.missionId, 'MISSION_ID');
    validateId(action.configurationId, 'CONFIGURATION_ID');
    if (!['MONOHULL', 'CATAMARAN', 'TRIMARAN', 'OTHER'].includes(action.topology))
      throw new Error('M03_INVALID_TOPOLOGY');
    validateClassification(action.classification);
  } else if (action.kind === 'REVISION_PROPOSED') {
    validateId(action.parentRevisionId, 'PARENT_REVISION');
    validateDigest(action.expectedHeadHash, 'EXPECTED_HEAD');
    validateDigest(action.changeReasonSha256, 'CHANGE_REASON');
  } else if (action.kind === 'EVIDENCE_RECORDED') {
    validateDigest(action.expectedHeadHash, 'EXPECTED_HEAD');
    if (!DOMAINS.includes(action.domain)) throw new Error('M03_INVALID_DOMAIN');
    if (!['UNVERIFIED', 'FAILED', 'UNKNOWN'].includes(action.outcome))
      throw new Error('M03_INVALID_OUTCOME');
    validateDigest(action.inputSha256, 'EVIDENCE_INPUT');
    validateDigest(action.outputSha256, 'EVIDENCE_OUTPUT');
    if (action.uncertaintySha256 !== undefined)
      validateDigest(action.uncertaintySha256, 'UNCERTAINTY');
    validateId(action.methodId, 'METHOD');
    // A review event cannot constitute independent signoff: all rows are
    // unverified research records, regardless of the domain label.
  } else {
    throw new Error('M03_UNKNOWN_ACTION');
  }
  if (action.kind === 'CANDIDATE_CREATED' || action.kind === 'REVISION_PROPOSED') {
    if (!Array.isArray(action.inputDigests) ||
        action.inputDigests.length < 1 || action.inputDigests.length > 2 ||
        !unique(action.inputDigests.map(x => x.domain))) {
      throw new Error('M03_INVALID_CHANGED_INPUTS');
    }
    for (const change of action.inputDigests) {
      if (!change || !['GEOMETRY', 'MASS_CG'].includes(change.domain))
        throw new Error('M03_INVALID_INPUT_DOMAIN');
      validateDigest(change.digest, 'INPUT_DIGEST');
    }
  }
}
function snapshotForCreation(action: CreateCandidate, head: Sha256): CandidateSnapshot {
  return {
    projectId:'USV-01',candidateId:action.candidateId,missionId:action.missionId,
    configurationId:action.configurationId,topology:action.topology,
    classification:action.classification,revisionId:action.revisionId,sourceSha:action.sourceSha,
    headEventHash:head, inputDigests:Object.fromEntries(action.inputDigests.map(x => [x.domain,x.digest])),
    domainStates:states(),domainEvidence:{},revisionCount:1,
    openTbdStatus:'UNKNOWN_REQUIRES_CONTROLLED_INPUTS',
    engineeringReleaseApproved:false,independentEngineeringValidationSatisfied:false,
    vesselDesignCertified:false
  };
}
function applyAction(
  views: Map<string, CandidateSnapshot>, event: CandidateEvent
): void {
  const a=event.action;
  validateAction(a);
  const prior=views.get(a.candidateId);
  const expected=prior?.headEventHash ?? null;
  if (event.candidatePreviousHash !== expected)
    throw new Error('M03_CANDIDATE_CHAIN_BROKEN');
  if (a.kind==='CANDIDATE_CREATED') {
    if (prior) throw new Error('M03_DUPLICATE_CANDIDATE');
    views.set(a.candidateId, snapshotForCreation(a,event.eventHash));
    return;
  }
  if (!prior) throw new Error('M03_MISSING_CANDIDATE');
  if (a.expectedHeadHash !== prior.headEventHash)
    throw new Error('M03_STALE_PARENT');
  if (a.kind==='REVISION_PROPOSED') {
    if (a.parentRevisionId !== prior.revisionId || a.revisionId === prior.revisionId)
      throw new Error('M03_REVISION_PARENT_MISMATCH');
    const changed=a.inputDigests.map(x => x.domain);
    const invalidated=affectedDomains(changed);
    const next:CandidateSnapshot={
      ...prior, revisionId:a.revisionId,sourceSha:a.sourceSha,headEventHash:event.eventHash,
      revisionCount:prior.revisionCount+1,
      inputDigests:{...prior.inputDigests},
      domainStates:{...prior.domainStates},domainEvidence:{...prior.domainEvidence}
    };
    for(const d of changed) next.inputDigests[d]=a.inputDigests.find(x=>x.domain===d)!.digest;
    for(const d of invalidated){
      next.domainStates[d]=changed.includes(d as 'GEOMETRY' | 'MASS_CG')?'NOT_RUN':'BLOCKED';
      delete next.domainEvidence[d];
    }
    views.set(a.candidateId,next);
  } else {
    if (a.revisionId !== prior.revisionId || a.sourceSha !== prior.sourceSha)
      throw new Error('M03_STALE_EVIDENCE_SOURCE');
    if (ENGINEERING_DEPENDENCIES[a.domain].some(
      dep => prior.domainStates[dep]!=='UNVERIFIED'
    ) && a.outcome==='UNVERIFIED') {
      throw new Error('M03_UPSTREAM_EVIDENCE_BLOCKED');
    }
    const next:CandidateSnapshot={
      ...prior,headEventHash:event.eventHash,
      domainStates:{...prior.domainStates},domainEvidence:{...prior.domainEvidence}
    };
    next.domainStates[a.domain]=a.outcome==='UNVERIFIED'?'UNVERIFIED':'BLOCKED';
    next.domainEvidence[a.domain]=a.outputSha256;
    // If an observed upstream domain fails, downstream previously unverified
    // results are no longer current even without a new geometry revision.
    if(a.outcome!=='UNVERIFIED'){
      for(const domain of affectedDomains([a.domain]).filter(d=>d!==a.domain)){
        next.domainStates[domain]='BLOCKED';
        delete next.domainEvidence[domain];
      }
    }
    views.set(a.candidateId,next);
  }
}
export function inspectCandidateJournal(journal: CandidateJournal): Map<string,CandidateSnapshot> {
  assertEngineeringDependencyGraph(ENGINEERING_DEPENDENCIES);
  if (!journal || journal.schema!=='usv01-candidate-journal/v1' || !Array.isArray(journal.events))
    throw new Error('M03_CORRUPT_JOURNAL_SCHEMA');
  if (journal.events.length>100_000) throw new Error('M03_JOURNAL_LIMIT');
  const views=new Map<string,CandidateSnapshot>();
  const txs=new Set<string>();
  let previous:Sha256|null=null;
  for(let i=0;i<journal.events.length;i++){
    const e=journal.events[i];
    if (!e || e.schema!=='usv01-candidate-event/v1' || e.sequence!==i+1 ||
        e.previousHash!==previous || !Number.isFinite(Date.parse(e.timestamp)))
      throw new Error('M03_BROKEN_EVENT_ORDER');
    validateAction(e.action);
    if(txs.has(e.action.txId)) throw new Error('M03_DUPLICATE_TX');
    txs.add(e.action.txId);
    if(e.actionSha256!==sha256(e.action)) throw new Error('M03_ACTION_DIGEST_TAMPERED');
    const {eventHash,...data}=e;
    if(eventHash!==sha256(data)) throw new Error('M03_EVENT_DIGEST_TAMPERED');
    applyAction(views,e);
    previous=e.eventHash;
  }
  return views;
}
export class CandidateLedger {
  constructor(private readonly filePath:string){}
  async readAll(): Promise<CandidateSnapshot[]> {
    const journal=await readDurableState(this.filePath,emptyJournal);
    return [...inspectCandidateJournal(journal).values()];
  }
  async readEvents(): Promise<CandidateEvent[]> {
    const journal=await readDurableState(this.filePath,emptyJournal);
    inspectCandidateJournal(journal);
    return journal.events;
  }
  async append(action:CandidateAction):Promise<CandidateEvent>{
    validateAction(action);
    return mutateDurableState<CandidateJournal,CandidateEvent>(this.filePath,emptyJournal,journal=>{
      const views=inspectCandidateJournal(journal);
      const digest=sha256(action);
      // Replay of exact transaction and payload is idempotent even if later
      // events have advanced the candidate; changed payload always conflicts.
      const existing=journal.events.find(e=>e.action.txId===action.txId);
      if(existing){
        if(existing.actionSha256!==digest)throw new Error('M03_TX_REPLAY_CONFLICT');
        return existing;
      }
      if(journal.events.length>=100_000)throw new Error('M03_JOURNAL_LIMIT');
      const prior=views.get(action.candidateId);
      if(action.kind==='CANDIDATE_CREATED' && prior)
        throw new Error('M03_DUPLICATE_CANDIDATE');
      if(action.kind!=='CANDIDATE_CREATED' && !prior)
        throw new Error('M03_MISSING_CANDIDATE');
      const data={
        schema:'usv01-candidate-event/v1' as const,
        sequence:journal.events.length+1,
        previousHash:journal.events.at(-1)?.eventHash||null,
        candidatePreviousHash:prior?.headEventHash||null,
        timestamp:new Date().toISOString(),
        action,actionSha256:digest
      };
      const event:CandidateEvent={...data,eventHash:sha256(data)};
      applyAction(views,event); // all permissions and stale parents checked first
      journal.events.push(event);
      return event;
    });
  }
}
