import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '@shared/settings';
import { createMarkdown } from './markdown';

// Constructs that real documents contain. Each must come out as the right element, never as visible raw markup.
const render = (src: string) => createMarkdown(DEFAULT_SETTINGS).render(src, {});
const text = (html: string) => {
  const el = document.createElement('div');
  el.innerHTML = html;
  return el.textContent ?? '';
};

describe('documents render fully', () => {
  const cases: Array<[string, string, RegExp]> = [
    ['an image', '![alt](pic.png "Title")', /<img src="pic\.png" alt="alt" title="Title">/],
    ['an image in angle brackets (spaces in the path)', '![alt](<my pic.png>)', /<img src="my%20pic\.png"/],
    ['a reference-style image', '![alt][r]\n\n[r]: pic.png', /<img src="pic\.png"/],
    ['a linked badge image', '[![build](b.svg)](https://ci.test)', /<a href="https:\/\/ci\.test"><img src="b\.svg"/],
    ['an HTML image with a size', '<img src="a.png" width="300" alt="x">', /<img src="a\.png" width="300" alt="x">/],
    ['centered HTML', '<p align="center"><img src="a.png"></p>', /<p align="center">/],
    ['details and summary', '<details><summary>More</summary>\n\nInside\n\n</details>', /<details><summary>More<\/summary>/],
    ['a keyboard key', 'Press <kbd>Ctrl</kbd>', /<kbd>Ctrl<\/kbd>/],
    ['an autolink', '<https://example.com>', /<a href="https:\/\/example\.com">/],
    ['a bare URL', 'see https://example.com/x', /<a href="https:\/\/example\.com\/x">/],
    ['table alignment', '| a | b |\n|:-:|--:|\n| 1 | 2 |', /style="text-align:center"/],
    ['a task list', '- [x] done\n- [ ] todo', /type="checkbox"/],
    ['a footnote', 'text[^1]\n\n[^1]: note', /class="footnote-ref"/],
    ['a definition list', 'Term\n: Meaning', /<dl>/],
    ['a setext heading', 'Title\n=====', /<h1 id="title">/],
    ['a heading with trailing hashes', '## Name ##', /<h2 id="name">Name<\/h2>/],
    ['an indented code block', '    code here', /<pre class="ms-code"><code class="hljs">code here/],
    ['a tilde fence', '~~~js\nlet a;\n~~~', /language-js/],
    ['a fence with extra info', '```ts title="a.ts"\nlet a;\n```', /language-ts/],
    ['an upper-case diagram language', '```Mermaid\ngraph TD;\n```', /language-mermaid/],
    ['the mmd alias', '```mmd\ngraph TD;\n```', /language-mermaid/],
    ['the gv alias', '```gv\ndigraph{}\n```', /language-dot/],
    ['an HTML comment (hidden)', 'a <!-- note --> b', /^(?!.*note)/s],
    ['an escaped character', '\\*not bold\\*', /\*not bold\*/],
    ['a nested list', '- a\n  - b\n    - c', /<li data-line="1">b\s*<ul>/],
    ['a numbered list that starts at 3', '3. a\n4. b', /<ol start="3">/],
    ['strikethrough', '~~gone~~', /<s>gone<\/s>/],
    ['a callout', '> [!WARNING]\n> careful', /data-kind="warning"/],
    ['an emoji shortcode', ':tada:', /🎉/u],
    ['a horizontal rule', '---', /<hr>/],
    ['a hard break with two spaces', 'a  \nb', /a<br>\s*b/],
    ['a mark', '==hi==', /<mark>hi<\/mark>/],
    ['sub and superscript', 'H~2~O x^2^', /<sub>2<\/sub>.*<sup>2<\/sup>/],
  ];

  it.each(cases)('%s', (_name, src, expected) => {
    expect(render(src)).toMatch(expected);
  });

  it('shows no markup characters from an HTML-heavy README', () => {
    const readme = [
      '<h1 align="center">Project</h1>',
      '<p align="center"><a href="https://ci.test"><img src="badge.svg" alt="build"></a></p>',
      '',
      '<details>',
      '<summary>Install</summary>',
      '',
      '```bash',
      'npm install',
      '```',
      '',
      '</details>',
    ].join('\n');
    const shown = text(render(readme));
    expect(shown).not.toMatch(/<\/?(h1|p|a|img|details|summary)\b/);
    expect(shown).toContain('Project');
    expect(shown).toContain('npm install');
  });

  it('keeps a Windows or file image path as an image (resolved later against the page)', () => {
    expect(render('![x](C:\\pics\\a.png)')).toMatch(/<img src="C:%5Cpics%5Ca\.png"/);
  });
});
