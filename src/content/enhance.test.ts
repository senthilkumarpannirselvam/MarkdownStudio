import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '@shared/settings';
import { enhancePreview, toggleTaskInSource, type EnhanceOptions } from './enhance';

function mount(html: string): HTMLElement {
  const root = document.createElement('article');
  root.innerHTML = html;
  document.body.replaceChildren(root);
  return root;
}

function enhance(root: HTMLElement, overrides: Partial<EnhanceOptions> = {}) {
  return enhancePreview(root, {
    settings: DEFAULT_SETTINGS,
    baseUrl: 'https://example.com/doc.md',
    lineOffset: 0,
    onTaskToggle() {},
    ...overrides,
  });
}

describe('section folding', () => {
  it('shows the section again after a collapse and keeps a node that was replaced while closed', () => {
    const root = mount(
      '<h2 id="one">One</h2><p id="body">Hello</p><pre class="ms-code" id="block"><code>x</code></pre><img alt="" src="pic.png"><h2 id="two">Two</h2><p id="other">There</p>',
    );
    const opened: HTMLElement[] = [];
    const folds = enhance(root, { onSectionOpen: (body) => opened.push(body) });

    expect(folds.count).toBe(2);
    expect(root.querySelector('img')!.loading).toBe('lazy');

    const toggle = root.querySelector('h2 button') as HTMLButtonElement;
    toggle.click();
    const section = root.querySelector('#body')!.closest('.ms-section')!;
    expect(section.classList.contains('ms-section-folded')).toBe(true);
    expect(root.querySelector('#other')!.closest('.ms-section')!.classList.contains('ms-section-folded')).toBe(false);
    expect(opened).toHaveLength(0);

    const diagram = document.createElement('div');
    diagram.id = 'diagram';
    diagram.textContent = 'drawn';
    root.querySelector('#block')!.replaceWith(diagram);

    toggle.click();
    expect(section.classList.contains('ms-section-folded')).toBe(false);
    expect(section.querySelector('#body')!.textContent).toBe('Hello');
    expect(section.querySelector('#diagram')!.textContent).toBe('drawn');
    expect(root.querySelector('#diagram')!.hasAttribute('hidden')).toBe(false);
    expect(root.querySelector('img')!.loading).toBe('eager');
    expect(opened).toEqual([section]);
  });

  it('keeps a nested section closed when its parent is opened again', () => {
    const root = mount('<h2>A</h2><p id="a">A</p><h3>A.1</h3><p id="nested">Nested</p><h2>B</h2><p>B</p>');
    enhance(root);
    const nestedToggle = root.querySelector('h3 button') as HTMLButtonElement;
    const parentToggle = root.querySelector('h2 button') as HTMLButtonElement;

    nestedToggle.click();
    parentToggle.click();
    parentToggle.click();

    expect(root.querySelector('#a')!.closest('.ms-section-folded')).toBeNull();
    expect(root.querySelector('#nested')!.closest('.ms-section')!.classList.contains('ms-section-folded')).toBe(true);
  });

  it('opens and closes every section from the toolbar controls', () => {
    const root = mount('<h2>A</h2><p id="a">A</p><h3>A.1</h3><p id="nested">Nested</p><h2>B</h2><p id="b">B</p>');
    const opened: HTMLElement[] = [];
    const folds = enhance(root, { onSectionOpen: (body) => opened.push(body) });

    expect(folds.allFolded()).toBe(false);
    folds.toggleAll();
    expect(folds.allFolded()).toBe(true);
    expect(root.querySelectorAll('.ms-section-folded')).toHaveLength(3);
    expect(opened).toHaveLength(0);

    folds.toggleAll();
    expect(folds.allFolded()).toBe(false);
    expect(root.querySelector('.ms-section-folded')).toBeNull();
    expect(root.querySelector('#a')!.textContent).toBe('A');
    expect(root.querySelector('#nested')!.textContent).toBe('Nested');
    expect(root.querySelector('#b')!.textContent).toBe('B');
    expect(opened).toHaveLength(3);
  });

  it('leaves headings unfolded when folding is off, and leaves the introduction in place', () => {
    const root = mount('<p id="intro">Intro</p><h2>A</h2><p id="body">Body</p>');
    const folds = enhance(root, { settings: { ...DEFAULT_SETTINGS, foldSections: false } });
    expect(folds.count).toBe(0);
    expect(root.querySelector('.ms-fold-toggle')).toBeNull();
    expect(root.querySelector('#intro')!.parentElement).toBe(root);

    enhance(root);
    expect(root.querySelector('#intro')!.parentElement).toBe(root);
    expect(root.querySelector('#body')!.closest('.ms-section')).not.toBeNull();
  });
});

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
