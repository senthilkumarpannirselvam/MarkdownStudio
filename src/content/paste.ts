import { EditorSelection } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';

// Images are embedded as base64, so cap their size to keep documents and extension storage manageable.
const MAX_IMAGE_BYTES = 1_500_000;

/** Embeds pasted or dropped image files into the editor as data-URI images. */
export function wireImagePaste(host: HTMLElement, view: EditorView, notify: (message: string) => void): () => void {
  const imagesIn = (files: FileList | undefined | null) =>
    [...(files ?? [])].filter((f) => /^image\/(png|jpe?g|gif|webp)$/.test(f.type));

  const insert = async (images: File[]) => {
    const lines: string[] = [];
    for (const image of images) {
      if (image.size > MAX_IMAGE_BYTES) {
        notify(`${image.name || 'Image'} is larger than ${(MAX_IMAGE_BYTES / 1e6).toFixed(1)} MB and was skipped`);
        continue;
      }
      lines.push(`![${image.name.replace(/[[\]]/g, '')}](${await readAsDataUrl(image)})`);
    }
    if (!lines.length) return;
    const text = `\n${lines.join('\n')}\n`;
    const { from, to } = view.state.selection.main;
    view.dispatch({ changes: { from, to, insert: text }, selection: EditorSelection.cursor(from + text.length) });
    view.focus();
  };

  const onPaste = (e: ClipboardEvent) => {
    const images = imagesIn(e.clipboardData?.files);
    if (!images.length) return;
    e.preventDefault();
    void insert(images);
  };
  const onDrop = (e: DragEvent) => {
    host.classList.remove('ms-editor-drop');
    const images = imagesIn(e.dataTransfer?.files);
    if (!images.length) return;
    e.preventDefault();
    void insert(images);
  };
  const onDragOver = (e: DragEvent) => {
    if (e.dataTransfer?.types.includes('Files')) {
      e.preventDefault();
      host.classList.add('ms-editor-drop');
    }
  };
  const onDragLeave = () => host.classList.remove('ms-editor-drop');

  host.addEventListener('paste', onPaste);
  host.addEventListener('drop', onDrop);
  host.addEventListener('dragover', onDragOver);
  host.addEventListener('dragleave', onDragLeave);
  return () => {
    host.removeEventListener('paste', onPaste);
    host.removeEventListener('drop', onDrop);
    host.removeEventListener('dragover', onDragOver);
    host.removeEventListener('dragleave', onDragLeave);
  };
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
