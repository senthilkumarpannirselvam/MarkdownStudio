import { getSetting, setSetting } from './browser';

export type Theme = 'auto' | 'light' | 'dark';
export type FontFamily = 'system' | 'serif' | 'sans' | 'mono';
/** full: fit the screen; wide: capped at about 120 characters; reading: a 72-character column. */
export type PageWidth = 'full' | 'wide' | 'reading';

export interface Settings {
  theme: Theme;
  pageWidth: PageWidth;
  wrapTables: boolean;
  wrapCode: boolean;
  fontSize: number;
  fontFamily: FontFamily;
  showToc: boolean;
  autoEdit: boolean;
  enableMermaid: boolean;
  enableKatex: boolean;
  enablePlantuml: boolean;
  plantumlServer: string;
  enableGraphviz: boolean;
  enableWikilinks: boolean;
  enableEmoji: boolean;
  enableFootnotes: boolean;
  enableCallouts: boolean;
  hideFrontmatter: boolean;
  showReadingTime: boolean;
  showCopyButtons: boolean;
  autosaveMs: number;
  scrollSync: boolean;
  pollRemote: boolean;
  pollSeconds: number;
  foldSections: boolean;
  showMinimap: boolean;
  customCss: string;
}

export const DEFAULT_PLANTUML_SERVER = 'https://www.plantuml.com/plantuml';
export const MAX_CUSTOM_CSS = 4000;

export const DEFAULT_SETTINGS: Settings = {
  theme: 'auto',
  pageWidth: 'full',
  wrapTables: true,
  wrapCode: true,
  fontSize: 16,
  fontFamily: 'system',
  showToc: false,
  autoEdit: false,
  enableMermaid: true,
  enableKatex: true,
  enablePlantuml: false,
  plantumlServer: DEFAULT_PLANTUML_SERVER,
  enableGraphviz: false,
  enableWikilinks: false,
  enableEmoji: true,
  enableFootnotes: true,
  enableCallouts: true,
  hideFrontmatter: true,
  showReadingTime: true,
  showCopyButtons: true,
  autosaveMs: 2000,
  scrollSync: true,
  pollRemote: false,
  pollSeconds: 10,
  foldSections: true,
  showMinimap: false,
  customCss: '',
};

const STORAGE_KEY = 'settings.v1';
const THEMES: readonly Theme[] = ['auto', 'light', 'dark'];
const FONTS: readonly FontFamily[] = ['system', 'serif', 'sans', 'mono'];
const WIDTHS: readonly PageWidth[] = ['full', 'wide', 'reading'];

const clamp = (n: unknown, min: number, max: number, fallback: number): number =>
  typeof n === 'number' && Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;

/** Only http(s) servers are accepted; anything else falls back to the default. */
export function normalizeServerUrl(value: unknown): string {
  if (typeof value !== 'string') return DEFAULT_PLANTUML_SERVER;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return DEFAULT_PLANTUML_SERVER;
    return url.origin + url.pathname.replace(/\/+$/, '');
  } catch {
    return DEFAULT_PLANTUML_SERVER;
  }
}

/** Merge stored values over the defaults, dropping anything of the wrong type or range. */
export function sanitizeSettings(raw: unknown): Settings {
  const input = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const out: Settings = { ...DEFAULT_SETTINGS };

  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
    if (typeof DEFAULT_SETTINGS[key] === 'boolean' && typeof input[key] === 'boolean') {
      (out as unknown as Record<string, unknown>)[key] = input[key];
    }
  }
  if (THEMES.includes(input.theme as Theme)) out.theme = input.theme as Theme;
  if (FONTS.includes(input.fontFamily as FontFamily)) out.fontFamily = input.fontFamily as FontFamily;
  if (WIDTHS.includes(input.pageWidth as PageWidth)) out.pageWidth = input.pageWidth as PageWidth;
  out.fontSize = clamp(input.fontSize, 10, 28, DEFAULT_SETTINGS.fontSize);
  out.autosaveMs = clamp(input.autosaveMs, 0, 30000, DEFAULT_SETTINGS.autosaveMs);
  out.pollSeconds = clamp(input.pollSeconds, 2, 600, DEFAULT_SETTINGS.pollSeconds);
  out.plantumlServer = normalizeServerUrl(input.plantumlServer);
  if (typeof input.customCss === 'string') out.customCss = input.customCss.slice(0, MAX_CUSTOM_CSS);
  return out;
}

export async function loadSettings(): Promise<Settings> {
  return sanitizeSettings(await getSetting<unknown>(STORAGE_KEY, {}));
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = sanitizeSettings({ ...(await loadSettings()), ...patch });
  await setSetting(STORAGE_KEY, next);
  return next;
}

export const SETTINGS_KEY = STORAGE_KEY;
