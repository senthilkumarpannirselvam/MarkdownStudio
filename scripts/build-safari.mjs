// Wraps dist/safari in an Xcode project. Safari only loads extensions packaged in a macOS app, so this
// needs macOS with Xcode; elsewhere it prints the command to run on a Mac.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const source = resolve('dist/safari');
if (!existsSync(resolve(source, 'manifest.json'))) {
  console.error('dist/safari not found. Run: npm run build:safari');
  process.exit(1);
}

const args = [
  'safari-web-extension-converter',
  source,
  '--project-location',
  resolve('safari-wrapper'),
  '--app-name',
  'Markdown Studio',
  '--bundle-identifier',
  'dev.markdownstudio.app',
  '--no-prompt',
  '--force',
];

if (process.platform !== 'darwin') {
  console.log(`Safari packaging needs macOS and Xcode. On a Mac, copy dist/safari and run:\n\n  xcrun ${args.join(' ')}\n`);
  process.exit(0);
}

process.exit(spawnSync('xcrun', args, { stdio: 'inherit' }).status ?? 1);
