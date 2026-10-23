export interface DocStats {
  words: number;
  chars: number;
  readMinutes: number;
}

const WPM = 220;

export function computeStats(source: string): DocStats {
  const stripped = source
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#>*_~\-\[\]\(\)!]/g, ' ');
  const words = stripped.match(/\b[\w'-]+\b/g)?.length ?? 0;
  const chars = source.length;
  const readMinutes = Math.max(1, Math.round(words / WPM));
  return { words, chars, readMinutes };
}

export function formatStats(s: DocStats): string {
  return `${s.words.toLocaleString()} words · ${s.readMinutes} min read`;
}
