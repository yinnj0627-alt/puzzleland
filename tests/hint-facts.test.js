// hint-facts.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateFence } from '../public/js/core/fence.js';
import { generateMagic } from '../public/js/core/magic.js';
import { getFenceHintFact, getMagicHintFact } from '../public/js/core/hint-facts.js';

test('울타리: 빈 판에서는 MISSING_EDGE 힌트 반환', () => {
  const puzzle = generateFence('FN-E-000000', 'E');
  const emptyLines = {
    h: Array.from({ length: 6 }, () => Array(5).fill(0)),
    v: Array.from({ length: 5 }, () => Array(6).fill(0))
  };
  const fact = getFenceHintFact(puzzle, emptyLines);
  assert.equal(fact.kind, 'MISSING_EDGE');
  assert.equal(fact.target.type, 'edge');
});

test('울타리: 선 3개 모인 점이 있으면 BRANCH 힌트 반환', () => {
  const puzzle = generateFence('FN-E-000000', 'E');
  const lines = {
    h: Array.from({ length: 6 }, () => Array(5).fill(0)),
    v: Array.from({ length: 5 }, () => Array(6).fill(0))
  };
  // 점 (1,1)에 h[1][0], h[1][1], v[0][1] 선 3개 연결
  lines.h[1][0] = 1;
  lines.h[1][1] = 1;
  lines.v[0][1] = 1;
  const fact = getFenceHintFact(puzzle, lines);
  assert.equal(fact.kind, 'BRANCH');
  assert.deepEqual(fact.target, { type: 'vertex', r: 1, c: 1 });
});

test('마방진: 빈 판에서는 REVEAL 힌트 반환', () => {
  const puzzle = generateMagic('MS-E-000000', 'E');
  const grid = Array.from({ length: 3 }, () => Array(3).fill(0));
  const fact = getMagicHintFact(puzzle, grid);
  assert.equal(fact.kind, 'REVEAL');
  assert.equal(fact.target.type, 'cell');
});

test('마방진: 중복 숫자가 있을 때 DUPLICATE 힌트 반환', () => {
  const puzzle = generateMagic('MS-E-000000', 'E');
  // givens 복사 후 빈칸 2곳에 중복 숫자 넣기
  const grid = puzzle.givens.map(r => r.slice().map(v => v || 0));
  const emptyCoords = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (grid[r][c] === 0) emptyCoords.push({ r, c });
    }
  }
  if (emptyCoords.length >= 2) {
    grid[emptyCoords[0].r][emptyCoords[0].c] = 9;
    grid[emptyCoords[1].r][emptyCoords[1].c] = 9;
    const fact = getMagicHintFact(puzzle, grid);
    assert.equal(fact.kind, 'DUPLICATE');
  }
});
