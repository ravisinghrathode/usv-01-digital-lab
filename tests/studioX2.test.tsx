import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { compareMeshPreviews, parseObjMesh, MAX_OBJ_BYTES } from '../src/studio/meshGeometry';
import { DEFAULT_ENGINEERING_SELECTION } from '../src/studio/engineeringContext';
import { MODULE_REGISTRY } from '../src/moduleRegistry';
import { DirectorBriefing } from '../src/components/DirectorBriefing';
import {
  INITIAL_REQUIREMENTS, INITIAL_DECISIONS, INITIAL_RISKS, INITIAL_SIMULATIONS, INITIAL_VERIFICATION_PLANS
} from '../src/data/initialProjectData';

const OBJ_A = [
  'o Hull', 'v 0 0 0', 'v 1 0 0', 'v 0 1 0', 'f 1 2 3'
].join('\n');
const OBJ_B = [
  'g Structure', 'v 0 0 0', 'v 1 0 0', 'v 1 1 0', 'v 0 1 0',
  'f -4 -3 -2 -1'
].join('\n');

describe('Naval Studio X.2 engineering workstation',()=>{
  it('parses bounded, locally supplied OBJ geometry without assigning physical units',()=>{
    const a=parseObjMesh(OBJ_A);
    expect(a.vertices).toHaveLength(3);
    expect(a.triangles).toHaveLength(1);
    expect(a.groups).toEqual(['Hull']);
    expect(a.bounds.max).toEqual([1,1,0]);
    const b=parseObjMesh(OBJ_B);
    expect(b.triangles).toHaveLength(2);
    expect(b.groups).toEqual(['Structure']);
    const difference=compareMeshPreviews(a,b);
    expect(difference.vertexDelta).toBe(1);
    expect(difference.triangleDelta).toBe(1);
    expect(difference.comparableDimensions).toBe(false);
    expect(difference).not.toHaveProperty('displacement');
  });
  it('rejects invalid faces, non-finite coordinates, empty geometry and excessive files',()=>{
    expect(()=>parseObjMesh('v 0 0 0\nv 1 1 1\nf 1 2 3')).toThrow();
    expect(()=>parseObjMesh('v 1 Infinity 0\nv 0 1 0\nv 0 0 0\nf 1 2 3')).toThrow();
    expect(()=>parseObjMesh('v 0 0 0')).toThrow();
    expect(()=>parseObjMesh('#'+ 'x'.repeat(MAX_OBJ_BYTES+1))).toThrow();
  });
  it('does not invent a governed configuration or verified release',()=>{
    expect(DEFAULT_ENGINEERING_SELECTION.configurationRevision).toBeNull();
    expect(DEFAULT_ENGINEERING_SELECTION.candidateId).toBeNull();
    expect(DEFAULT_ENGINEERING_SELECTION.evidenceLevel).toBe('UNVERIFIED');
  });
  it('renders the director briefing from real register inputs without claiming acceptance',()=>{
    const html=renderToStaticMarkup(<DirectorBriefing
      requirements={INITIAL_REQUIREMENTS} decisions={INITIAL_DECISIONS}
      risks={INITIAL_RISKS} simulations={INITIAL_SIMULATIONS}
      verificationPlans={INITIAL_VERIFICATION_PLANS} onNavigate={()=>{}} onDetailed={()=>{}}/>);
    expect(html).toContain('Director');
    expect(html).toContain('Authoritative CAD revision: TBD');
    expect(html).toContain('Record');
  });
  it('retains all 23 legacy modules and the CAD module under the single shell',()=>{
    expect(MODULE_REGISTRY).toHaveLength(24);
    const app=readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
    expect(app).toContain('openTabs.map(tab =>');
    expect(app).toContain('<StudioNavigation');
    expect(app).toContain('<StudioWorkspaceBar');
    expect(app).toContain('<StudioCommandPalette');
    expect(app).toContain('<DirectorBriefing');
    expect(app).not.toContain('NavigationSidebar');
    for(const module of MODULE_REGISTRY)expect(app).toContain(`currentModule === '${module.id}'`);
  });
});
