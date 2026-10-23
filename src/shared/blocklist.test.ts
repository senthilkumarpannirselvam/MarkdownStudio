import { beforeEach, describe, expect, it, vi } from 'vitest';

const store: Record<string, unknown> = {};
const area = {
  get: (key: string, cb: (items: Record<string, unknown>) => void) => cb({ [key]: store[key] }),
  set: (items: Record<string, unknown>, cb?: () => void) => {
    Object.assign(store, items);
    cb?.();
  },
};
vi.stubGlobal('chrome', { runtime: { lastError: undefined }, storage: { local: area, sync: area } });

const { blockHost, hostOf, isBlocked, listBlocked, normalizeHost, unblockHost } = await import('./blocklist');

describe('hostOf', () => {
  it('extracts a lower-cased hostname', () => {
    expect(hostOf('https://Example.COM/a/b.md?x=1')).toBe('example.com');
  });

  it('uses "local" for files and unparsable input', () => {
    expect(hostOf('file:///C:/notes/a.md')).toBe('local');
    expect(hostOf('not a url')).toBe('local');
  });
});

describe('normalizeHost', () => {
  it('accepts hostnames and URLs', () => {
    expect(normalizeHost(' Example.com ')).toBe('example.com');
    expect(normalizeHost('https://docs.example.com/path')).toBe('docs.example.com');
    expect(normalizeHost('')).toBe('');
  });
});

describe('block list', () => {
  beforeEach(() => {
    for (const key of Object.keys(store)) delete store[key];
  });

  it('blocks per host', async () => {
    await blockHost('foo.example');
    expect(await isBlocked('https://foo.example/x.md')).toBe(true);
    expect(await isBlocked('https://bar.example/x.md')).toBe(false);
  });

  it('does not add a host twice', async () => {
    await blockHost('foo.example');
    await blockHost('foo.example');
    expect(await listBlocked()).toEqual(['foo.example']);
  });

  it('unblocks', async () => {
    await blockHost('foo.example');
    await unblockHost('foo.example');
    expect(await isBlocked('https://foo.example/x.md')).toBe(false);
  });
});
