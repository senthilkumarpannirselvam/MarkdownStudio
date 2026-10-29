import type { Settings } from '@shared/settings';
import { resolveSource, watchImage } from './problems';

export interface FoldController {
  /** Foldable headings on the page (levels 2 to 4). */
  readonly count: number;
  /** True when every foldable section is closed. */
  allFolded(): boolean;
  expandAll(): void;
  collapseAll(): void;
  /** Closes every section, or opens them when they are already all closed. */
  toggleAll(): void;
}

export interface EnhanceOptions {
  settings: Settings;
  baseUrl: string;
  /** Source lines stripped before the rendered body (front matter). */
  lineOffset: number;
  onTaskToggle(sourceLine: number, checked: boolean): void;
  /** A section was opened. Diagrams inside it may not have been drawn yet. */
  onSectionOpen?(body: HTMLElement): void;
  /** A heading was opened or closed, including expand-all and collapse-all. */
  onFoldChange?(): void;
}

const NO_FOLDS: FoldController = {
  count: 0,
  allFolded: () => false,
  expandAll() {},
  collapseAll() {},
  toggleAll() {},
};

const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function scrollToId(id: string): void {
  document.getElementById(id)?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
}

/** Post-processes freshly rendered Markdown in place. Must run after the TOC is built. */
export function enhancePreview(root: HTMLElement, opts: EnhanceOptions): FoldController {
  resolveUrls(root, opts.baseUrl);
  if (opts.settings.showCopyButtons) addCopyButtons(root);
  if (opts.settings.enableCallouts) addCalloutIcons(root);
  wireTaskLists(root, opts);
  const folds = opts.settings.foldSections ? addFolding(root, opts.onSectionOpen, opts.onFoldChange) : NO_FOLDS;
  wireAnchors(root);
  return folds;
}

function resolveUrls(root: HTMLElement, baseUrl: string): void {
  const base = new URL('.', baseUrl);
  root.querySelectorAll<HTMLImageElement>('img[src]').forEach((img) => {
    img.src = resolveSource(img.getAttribute('src')!, base);
    img.loading = 'lazy';
    img.decoding = 'async';
    watchImage(img);
  });
  root.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((a) => {
    const href = a.getAttribute('href') ?? '';
    if (/^https?:/i.test(href)) {
      a.rel = 'noopener noreferrer';
      a.target = '_blank';
    } else if (href && !href.startsWith('#')) {
      a.href = resolveSource(href, base);
    }
  });
}

function addCopyButtons(root: HTMLElement): void {
  root.querySelectorAll<HTMLPreElement>('pre.ms-code').forEach((pre) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ms-copy';
    button.textContent = 'Copy';
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(pre.querySelector('code')?.textContent ?? '');
        button.textContent = 'Copied';
      } catch {
        button.textContent = 'Failed';
      }
      setTimeout(() => (button.textContent = 'Copy'), 1500);
    });
    pre.append(button);
  });
}

const CALLOUT_ICONS: Record<string, string> = { note: 'ℹ', tip: '✦', important: '!', warning: '⚠', caution: '⛔' };

function addCalloutIcons(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>('blockquote.ms-callout').forEach((quote) => {
    const icon = document.createElement('span');
    icon.className = 'ms-callout-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = CALLOUT_ICONS[quote.dataset.kind ?? ''] ?? '•';
    quote.querySelector('.ms-callout-title')?.prepend(icon);
  });
}

function wireTaskLists(root: HTMLElement, opts: EnhanceOptions): void {
  root.querySelectorAll<HTMLInputElement>('li input[type="checkbox"]').forEach((box) => {
    box.disabled = false;
    box.addEventListener('change', () => {
      const line = Number(box.closest<HTMLElement>('[data-line]')?.dataset.line);
      if (Number.isInteger(line)) opts.onTaskToggle(line + opts.lineOffset, box.checked);
    });
  });
}

interface FoldSection {
  heading: HTMLHeadingElement;
  body: HTMLElement;
  toggle: HTMLButtonElement;
}

/**
 * Each heading owns one body wrapper. Folding toggles a class on that wrapper, so a diagram
 * that replaces a code block later stays inside the section. Nested headings keep their own
 * wrappers and their own open or closed state.
 */
function addFolding(
  root: HTMLElement,
  onSectionOpen?: (body: HTMLElement) => void,
  onFoldChange?: () => void,
): FoldController {
  const headings = [...root.querySelectorAll<HTMLHeadingElement>('h2, h3, h4')];
  const sections: FoldSection[] = [];

  headings.forEach((heading, index) => {
    const parent = heading.parentElement;
    if (!parent || (parent !== root && !parent.classList.contains('ms-section'))) return;

    const level = Number(heading.tagName[1]);
    const body = document.createElement('div');
    body.className = 'ms-section';
    body.id = `ms-fold-${heading.id || index}`;
    heading.after(body);

    let sibling = body.nextElementSibling;
    while (sibling) {
      if (sibling instanceof HTMLHeadingElement && Number(sibling.tagName[1]) <= level) break;
      const next = sibling.nextElementSibling;
      body.append(sibling);
      sibling = next;
    }

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'ms-fold-toggle';
    toggle.setAttribute('aria-controls', body.id);
    heading.prepend(toggle);

    const section: FoldSection = { heading, body, toggle };
    setFolded(section, false, onSectionOpen);
    toggle.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      setFolded(section, !body.classList.contains('ms-section-folded'), onSectionOpen);
      onFoldChange?.();
    });
    sections.push(section);
  });

  const allFolded = () => sections.length > 0 && sections.every((section) => section.body.classList.contains('ms-section-folded'));
  const expandAll = () => {
    for (const section of sections) setFolded(section, false, onSectionOpen);
  };
  const collapseAll = () => {
    for (const section of sections) setFolded(section, true, onSectionOpen);
  };

  return {
    count: sections.length,
    allFolded,
    expandAll,
    collapseAll,
    toggleAll() {
      if (allFolded()) expandAll();
      else collapseAll();
      onFoldChange?.();
    },
  };
}

function setFolded(section: FoldSection, folded: boolean, onSectionOpen?: (body: HTMLElement) => void): void {
  const wasFolded = section.body.classList.contains('ms-section-folded');
  section.heading.classList.toggle('ms-folded', folded);
  section.body.classList.toggle('ms-section-folded', folded);
  section.toggle.setAttribute('aria-expanded', String(!folded));
  section.toggle.setAttribute('aria-label', folded ? 'Expand section' : 'Collapse section');
  section.toggle.textContent = folded ? '▸' : '▾';
  if (!wasFolded || folded) return;
  resumeLazyMedia(section.body);
  onSectionOpen?.(section.body);
}

/** Chrome does not fetch a lazy image that was inside a closed section, so reopen starts the load again. */
function resumeLazyMedia(root: HTMLElement): void {
  root.querySelectorAll<HTMLImageElement>('img[src]').forEach((img) => {
    if (img.closest('.ms-section-folded')) return;
    if (img.complete && img.naturalWidth > 0) return;
    const src = img.getAttribute('src');
    if (!src) return;
    img.loading = 'eager';
    img.classList.remove('ms-image-error');
    img.removeAttribute('src');
    img.src = src;
  });
}

function wireAnchors(root: HTMLElement): void {
  root.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (event) => {
      const id = decodeURIComponent(a.getAttribute('href')!.slice(1));
      if (!document.getElementById(id)) return;
      event.preventDefault();
      scrollToId(id);
      history.replaceState(null, '', `#${encodeURIComponent(id)}`);
    });
  });
}

/** Flips the `[ ]` / `[x]` marker on a 0-indexed source line. Returns the source unchanged if the line is not a task. */
export function toggleTaskInSource(source: string, line: number, checked: boolean): string {
  const lines = source.split('\n');
  const current = lines[line];
  if (current === undefined) return source;
  const next = current.replace(/^(\s*(?:[-+*]|\d+[.)])\s+\[)[ xX](\])/, `$1${checked ? 'x' : ' '}$2`);
  if (next === current) return source;
  lines[line] = next;
  return lines.join('\n');
}
