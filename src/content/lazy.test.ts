import { describe, expect, it } from 'vitest';
import { makeZoomable, sanitizeSvg, sizeDiagram, splitMath } from './lazy';

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

describe('sizeDiagram', () => {
  const svgFrom = (attrs: string) => {
    document.body.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" ${attrs}></svg>`;
    return document.querySelector('svg')!;
  };
  const sizeOf = (svg: Element) => (svg as SVGElement).style.getPropertyValue('--ms-w');

  it('uses the drawing width when the renderer stretches it to 100%', () => {
    const svg = svgFrom('width="100%" viewBox="0 0 360 1680"');
    sizeDiagram(svg);
    expect(sizeOf(svg)).toBe('360px');
    expect(svg.hasAttribute('width')).toBe(false);
  });

  it('keeps an explicit pixel width', () => {
    const svg = svgFrom('width="480" height="200" viewBox="0 0 960 400"');
    sizeDiagram(svg);
    expect(sizeOf(svg)).toBe('480px');
    expect(svg.hasAttribute('height')).toBe(false);
  });

  it('converts points, as Graphviz writes them, to pixels', () => {
    const svg = svgFrom('width="150pt" height="60pt" viewBox="0.00 0.00 150.00 60.00"');
    sizeDiagram(svg);
    expect(sizeOf(svg)).toBe('200px');
  });

  it('leaves a drawing with no usable size alone', () => {
    const svg = svgFrom('width="100%"');
    sizeDiagram(svg);
    expect(sizeOf(svg)).toBe('');
    expect(svg.getAttribute('width')).toBe('100%');
  });
});

describe('makeZoomable', () => {
  const setup = (naturalPx: number) => {
    document.body.innerHTML = '<div class="ms-diagram"><svg xmlns="http://www.w3.org/2000/svg"></svg></div>';
    const holder = document.querySelector('.ms-diagram') as HTMLElement;
    const svg = holder.querySelector('svg')!;
    (svg as SVGElement).style.setProperty('--ms-w', naturalPx + 'px');
    makeZoomable(holder, svg);
    return { holder, svg };
  };

  it('becomes clickable when the diagram is shown smaller than its own size, and toggles', () => {
    const { holder } = setup(2000); // jsdom lays nothing out, so the drawing is "0px wide": smaller than 2000px
    holder.dispatchEvent(new Event('pointerenter'));
    expect(holder.classList.contains('ms-diagram-zoomable')).toBe(true);
    expect(holder.tabIndex).toBe(0);

    holder.click();
    expect(holder.classList.contains('ms-diagram-actual')).toBe(true);
    expect(holder.title).toBe('Click to fit to the page');

    holder.click();
    expect(holder.classList.contains('ms-diagram-actual')).toBe(false);
  });

  it('works from the keyboard', () => {
    const { holder } = setup(2000);
    holder.dispatchEvent(new Event('focus'));
    holder.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(holder.classList.contains('ms-diagram-actual')).toBe(true);
  });

  it('does nothing for a diagram that already fits', () => {
    const { holder } = setup(0);
    holder.dispatchEvent(new Event('pointerenter'));
    holder.click();
    expect(holder.classList.contains('ms-diagram-zoomable')).toBe(false);
    expect(holder.classList.contains('ms-diagram-actual')).toBe(false);
  });
});
