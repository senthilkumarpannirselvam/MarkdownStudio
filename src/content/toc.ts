export interface TocEntry {
  id: string;
  text: string;
  level: number;
}

export function buildToc(root: HTMLElement): TocEntry[] {
  return [...root.querySelectorAll<HTMLHeadingElement>('h1, h2, h3, h4, h5, h6')].map((h) => ({
    id: h.id,
    text: h.textContent?.trim() ?? '',
    level: Number(h.tagName.slice(1)),
  }));
}
