import { getLocal, setLocal } from './browser';

const KEY = 'blockedSites.v1';

/** Hostname used as the block key. Local files share the single key "local". */
export function hostOf(href: string): string {
  try {
    return new URL(href).hostname.toLowerCase() || 'local';
  } catch {
    return 'local';
  }
}

/** Accepts a bare hostname or a full URL typed into the options page. */
export function normalizeHost(input: string): string {
  const value = input.trim().toLowerCase();
  if (!value) return '';
  try {
    return new URL(value.includes('://') ? value : `https://${value}`).hostname;
  } catch {
    return '';
  }
}

export const listBlocked = () => getLocal<string[]>(KEY, []);

export async function isBlocked(href: string): Promise<boolean> {
  return (await listBlocked()).includes(hostOf(href));
}

export async function blockHost(host: string): Promise<void> {
  const list = await listBlocked();
  if (host && !list.includes(host)) await setLocal(KEY, [...list, host]);
}

export async function unblockHost(host: string): Promise<void> {
  await setLocal(KEY, (await listBlocked()).filter((h) => h !== host));
}
