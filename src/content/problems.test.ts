import { describe, expect, it } from 'vitest';
import {
  collectProblems,
  flagUnparsedImages,
  markMissingFigures,
  resolveSource,
  watchImage,
} from './problems';

const mount = (html: string): HTMLElement => {
  const root = document.createElement('article');
  root.innerHTML = html;
  document.body.replaceChildren(root);
  return root;
};

const FILE = new URL('file:///C:/Users/me/docs/');
const WEB = new URL('https://example.com/docs/');

describe('resolveSource', () => {
  it('resolves relative paths against the page', () => {
    expect(resolveSource('images/a.png', FILE)).toBe('file:///C:/Users/me/docs/images/a.png');
    expect(resolveSource('../a.png', WEB)).toBe('https://example.com/a.png');
    expect(resolveSource('./a%20b.png', FILE)).toBe('file:///C:/Users/me/docs/a%20b.png');
  });

  it('accepts Windows backslashes in relative paths', () => {
    expect(resolveSource('images\\a.png', FILE)).toBe('file:///C:/Users/me/docs/images/a.png');
    expect(resolveSource('images%5Ca.png', FILE)).toBe('file:///C:/Users/me/docs/images/a.png');
  });

  it('turns a Windows drive path into a file address on a local page', () => {
    expect(resolveSource('C:\\pics\\my logo.png', FILE)).toBe('file:///C:/pics/my%20logo.png');
    expect(resolveSource('C:%5Cpics%5Ca.png', FILE)).toBe('file:///C:/pics/a.png');
    expect(resolveSource('D:/shared/a.png', FILE)).toBe('file:///D:/shared/a.png');
  });

  it('leaves a drive path alone on a web page, where it cannot work', () => {
    expect(resolveSource('C:\\pics\\a.png', WEB)).toBe('C:\\pics\\a.png');
  });

  it('leaves absolute addresses unchanged', () => {
    expect(resolveSource('https://cdn.test/a.png', FILE)).toBe('https://cdn.test/a.png');
    expect(resolveSource('file:///C:/x/a.png', WEB)).toBe('file:///C:/x/a.png');
    expect(resolveSource('mailto:a@b.test', FILE)).toBe('mailto:a@b.test');
    expect(resolveSource('data:image/png;base64,AAAA', FILE)).toBe('data:image/png;base64,AAAA');
  });
});

describe('missing figure placeholders', () => {
  it('replaces an export placeholder with a note that explains it', () => {
    const root = mount('<p>[embedded content: How it works · sources, people]</p><p>Normal text</p>');
    markMissingFigures(root);
    const note = root.querySelector('.ms-figure-missing')!;
    expect(note.querySelector('strong')!.textContent).toBe('How it works · sources, people');
    expect(note.textContent).toContain('not included in the file');
    expect(root.querySelectorAll('p')).toHaveLength(1);
  });

  it('recognises other placeholder wordings', () => {
    const root = mount('<p>[Image: Architecture]</p><p>[diagram - Flow of a request]</p><p>[figure]</p>');
    markMissingFigures(root);
    expect(root.querySelectorAll('.ms-figure-missing')).toHaveLength(3);
  });

  it('does not touch real links or ordinary bracketed text', () => {
    const root = mount('<p>[a link](x)</p><p><a href="x">[image: not a placeholder]</a></p><p>see [1] and [note]</p>');
    markMissingFigures(root);
    expect(root.querySelector('.ms-figure-missing')).toBeNull();
  });
});

describe('unrecognised image syntax', () => {
  it('flags an image whose path has spaces, because Markdown shows it as text', () => {
    const root = mount('<p>Before ![diagram](my diagram.png) after</p>');
    flagUnparsedImages(root);
    const flagged = root.querySelector('.ms-unparsed')!;
    expect(flagged.textContent).toBe('![diagram](my diagram.png)');
    expect(flagged.getAttribute('title')).toContain('<my image.png>');
    expect(root.textContent).toBe('Before ![diagram](my diagram.png) after');
  });

  it('ignores code', () => {
    const root = mount('<p>Use <code>![alt](a b.png)</code></p><pre><code>![x](y z.png)</code></pre>');
    flagUnparsedImages(root);
    expect(root.querySelector('.ms-unparsed')).toBeNull();
  });
});

describe('failed images', () => {
  it('shows a visible note with the reason instead of a blank gap', () => {
    const root = mount('<p><img src="file:///C:/missing/a.png" alt="Logo"></p>');
    const img = root.querySelector('img')!;
    watchImage(img);
    img.dispatchEvent(new Event('error'));

    const note = root.querySelector('.ms-image-missing')!;
    expect(note.textContent).toBe('Image not loaded: Logo');
    expect(note.getAttribute('title')).toContain('Allow access to file URLs');
    expect(root.querySelector('img')).toBeNull();
  });

  it('names the file when there is no alt text', () => {
    const root = mount('<img src="https://cdn.test/pics/chart%201.png">');
    const img = root.querySelector('img')!;
    watchImage(img);
    img.dispatchEvent(new Event('error'));
    expect(root.querySelector('.ms-image-missing')!.textContent).toBe('Image not loaded: chart 1.png');
  });
});

describe('collectProblems', () => {
  it('lists every kind of problem in document order', () => {
    const root = mount(
      '<span class="ms-diagram-error">Mermaid error: bad</span>' +
        '<span class="ms-image-missing">Image not loaded: a.png</span>' +
        '<div class="ms-figure-missing"><strong>Flow</strong></div>' +
        '<span class="ms-unparsed">![x](a b.png)</span>',
    );
    expect(collectProblems(root).map((p) => p.kind)).toEqual(['diagram', 'image', 'figure', 'syntax']);
  });

  it('is empty for a clean document', () => {
    expect(collectProblems(mount('<p>fine</p>'))).toEqual([]);
  });
});
