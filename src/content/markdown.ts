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
  return md;
}
