// Diagram and math renderers are loaded on demand so ordinary documents never pay for them.
import plantumlEncoder from 'plantuml-encoder';
import { ext } from '@shared/browser';
import { escapeHtml } from '@shared/html';
import { DEFAULT_PLANTUML_SERVER, type Settings } from '@shared/settings';

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
  mermaidReady ??= import('mermaid').then((m) => m.default);
  const mermaid = await mermaidReady;
  const dark = document.documentElement.dataset.msTheme === 'dark';
  mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: dark ? 'dark' : 'default' });

  for (const code of blocks) {
    const holder = document.createElement('div');
    holder.className = 'ms-diagram';
    try {
      holder.innerHTML = (await mermaid.render(`ms-mermaid-${mermaidCounter++}`, code.textContent ?? '')).svg;
      code.parentElement!.replaceWith(holder);
    } catch (error) {
      code.parentElement!.replaceWith(errorBox('Mermaid', error));
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
      node.nodeValue?.includes('$') && !node.parentElement?.closest('pre, code')
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
    const img = document.createElement('img');
    img.className = 'ms-plantuml';
    img.alt = 'PlantUML diagram';
    img.loading = 'lazy';
    img.referrerPolicy = 'no-referrer';
    img.src = `${server}/svg/${plantumlEncoder.encode(code.textContent ?? '')}`;
    code.parentElement!.replaceWith(img);
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
  graphvizReady ??= import('@hpcc-js/wasm/graphviz').then((m) => m.Graphviz.load());
  const graphviz = await graphvizReady;

  for (const code of blocks) {
    try {
      const holder = document.createElement('div');
      holder.className = 'ms-diagram';
      holder.innerHTML = sanitizeSvg(graphviz.dot(code.textContent ?? ''));
      code.parentElement!.replaceWith(holder);
    } catch (error) {
      code.parentElement!.replaceWith(errorBox('Graphviz', error));
    }
  }
}
