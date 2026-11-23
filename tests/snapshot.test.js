// snapshot.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateFence } from '../public/js/core/fence.js';
import { generateMagic } from '../public/js/core/magic.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('puzzles-v1.json 스냅샷과 현재 생성 결과가 완벽히 일치', async () => {
  const targetPath = path.join(__dirname, 'fixtures', 'puzzles-v1.json');
  const raw = await fs.readFile(targetPath, 'utf-8');
  const fixtures = JSON.parse(raw);

  const fixtureCodes = [
    { game: 'FN', diff: 'E', code: 'FN-E-000000' },
    { game: 'FN', diff: 'N', code: 'FN-N-7K3QX9' },
    { game: 'FN', diff: 'H', code: 'FN-H-ZZZZZZ' },
    { game: 'MS', diff: 'E', code: 'MS-E-000000' },
    { game: 'MS', diff: 'N', code: 'MS-N-7K3QX9' },
    { game: 'MS', diff: 'H', code: 'MS-H-ZZZZZZ' }
  ];

  for (const item of fixtureCodes) {
    const current = item.game === 'FN'
      ? generateFence(item.code, item.diff)
      : generateMagic(item.code, item.diff);
    assert.deepEqual(current, fixtures[item.code], `Snapshot mismatch on ${item.code}`);
  }
});
