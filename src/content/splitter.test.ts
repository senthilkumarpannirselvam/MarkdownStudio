import { describe, expect, it } from 'vitest';
import { clampSplit } from './splitter';

describe('clampSplit', () => {
  it('keeps sensible values', () => {
    expect(clampSplit(50)).toBe(50);
    expect(clampSplit(33.5)).toBe(33.5);
  });

  it('never lets either pane disappear', () => {
    expect(clampSplit(0)).toBe(15);
    expect(clampSplit(100)).toBe(85);
    expect(clampSplit(-40)).toBe(15);
  });

  it('falls back to an even split for non-numbers', () => {
    expect(clampSplit(NaN)).toBe(50);
    expect(clampSplit(Infinity)).toBe(50);
  });
});
