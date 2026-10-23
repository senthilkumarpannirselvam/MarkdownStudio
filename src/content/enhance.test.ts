import { describe, expect, it } from 'vitest';
import { toggleTaskInSource } from './enhance';

describe('toggleTaskInSource', () => {
  it('ticks an unchecked task on the given line (0-indexed)', () => {
    const src = ['- [ ] one', '- [ ] two'].join('\n');
    expect(toggleTaskInSource(src, 1, true)).toBe(['- [ ] one', '- [x] two'].join('\n'));
  });

  it('unticks a checked task', () => {
    const src = '- [x] done';
    expect(toggleTaskInSource(src, 0, false)).toBe('- [ ] done');
  });

  it('respects list prefix variations (-, *, +, numbered)', () => {
    expect(toggleTaskInSource('* [ ] a', 0, true)).toBe('* [x] a');
    expect(toggleTaskInSource('+ [ ] a', 0, true)).toBe('+ [x] a');
    expect(toggleTaskInSource('1. [ ] a', 0, true)).toBe('1. [x] a');
  });

  it('leaves non-task lines alone', () => {
    const src = 'just prose';
    expect(toggleTaskInSource(src, 0, true)).toBe('just prose');
  });

  it('is a no-op for an out-of-range line', () => {
    const src = '- [ ] only line';
    expect(toggleTaskInSource(src, 5, true)).toBe(src);
  });

  it('preserves surrounding lines verbatim', () => {
    const src = ['prelude', '- [ ] todo', 'coda'].join('\n');
    const out = toggleTaskInSource(src, 1, true);
    expect(out.split('\n')).toEqual(['prelude', '- [x] todo', 'coda']);
  });
});
