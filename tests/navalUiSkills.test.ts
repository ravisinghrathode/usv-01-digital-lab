import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const skills = [
  'frontend-app-builder',
  'frontend-design',
  'frontend-ui-engineering',
  'browser-testing-with-devtools',
  'ui-ux-pro-max'
] as const;
function source(path:string) { return readFileSync(resolve(root,path),'utf8'); }

describe('Naval Design Studio five approved UI/UX development skills',()=>{
  it('vendors all five original SKILL.md contracts in the repository',()=>{
    for(const name of skills){
      const path='.agents/skills/'+name+'/SKILL.md';
      expect(existsSync(resolve(root,path)),name).toBe(true);
      expect(source(path),name).toMatch(new RegExp('^---\\nname: '+name+'\\n'));
      expect(source(path).length).toBeGreaterThan(1500);
    }
  });
  it('includes the design system database and program needed by UI UX Pro Max',()=>{
    for(const asset of [
      'scripts/search.py',
      'scripts/core.py',
      'scripts/design_system.py',
      'data/styles.csv',
      'data/typography.csv',
      'data/ui-reasoning.csv',
      'data/ux-guidelines.csv',
      'data/stacks/react.csv',
      'references/quick-reference.md'
    ]) {
      expect(existsSync(resolve(root,'.agents/skills/ui-ux-pro-max',asset)),asset).toBe(true);
    }
  });
  it('preserves licenses, provenance and original engineering authority',()=>{
    expect(existsSync(resolve(root,'.agents/skills/frontend-design/LICENSE.txt'))).toBe(true);
    expect(existsSync(resolve(root,'.agents/skills/ui-ux-pro-max/LICENSE'))).toBe(true);
    expect(existsSync(resolve(root,'.agents/skills/browser-testing-with-devtools/LICENSE'))).toBe(true);
    expect(existsSync(resolve(root,'.agents/skills/frontend-app-builder/SOURCE-PLUGIN-MANIFEST.json'))).toBe(true);
    expect(source('AGENTS.md')).toContain('mandatory UI/UX skills');
    const doc=source('docs/UI_UX_SKILL_STACK.md');
    expect(doc).toContain('ChatGPT');
    expect(doc).toContain('Chrome DevTools MCP');
    expect(doc).toContain('31');
  });
});
