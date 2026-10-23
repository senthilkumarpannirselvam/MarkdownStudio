// Builds every browser target in sequence.
import { spawnSync } from 'node:child_process';

for (const target of ['chrome', 'firefox', 'safari']) {
  console.log(`\nBuilding ${target}`);
  const result = spawnSync('npx', ['vite', 'build'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, TARGET: target },
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
