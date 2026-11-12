/**
 * Verification Test Suite for Global Navy USV Intelligence Agent (INTEL-USV-26 / A26)
 * Validates fleet intelligence catalog, scraping, model specifications, academic papers,
 * benchmarking against USV-01, and Obsidian vault exports.
 */

import { describe, it, expect } from 'vitest';
import { GlobalUsvIntelligenceAgent } from '../src/core/agents/GlobalUsvIntelligenceAgent.ts';
import { INTEL_USV_26_SPEC } from '../src/core/agents/definitions.ts';
import { GLOBAL_NAVY_USVS, GLOBAL_USV_ACADEMIC_PAPERS } from '../src/data/globalUsvFleetData.ts';

describe('Global Navy USV Fleet Intelligence & Scraping Agent (INTEL-USV-26)', () => {
  const agent = new GlobalUsvIntelligenceAgent();

  it('should verify agent specification and metadata', () => {
    expect(INTEL_USV_26_SPEC.id).toBe('INTEL-USV-26');
    expect(INTEL_USV_26_SPEC.canonicalId).toBe('A26');
    expect(INTEL_USV_26_SPEC.division).toBe('OPERATIONS_DELIVERABLES');
    expect(INTEL_USV_26_SPEC.responsibilities.length).toBeGreaterThanOrEqual(4);
    expect(INTEL_USV_26_SPEC.requiredKnowledgeSources).toContain('GLOBAL_NAVY_USVS');
    expect(INTEL_USV_26_SPEC.systemInstructions.length).toBeGreaterThan(50);
  });

  it('should catalog operational USVs across major world navies', () => {
    const vessels = agent.searchOperatingUsvs();
    expect(vessels.length).toBeGreaterThanOrEqual(14);

    const navies = new Set(vessels.map((v) => v.operatorNavy));
    expect(navies.size).toBeGreaterThanOrEqual(8);

    // Verify key countries are represented
    const countries = new Set(vessels.map((v) => v.country));
    expect(countries.has('United States')).toBe(true);
    expect(countries.has('Ukraine')).toBe(true);
    expect(countries.has('Turkey')).toBe(true);
    expect(countries.has('Israel')).toBe(true);
    expect(countries.has('United Kingdom')).toBe(true);
    expect(countries.has('France')).toBe(true);
    expect(countries.has('Singapore')).toBe(true);
    expect(countries.has('Australia')).toBe(true);
    expect(countries.has('China')).toBe(true);
    expect(countries.has('India')).toBe(true);
  });

  it('should validate complete naval architecture particulars for every vessel', () => {
    const vessels = agent.searchOperatingUsvs();

    for (const v of vessels) {
      expect(v.id).toBeTruthy();
      expect(v.modelName).toBeTruthy();
      expect(v.operatorNavy).toBeTruthy();
      expect(v.manufacturer).toBeTruthy();

      // Naval Architecture dimensions
      expect(v.dimensions.lengthOverallM).toBeGreaterThan(0);
      expect(v.dimensions.beamM).toBeGreaterThan(0);
      expect(v.dimensions.draftM).toBeGreaterThan(0);
      expect(v.dimensions.fullLoadDisplacementKg).toBeGreaterThan(0);
      expect(v.dimensions.displacementTonnes).toBeGreaterThan(0);
      expect(v.dimensions.payloadCapacityKg).toBeGreaterThan(0);
      expect(v.dimensions.hullMaterial.length).toBeGreaterThan(3);
      expect(v.dimensions.maxSeaStateOperating).toBeGreaterThanOrEqual(3);

      // Performance
      expect(v.performance.maxSpeedKnots).toBeGreaterThan(0);
      expect(v.performance.cruiseSpeedKnots).toBeGreaterThan(0);
      expect(v.performance.rangeNauticalMiles).toBeGreaterThan(0);
      expect(v.performance.enduranceHours).toBeGreaterThan(0);

      // Propulsion
      expect(v.propulsion.totalPowerKw).toBeGreaterThan(0);
      expect(v.propulsion.engineDescription.length).toBeGreaterThan(5);

      // Autonomy & COLREGS
      expect(v.autonomy.autonomyLevel).toBeTruthy();
      expect(v.autonomy.c2Datalinks.length).toBeGreaterThan(0);

      // Benchmark delta vs USV-01
      expect(v.usv01BenchmarkDelta.speedRatio).toBeGreaterThan(0);
      expect(v.usv01BenchmarkDelta.keyTakeaway.length).toBeGreaterThan(10);
      expect(v.usv01BenchmarkDelta.recommendedDesignImprovement.length).toBeGreaterThan(10);
    }
  });

  it('should filter vessels by country and navy', () => {
    const ukrVessels = agent.searchOperatingUsvs({ country: 'Ukraine' });
    expect(ukrVessels.length).toBeGreaterThanOrEqual(2);
    expect(ukrVessels.some((v) => v.modelName === 'MAGURA V5')).toBe(true);
    expect(ukrVessels.some((v) => v.modelName === 'Sea Baby')).toBe(true);

    const usVessels = agent.searchOperatingUsvs({ country: 'United States' });
    expect(usVessels.length).toBeGreaterThanOrEqual(2);
    expect(usVessels.some((v) => v.modelName === 'Sea Hunter')).toBe(true);
  });

  it('should filter vessels by mission profile', () => {
    const aswVessels = agent.searchOperatingUsvs({ mission: 'ASW' });
    expect(aswVessels.length).toBeGreaterThanOrEqual(1);
    expect(aswVessels.some((v) => v.modelName === 'Sea Hunter')).toBe(true);

    const strikeVessels = agent.searchOperatingUsvs({ mission: 'STRIKE' });
    expect(strikeVessels.length).toBeGreaterThanOrEqual(2);

    const mcmVessels = agent.searchOperatingUsvs({ mission: 'MCM' });
    expect(mcmVessels.some((v) => v.modelName === 'Seagull')).toBe(true);
  });

  it('should filter vessels by hull form', () => {
    const trimaranVessels = agent.searchOperatingUsvs({ hullForm: 'Trimaran' });
    expect(trimaranVessels.length).toBe(1);
    expect(trimaranVessels[0].modelName).toBe('Sea Hunter');

    const rhibVessels = agent.searchOperatingUsvs({ hullForm: 'RHIB' });
    expect(rhibVessels.some((v) => v.modelName === 'Protector USV')).toBe(true);
  });

  it('should perform keyword search across specifications', () => {
    const starlinkSearch = agent.searchOperatingUsvs({ keyword: 'Starlink' });
    expect(starlinkSearch.length).toBeGreaterThanOrEqual(1);

    const waterjetSearch = agent.searchOperatingUsvs({ keyword: 'Waterjet' });
    expect(waterjetSearch.length).toBeGreaterThanOrEqual(4);
  });

  it('should synthesize peer-reviewed academic papers and governing formulas', () => {
    const papers = agent.fetchAcademicPapers();
    expect(papers.length).toBeGreaterThanOrEqual(5);

    const actuvPaper = papers.find((p) => p.id === 'PAPER-USV-01');
    expect(actuvPaper).toBeDefined();
    expect(actuvPaper?.doi).toBeTruthy();
    expect(actuvPaper?.governingFormulas && actuvPaper.governingFormulas.length > 0).toBe(true);

    // Search papers
    const hydroPapers = agent.fetchAcademicPapers('porpoising');
    expect(hydroPapers.length).toBeGreaterThanOrEqual(1);
  });

  it('should compute comparative hydrodynamic benchmarks against USV-01', () => {
    const bm = agent.benchmarkAgainstUsv01('USV-USN-01');
    expect(bm.modelName).toBe('Sea Hunter');
    expect(bm.comparisonTable.maxSpeedKnots.foreign).toBe(27);
    expect(bm.comparisonTable.maxSpeedKnots.usv01).toBe(30);
    expect(bm.hydrodynamicMetrics.foreignFroudeNumberLength).toBeGreaterThan(0.6);
    expect(bm.hydrodynamicMetrics.slendernessRatio).toBeGreaterThan(5.0);
    expect(bm.hydrodynamicMetrics.payloadFractionPercent).toBeGreaterThan(5.0);
    expect(bm.engineeringAssessment.length).toBeGreaterThan(20);
    expect(bm.recommendedDesignTransfer.length).toBeGreaterThan(20);
  });

  it('should generate valid Obsidian markdown notes with wikilinks', () => {
    const vessel = agent.getUsvDetails('USV-UKR-01');
    expect(vessel).toBeDefined();

    const md = agent.generateObsidianVaultExport(vessel!);
    expect(md).toContain('---');
    expect(md).toContain('[[MAGURA V5]]');
    expect(md.includes('[[Main Directorate of Intelligence (HUR Group 13) / Ukrainian Navy]]') || md.includes('[[STRIKE]]')).toBe(true);
    expect(md).toContain('[[USV-01 Baseline]]');
    expect(md).toContain('| **Length Overall ($L_{OA}$)** | 5.5 m |');
  });

  it('should generate KnowledgeNote records for digital lab knowledge base', () => {
    const notes = agent.generateKnowledgeNotes();
    expect(notes.length).toBeGreaterThanOrEqual(15);

    const masterNote = notes.find((n) => n.id === 'KN-USV-FLEET-OVERVIEW');
    expect(masterNote).toBeDefined();
    expect(masterNote?.category).toBe('BENCHMARK');
    expect(masterNote?.contentMarkdown).toContain('[[Global Operating USV Fleet Intelligence]]');
  });
});
