import { escapeHtml } from '@shared/html';

export interface Frontmatter {
  data: Record<string, unknown>;
  body: string;
  /** Number of source lines removed ahead of `body`; needed to map rendered lines back to the source. */
  lineOffset: number;
}

const FENCES = [
  { open: /^---\r?\n/, close: /\r?\n---\r?\n?/, kind: 'yaml' as const },
  { open: /^\+\+\+\r?\n/, close: /\r?\n\+\+\+\r?\n?/, kind: 'toml' as const },
  { open: /^;;;\r?\n/, close: /\r?\n;;;\r?\n?/, kind: 'json' as const },
];

/** Splits YAML / TOML / JSON front matter off the top. Only flat `key: value` pairs are read. */
export function parseFrontmatter(source: string): Frontmatter {
  for (const fence of FENCES) {
    if (!fence.open.test(source)) continue;
    const after = source.replace(fence.open, '');
    const match = fence.close.exec(after);
    if (!match) continue;
    const raw = after.slice(0, match.index);
    const body = after.slice(match.index + match[0].length);
    const data = fence.kind === 'json' ? parseJsonBlock(raw) : parseKvBlock(raw);
    const removed = source.slice(0, source.length - body.length);
    return { data, body, lineOffset: removed.split('\n').length - 1 };
  }
  return { data: {}, body: source, lineOffset: 0 };
}

function parseKvBlock(raw: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const m = /^\s*([A-Za-z0-9_.-]+)\s*[:=]\s*(.*)$/.exec(line);
    if (!m) continue;
    const [, key, rawValue] = m;
    if (!key) continue;
    out[key] = coerce((rawValue ?? '').trim());
  }
  return out;
}

function parseJsonBlock(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function coerce(value: string): unknown {
  if (value === '' || value === '~' || value.toLowerCase() === 'null') return null;
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+$/.test(value)) return Number(value);
  if (/^-?\d+\.\d+$/.test(value)) return Number(value);
  if (value.startsWith('[') && value.endsWith(']')) {
    return value
      .slice(1, -1)
      .split(',')
      .map((s) => coerce(s.trim().replace(/^["']|["']$/g, '')));
  }
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

export function renderFrontmatterCard(data: Record<string, unknown>): string {
  const entries = Object.entries(data);
  if (!entries.length) return '';
  const rows = entries
    .map(([k, v]) => `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(formatValue(v))}</td></tr>`)
    .join('');
  return `<details class="ms-frontmatter" open><summary>Front matter · ${entries.length} field${
    entries.length === 1 ? '' : 's'
  }</summary><table>${rows}</table></details>`;
}

function formatValue(v: unknown): string {
  if (v == null) return '';
  if (Array.isArray(v)) return v.map(formatValue).join(', ');
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
