// Manifest content scripts are classic scripts: no static imports, no code splitting.
// This stub (which must stay import-free) loads the real bundle as an ES module from the extension.
declare const browser: typeof chrome | undefined;

const api = typeof browser !== 'undefined' ? browser : chrome;
void import(/* @vite-ignore */ api.runtime.getURL('content/main.js'));

export {};
