import type { EditorView } from '@codemirror/view';
import { EditorSelection } from '@codemirror/state';

export type ToolbarAction =
  | 'bold'
  | 'italic'
  | 'strike'
  | 'code'
  | 'link'
  | 'image'
  | 'quote'
  | 'ul'
  | 'ol'
  | 'task'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'hr'
  | 'codeblock'
  | 'table'
  | 'formatTable';

const WRAPS: Partial<Record<ToolbarAction, [string, string]>> = {
  bold: ['**', '**'],
  italic: ['_', '_'],
  strike: ['~~', '~~'],
  code: ['`', '`'],
};

const LINE_PREFIX: Partial<Record<ToolbarAction, string>> = {
  quote: '> ',
  ul: '- ',
  ol: '1. ',
  task: '- [ ] ',
  h1: '# ',
  h2: '## ',
  h3: '### ',
};

const SNIPPETS: Partial<Record<ToolbarAction, string>> = {
  hr: '\n\n---\n\n',
  codeblock: '\n\n```\n$\n```\n\n',
  table: '\n\n| Column A | Column B |\n| --- | --- |\n| 1 | 2 |\n\n',
};

export function runToolbar(view: EditorView, action: ToolbarAction): void {
  if (action === 'link' || action === 'image') return wrapLinkOrImage(view, action);
  if (action === 'formatTable') return formatTablesInSelection(view);

  const wrap = WRAPS[action];
  if (wrap) return wrapSelection(view, wrap[0], wrap[1]);

  const prefix = LINE_PREFIX[action];
  if (prefix) return togglePrefix(view, prefix);

  const snippet = SNIPPETS[action];
  if (snippet) return insertSnippet(view, snippet);
}

function wrapSelection(view: EditorView, open: string, close: string) {
  const changes = view.state.changeByRange((range) => {
    const text = view.state.sliceDoc(range.from, range.to);
    const next = `${open}${text}${close}`;
    return {
      changes: { from: range.from, to: range.to, insert: next },
      range: EditorSelection.range(range.from + open.length, range.from + open.length + text.length),
    };
  });
  view.dispatch(changes);
  view.focus();
}

function togglePrefix(view: EditorView, prefix: string) {
  const { state } = view;
  const changes: { from: number; to: number; insert: string }[] = [];
  for (const range of state.selection.ranges) {
    const fromLine = state.doc.lineAt(range.from);
    const toLine = state.doc.lineAt(range.to);
    for (let n = fromLine.number; n <= toLine.number; n++) {
      const line = state.doc.line(n);
      const stripped = line.text.replace(/^(\s*)(?:>\s*|-\s*\[[ xX]\]\s*|[-*+]\s*|\d+\.\s*|#{1,6}\s+)?/, '$1');
      changes.push({ from: line.from, to: line.to, insert: stripped.replace(/^(\s*)/, `$1${prefix}`) });
    }
  }
  view.dispatch({ changes });
  view.focus();
}

function insertSnippet(view: EditorView, snippet: string) {
  const caret = snippet.indexOf('$');
  const text = caret >= 0 ? snippet.replace('$', '') : snippet;
  const changes = view.state.changeByRange((range) => {
    const insert = text;
    const anchor = range.from + (caret >= 0 ? caret : insert.length);
    return {
      changes: { from: range.from, to: range.to, insert },
      range: EditorSelection.cursor(anchor),
    };
  });
  view.dispatch(changes);
  view.focus();
}

function wrapLinkOrImage(view: EditorView, kind: 'link' | 'image') {
  const text = view.state.sliceDoc(view.state.selection.main.from, view.state.selection.main.to) || 'text';
  const prefix = kind === 'image' ? '!' : '';
  const snippet = `${prefix}[${text}](https://)`;
  const start = view.state.selection.main.from + snippet.length - 'https://)'.length;
  view.dispatch({
    changes: { from: view.state.selection.main.from, to: view.state.selection.main.to, insert: snippet },
    selection: EditorSelection.range(start, start + 'https://'.length),
  });
  view.focus();
}

/** Re-aligns every pipe table in the selection, or in the whole document when nothing is selected. */
function formatTablesInSelection(view: EditorView) {
  const { state } = view;
  const range = state.selection.main;
  const slice = state.sliceDoc(range.from, range.to) || state.doc.toString();
  const formatted = slice.replace(/((?:^\|[^\n]*\|\n?){2,})/gm, (block) => formatTable(block));
  if (formatted === slice) return;
  if (range.from === range.to) {
    view.dispatch({ changes: { from: 0, to: state.doc.length, insert: formatted } });
  } else {
    view.dispatch({ changes: { from: range.from, to: range.to, insert: formatted } });
  }
  view.focus();
}

function formatTable(block: string): string {
  const rows = block.trim().split(/\n/).map((r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
  const cols = Math.max(...rows.map((r) => r.length));
  const widths = Array.from({ length: cols }, (_c, i) => Math.max(3, ...rows.map((r) => (r[i] ?? '').length)));
  return rows
    .map((r, ri) => {
      const padded = widths.map((w, i) => {
        const cell = r[i] ?? '';
        if (ri === 1 && /^:?-+:?$/.test(cell)) {
          const left = cell.startsWith(':');
          const right = cell.endsWith(':');
          const mid = '-'.repeat(w - (left ? 1 : 0) - (right ? 1 : 0));
          return `${left ? ':' : ''}${mid}${right ? ':' : ''}`;
        }
        return cell.padEnd(w);
      });
      return `| ${padded.join(' | ')} |`;
    })
    .join('\n') + '\n';
}
