/**
 * Verification Test Suite for Global Intelligence Learning Bridge & Naval NotebookLM
 * Tests cross-discipline agent clues, trial proposals, grounded source synthesis, and citations.
 */

import { describe, it, expect } from 'vitest';
import { GlobalIntelligenceLearningBridge } from '../src/core/intelligence/GlobalIntelligenceLearningBridge.ts';

describe('Global Intelligence Learning Bridge & Naval NotebookLM', () => {
  const bridge = GlobalIntelligenceLearningBridge.getInstance();

  it('should harvest actionable engineering clues across all 8 engineering disciplines', () => {
    const clues = bridge.getClues();
    expect(clues.length).toBeGreaterThanOrEqual(10);

    const disciplines = new Set(clues.map((c) => c.targetDiscipline));
    const expectedDisciplines = ['SYS', 'NAV', 'HYD', 'MEC', 'ELE', 'PRP', 'AUT', 'VNV'];

    for (const d of expectedDisciplines) {
      expect(disciplines.has(d as any)).toBe(true);
    }
  });

  it('should validate clue structure with proposed application, benefit, and trade-off', () => {
    const clues = bridge.getClues();

    for (const clue of clues) {
      expect(clue.id.startsWith('CLUE-')).toBe(true);
      expect(clue.sourceName.length).toBeGreaterThan(3);
      expect(clue.clueTitle.length).toBeGreaterThan(5);
      expect(clue.proposedApplicationToUsv01.length).toBeGreaterThan(15);
      expect(clue.expectedBenefit.length).toBeGreaterThan(10);
      expect(clue.potentialRiskOrTradeoff.length).toBeGreaterThan(10);
      expect(['DISCOVERED', 'EVALUATING', 'TRIAL_PROPOSED', 'ADOPTED', 'REJECTED'].includes(clue.status)).toBe(true);
    }
  });

  it('should support clue adoption workflow for engineering trials', () => {
    const clue = bridge.getClues('HYD')[0];
    expect(clue).toBeDefined();

    const updated = bridge.updateClueStatus(clue.id, 'ADOPTED');
    expect(updated.status).toBe('ADOPTED');

    const retrieved = bridge.getClues('HYD').find((c) => c.id === clue.id);
    expect(retrieved?.status).toBe('ADOPTED');
  });

  it('should generate discipline learning summaries for all 8 workstreams', () => {
    const summaries = bridge.generateDisciplineLearningSummaries();
    expect(summaries.length).toBe(8);

    for (const s of summaries) {
      expect(s.discipline).toBeTruthy();
      expect(s.disciplineName).toBeTruthy();
      expect(s.leadAgentId).toBeTruthy();
      expect(s.totalCluesDiscovered).toBeGreaterThanOrEqual(1);
      expect(s.topGlobalPrecedents.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('should provide formatted NotebookLM source documents for reading', () => {
    const sources = bridge.getNotebookSources();
    expect(sources.length).toBeGreaterThanOrEqual(20);

    const vesselSources = sources.filter((s) => s.type === 'USV_VESSEL');
    const paperSources = sources.filter((s) => s.type === 'ACADEMIC_PAPER');
    const baselineSources = sources.filter((s) => s.type === 'PROJECT_BASELINE');

    expect(vesselSources.length).toBeGreaterThanOrEqual(14);
    expect(paperSources.length).toBeGreaterThanOrEqual(6);
    expect(baselineSources.length).toBe(1);

    // Check reading content
    for (const src of sources) {
      expect(src.id).toBeTruthy();
      expect(src.title).toBeTruthy();
      expect(src.contentMarkdown.length).toBeGreaterThan(50);
    }
  });

  it('should synthesize grounded NotebookLM query with direct source citations', () => {
    const response = bridge.answerGroundedQuery('What propulsion and waterjet systems are used on high speed naval USVs?');
    expect(response.isGrounded).toBe(true);
    expect(response.citations && response.citations.length > 0).toBe(true);
    expect(response.text.includes('Waterjet') || response.text.includes('Propulsion')).toBe(true);

    const autonomyResp = bridge.answerGroundedQuery('How is autonomous COLREGS compliance verified in operational sea trials?');
    expect(autonomyResp.isGrounded).toBe(true);
    expect(autonomyResp.citations && autonomyResp.citations.length > 0).toBe(true);
    expect(autonomyResp.text.includes('COLREGS') || autonomyResp.text.includes('Sea Hunter')).toBe(true);
  });
});
