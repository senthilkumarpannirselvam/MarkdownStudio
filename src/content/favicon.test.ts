import { beforeEach, describe, expect, it } from 'vitest';
import { installFavicon } from './favicon';

describe('installFavicon', () => {
  beforeEach(() => {
    document.head.replaceChildren();
  });

  it('adds the app icon as an SVG data address', () => {
    installFavicon();
    const links = document.head.querySelectorAll<HTMLLinkElement>('link[rel="icon"]');
    expect(links).toHaveLength(1);
    expect(links[0]!.type).toBe('image/svg+xml');
    expect(links[0]!.href.startsWith('data:image/svg+xml,')).toBe(true);
    expect(decodeURIComponent(links[0]!.href)).toContain('<svg');
  });

  it('replaces an icon the page already had, and never adds a second', () => {
    document.head.innerHTML = '<link rel="shortcut icon" href="/old.ico"><link rel="icon" href="/older.png">';
    installFavicon();
    installFavicon();
    const icons = document.head.querySelectorAll('link[rel~="icon"]');
    expect(icons).toHaveLength(1);
    expect((icons[0] as HTMLLinkElement).href).not.toContain('old');
  });
});
