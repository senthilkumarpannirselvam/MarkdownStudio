import { describe, expect, it } from 'vitest';
import { sanitizeSvg, splitMath } from './lazy';

describe('splitMath', () => {
  const maths = (s: string) => splitMath(s).filter((p) => p.math !== undefined).map((p) => p.math);

  it('finds inline and display math', () => {
    expect(maths('a $x^2$ b $$y$$ c')).toEqual(['x^2', 'y']);
  });

  it('leaves prices alone', () => {
    expect(maths('costs $5 and $10 today')).toEqual([]);
    expect(maths('between $5 and $x$')).toEqual(['x']);
  });

  it('does not match across lines or spaces inside the delimiters', () => {
    expect(maths('$ a $')).toEqual([]);
    expect(maths('$a\nb$')).toEqual([]);
  });

  it('reassembles to the original text', () => {
    const text = 'one $a$ two $$b$$ three';
    expect(splitMath(text).map((p) => p.text).join('')).toBe(text);
  });
});

describe('sanitizeSvg', () => {
  it('removes scripts, event handlers and script URLs', () => {
    const out = sanitizeSvg(
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" onload="x()">' +
        '<script>alert(1)</script><foreignObject><div>hi</div></foreignObject>' +
        '<a xlink:href="javascript:alert(1)"><rect onclick="y()" width="1" height="1"/></a></svg>',
    );
    expect(out).not.toMatch(/script|onload|onclick|javascript|foreignObject/i);
    expect(out).toContain('<rect');
  });

  it('returns an empty string for markup that is not valid SVG', () => {
    expect(sanitizeSvg('<svg><unclosed></svg')).toBe('');
  });
});
