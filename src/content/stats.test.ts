import { describe, expect, it } from 'vitest';
import { computeStats, formatStats } from './stats';

describe('computeStats', () => {
  it('counts words in plain prose', () => {
    expect(computeStats('one two three').words).toBe(3);
  });

  it('strips fenced code before counting (HTML text content still counts)', () => {
    const src = '```ts\nconst a = 1;\n```\n\n<span>hi</span>\n\nreal words here';
    const s = computeStats(src);
    // "hi real words here" = 4 words — fenced block is stripped, HTML text stays.
    expect(s.words).toBe(4);
  });

  it('reports chars from the raw source', () => {
    expect(computeStats('abc').chars).toBe(3);
  });

  it('clamps reading time to at least 1 minute', () => {
    expect(computeStats('a').readMinutes).toBe(1);
  });

  it('scales reading time roughly by words-per-minute', () => {
    const long = Array.from({ length: 440 }, () => 'word').join(' ');
    expect(computeStats(long).readMinutes).toBe(2);
  });
});

describe('formatStats', () => {
  it('reads naturally', () => {
    expect(formatStats({ words: 1234, chars: 5000, readMinutes: 6 })).toBe('1,234 words · 6 min read');
  });
});
