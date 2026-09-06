import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { chromium } from '@playwright/test';

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const browserCandidates = [
  process.env.PW_CHROMIUM_PATH,
  chromium.executablePath(),
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
].filter(Boolean);

let browserPath = browserCandidates.find((candidate) => existsSync(candidate));

if (!browserPath) {
  console.log('[QA] 실행 가능한 Chrome/Chromium이 없어 최초 1회 Playwright Chromium을 설치한다.');
  const install = spawnSync(npx, ['playwright', 'install', 'chromium'], {
    stdio: 'inherit',
    shell: false,
  });
  if (install.status !== 0) process.exit(install.status ?? 1);
  browserPath = chromium.executablePath();
}

const args = ['playwright', 'test', '--reporter=line', ...process.argv.slice(2)];
const result = spawnSync(npx, args, {
  stdio: 'inherit',
  shell: false,
  env: { ...process.env, PW_CHROMIUM_PATH: browserPath },
});
process.exit(result.status ?? 1);
