import type { Settings } from '@shared/settings';

export interface EnhanceOptions {
  settings: Settings;
  baseUrl: string;
  /** Source lines stripped before the rendered body (front matter). */
  lineOffset: number;
  onTaskToggle(sourceLine: number, checked: boolean): void;
}

const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function scrollToId(id: string): void {
  document.getElementById(id)?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
}

/** Post-processes freshly rendered Markdown in place. Must run after the TOC is built. */
export function enhancePreview(root: HTMLElement, opts: EnhanceOptions): void {
  resolveUrls(root, opts.baseUrl);
  if (opts.settings.showCopyButtons) addCopyButtons(root);
  if (opts.settings.enableCallouts) addCalloutIcons(root);
  wireTaskLists(root, opts);
  if (opts.settings.foldSections) addFolding(root);
  wireAnchors(root);
}

function resolveUrls(root: HTMLElement, baseUrl: string): void {
  const base = new URL('.', baseUrl);
  root.querySelectorAll<HTMLImageElement>('img[src]').forEach((img) => {
    img.src = new URL(img.getAttribute('src')!, base).href;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.addEventListener('error', () => img.classList.add('ms-image-error'), { once: true });
  });
  root.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((a) => {
    const href = a.getAttribute('href') ?? '';
    if (/^https?:/i.test(href)) {
      a.rel = 'noopener noreferrer';
      a.target = '_blank';
    } else if (href && !href.startsWith('#') && !/^[a-z][a-z0-9+.-]*:/i.test(href)) {
      a.href = new URL(href, base).href;
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

function addFolding(root: HTMLElement): void {
  root.querySelectorAll<HTMLHeadingElement>('h2, h3, h4').forEach((heading) => {
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'ms-fold-toggle';
    toggle.setAttribute('aria-label', 'Fold section');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.textContent = '▾';
    toggle.addEventListener('click', () => {
      const level = Number(heading.tagName[1]);
      const folded = heading.classList.toggle('ms-folded');
      toggle.setAttribute('aria-expanded', String(!folded));
      toggle.textContent = folded ? '▸' : '▾';
      for (let n = heading.nextElementSibling as HTMLElement | null; n; n = n.nextElementSibling as HTMLElement | null) {
        if (/^H[1-6]$/.test(n.tagName) && Number(n.tagName[1]) <= level) break;
        n.hidden = folded;
      }
    });
    heading.prepend(toggle);
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
