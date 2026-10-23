import type MarkdownIt from 'markdown-it';
import { full as emoji } from 'markdown-it-emoji';
// @ts-expect-error - untyped
import taskLists from 'markdown-it-task-lists';
// @ts-expect-error - untyped
import footnote from 'markdown-it-footnote';
// @ts-expect-error - untyped
import deflist from 'markdown-it-deflist';
// @ts-expect-error - untyped
import sub from 'markdown-it-sub';
// @ts-expect-error - untyped
import sup from 'markdown-it-sup';
// @ts-expect-error - untyped
import abbr from 'markdown-it-abbr';
// @ts-expect-error - untyped
import mark from 'markdown-it-mark';
// @ts-expect-error - untyped
import ins from 'markdown-it-ins';
import type { Settings } from '@shared/settings';

export function applyPlugins(md: MarkdownIt, settings: Settings): void {
  md.use(taskLists, { enabled: true });
  md.core.ruler.push('source-lines', sourceLines);
  md.use(deflist).use(sub).use(sup).use(abbr).use(mark).use(ins);
  if (settings.enableFootnotes) md.use(footnote);
  if (settings.enableEmoji) md.use(emoji);
  if (settings.enableCallouts) md.core.ruler.after('block', 'callouts', callouts);
  if (settings.enableWikilinks) md.inline.ruler.before('link', 'wikilink', wikilink);
}

/** Records each list item's 0-indexed source line so a clicked checkbox can be mapped back to the Markdown. */
const sourceLines: Parameters<MarkdownIt['core']['ruler']['push']>[1] = (state) => {
  for (const token of state.tokens) {
    if (token.type === 'list_item_open' && token.map) token.attrSet('data-line', String(token.map[0]));
  }
};

const CALLOUT = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*\n?/i;

/** Turns `> [!NOTE]` blockquotes into titled callouts. */
const callouts: Parameters<MarkdownIt['core']['ruler']['after']>[2] = (state) => {
  const tokens = state.tokens;
  for (let i = 0; i < tokens.length - 2; i++) {
    const open = tokens[i];
    const inline = tokens[i + 2];
    if (open?.type !== 'blockquote_open' || tokens[i + 1]?.type !== 'paragraph_open' || inline?.type !== 'inline') {
      continue;
    }
    const match = CALLOUT.exec(inline.content);
    if (!match?.[1]) continue;

    const kind = match[1].toLowerCase();
    open.attrJoin('class', `ms-callout ms-callout-${kind}`);
    open.attrSet('data-kind', kind);
    inline.content = inline.content.slice(match[0].length);
    const first = inline.children?.[0];
    if (first?.type === 'text') first.content = first.content.replace(CALLOUT, '');

    const title = new state.Token('html_block', '', 0);
    title.content = `<div class="ms-callout-title">${kind[0]!.toUpperCase()}${kind.slice(1)}</div>\n`;
    tokens.splice(i + 1, 0, title);
  }
};

/** `[[Page]]` and `[[Page|label]]` link to `Page.md` next to the current document. */
const wikilink: Parameters<MarkdownIt['inline']['ruler']['before']>[2] = (state, silent) => {
  const { src, pos } = state;
  if (src.charCodeAt(pos) !== 0x5b || src.charCodeAt(pos + 1) !== 0x5b) return false;
  const end = src.indexOf(']]', pos + 2);
  if (end < 0) return false;
  const body = src.slice(pos + 2, end);
  if (/[[\]\n]/.test(body)) return false;

  const [target = '', label = target] = body.split('|');
  const href = `${encodeURI(target.trim())}.md`;
  if (!target.trim() || !state.md.validateLink(href)) return false;
  if (silent) return true;

  const open = state.push('link_open', 'a', 1);
  open.attrs = [
    ['href', href],
    ['class', 'ms-wikilink'],
  ];
  state.push('text', '', 0).content = label.trim();
  state.push('link_close', 'a', -1);
  state.pos = end + 2;
  return true;
};
