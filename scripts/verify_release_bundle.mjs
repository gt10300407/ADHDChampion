import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const preview = join(root, 'preview-web');
const indexPath = join(preview, 'index.html');
const index = readFileSync(indexPath, 'utf8');

const assetMatch = index.match(/src="\/assets\/(index-[^"]+\.js)"/);
if (!assetMatch) throw new Error('preview-web/index.html에서 JS 번들을 찾지 못했어.');

const bundlePath = join(preview, 'assets', assetMatch[1]);
if (!existsSync(bundlePath)) throw new Error(`JS 번들이 없어: ${bundlePath}`);
const bundle = readFileSync(bundlePath, 'utf8');

const checks = [
  ['외부 임시 패치 제거', !index.includes('memory-pause-patch.js')],
  ['기억 임무 일시정지 코드', bundle.includes('T.current=!0,U(!0),V(null),z(!1)')],
  ['기억 임무 안내 문구', bundle.includes('정답을 고르면 경기가 다시 시작돼')],
  ['기억 임무 테스트 식별자', bundle.includes('data-testid":"memory-quiz')],
  ['기억 임무 중 중복 일시정지 화면 차단', bundle.includes('H.length===0')],
];

let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
console.log('PASS: 출시용 preview-web 번들 검증 완료');
