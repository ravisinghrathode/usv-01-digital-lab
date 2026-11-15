import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { MODULE_REGISTRY } from '../src/moduleRegistry';
import { legacyModuleUrl, legacyRootRedirect } from '../src/dockyard2/domain';

const read = (file:string)=>readFileSync(new URL('../'+file,import.meta.url),'utf8');

describe('Engineering Sessions becomes the standard interface',()=>{
  it('serves Engineering Sessions at root, redirects retired UI, and preserves governed routes',()=>{
    const index=read('index.html');
    const legacy=read('legacy.html');
    const alias=read('dockyard2.html');
    const config=read('vite.config.ts');
    expect(index).toContain('<title>Naval AI Lab | Engineering Sessions | USV-01</title>');
    expect(index).toContain('src/sessions/main.tsx');
    expect(index).not.toContain('src/main.tsx');
    expect(legacy).toContain('src/main.tsx');
    expect(legacy).not.toContain('src/dockyard2/main.tsx');
    expect(alias).toContain('window.location.replace');
    expect(alias).not.toContain('src/dockyard2/main.tsx');
    expect(config).toContain("legacyEngineering: path.resolve(import.meta.dirname, 'legacy.html')");
    expect(config).toContain("navalDesignStudio: path.resolve(import.meta.dirname, 'index.html')");
  });
  it('keeps the original governed editor reachable while historical presentation code stays non-default',()=>{
    const app=read('src/dockyard2/App.tsx');
    const originalTopBar=read('src/components/TopBar.tsx');
    const sessions=read('src/sessions/App.tsx');
    expect(app).toContain('Naval Design Studio');
    expect(app).not.toContain('DOCKYARD <em>2.0</em>');
    expect(app).toContain('legacyRootRedirect(window.location.search)');
    expect(app).toContain('href="/legacy.html"');
    expect(sessions).toContain('href="/#worktable"');
    expect(sessions).toContain('href="/legacy.html"');
    expect(read('src/sessions/main.tsx')).toContain('legacyRootRedirect(window.location.search)');
    expect(originalTopBar).toContain('Return to Engineering Sessions');
    expect(originalTopBar).toContain('href="/"');
  });
  it('routes every old module deep link to the legacy workbench but ignores invalid query strings',()=>{
    expect(MODULE_REGISTRY).toHaveLength(24);
    for(const {id} of MODULE_REGISTRY){
      const expected='/legacy.html?module='+encodeURIComponent(id);
      expect(legacyModuleUrl(id)).toBe(expected);
      expect(legacyRootRedirect('?module='+encodeURIComponent(id))).toBe(expected);
    }
    expect(legacyRootRedirect('')).toBeNull();
    expect(legacyRootRedirect('?module=made-up')).toBeNull();
    expect(legacyRootRedirect('?module=%3Cscript%3E')).toBeNull();
  });
  it('documents that default routing does not grant approval or migrate legacy write workflows',()=>{
    const readme=read('src/dockyard2/README.md');
    const product=read('PRODUCT.md');
    expect(product).toContain('Engineering Sessions');
    expect(readme).toContain('Engineering Sessions');
    expect(readme).toContain('no privileged writes');
    expect(readme).toContain('/legacy.html');
    expect(readme).toContain('protected');
  });
});
