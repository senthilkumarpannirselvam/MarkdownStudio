import { getLocal, setLocal } from './browser';

// Edits to http(s) pages cannot be written back, so they are kept per URL in extension storage.
const KEY = 'drafts.v1';

type DraftMap = Record<string, { text: string; updatedAt: number }>;

export async function getDraft(url: string): Promise<string | null> {
  return (await getLocal<DraftMap>(KEY, {}))[url]?.text ?? null;
}

export async function saveDraft(url: string, text: string): Promise<void> {
  const map = await getLocal<DraftMap>(KEY, {});
  map[url] = { text, updatedAt: Date.now() };
  await setLocal(KEY, map);
}

export async function clearDraft(url: string): Promise<void> {
  const map = await getLocal<DraftMap>(KEY, {});
  delete map[url];
  await setLocal(KEY, map);
}

export async function listDrafts(): Promise<Array<{ url: string; updatedAt: number }>> {
  const map = await getLocal<DraftMap>(KEY, {});
  return Object.entries(map).map(([url, { updatedAt }]) => ({ url, updatedAt }));
}
