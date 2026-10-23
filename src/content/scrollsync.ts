import type { EditorView } from '@codemirror/view';

/** Keeps the editor and preview scrolled to the same relative position. */
export function wireScrollSync(editor: EditorView, preview: HTMLElement): () => void {
  let locked = false;

  const onEditorScroll = () => {
    if (locked) return;
    locked = true;
    const el = editor.scrollDOM;
    const pct = el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight);
    preview.scrollTop = pct * Math.max(0, preview.scrollHeight - preview.clientHeight);
    requestAnimationFrame(() => (locked = false));
  };

  const onPreviewScroll = () => {
    if (locked) return;
    locked = true;
    const el = editor.scrollDOM;
    const pct = preview.scrollTop / Math.max(1, preview.scrollHeight - preview.clientHeight);
    el.scrollTop = pct * Math.max(0, el.scrollHeight - el.clientHeight);
    requestAnimationFrame(() => (locked = false));
  };

  editor.scrollDOM.addEventListener('scroll', onEditorScroll, { passive: true });
  preview.addEventListener('scroll', onPreviewScroll, { passive: true });

  return () => {
    editor.scrollDOM.removeEventListener('scroll', onEditorScroll);
    preview.removeEventListener('scroll', onPreviewScroll);
  };
}
