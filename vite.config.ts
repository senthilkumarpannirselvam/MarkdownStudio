import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const TARGETS = ['chrome', 'firefox', 'safari'] as const;
type Target = (typeof TARGETS)[number];

const target = (process.env.TARGET ?? 'chrome') as Target;
if (!TARGETS.includes(target)) throw new Error(`TARGET must be one of ${TARGETS.join(', ')}`);

const outDir = resolve(__dirname, 'dist', target);
const readJson = (path: string) => JSON.parse(readFileSync(resolve(__dirname, path), 'utf8'));

function mergeManifest(base: Record<string, unknown>, overlay: Record<string, unknown>): Record<string, unknown> {
  const out = { ...base };
  for (const [key, value] of Object.entries(overlay)) {
    const current = out[key];
    const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
    out[key] = isObject(current) && isObject(value) ? mergeManifest(current, value) : value;
  }
  return out;
}

/** Writes manifest.json for the target and the KaTeX stylesheet + fonts (woff2 only) that math rendering loads. */
function extensionFiles() {
  return {
    name: 'extension-files',
    apply: 'build' as const,
    closeBundle() {
      const manifest = mergeManifest(readJson('src/manifest.base.json'), readJson(`src/manifest.${target}.json`));
      manifest.version = readJson('package.json').version;
      writeFileSync(resolve(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

      const katexDir = resolve(__dirname, 'node_modules/katex/dist');
      const vendorDir = resolve(outDir, 'vendor/katex');
      mkdirSync(resolve(vendorDir, 'fonts'), { recursive: true });
      const css = readFileSync(resolve(katexDir, 'katex.min.css'), 'utf8')
        .replace(/,url\([^)]*\.woff\) format\("woff"\)/g, '')
        .replace(/,url\([^)]*\.ttf\) format\("truetype"\)/g, '');
      writeFileSync(resolve(vendorDir, 'katex.min.css'), css);
      for (const [, font] of css.matchAll(/url\(fonts\/([^)]+\.woff2)\)/g)) {
        copyFileSync(resolve(katexDir, 'fonts', font!), resolve(vendorDir, 'fonts', font!));
      }
    },
  };
}

export default defineConfig(({ mode }) => ({
  root: resolve(__dirname, 'src'),
  base: './',
  publicDir: resolve(__dirname, 'public'),
  plugins: [react(), extensionFiles()],
  resolve: { alias: { '@shared': resolve(__dirname, 'src/shared') } },
  esbuild: { charset: 'ascii', legalComments: 'none' },
  build: {
    outDir,
    emptyOutDir: true,
    sourcemap: mode === 'development',
    target: 'es2022',
    modulePreload: false,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      input: {
        'content/loader': resolve(__dirname, 'src/content/loader.ts'),
        'content/main': resolve(__dirname, 'src/content/main.ts'),
        'background/index': resolve(__dirname, 'src/background/index.ts'),
        popup: resolve(__dirname, 'src/popup/index.html'),
        options: resolve(__dirname, 'src/options/index.html'),
      },
      output: {
        entryFileNames: (chunk) => (/^(content|background)\//.test(chunk.name) ? '[name].js' : 'assets/[name]-[hash].js'),
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
}));
