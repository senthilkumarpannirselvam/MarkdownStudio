// Anything in a document that could not be shown should be visible, with a reason, rather than quietly missing.

export type ProblemKind = 'image' | 'figure' | 'syntax' | 'diagram';

export interface Problem {
  kind: ProblemKind;
  text: string;
  el: HTMLElement;
}

const PROBLEM_EVENT = 'ms-problem';
const DRIVE_PATH = /^[a-z]:[\\/]/i;
const ABSOLUTE_URL = /^[a-z][a-z0-9+.-]*:/i;

const decode = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

/** Resolves an image or link address from a file against the page's own address. */
export function resolveSource(raw: string, base: URL): string {
  const value = raw.trim();
  if (!value) return value;

  // A Windows path such as C:\pics\a.png (markdown-it stores the backslash as %5C).
  const path = decode(value);
  if (DRIVE_PATH.test(path)) {
    return base.protocol === 'file:' ? `file:///${encodeURI(path.replace(/\\/g, '/'))}` : value;
  }
  if (ABSOLUTE_URL.test(value)) return value;
  return new URL(value.replace(/%5C|\\/gi, '/'), base).href;
}

export function notify(): void {
  document.dispatchEvent(new Event(PROBLEM_EVENT));
}

const fileName = (src: string) => decode(src.split(/[?#]/)[0]!.split('/').pop() ?? src);

function imageHint(src: string): string {
  if (src.startsWith('file:')) {
    return 'The file was not found, or this extension may not be allowed to read local files (chrome://extensions, Details, Allow access to file URLs).';
  }
  if (/^https?:/.test(src)) return 'The server did not return an image, or the request was blocked.';
  return 'This address cannot be loaded from a web page.';
}

/** Replaces an image that fails to load with a visible note that says what and why. */
export function watchImage(img: HTMLImageElement): void {
  img.addEventListener(
    'error',
    () => {
      const src = img.currentSrc || img.src;
      const note = document.createElement('span');
      note.className = 'ms-image-missing';
      note.title = `${decode(src)}\n${imageHint(src)}`;
      note.textContent = `Image not loaded: ${img.alt || fileName(src)}`;
      img.replaceWith(note);
      notify();
    },
    { once: true },
  );
}

// Export tools sometimes leave a bracketed placeholder where a figure was, for example
// "[embedded content: How it works]". The picture itself is not in the file.
const FIGURE_PLACEHOLDER = /^\[(?:embedded content|embedded image|embedded|image|figure|diagram|chart|attachment)\s*[:\-\u2013\u2014]?\s*([^\]]*)\]$/i;

export function markMissingFigures(root: HTMLElement): void {
  root.querySelectorAll<HTMLParagraphElement>('p').forEach((p) => {
    if (p.children.length > 0 && !p.querySelector(':scope > br')) return;
    const match = FIGURE_PLACEHOLDER.exec((p.textContent ?? '').trim());
    if (!match) return;

    const note = document.createElement('div');
    note.className = 'ms-figure-missing';
    const title = document.createElement('strong');
    title.textContent = match[1]?.trim() || 'Figure';
    const detail = document.createElement('span');
    detail.textContent =
      'This figure is not included in the file. The tool that exported it left only a placeholder, so there is no image or diagram to show. Export it again with images or diagrams included, or open the original document.';
    note.append(title, detail);
    p.replaceWith(note);
  });
}

// ![alt](path with spaces.png) is not valid Markdown, so it shows up as literal text.
const IMAGE_SYNTAX = /!\[[^\]\n]*\]\([^)\n]*\)/g;

export function flagUnparsedImages(root: HTMLElement): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) =>
      node.nodeValue?.includes('![') && !node.parentElement?.closest('pre, code')
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT,
  });
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);

  for (const node of nodes) {
    const text = node.nodeValue ?? '';
    const matches = [...text.matchAll(IMAGE_SYNTAX)];
    if (!matches.length) continue;

    const parts = document.createDocumentFragment();
    let last = 0;
    for (const m of matches) {
      parts.append(text.slice(last, m.index));
      const span = document.createElement('span');
      span.className = 'ms-unparsed';
      span.title = 'This looks like an image but was not understood. If the path contains spaces, wrap it in angle brackets: ![alt](<my image.png>)';
      span.textContent = m[0];
      parts.append(span);
      last = m.index + m[0].length;
    }
    parts.append(text.slice(last));
    node.replaceWith(parts);
  }
}

// The label is only added where the element's own text does not already say what is wrong.
const KINDS: Array<[ProblemKind, string, string]> = [
  ['image', '.ms-image-missing', ''],
  ['figure', '.ms-figure-missing', 'Figure not in the file: '],
  ['syntax', '.ms-unparsed', 'Image not recognised: '],
  ['diagram', '.ms-diagram-error', ''],
];

export function collectProblems(root: HTMLElement): Problem[] {
  const found: Problem[] = [];
  for (const [kind, selector, label] of KINDS) {
    root.querySelectorAll<HTMLElement>(selector).forEach((el) => {
      const detail = (el.querySelector('strong')?.textContent || el.textContent || '').trim().slice(0, 90);
      found.push({ kind, text: `${label}${detail}`, el });
    });
  }
  return found.sort((a, b) => (a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
}

/** Wires the toolbar badge and its list of problems. */
export function initProblems(button: HTMLElement, panel: HTMLElement, root: HTMLElement) {
  const refresh = () => {
    const problems = collectProblems(root);
    button.hidden = problems.length === 0;
    button.textContent = `\u26A0 ${problems.length}`;
    button.setAttribute('aria-label', `${problems.length} items could not be shown`);
    button.title = 'Content that could not be shown';
    panel.replaceChildren(
      ...problems.map((p) => {
        const item = document.createElement('button');
        item.type = 'button';
        item.textContent = p.text;
        item.addEventListener('click', () => {
          p.el.scrollIntoView({ block: 'center', behavior: 'smooth' });
          p.el.classList.add('ms-flash');
          setTimeout(() => p.el.classList.remove('ms-flash'), 1600);
        });
        return item;
      }),
    );
    if (!problems.length) panel.hidden = true;
  };

  let timer: number | undefined;
  document.addEventListener(PROBLEM_EVENT, () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(refresh, 150);
  });
  button.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    button.setAttribute('aria-expanded', String(!panel.hidden));
  });

  return {
    /** Run once on freshly rendered content, before it is enhanced. */
    scan(content: HTMLElement) {
      markMissingFigures(content);
      flagUnparsedImages(content);
    },
    refresh,
  };
}
