import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '@shared/settings';
import { createMarkdown } from './markdown';

const render = (src: string, overrides = {}) => createMarkdown({ ...DEFAULT_SETTINGS, ...overrides }).render(src, {});

describe('security', () => {
  it('cannot inject attributes through the fence language', () => {
    const html = render('```a"onmouseover="alert(1)\nx\n```');
    expect(html).not.toMatch(/onmouseover/);
    expect(html).toContain('<code class="hljs">');
  });

  it('escapes raw HTML in the source', () => {
    const html = render('<script>alert(1)</script> <img src=x onerror=alert(1)>');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img');
  });

  it('does not create javascript: links', () => {
    expect(render('[x](javascript:alert(1))')).not.toContain('href="javascript');
  });

  it('rejects a wiki link whose target is a script URL', () => {
    const html = render('[[javascript:alert(1)//]]', { enableWikilinks: true });
    expect(html).not.toContain('<a');
  });

  it('accepts ordinary wiki links', () => {
    expect(render('[[My Page|label]]', { enableWikilinks: true })).toContain('href="My%20Page.md"');
  });
});

describe('rendering', () => {
  it('keeps the language class for diagram fences', () => {
    expect(render('```mermaid\ngraph TD;\n```')).toContain('language-mermaid');
  });

  it('highlights known languages', () => {
    expect(render('```js\nconst a = 1;\n```')).toContain('hljs-keyword');
  });

  it('gives duplicate headings unique ids', () => {
    const html = render('## Install\n\n## Install\n\n## Install');
    expect(html).toContain('id="install"');
    expect(html).toContain('id="install-1"');
    expect(html).toContain('id="install-2"');
  });

  it('keeps non-Latin heading text in ids and never emits an empty id', () => {
    expect(render('## 安装指南')).toContain('id="安装指南"');
    expect(render('## !!!')).toContain('id="section"');
  });

  it('wraps tables so they scroll inside their own box', () => {
    expect(render('| a | b |\n|---|---|\n| 1 | 2 |')).toMatch(/<div class="ms-table-wrap"><table>[\s\S]*<\/table>\s*<\/div>/);
  });

  it('turns [!NOTE] blockquotes into callouts', () => {
    const html = render('> [!WARNING]\n> careful');
    expect(html).toContain('ms-callout-warning');
    expect(html).toContain('ms-callout-title');
    expect(html).not.toContain('[!WARNING]');
  });

  it('records the source line of every list item', () => {
    const html = render('intro\n\n- [ ] a\n- [x] b');
    expect(html).toContain('data-line="2"');
    expect(html).toContain('data-line="3"');
  });

  it('respects feature toggles', () => {
    expect(render('> [!NOTE]\n> x', { enableCallouts: false })).not.toContain('ms-callout');
    expect(render(':tada:', { enableEmoji: false })).toContain(':tada:');
    expect(render(':tada:')).not.toContain(':tada:');
  });
});
