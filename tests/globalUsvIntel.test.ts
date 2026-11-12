/**
 * Verification Test Suite for Global Navy USV Intelligence Agent (INTEL-USV-26 / A26)
 * Validates fleet intelligence catalog, scraping, model specifications, academic papers,
 * benchmarking against USV-01, and Obsidian vault exports.
 */

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { GlobalUsvIntelligenceAgent } from '../src/core/agents/GlobalUsvIntelligenceAgent.ts';
import { INTEL_USV_26_SPEC } from '../src/core/agents/definitions.ts';
import { GLOBAL_NAVY_USVS, GLOBAL_USV_ACADEMIC_PAPERS } from '../src/data/globalUsvFleetData.ts';

describe('Global Navy USV Fleet Intelligence & Scraping Agent (INTEL-USV-26)', () => {
  const agent = new GlobalUsvIntelligenceAgent();

  it('should verify agent specification and metadata', () => {
    assert.strictEqual(INTEL_USV_26_SPEC.id, 'INTEL-USV-26');
    assert.strictEqual(INTEL_USV_26_SPEC.canonicalId, 'A26');
    assert.strictEqual(INTEL_USV_26_SPEC.division, 'OPERATIONS_DELIVERABLES');
    assert.ok(INTEL_USV_26_SPEC.responsibilities.length >= 4);
    assert.ok(INTEL_USV_26_SPEC.requiredKnowledgeSources.includes('GLOBAL_NAVY_USVS'));
    assert.ok(INTEL_USV_26_SPEC.systemInstructions.length > 50);
  });

  it('should catalog operational USVs across major world navies', () => {
    const vessels = agent.searchOperatingUsvs();
    assert.ok(vessels.length >= 14, `Expected at least 14 operating vessels, got ${vessels.length}`);

    const navies = new Set(vessels.map((v) => v.operatorNavy));
    assert.ok(navies.size >= 8, `Expected at least 8 distinct navies, got ${navies.size}`);

    // Verify key countries are represented
    const countries = new Set(vessels.map((v) => v.country));
    assert.ok(countries.has('United States'), 'Missing United States Navy');
    assert.ok(countries.has('Ukraine'), 'Missing Ukrainian Naval Forces');
    assert.ok(countries.has('Turkey'), 'Missing Turkish Naval Forces');
    assert.ok(countries.has('Israel'), 'Missing Israeli Navy');
    assert.ok(countries.has('United Kingdom'), 'Missing Royal Navy');
    assert.ok(countries.has('France'), 'Missing French Navy');
    assert.ok(countries.has('Singapore'), 'Missing Republic of Singapore Navy');
    assert.ok(countries.has('Australia'), 'Missing Royal Australian Navy');
    assert.ok(countries.has('China'), 'Missing PLA Navy');
    assert.ok(countries.has('India'), 'Missing Indian Navy');
  });

  it('should validate complete naval architecture particulars for every vessel', () => {
    const vessels = agent.searchOperatingUsvs();

    for (const v of vessels) {
      assert.ok(v.id, 'Missing vessel ID');
      assert.ok(v.modelName, 'Missing model name');
      assert.ok(v.operatorNavy, 'Missing operator navy');
      assert.ok(v.manufacturer, 'Missing manufacturer');

      // Naval Architecture dimensions
      assert.ok(v.dimensions.lengthOverallM > 0, `${v.modelName} invalid LOA`);
      assert.ok(v.dimensions.beamM > 0, `${v.modelName} invalid beam`);
      assert.ok(v.dimensions.draftM > 0, `${v.modelName} invalid draft`);
      assert.ok(v.dimensions.fullLoadDisplacementKg > 0, `${v.modelName} invalid displacement`);
      assert.ok(v.dimensions.displacementTonnes > 0, `${v.modelName} invalid displacement tonnes`);
      assert.ok(v.dimensions.payloadCapacityKg > 0, `${v.modelName} invalid payload capacity`);
      assert.ok(v.dimensions.hullMaterial.length > 3, `${v.modelName} missing hull material`);
      assert.ok(v.dimensions.maxSeaStateOperating >= 3, `${v.modelName} operating sea state too low`);

      // Performance
      assert.ok(v.performance.maxSpeedKnots > 0, `${v.modelName} invalid max speed`);
      assert.ok(v.performance.cruiseSpeedKnots > 0, `${v.modelName} invalid cruise speed`);
      assert.ok(v.performance.rangeNauticalMiles > 0, `${v.modelName} invalid range`);
      assert.ok(v.performance.enduranceHours > 0, `${v.modelName} invalid endurance`);

      // Propulsion
      assert.ok(v.propulsion.totalPowerKw > 0, `${v.modelName} invalid power kW`);
      assert.ok(v.propulsion.engineDescription.length > 5, `${v.modelName} missing engine description`);

      // Autonomy & COLREGS
      assert.ok(v.autonomy.autonomyLevel, `${v.modelName} missing autonomy level`);
      assert.ok(v.autonomy.c2Datalinks.length > 0, `${v.modelName} missing datalinks`);

      // Benchmark delta vs USV-01
      assert.ok(v.usv01BenchmarkDelta.speedRatio > 0, `${v.modelName} missing speedRatio`);
      assert.ok(v.usv01BenchmarkDelta.keyTakeaway.length > 10, `${v.modelName} missing takeaway`);
      assert.ok(v.usv01BenchmarkDelta.recommendedDesignImprovement.length > 10, `${v.modelName} missing recommendation`);
    }
  });

  it('should filter vessels by country and navy', () => {
    const ukrVessels = agent.searchOperatingUsvs({ country: 'Ukraine' });
    assert.ok(ukrVessels.length >= 2, 'Expected at least 2 Ukrainian USVs (MAGURA V5, Sea Baby)');
    assert.ok(ukrVessels.some((v) => v.modelName === 'MAGURA V5'));
    assert.ok(ukrVessels.some((v) => v.modelName === 'Sea Baby'));

    const usVessels = agent.searchOperatingUsvs({ country: 'United States' });
    assert.ok(usVessels.length >= 2, 'Expected US Navy USVs (Sea Hunter, Mariner)');
    assert.ok(usVessels.some((v) => v.modelName === 'Sea Hunter'));
  });

  it('should filter vessels by mission profile', () => {
    const aswVessels = agent.searchOperatingUsvs({ mission: 'ASW' });
    assert.ok(aswVessels.length >= 1, 'Expected at least 1 ASW USV');
    assert.ok(aswVessels.some((v) => v.modelName === 'Sea Hunter'));

    const strikeVessels = agent.searchOperatingUsvs({ mission: 'STRIKE' });
    assert.ok(strikeVessels.length >= 2, 'Expected strike USVs');

    const mcmVessels = agent.searchOperatingUsvs({ mission: 'MCM' });
    assert.ok(mcmVessels.some((v) => v.modelName === 'Seagull'));
  });

  it('should filter vessels by hull form', () => {
    const trimaranVessels = agent.searchOperatingUsvs({ hullForm: 'Trimaran' });
    assert.strictEqual(trimaranVessels.length, 1);
    assert.strictEqual(trimaranVessels[0].modelName, 'Sea Hunter');

    const rhibVessels = agent.searchOperatingUsvs({ hullForm: 'RHIB' });
    assert.ok(rhibVessels.some((v) => v.modelName === 'Protector USV'));
  });

  it('should perform keyword search across specifications', () => {
    const starlinkSearch = agent.searchOperatingUsvs({ keyword: 'Starlink' });
    assert.ok(starlinkSearch.length >= 1, 'Should find USVs equipped with Starlink SATCOM');

    const waterjetSearch = agent.searchOperatingUsvs({ keyword: 'Waterjet' });
    assert.ok(waterjetSearch.length >= 4, 'Should find multiple waterjet powered USVs');
  });

  it('should synthesize peer-reviewed academic papers and governing formulas', () => {
    const papers = agent.fetchAcademicPapers();
    assert.ok(papers.length >= 5, `Expected at least 5 academic papers, got ${papers.length}`);

    const actuvPaper = papers.find((p) => p.id === 'PAPER-USV-01');
    assert.ok(actuvPaper, 'Missing Sea Hunter ACTUV paper');
    assert.ok(actuvPaper.doi, 'Missing paper DOI');
    assert.ok(actuvPaper.governingFormulas && actuvPaper.governingFormulas.length > 0, 'Missing governing formulas');

    // Search papers
    const hydroPapers = agent.fetchAcademicPapers('porpoising');
    assert.ok(hydroPapers.length >= 1, 'Should find Savitsky planing hull porpoising paper');
  });

  it('should compute comparative hydrodynamic benchmarks against USV-01', () => {
    const bm = agent.benchmarkAgainstUsv01('USV-USN-01');
    assert.strictEqual(bm.modelName, 'Sea Hunter');
    assert.ok(bm.comparisonTable.maxSpeedKnots.foreign === 27);
    assert.ok(bm.comparisonTable.maxSpeedKnots.usv01 === 30);
    assert.ok(bm.hydrodynamicMetrics.foreignFroudeNumberLength > 0.6);
    assert.ok(bm.hydrodynamicMetrics.slendernessRatio > 5.0);
    assert.ok(bm.hydrodynamicMetrics.payloadFractionPercent > 5.0);
    assert.ok(bm.engineeringAssessment.length > 20);
    assert.ok(bm.recommendedDesignTransfer.length > 20);
  });

  it('should generate valid Obsidian markdown notes with wikilinks', () => {
    const vessel = agent.getUsvDetails('USV-UKR-01');
    assert.ok(vessel, 'Missing MAGURA V5');

    const md = agent.generateObsidianVaultExport(vessel);
    assert.ok(md.includes('---'), 'Missing YAML frontmatter');
    assert.ok(md.includes('[[MAGURA V5]]'), 'Missing [[MAGURA V5]] Obsidian wikilink');
    assert.ok(md.includes('[[Main Directorate of Intelligence (HUR Group 13) / Ukrainian Navy]]') || md.includes('[[STRIKE]]'), 'Missing wikilink concepts');
    assert.ok(md.includes('[[USV-01 Baseline]]'), 'Missing [[USV-01 Baseline]] wikilink');
    assert.ok(md.includes('| **Length Overall ($L_{OA}$)** | 5.5 m |'), 'Missing dimension table');
  });

  it('should generate KnowledgeNote records for digital lab knowledge base', () => {
    const notes = agent.generateKnowledgeNotes();
    assert.ok(notes.length >= 15, `Expected at least 15 notes, got ${notes.length}`);

    const masterNote = notes.find((n) => n.id === 'KN-USV-FLEET-OVERVIEW');
    assert.ok(masterNote, 'Missing master fleet overview note');
    assert.strictEqual(masterNote.category, 'BENCHMARK');
    assert.ok(masterNote.contentMarkdown.includes('[[Global Operating USV Fleet Intelligence]]'));
  });
});
