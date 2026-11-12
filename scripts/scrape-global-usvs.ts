#!/usr/bin/env node
/**
 * USV-01 Digital Engineering Lab — Global Navy USV Fleet Scraper & Model Intelligence CLI
 * 
 * Usage:
 *   node --experimental-strip-types scripts/scrape-global-usvs.ts [options]
 * 
 * Options:
 *   --query=<text>        Filter by model name, navy, country, or technology
 *   --country=<country>   Filter by country (e.g. US, UK, TR, UA, IL, FR, SG, AU, IN, CN)
 *   --mission=<profile>   Filter by mission (ASW, ASuW, MCM, ISR, STRIKE, PATROL, SURVEY, EW)
 *   --sync                Sync intelligence records into data/project_store.json
 *   --export              Export Obsidian markdown vault files to docs/vault/usv-fleet/
 *   --benchmark=<id>      Run comparative naval architecture benchmark against USV-01
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GlobalUsvIntelligenceAgent } from '../src/core/agents/GlobalUsvIntelligenceAgent.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

async function main() {
  console.log('\n========================================================================');
  console.log('  USV-01 DIGITAL ENGINEERING LAB — GLOBAL NAVAL USV INTELLIGENCE AGENT  ');
  console.log('  Agent: INTEL-USV-26 | Model & Knowledge Scraper Engine               ');
  console.log('========================================================================\n');

  const args = process.argv.slice(2);
  const options: Record<string, string | boolean> = {};

  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      options[key] = value !== undefined ? value : true;
    }
  }

  const agent = new GlobalUsvIntelligenceAgent();

  // Run scraper and enrichment pipeline
  console.log('🔍 Executing global web & defense archive intelligence extraction pipeline...');
  const scrapeReport = await agent.scrapeAndEnrich([
    'DARPA ACTUV Sea Trial Archive',
    'IEEE Oceanic Engineering Transactions',
    'Naval News Operational Fleet Records',
    'Jane\'s Defense Unmanned Surface Systems',
    'SNAME High-Speed Craft Hull Repository',
    'Black Sea Maritime Strike Tactical Lessons (RUSI)',
    'NATO STO Autonomous MCM Working Group'
  ]);

  console.log(`✅ Extraction Completed:`);
  console.log(`   - Operating Naval USVs Cataloged: ${scrapeReport.totalVesselsScraped}`);
  console.log(`   - Active Naval Operators / Navies: ${scrapeReport.activeNaviesCount}`);
  console.log(`   - Peer-Reviewed Technical Papers: ${scrapeReport.papersExtracted}`);
  console.log(`   - Fastest Operating USV: ${scrapeReport.topPerformingVessels.fastest}`);
  console.log(`   - Longest Endurance: ${scrapeReport.topPerformingVessels.longestEndurance}`);
  console.log(`   - Largest Displacement: ${scrapeReport.topPerformingVessels.largestDisplacement}\n`);

  // Query filtering
  const query = {
    keyword: typeof options.query === 'string' ? options.query : undefined,
    country: typeof options.country === 'string' ? options.country : undefined,
    mission: typeof options.mission === 'string' ? (options.mission as any) : undefined
  };

  const results = agent.searchOperatingUsvs(query);
  console.log(`📋 Found ${results.length} operational naval USV models matching criteria:\n`);

  console.log(
    '| ' +
    'Model Name'.padEnd(20) + ' | ' +
    'Country'.padEnd(14) + ' | ' +
    'Navy / Operator'.padEnd(30) + ' | ' +
    'LOA (m)'.padEnd(8) + ' | ' +
    'Disp (t)'.padEnd(9) + ' | ' +
    'Speed (kt)'.padEnd(10) + ' | ' +
    'Mission'.padEnd(10) + ' |'
  );
  console.log('|-' + '-'.repeat(20) + '-|-' + '-'.repeat(14) + '-|-' + '-'.repeat(30) + '-|-' + '-'.repeat(8) + '-|-' + '-'.repeat(9) + '-|-' + '-'.repeat(10) + '-|-' + '-'.repeat(10) + '-|');

  for (const v of results) {
    console.log(
      '| ' +
      v.modelName.padEnd(20).substring(0, 20) + ' | ' +
      v.country.padEnd(14).substring(0, 14) + ' | ' +
      v.operatorNavy.padEnd(30).substring(0, 30) + ' | ' +
      v.dimensions.lengthOverallM.toFixed(1).padStart(7) + ' | ' +
      v.dimensions.displacementTonnes.toFixed(1).padStart(8) + ' | ' +
      v.performance.maxSpeedKnots.toFixed(1).padStart(9) + ' | ' +
      v.primaryMission.padEnd(10).substring(0, 10) + ' |'
    );
  }

  // Handle single vessel benchmark if requested
  if (options.benchmark) {
    const targetId = typeof options.benchmark === 'string' ? options.benchmark : results[0]?.id;
    if (targetId) {
      console.log(`\n⚖️  Running Comparative Benchmark: [${targetId}] vs USV-01 Baseline...`);
      const bm = agent.benchmarkAgainstUsv01(targetId);
      console.log(`   Model: ${bm.modelName} (${bm.country})`);
      console.log(`   Speed Ratio: ${bm.comparisonTable.maxSpeedKnots.deltaRatio}x (${bm.comparisonTable.maxSpeedKnots.foreign} kt vs ${bm.comparisonTable.maxSpeedKnots.usv01} kt)`);
      console.log(`   Displacement Ratio: ${bm.comparisonTable.displacementTonnes.deltaRatio}x (${bm.comparisonTable.displacementTonnes.foreign} t vs ${bm.comparisonTable.displacementTonnes.usv01} t)`);
      console.log(`   Length Froude Number Fn_L: ${bm.hydrodynamicMetrics.foreignFroudeNumberLength} (USV-01: ${bm.hydrodynamicMetrics.usv01FroudeNumberLength})`);
      console.log(`   Payload Mass Fraction: ${bm.hydrodynamicMetrics.payloadFractionPercent}% of full load displacement`);
      console.log(`   Takeaway: ${bm.engineeringAssessment}`);
      console.log(`   Recommendation: ${bm.recommendedDesignTransfer}`);
    }
  }

  // Handle Obsidian Export if requested
  if (options.export) {
    const vaultDir = path.join(PROJECT_ROOT, 'docs', 'vault', 'usv-fleet');
    if (!fs.existsSync(vaultDir)) {
      fs.mkdirSync(vaultDir, { recursive: true });
    }

    console.log(`\n📁 Exporting Obsidian Vault Markdown Notes to ${vaultDir}...`);
    for (const v of results) {
      const fileName = `${v.modelName.replace(/[^a-zA-Z0-9_-]/g, '_')}.md`;
      const filePath = path.join(vaultDir, fileName);
      const markdown = agent.generateObsidianVaultExport(v);
      fs.writeFileSync(filePath, markdown, 'utf-8');
    }
    console.log(`✅ Successfully exported ${results.length} Obsidian notes.`);
  }

  // Save to JSON dataset
  const dataDir = path.join(PROJECT_ROOT, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const jsonPath = path.join(dataDir, 'global_usv_fleet_intelligence.json');
  fs.writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        scrapedAt: new Date().toISOString(),
        agent: 'INTEL-USV-26',
        report: scrapeReport,
        vessels: results,
        academicPapers: agent.fetchAcademicPapers()
      },
      null,
      2
    ),
    'utf-8'
  );
  console.log(`💾 Saved fleet dataset snapshot to: ${jsonPath}`);

  // Handle Project Store sync if requested
  if (options.sync) {
    const storePath = path.join(dataDir, 'project_store.json');
    let dbStore: Record<string, any[]> = {};
    if (fs.existsSync(storePath)) {
      try {
        dbStore = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
      } catch (e) {
        console.warn('Could not parse existing project_store.json, creating new.');
      }
    }

    if (!Array.isArray(dbStore.knowledge_notes)) {
      dbStore.knowledge_notes = [];
    }

    const newNotes = agent.generateKnowledgeNotes();
    let addedCount = 0;

    for (const note of newNotes) {
      const existingIdx = dbStore.knowledge_notes.findIndex((n: any) => n.id === note.id);
      if (existingIdx >= 0) {
        dbStore.knowledge_notes[existingIdx] = note;
      } else {
        dbStore.knowledge_notes.push(note);
        addedCount++;
      }
    }

    fs.writeFileSync(storePath, JSON.stringify(dbStore, null, 2), 'utf-8');
    console.log(`🔄 Synced ${newNotes.length} intelligence notes into project store (${addedCount} new notes).`);
  }

  console.log('\n✨ Global USV intelligence agent run complete.\n');
}

main().catch((err) => {
  console.error('Error executing scraper agent:', err);
  process.exit(1);
});
