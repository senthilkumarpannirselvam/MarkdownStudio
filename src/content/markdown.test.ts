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

  it('removes scripts and event handlers from raw HTML', () => {
    const html = render('<script>alert(1)</script> <img src=x onerror=alert(1)>');
    expect(html).not.toContain('<script');
    expect(html).not.toMatch(/onerror/i);
    expect(html).toContain('<img src="x">');
  });

  it('shows raw HTML as text when the HTML setting is off', () => {
    const html = render('<script>alert(1)</script> <img src=x onerror=alert(1)>', { allowHtml: false });
    expect(html).not.toContain('<script');
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

  it('shows a single line break instead of joining the lines', () => {
    const html = render('one\ntwo');
    expect(html).toContain('one<br>');
    expect(html).toContain('two');
    expect(html.match(/<p>/g)).toHaveLength(1);
  });

  it('keeps a blank line as a new paragraph', () => {
    expect(render('one\n\ntwo').match(/<p>/g)).toHaveLength(2);
  });

  it('turns a br tag into a break', () => {
    const html = render('one<br>two<br/>three<br />four');
    expect(html).toMatch(/one<br>\s*two<br>\s*three<br>\s*four/);
    expect(render('`keep <br> here`')).toContain('&lt;br&gt;');
  });

  it('keeps a br tag but drops its attributes and any script next to it', () => {
    const html = render('see <br class="x" onclick="alert(1)"> and <script>');
    expect(html).not.toMatch(/onclick/i);
    expect(html).not.toContain('<script');
  });

  it('with HTML off, only a plain br tag becomes a break and every other tag stays text', () => {
    const html = render('one<br>two', { allowHtml: false });
    expect(html).toMatch(/one<br>\s*two/);
    const unsafe = render('see <br class="x" onclick="alert(1)"> and <script>', { allowHtml: false });
    expect(unsafe).not.toContain('<br');
    expect(unsafe).not.toContain('<script');
  });

  it('breaks a table cell on a br tag', () => {
    expect(render('| A |\n| --- |\n| one<br>two |')).toMatch(/one<br>\s*two/);
  });

  it('keeps newlines inside a code block', () => {
    const html = render('```\nalpha\nbeta\n```');
    expect(html).toContain('alpha\nbeta');
    expect(html).not.toContain('<br');
  });

  it('respects feature toggles', () => {
    expect(render('> [!NOTE]\n> x', { enableCallouts: false })).not.toContain('ms-callout');
    expect(render(':tada:', { enableEmoji: false })).toContain(':tada:');
    expect(render(':tada:')).not.toContain(':tada:');
  });
});
