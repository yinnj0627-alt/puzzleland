// magic.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createBaseMagic, generateMagic, validateMagic } from '../public/js/core/magic.js';
import { MAGIC_CONFIG } from '../public/js/core/constants.js';

test('시암 n=3, 이중짝수 n=4 기본값 명세와 일치', () => {
  const base3 = createBaseMagic(3);
  assert.deepEqual(base3, [
    [8, 1, 6],
    [3, 5, 7],
    [4, 9, 2]
  ]);

  const base4 = createBaseMagic(4);
  assert.deepEqual(base4, [
    [16, 2, 3, 13],
    [5, 11, 10, 8],
    [9, 7, 6, 12],
    [4, 14, 15, 1]
  ]);
});

test('각 난이도별 solution이 validateMagic 통과', () => {
  for (const diff of ['E', 'N', 'H']) {
    for (let i = 0; i < 20; i++) {
      const code = `MS-${diff}-00000${i}`;
      const puzzle = generateMagic(code, diff);
      const res = validateMagic(puzzle, puzzle.solution);
      assert.equal(res.ok, true, `Failed on ${code}: ${res.reason}`);
    }
  }
});

test('givens 개수 일치', () => {
  for (const diff of ['E', 'N', 'H']) {
    const puzzle = generateMagic(`MS-${diff}-TEST99`, diff);
    let count = 0;
    for (let r = 0; r < puzzle.n; r++) {
      for (let c = 0; c < puzzle.n; c++) {
        if (puzzle.givens[r][c] !== null) count++;
      }
    }
    assert.equal(count, MAGIC_CONFIG.givens[diff]);
  }
});

test('빈칸이 있으면 INCOMPLETE 실패', () => {
  const puzzle = generateMagic('MS-E-000000', 'E');
  const grid = puzzle.solution.map(r => r.slice());
  grid[0][0] = 0;
  const res = validateMagic(puzzle, grid);
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'INCOMPLETE');
});

test('숫자 중복이 있으면 DUPLICATE 실패', () => {
  const puzzle = generateMagic('MS-E-000000', 'E');
  const grid = puzzle.solution.map(r => r.slice());
  // givens가 아닌 칸 2개 찾아서 하나를 다른 하나와 동일하게 만들기
  const freeCells = [];
  for (let r = 0; r < puzzle.n; r++) {
    for (let c = 0; c < puzzle.n; c++) {
      if (puzzle.givens[r][c] === null) freeCells.push({ r, c });
    }
  }
  grid[freeCells[0].r][freeCells[0].c] = grid[freeCells[1].r][freeCells[1].c];
  const res = validateMagic(puzzle, grid);
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'DUPLICATE');
});

test('주어진 숫자가 바뀌면 GIVEN_CHANGED 실패', () => {
  const puzzle = generateMagic('MS-E-000000', 'E');
  // givens 중 첫 번째 찾기
  let gr = -1, gc = -1;
  let nonGr = -1, nonGc = -1;
  for (let r = 0; r < puzzle.n; r++) {
    for (let c = 0; c < puzzle.n; c++) {
      if (puzzle.givens[r][c] !== null && gr === -1) {
        gr = r;
        gc = c;
      }
      if (puzzle.givens[r][c] === null && nonGr === -1) {
        nonGr = r;
        nonGc = c;
      }
    }
  }
  // 중복 없이 두 값을 swap (givens와 비-givens 교환)
  const grid = puzzle.solution.map(r => r.slice());
  const temp = grid[gr][gc];
  grid[gr][gc] = grid[nonGr][nonGc];
  grid[nonGr][nonGc] = temp;

  const res = validateMagic(puzzle, grid);
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'GIVEN_CHANGED');
});
