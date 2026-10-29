import MarkdownIt from 'markdown-it';
import { escapeHtml } from '@shared/html';
import type { Settings } from '@shared/settings';
import hljs from './hljs';
import { applyPlugins } from './plugins';

const SAFE_LANG = /^[\w#+.-]{1,32}$/;

const slugify = (text: string) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

export function createMarkdown(settings: Settings): MarkdownIt {
  const md: MarkdownIt = new MarkdownIt({
    html: false,
    // A new line in the file is a new line on the page. A blank line still starts a new paragraph.
    breaks: true,
    linkify: true,
    typographer: true,
    highlight(code, lang) {
      // The fence language is untrusted text: emit it only after validation and escaping.
      const safe = SAFE_LANG.test(lang) ? escapeHtml(lang) : '';
      let body = md.utils.escapeHtml(code);
      if (safe && hljs.getLanguage(lang)) {
        body = hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
      }
      return `<pre class="ms-code"><code class="${safe ? `hljs language-${safe}` : 'hljs'}">${body}</code></pre>`;
    },
  });

  const wrap = (rule: 'table_open' | 'table_close', before: string, after: string) => {
    const original = md.renderer.rules[rule];
    md.renderer.rules[rule] = (tokens, idx, options, env, self) =>
      before + (original ? original(tokens, idx, options, env, self) : self.renderToken(tokens, idx, options)) + after;
  };
  wrap('table_open', '<div class="ms-table-wrap">', '');
  wrap('table_close', '', '</div>');

  md.renderer.rules.heading_open = (tokens, idx, options, env, self) => {
    const text = tokens[idx + 1]?.children?.map((c) => c.content).join('') ?? '';
    const base = slugify(text) || 'section';
    const seen: Map<string, number> = (env.slugs ??= new Map());
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    tokens[idx]!.attrSet('id', count ? `${base}-${count}` : base);
    return self.renderToken(tokens, idx, options);
  };

  applyPlugins(md, settings);
  md.core.ruler.push('br_tags', breakTags);
  return md;
}

const BR_TAG = /<br\s*\/?>/gi;

/** Turns a literal `<br>` into a break. Any other HTML, including a `<br>` with attributes, stays text. */
const breakTags: Parameters<MarkdownIt['core']['ruler']['push']>[1] = (state) => {
  for (const token of state.tokens) {
    if (token.type !== 'inline' || !token.children) continue;
    const next = [];
    for (const child of token.children) {
      if (child.type !== 'text' || !BR_TAG.test(child.content)) {
        BR_TAG.lastIndex = 0;
        next.push(child);
        continue;
      }
      BR_TAG.lastIndex = 0;
      const parts = child.content.split(BR_TAG);
      parts.forEach((part, index) => {
        if (part) {
          const text = new state.Token('text', '', 0);
          text.content = part;
          next.push(text);
        }
        if (index < parts.length - 1) next.push(new state.Token('hardbreak', 'br', 0));
      });
    }
    token.children = next;
  }
};
