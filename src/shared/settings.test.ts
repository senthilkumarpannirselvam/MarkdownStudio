import { describe, expect, it } from 'vitest';
import { DEFAULT_PLANTUML_SERVER, DEFAULT_SETTINGS, MAX_CUSTOM_CSS, normalizeServerUrl, sanitizeSettings } from './settings';

describe('sanitizeSettings', () => {
  it('returns the defaults for junk input', () => {
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings('nope')).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings([1, 2])).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps valid values and drops wrongly typed ones', () => {
    const out = sanitizeSettings({ theme: 'dark', wrapCode: false, enableEmoji: 'yes', fontFamily: 'comic' });
    expect(out.theme).toBe('dark');
    expect(out.wrapCode).toBe(false);
    expect(out.enableEmoji).toBe(DEFAULT_SETTINGS.enableEmoji);
    expect(out.fontFamily).toBe(DEFAULT_SETTINGS.fontFamily);
  });

  it('fits the screen and wraps tables and code by default', () => {
    expect(DEFAULT_SETTINGS).toMatchObject({ pageWidth: 'full', wrapTables: true, wrapCode: true, enabled: true });
  });

  it('stays on unless a stored value turns it off', () => {
    expect(sanitizeSettings({}).enabled).toBe(true);
    expect(sanitizeSettings({ enabled: false }).enabled).toBe(false);
    expect(sanitizeSettings({ enabled: 'no' }).enabled).toBe(true);
  });

  it('accepts the known page widths and rejects anything else', () => {
    expect(sanitizeSettings({ pageWidth: 'reading' }).pageWidth).toBe('reading');
    expect(sanitizeSettings({ pageWidth: 'wide' }).pageWidth).toBe('wide');
    expect(sanitizeSettings({ pageWidth: '100vw' }).pageWidth).toBe('full');
    expect(sanitizeSettings({ pageWidth: 3 }).pageWidth).toBe('full');
  });

  it('clamps numbers to safe ranges', () => {
    const out = sanitizeSettings({ fontSize: 500, autosaveMs: -5, pollSeconds: 0 });
    expect(out.fontSize).toBe(28);
    expect(out.autosaveMs).toBe(0);
    expect(out.pollSeconds).toBe(2);
    expect(sanitizeSettings({ fontSize: NaN }).fontSize).toBe(DEFAULT_SETTINGS.fontSize);
  });

  it('truncates custom CSS', () => {
    expect(sanitizeSettings({ customCss: 'a'.repeat(MAX_CUSTOM_CSS + 50) }).customCss).toHaveLength(MAX_CUSTOM_CSS);
  });

  it('ignores unknown keys', () => {
    expect(sanitizeSettings({ evil: true })).not.toHaveProperty('evil');
  });
});

describe('normalizeServerUrl', () => {
  it('accepts http and https and trims trailing slashes', () => {
    expect(normalizeServerUrl('https://uml.example.com/plantuml/')).toBe('https://uml.example.com/plantuml');
    expect(normalizeServerUrl('http://localhost:8080')).toBe('http://localhost:8080');
  });

  it.each(['javascript:alert(1)', 'file:///etc/passwd', 'ftp://x.test', 'not a url', '', 42, null])(
    'falls back to the default for %s',
    (value) => expect(normalizeServerUrl(value)).toBe(DEFAULT_PLANTUML_SERVER),
  );
});
