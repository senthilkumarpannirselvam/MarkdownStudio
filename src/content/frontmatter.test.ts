import { describe, expect, it } from 'vitest';
import { parseFrontmatter, renderFrontmatterCard } from './frontmatter';

describe('parseFrontmatter', () => {
  it('extracts simple YAML keys and coerces types', () => {
    const src = `---
title: Hello
count: 42
rate: 3.14
published: true
draft: false
tags: [a, b, c]
nothing: ~
---
body here`;
    const { data, body } = parseFrontmatter(src);
    expect(data).toEqual({
      title: 'Hello',
      count: 42,
      rate: 3.14,
      published: true,
      draft: false,
      tags: ['a', 'b', 'c'],
      nothing: null,
    });
    expect(body).toBe('body here');
  });

  it('handles TOML-style +++ fences', () => {
    const { data, body } = parseFrontmatter('+++\nname = "x"\n+++\nhi');
    expect(data).toEqual({ name: 'x' });
    expect(body).toBe('hi');
  });

  it('handles JSON block via ;;; fence', () => {
    const { data, body } = parseFrontmatter(';;;\n{"a":1}\n;;;\nhi');
    expect(data).toEqual({ a: 1 });
    expect(body).toBe('hi');
  });

  it('reports how many source lines were removed', () => {
    expect(parseFrontmatter('---\na: 1\n---\n# T').lineOffset).toBe(3);
    expect(parseFrontmatter('# T').lineOffset).toBe(0);
  });

  it('returns the body unchanged when there is no frontmatter', () => {
    const { data, body } = parseFrontmatter('# just markdown\n\ntext');
    expect(data).toEqual({});
    expect(body).toBe('# just markdown\n\ntext');
  });

  it('ignores comments and blank lines inside the block', () => {
    const { data } = parseFrontmatter('---\n# comment\n\nkey: value\n---\n');
    expect(data).toEqual({ key: 'value' });
  });

  it('returns the body unchanged on an unterminated fence', () => {
    const src = '---\ntitle: broken\n(no closing fence)';
    const { data, body } = parseFrontmatter(src);
    expect(data).toEqual({});
    expect(body).toBe(src);
  });
});

describe('renderFrontmatterCard', () => {
  it('returns an empty string for empty data', () => {
    expect(renderFrontmatterCard({})).toBe('');
  });

  it('renders a details element with one row per key', () => {
    const html = renderFrontmatterCard({ title: 'Hi', tags: ['a', 'b'] });
    expect(html).toContain('<details class="ms-frontmatter"');
    expect(html).toContain('title');
    expect(html).toContain('a, b');
    expect(html).toContain('2 fields');
  });

  it('escapes HTML in keys and values', () => {
    const html = renderFrontmatterCard({ k: '<script>' });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
