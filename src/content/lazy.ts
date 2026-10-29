// Diagram and math renderers are loaded on demand so ordinary documents never pay for them.
import plantumlEncoder from 'plantuml-encoder';
import { ext } from '@shared/browser';
import { escapeHtml } from '@shared/html';
import { DEFAULT_PLANTUML_SERVER, type Settings } from '@shared/settings';
import { notify, watchImage } from './problems';

export async function renderDynamicBlocks(root: HTMLElement, settings: Settings): Promise<void> {
  const jobs: Promise<void>[] = [];
  if (settings.enableMermaid) jobs.push(renderMermaid(root));
  if (settings.enableKatex) jobs.push(renderMath(root));
  if (settings.enablePlantuml) jobs.push(renderPlantuml(root, settings.plantumlServer || DEFAULT_PLANTUML_SERVER));
  if (settings.enableGraphviz) jobs.push(renderGraphviz(root));
  await Promise.allSettled(jobs);
}

const codeBlocks = (root: HTMLElement, ...langs: string[]) =>
  [...root.querySelectorAll<HTMLElement>(langs.map((l) => `pre.ms-code > code.language-${l}`).join(','))];

const claimedBlocks = new WeakSet<HTMLElement>();

/** One renderer wins. Blocks inside a closed section wait until that section is opened. */
function claimBlock(code: HTMLElement): boolean {
  if (!code.isConnected || code.closest('.ms-section-folded') || claimedBlocks.has(code)) return false;
  claimedBlocks.add(code);
  return true;
}

function replaceBlock(code: HTMLElement, next: HTMLElement): void {
  if (!code.isConnected) return;
  code.parentElement?.replaceWith(next);
}

/** Marks diagram sources that are waiting for their renderer to load. */
function markLoading(blocks: HTMLElement[]): void {
  blocks.forEach((code) => code.parentElement?.setAttribute('data-ms-loading', ''));
}

/**
 * Gives a diagram its own size. Mermaid draws every SVG at width 100%, which blows a narrow diagram up to the whole
 * column and squashes a wide one until its text is unreadable. The size is handed to the stylesheet, which shrinks a
 * diagram that is too wide but never enlarges one.
 */
export function sizeDiagram(svg: Element): void {
  const attr = svg.getAttribute('width') ?? '';
  const [, , boxWidth] = (svg.getAttribute('viewBox') ?? '').trim().split(/[\s,]+/).map(Number);
  const own = /%$/.test(attr) ? NaN : parseFloat(attr) * (/pt$/.test(attr) ? 4 / 3 : 1);
  const natural = Number.isFinite(own) && own > 0 ? own : boxWidth;
  if (!natural || !Number.isFinite(natural)) return;

  (svg as SVGElement).style.setProperty('--ms-w', `${Math.round(natural)}px`);
  svg.removeAttribute('width');
  svg.removeAttribute('height');
}

/** A diagram that was shrunk to fit can be clicked (or activated with Enter or Space) to show it at its own size. */
export function makeZoomable(holder: HTMLElement, svg: Element): void {
  const naturalWidth = () => parseFloat((svg as SVGElement).style.getPropertyValue('--ms-w'));
  const refresh = () => {
    const shrunk = svg.getBoundingClientRect().width < naturalWidth() - 2;
    const zoomable = shrunk || holder.classList.contains('ms-diagram-actual');
    holder.classList.toggle('ms-diagram-zoomable', zoomable);
    if (zoomable) {
      holder.tabIndex = 0;
      holder.setAttribute('role', 'button');
      holder.title = holder.classList.contains('ms-diagram-actual') ? 'Click to fit to the page' : 'Click to show at full size';
    } else {
      holder.removeAttribute('tabindex');
      holder.removeAttribute('role');
      holder.removeAttribute('title');
    }
    return zoomable;
  };
  const toggle = () => {
    if (!refresh()) return;
    holder.classList.toggle('ms-diagram-actual');
    refresh();
  };

  holder.addEventListener('pointerenter', refresh);
  holder.addEventListener('focus', refresh);
  holder.addEventListener('click', toggle);
  holder.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    toggle();
  });
}

/** Explains why a diagram failed, above its source, which stays visible so nothing is lost. */
function flagBlock(code: HTMLElement, kind: string, error: unknown): void {
  const pre = code.parentElement;
  pre?.removeAttribute('data-ms-loading');
  pre?.before(errorBox(kind, error));
  notify();
}

function errorBox(kind: string, error: unknown): HTMLElement {
  const box = document.createElement('div');
  box.className = `ms-diagram-error`;
  box.textContent = `${kind} error: ${error instanceof Error ? error.message : String(error)}`;
  return box;
}

// Mermaid

let mermaidReady: Promise<typeof import('mermaid').default> | undefined;
let mermaidCounter = 0;

async function renderMermaid(root: HTMLElement): Promise<void> {
  const blocks = codeBlocks(root, 'mermaid');
  if (!blocks.length) return;
  markLoading(blocks);
  let mermaid: Awaited<NonNullable<typeof mermaidReady>>;
  try {
    mermaidReady ??= import('mermaid').then((m) => m.default);
    mermaid = await mermaidReady;
  } catch (error) {
    mermaidReady = undefined;
    blocks.filter(claimBlock).forEach((code) => flagBlock(code, 'Mermaid', error));
    return;
  }
  const dark = document.documentElement.dataset.msTheme === 'dark';
  mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: dark ? 'dark' : 'default' });

  for (const code of blocks) {
    if (!claimBlock(code)) continue;
    const holder = document.createElement('div');
    holder.className = 'ms-diagram';
    try {
      holder.innerHTML = (await mermaid.render(`ms-mermaid-${mermaidCounter++}`, code.textContent ?? '')).svg;
      const svg = holder.querySelector('svg');
      if (svg) {
        sizeDiagram(svg);
        makeZoomable(holder, svg);
      }
      replaceBlock(code, holder);
    } catch (error) {
      flagBlock(code, 'Mermaid', error);
    }
  }
}

// Math

let katexReady: Promise<typeof import('katex').default> | undefined;

function loadKatexStyles(): void {
  if (document.getElementById('ms-katex-css')) return;
  const link = document.createElement('link');
  link.id = 'ms-katex-css';
  link.rel = 'stylesheet';
  link.href = ext.runtime.getURL('vendor/katex/katex.min.css');
  document.head.append(link);
}

// `$` opens math only when followed by non-space and closes only when preceded by non-space and not followed by a
// digit, so prices such as "$5 and $10" stay text.
const MATH = /\$\$([^$]+)\$\$|\$(?![\s$])([^$\n]*?[^\s$])\$(?!\d)/g;

export function splitMath(text: string): Array<{ text: string; math?: string; display?: boolean }> {
  const parts: Array<{ text: string; math?: string; display?: boolean }> = [];
  let last = 0;
  for (const m of text.matchAll(MATH)) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index) });
    parts.push({ text: m[0], math: m[1] ?? m[2], display: m[1] !== undefined });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

async function renderMath(root: HTMLElement): Promise<void> {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) =>
      node.nodeValue?.includes('$') && !node.parentElement?.closest('pre, code, .ms-section-folded')
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT,
  });
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);

  const targets = nodes.filter((n) => splitMath(n.nodeValue ?? '').some((p) => p.math !== undefined));
  if (!targets.length) return;

  katexReady ??= import('katex').then((m) => m.default);
  const katex = await katexReady;
  loadKatexStyles();

  for (const node of targets) {
    const span = document.createElement('span');
    span.innerHTML = splitMath(node.nodeValue ?? '')
      .map((p) =>
        p.math === undefined
          ? escapeHtml(p.text)
          : katex.renderToString(p.math, { throwOnError: false, displayMode: p.display, trust: false }),
      )
      .join('');
    node.replaceWith(span);
  }
}

// PlantUML (renders on a remote server; opt-in)

async function renderPlantuml(root: HTMLElement, server: string): Promise<void> {
  for (const code of codeBlocks(root, 'plantuml', 'puml')) {
    if (!claimBlock(code)) continue;
    const img = document.createElement('img');
    img.className = 'ms-plantuml';
    img.alt = 'PlantUML diagram';
    img.loading = 'lazy';
    img.referrerPolicy = 'no-referrer';
    img.src = `${server}/svg/${plantumlEncoder.encode(code.textContent ?? '')}`;
    watchImage(img);
    replaceBlock(code, img);
  }
}

// Graphviz

let graphvizReady: Promise<{ dot(source: string): string }> | undefined;

/** Removes anything executable from SVG markup before it is inserted into the page. */
export function sanitizeSvg(svg: string): string {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
  if (doc.querySelector('parsererror')) return '';
  doc.querySelectorAll('script, foreignObject, iframe, object, embed').forEach((el) => el.remove());
  doc.querySelectorAll('*').forEach((el) => {
    for (const attr of [...el.attributes]) {
      const isHandler = attr.name.toLowerCase().startsWith('on');
      const isScriptUrl = /href$/i.test(attr.name) && /^\s*(javascript|data):/i.test(attr.value);
      if (isHandler || isScriptUrl) el.removeAttribute(attr.name);
    }
  });
  return new XMLSerializer().serializeToString(doc.documentElement);
}

async function renderGraphviz(root: HTMLElement): Promise<void> {
  const blocks = codeBlocks(root, 'dot', 'graphviz');
  if (!blocks.length) return;
  markLoading(blocks);
  let graphviz: Awaited<NonNullable<typeof graphvizReady>>;
  try {
    graphvizReady ??= import('@hpcc-js/wasm/graphviz').then((m) => m.Graphviz.load());
    graphviz = await graphvizReady;
  } catch (error) {
    graphvizReady = undefined;
    blocks.filter(claimBlock).forEach((code) => flagBlock(code, 'Graphviz', error));
    return;
  }

  for (const code of blocks) {
    if (!claimBlock(code)) continue;
    try {
      const holder = document.createElement('div');
      holder.className = 'ms-diagram';
      holder.innerHTML = sanitizeSvg(graphviz.dot(code.textContent ?? ''));
      const svg = holder.querySelector('svg');
      if (!svg) throw new Error('The diagram could not be drawn');
      sizeDiagram(svg);
      makeZoomable(holder, svg);
      replaceBlock(code, holder);
    } catch (error) {
      flagBlock(code, 'Graphviz', error);
    }
  }
}
