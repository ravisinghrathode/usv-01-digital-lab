/**
 * Verification Test Suite for Global Intelligence Learning Bridge & Naval NotebookLM
 * Tests cross-discipline agent clues, trial proposals, grounded source synthesis, and citations.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { GlobalIntelligenceLearningBridge } from '../src/core/intelligence/GlobalIntelligenceLearningBridge.ts';

describe('Global Intelligence Learning Bridge & Naval NotebookLM', () => {
  const bridge = GlobalIntelligenceLearningBridge.getInstance();

  it('should harvest actionable engineering clues across all 8 engineering disciplines', () => {
    const clues = bridge.getClues();
    assert.ok(clues.length >= 10, `Expected at least 10 clues, got ${clues.length}`);

    const disciplines = new Set(clues.map((c) => c.targetDiscipline));
    const expectedDisciplines = ['SYS', 'NAV', 'HYD', 'MEC', 'ELE', 'PRP', 'AUT', 'VNV'];

    for (const d of expectedDisciplines) {
      assert.ok(disciplines.has(d as any), `Missing clue for discipline: ${d}`);
    }
  });

  it('should validate clue structure with proposed application, benefit, and trade-off', () => {
    const clues = bridge.getClues();

    for (const clue of clues) {
      assert.ok(clue.id.startsWith('CLUE-'), `Invalid clue ID format: ${clue.id}`);
      assert.ok(clue.sourceName.length > 3, `${clue.id} missing source name`);
      assert.ok(clue.clueTitle.length > 5, `${clue.id} missing clue title`);
      assert.ok(clue.proposedApplicationToUsv01.length > 15, `${clue.id} missing USV-01 application`);
      assert.ok(clue.expectedBenefit.length > 10, `${clue.id} missing expected benefit`);
      assert.ok(clue.potentialRiskOrTradeoff.length > 10, `${clue.id} missing potential risk`);
      assert.ok(['DISCOVERED', 'EVALUATING', 'TRIAL_PROPOSED', 'ADOPTED', 'REJECTED'].includes(clue.status));
    }
  });

  it('should support clue adoption workflow for engineering trials', () => {
    const clue = bridge.getClues('HYD')[0];
    assert.ok(clue, 'Missing HYD clue');

    const updated = bridge.updateClueStatus(clue.id, 'ADOPTED');
    assert.strictEqual(updated.status, 'ADOPTED');

    const retrieved = bridge.getClues('HYD').find((c) => c.id === clue.id);
    assert.strictEqual(retrieved?.status, 'ADOPTED');
  });

  it('should generate discipline learning summaries for all 8 workstreams', () => {
    const summaries = bridge.generateDisciplineLearningSummaries();
    assert.strictEqual(summaries.length, 8);

    for (const s of summaries) {
      assert.ok(s.discipline, 'Missing discipline code');
      assert.ok(s.disciplineName, 'Missing discipline name');
      assert.ok(s.leadAgentId, 'Missing lead agent ID');
      assert.ok(s.totalCluesDiscovered >= 1, `Expected at least 1 clue for ${s.discipline}`);
      assert.ok(s.topGlobalPrecedents.length >= 1, `Expected precedents for ${s.discipline}`);
    }
  });

  it('should provide formatted NotebookLM source documents for reading', () => {
    const sources = bridge.getNotebookSources();
    assert.ok(sources.length >= 20, `Expected at least 20 source documents, got ${sources.length}`);

    const vesselSources = sources.filter((s) => s.type === 'USV_VESSEL');
    const paperSources = sources.filter((s) => s.type === 'ACADEMIC_PAPER');
    const baselineSources = sources.filter((s) => s.type === 'PROJECT_BASELINE');

    assert.ok(vesselSources.length >= 14, 'Missing vessel sources');
    assert.ok(paperSources.length >= 6, 'Missing paper sources');
    assert.strictEqual(baselineSources.length, 1, 'Missing baseline source');

    // Check reading content
    for (const src of sources) {
      assert.ok(src.id, 'Missing source ID');
      assert.ok(src.title, 'Missing source title');
      assert.ok(src.contentMarkdown.length > 50, `${src.id} content markdown too short`);
    }
  });

  it('should synthesize grounded NotebookLM query with direct source citations', () => {
    const response = bridge.answerGroundedQuery('What propulsion and waterjet systems are used on high speed naval USVs?');
    assert.ok(response.isGrounded);
    assert.ok(response.citations && response.citations.length > 0, 'Expected citations');
    assert.ok(response.text.includes('Waterjet') || response.text.includes('Propulsion'));

    const autonomyResp = bridge.answerGroundedQuery('How is autonomous COLREGS compliance verified in operational sea trials?');
    assert.ok(autonomyResp.isGrounded);
    assert.ok(autonomyResp.citations && autonomyResp.citations.length > 0);
    assert.ok(autonomyResp.text.includes('COLREGS') || autonomyResp.text.includes('Sea Hunter'));
  });
});
