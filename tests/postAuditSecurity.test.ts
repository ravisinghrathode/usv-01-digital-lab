import { describe, expect, it, vi, afterEach } from 'vitest';
import { GlobalUsvIntelligenceAgent } from '../src/core/agents/GlobalUsvIntelligenceAgent.ts';
import { BaseAgent } from '../src/core/engine/BaseAgent.ts';
import { AgentRegistry } from '../src/core/registry/AgentRegistry.ts';

describe('Post-audit security and evidence regression', () => {
  afterEach(() => {
    delete process.env.USV_INTEL_PUBLIC_FEEDS;
    vi.unstubAllGlobals();
  });

  it('requires registered safety approval regardless of exploratory flags', async () => {
    const spec = AgentRegistry.getInstance().requireAgent('STAB-HYD-06');
    const agent = new BaseAgent({ ...spec, verificationCriteria: {
      ...spec.verificationCriteria, mandatoryDeterministicTools: [],
      independentReviewRequired: true
    }});
    const result = await agent.execute({
      taskId: 'SAFETY-POLICY-BYPASS-TEST',
      context: { isExploratoryStudy: true },
      parameters: { isExploratoryStudy: true }
    });
    expect(result.requiresDirectorApproval).toBe(true);
    expect(result.status).toBe('NEEDS_HUMAN_APPROVAL');
  });

  it('reports cached A26 data without claiming fresh scraping', async () => {
    const report = await new GlobalUsvIntelligenceAgent().scrapeAndEnrich();
    expect(report.refreshMode).toBe('CACHED_OFFLINE');
    expect(report.sourcesQueried).toEqual([]);
    expect(report.totalVesselsScraped).toBe(0);
    expect(report.papersExtracted).toBe(0);
  });

  it('rejects unapproved feed hosts without making network requests', async () => {
    process.env.USV_INTEL_PUBLIC_FEEDS = 'https://127.0.0.1/private';
    const spy = vi.fn();
    vi.stubGlobal('fetch', spy);
    const report = await new GlobalUsvIntelligenceAgent().scrapeAndEnrich();
    expect(spy).not.toHaveBeenCalled();
    expect(report.sourcesQueried).toEqual([]);
    expect(report.refreshMode).toBe('CACHED_OFFLINE');
  });

  it('records real public feed attempts without inventing verified vessel models', async () => {
    process.env.USV_INTEL_PUBLIC_FEEDS = 'https://export.arxiv.org/rss/cs.RO';
    const spy = vi.fn().mockResolvedValue({
      ok: true, headers: { get: () => 'application/rss+xml' },
      text: async () => '<rss><channel><item><title>Marine autonomy paper</title></item></channel></rss>'
    });
    vi.stubGlobal('fetch', spy);
    const report = await new GlobalUsvIntelligenceAgent().scrapeAndEnrich();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(report.refreshMode).toBe('LIVE_RETRIEVAL');
    expect(report.sourcesQueried).toHaveLength(1);
    expect(report.sourceAttributions.some(a => a.status === 'SUCCESS' && a.recordsFound === 1)).toBe(true);
    expect(report.totalVesselsScraped).toBe(0);
    expect(report.newVesselsIdentified).toBe(0);
  });
});
