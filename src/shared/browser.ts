type Browser = typeof chrome;

export const ext: Browser =
  typeof chrome !== 'undefined' && chrome.runtime
    ? chrome
    : (globalThis as unknown as { browser: Browser }).browser;

function read<T>(area: chrome.storage.StorageArea, key: string, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    area.get(key, (items) => {
      void ext.runtime.lastError;
      resolve((items?.[key] as T | undefined) ?? fallback);
    });
  });
}

function write<T>(area: chrome.storage.StorageArea, key: string, value: T): Promise<void> {
  return new Promise((resolve, reject) => {
    area.set({ [key]: value }, () => {
      const err = ext.runtime.lastError;
      if (err) reject(new Error(err.message));
      else resolve();
    });
  });
}

// Settings sync where the browser supports it; Safari falls back to local storage.
const settingsArea = (): chrome.storage.StorageArea => ext.storage.sync ?? ext.storage.local;

export const getSetting = <T>(key: string, fallback: T) => read(settingsArea(), key, fallback);
export const setSetting = <T>(key: string, value: T) => write(settingsArea(), key, value);
export const getLocal = <T>(key: string, fallback: T) => read(ext.storage.local, key, fallback);
export const setLocal = <T>(key: string, value: T) => write(ext.storage.local, key, value);

export function onStorageChange(cb: (key: string) => void): void {
  ext.storage.onChanged.addListener((changes) => {
    for (const key of Object.keys(changes)) cb(key);
  });
}
