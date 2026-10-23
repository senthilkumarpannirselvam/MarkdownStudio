import { EditorState, Prec, type Extension } from '@codemirror/state';
import { EditorView, highlightActiveLine, keymap, lineNumbers } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { search, searchKeymap } from '@codemirror/search';
import { tags } from '@lezer/highlight';
import { showMinimap } from '@replit/codemirror-minimap';
import { runToolbar } from './toolbar';

export interface EditorHandle {
  view: EditorView;
  setValue(text: string): void;
  getScrollTop(): number;
  setScrollTop(y: number): void;
  destroy(): void;
}

// Colours come from the page's CSS variables so the editor follows the light/dark theme.
const theme = EditorView.theme({
  '&': { height: '100%', backgroundColor: 'var(--ms-bg)', color: 'var(--ms-fg)' },
  '.cm-scroller': { fontFamily: "ui-monospace, 'JetBrains Mono', Menlo, Consolas, monospace", lineHeight: '1.6' },
  '.cm-content': { caretColor: 'var(--ms-accent)', padding: '16px 0' },
  '.cm-cursor': { borderLeftColor: 'var(--ms-accent)' },
  '.cm-gutters': { backgroundColor: 'var(--ms-tint)', color: 'var(--ms-muted)', border: 'none' },
  '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: 'color-mix(in oklab, var(--ms-fg) 6%, transparent)' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
    backgroundColor: 'color-mix(in oklab, var(--ms-accent) 30%, transparent)',
  },
  '.cm-panels': { backgroundColor: 'var(--ms-tint)', color: 'var(--ms-fg)' },
  '.cm-searchMatch': { backgroundColor: 'color-mix(in oklab, var(--ms-warning) 35%, transparent)' },
});

const highlight = HighlightStyle.define([
  { tag: tags.heading, color: 'var(--ms-link)', fontWeight: '600' },
  { tag: tags.strong, fontWeight: '700' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strikethrough, textDecoration: 'line-through' },
  { tag: [tags.link, tags.url], color: 'var(--ms-link)' },
  { tag: tags.monospace, color: 'var(--ms-accent)' },
  { tag: [tags.quote, tags.comment, tags.processingInstruction], color: 'var(--ms-muted)' },
]);

export function mountEditor(
  host: HTMLElement,
  initial: string,
  onChange: (text: string) => void,
  options: { minimap: boolean },
): EditorHandle {
  const formatting = keymap.of([
    { key: 'Mod-b', run: (v) => (runToolbar(v, 'bold'), true) },
    { key: 'Mod-i', run: (v) => (runToolbar(v, 'italic'), true) },
    { key: 'Mod-k', run: (v) => (runToolbar(v, 'link'), true) },
    { key: 'Mod-e', run: (v) => (runToolbar(v, 'code'), true) },
    { key: 'Mod-Shift-c', run: (v) => (runToolbar(v, 'codeblock'), true) },
  ]);

  const extensions: Extension[] = [
    lineNumbers(),
    highlightActiveLine(),
    history(),
    search({ top: true }),
    Prec.highest(formatting),
    keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap, indentWithTab]),
    markdown({ base: markdownLanguage }),
    syntaxHighlighting(highlight),
    theme,
    EditorView.lineWrapping,
    EditorView.updateListener.of((update) => {
      if (update.docChanged) onChange(update.state.doc.toString());
    }),
  ];
  if (options.minimap) {
    extensions.push(
      showMinimap.compute(['doc'], () => ({
        create: () => ({ dom: document.createElement('div') }),
        displayText: 'blocks',
        showOverlay: 'always',
      })),
    );
  }

  host.replaceChildren();
  const view = new EditorView({ parent: host, state: EditorState.create({ doc: initial, extensions }) });

  return {
    view,
    setValue(text) {
      if (text !== view.state.doc.toString()) {
        view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } });
      }
    },
    getScrollTop: () => view.scrollDOM.scrollTop,
    setScrollTop: (y) => void (view.scrollDOM.scrollTop = y),
    destroy: () => view.destroy(),
  };
}
