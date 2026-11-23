// fence.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { generateFence, validateFence } from '../public/js/core/fence.js';
import { FENCE_CONFIG } from '../public/js/core/constants.js';

test('같은 코드 2번 생성 시 완전히 동일한 퍼즐 생성', () => {
  const p1 = generateFence('FN-E-7K3QX9', 'E');
  const p2 = generateFence('FN-E-7K3QX9', 'E');
  assert.equal(JSON.stringify(p1), JSON.stringify(p2));
});

test('난이도별 크기 확인 (E: 5, N: 7, H: 10)', () => {
  const pE = generateFence('FN-E-AAAAAA', 'E');
  assert.equal(pE.rows, 5);
  assert.equal(pE.cols, 5);

  const pN = generateFence('FN-N-BBBBBB', 'N');
  assert.equal(pN.rows, 7);
  assert.equal(pN.cols, 7);

  const pH = generateFence('FN-H-CCCCCC', 'H');
  assert.equal(pH.rows, 10);
  assert.equal(pH.cols, 10);
});

test('난이도별 생성 후 자기 solution을 validateFence에 넣으면 항상 통과', () => {
  for (const diff of ['E', 'N', 'H']) {
    for (let i = 0; i < 20; i++) {
      const code = `FN-${diff}-00000${i}`;
      const puzzle = generateFence(code, diff);
      const res = validateFence(puzzle, puzzle.solution);
      assert.equal(res.ok, true, `Failed on ${code}: ${res.reason}`);
    }
  }
});

test('숫자 공개 비율 검증', () => {
  for (const diff of ['E', 'N', 'H']) {
    const puzzle = generateFence(`FN-${diff}-TEST12`, diff);
    const total = puzzle.rows * puzzle.cols;
    let visible = 0;
    for (let r = 0; r < puzzle.rows; r++) {
      for (let c = 0; c < puzzle.cols; c++) {
        if (puzzle.clues[r][c] !== null) visible++;
      }
    }
    const expected = Math.round(total * FENCE_CONFIG.revealRatio[diff]);
    assert.equal(visible, expected);
  }
});

test('선 하나 지우면 검증 실패', () => {
  const puzzle = generateFence('FN-E-7K3QX9', 'E');
  const brokenSolution = {
    h: puzzle.solution.h.map(row => row.slice()),
    v: puzzle.solution.v.map(row => row.slice())
  };
  // 첫 번째로 발견되는 선 지우기
  let removed = false;
  for (let r = 0; r < brokenSolution.h.length; r++) {
    for (let c = 0; c < brokenSolution.h[r].length; c++) {
      if (brokenSolution.h[r][c] === 1) {
        brokenSolution.h[r][c] = 0;
        removed = true;
        break;
      }
    }
    if (removed) break;
  }
  assert.ok(removed);
  const res = validateFence(puzzle, brokenSolution);
  assert.equal(res.ok, false);
});

test('빈 답안(선 없음)은 EMPTY 실패', () => {
  const puzzle = generateFence('FN-E-7K3QX9', 'E');
  const empty = {
    h: Array.from({ length: 6 }, () => Array(5).fill(0)),
    v: Array.from({ length: 5 }, () => Array(6).fill(0))
  };
  const res = validateFence(puzzle, empty);
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'EMPTY');
});

test('독립된 고리 2개는 DISCONNECTED 실패', () => {
  const puzzle = generateFence('FN-E-7K3QX9', 'E');
  const twoLoops = {
    h: Array.from({ length: 6 }, () => Array(5).fill(0)),
    v: Array.from({ length: 5 }, () => Array(6).fill(0))
  };
  // 고리 1: (0,0) 칸 둘레
  twoLoops.h[0][0] = 1;
  twoLoops.h[1][0] = 1;
  twoLoops.v[0][0] = 1;
  twoLoops.v[0][1] = 1;

  // 고리 2: (3,3) 칸 둘레
  twoLoops.h[3][3] = 1;
  twoLoops.h[4][3] = 1;
  twoLoops.v[3][3] = 1;
  twoLoops.v[3][4] = 1;

  const res = validateFence(puzzle, twoLoops);
  assert.equal(res.ok, false);
  // CLUE 검사를 건너뛸 수 있도록 임시로 빈 clue 퍼즐에 적용
  const puzzleNoClues = { ...puzzle, clues: Array.from({ length: 5 }, () => Array(5).fill(null)) };
  const res2 = validateFence(puzzleNoClues, twoLoops);
  assert.equal(res2.ok, false);
  assert.equal(res2.reason, 'DISCONNECTED');
});
