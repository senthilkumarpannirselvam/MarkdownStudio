/** Checks an http(s) URL's ETag / Last-Modified every `seconds` and calls `onChange` when it moves. */
export function startPolling(url: string, seconds: number, onChange: () => void): () => void {
  if (!/^https?:/.test(url)) return () => {};
  let last: string | null = null;

  const check = async () => {
    if (document.hidden) return;
    try {
      const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
      const id = res.headers.get('etag') ?? res.headers.get('last-modified');
      if (id && last && id !== last) onChange();
      if (id) last = id;
    } catch {
      // Offline or blocked; try again on the next tick.
    }
  };

  void check();
  const timer = setInterval(check, Math.max(2, seconds) * 1000);
  return () => clearInterval(timer);
}
