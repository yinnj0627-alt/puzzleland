// make-fixtures.js
// 6개 기준 코드의 퍼즐 스냅샷 생성
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateFence } from '../public/js/core/fence.js';
import { generateMagic } from '../public/js/core/magic.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fixtureCodes = [
  { game: 'FN', diff: 'E', code: 'FN-E-000000' },
  { game: 'FN', diff: 'N', code: 'FN-N-7K3QX9' },
  { game: 'FN', diff: 'H', code: 'FN-H-ZZZZZZ' },
  { game: 'MS', diff: 'E', code: 'MS-E-000000' },
  { game: 'MS', diff: 'N', code: 'MS-N-7K3QX9' },
  { game: 'MS', diff: 'H', code: 'MS-H-ZZZZZZ' }
];

const results = {};
for (const item of fixtureCodes) {
  if (item.game === 'FN') {
    results[item.code] = generateFence(item.code, item.diff);
  } else {
    results[item.code] = generateMagic(item.code, item.diff);
  }
}

const targetPath = path.join(__dirname, 'fixtures', 'puzzles-v1.json');
await fs.writeFile(targetPath, JSON.stringify(results, null, 2), 'utf-8');
console.log('Fixtures created at:', targetPath);
