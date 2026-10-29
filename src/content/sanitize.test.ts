import { describe, expect, it } from 'vitest';
import { sanitizeHtml } from './sanitize';

describe('sanitizeHtml', () => {
  it('keeps the HTML real documents use', () => {
    const html = sanitizeHtml(
      '<p align="center"><img src="logo.png" width="120" alt="Logo"></p>' +
        '<details open><summary>More</summary><kbd>Ctrl</kbd>+<kbd>S</kbd> H<sub>2</sub>O x<sup>2</sup></details>' +
        '<table><tr><th align="left">A</th><td colspan="2">B</td></tr></table>',
    );
    expect(html).toContain('<img src="logo.png" width="120" alt="Logo">');
    expect(html).toContain('<p align="center">');
    expect(html).toContain('<details open="">');
    expect(html).toContain('<kbd>Ctrl</kbd>');
    expect(html).toContain('<sub>2</sub>');
    expect(html).toContain('colspan="2"');
  });

  it('removes scripts, frames, forms and event handlers', () => {
    const html = sanitizeHtml(
      '<script>alert(1)</script><iframe src="https://x.test"></iframe><form action="/x"><input type="text"></form>' +
        '<a href="https://ok.test" onclick="steal()">ok</a><img src="a.png" onerror="steal()"><svg onload="steal()"></svg>',
    );
    expect(html).not.toMatch(/<script|<iframe|<form|<svg|onclick|onerror|onload/i);
    expect(html).not.toContain('type="text"');
    expect(html).toContain('href="https://ok.test"');
  });

  it('drops script URLs but keeps ordinary, relative and anchor links', () => {
    const html = sanitizeHtml(
      '<a href="javascript:alert(1)">a</a><a href="data:text/html,hi">b</a><a href="docs/a.md">c</a><a href="#top">d</a><a href="mailto:a@b.test">e</a>',
    );
    expect(html).not.toMatch(/javascript:|data:text/i);
    expect(html).toContain('href="docs/a.md"');
    expect(html).toContain('href="#top"');
    expect(html).toContain('href="mailto:a@b.test"');
  });

  it('allows file addresses only when asked to', () => {
    expect(sanitizeHtml('<img src="file:///C:/pics/a.png">')).not.toContain('file:');
    expect(sanitizeHtml('<img src="file:///C:/pics/a.png">', true)).toContain('src="file:///C:/pics/a.png"');
    expect(sanitizeHtml('<a href="file:///C:/a.md">x</a>', true)).toContain('file:///C:/a.md');
  });

  it('keeps table alignment but no other inline style', () => {
    const html = sanitizeHtml(
      '<table><tr><th style="text-align:center">A</th><td style="position:fixed;top:0">B</td></tr></table><p style="color:red">x</p>',
    );
    expect(html).toContain('style="text-align:center"');
    expect(html).not.toMatch(/position|color:red/);
  });

  it('keeps the attributes this extension relies on', () => {
    const html = sanitizeHtml(
      '<h2 id="location">Location</h2><li class="task-list-item" data-line="4"><input type="checkbox" disabled checked> done</li>' +
        '<blockquote class="ms-callout ms-callout-note" data-kind="note"><div class="ms-callout-title">Note</div></blockquote>',
    );
    expect(html).toContain('id="location"');
    expect(html).toContain('data-line="4"');
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('data-kind="note"');
  });

  it('removes comments and unknown tags but keeps their text', () => {
    const html = sanitizeHtml('<!-- hidden --><blink>text</blink><object data="x"></object>');
    expect(html).not.toMatch(/hidden|<blink|<object/);
    expect(html).toContain('text');
  });
});
