/** Saves a file through a download link. Works from a content script, so no `downloads` permission is needed. */
export function downloadFile(filename: string, data: BlobPart, type: string): void {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** File name of the current page, falling back to a default. */
export function currentFilename(fallback = 'document.md'): string {
  const last = location.pathname.split('/').pop() ?? '';
  try {
    return decodeURIComponent(last) || fallback;
  } catch {
    return last || fallback;
  }
}
