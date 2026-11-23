// 마방진(Magic Square) 생성·판정 모듈
import { MAGIC_CONFIG } from './constants.js';
import { createRng, randInt, shuffle } from './rng.js';

// 기본 마방진 만들기
export function createBaseMagic(n) {
  const grid = Array.from({ length: n }, () => Array(n).fill(0));

  if (n % 2 === 1) {
    // 홀수 n (3, 5): 시암 방법
    let r = 0;
    let c = Math.floor(n / 2);
    for (let k = 1; k <= n * n; k++) {
      grid[r][c] = k;
      let nr = (r - 1 + n) % n;
      let nc = (c + 1) % n;
      if (grid[nr][nc] !== 0) {
        nr = (r + 1) % n;
        nc = c;
      }
      r = nr;
      c = nc;
    }
  } else if (n === 4) {
    // n = 4: 이중 짝수 방법
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const v = r * n + c + 1;
        if (r % 4 === c % 4 || (r % 4) + (c % 4) === 3) {
          grid[r][c] = n * n + 1 - v;
        } else {
          grid[r][c] = v;
        }
      }
    }
  }

  return grid;
}

// 회전 함수 (시계방향 90도)
function rotate90(grid) {
  const n = grid.length;
  const rotated = Array.from({ length: n }, () => Array(n).fill(0));
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      rotated[c][n - 1 - r] = grid[r][c];
    }
  }
  return rotated;
}

// 좌우 뒤집기 함수
function flipH(grid) {
  const n = grid.length;
  const flipped = Array.from({ length: n }, () => Array(n).fill(0));
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      flipped[r][n - 1 - c] = grid[r][c];
    }
  }
  return flipped;
}

// 마방진 퍼즐 생성
export function generateMagic(code, difficulty) {
  const rng = createRng(code);
  const n = MAGIC_CONFIG.size[difficulty];
  const magicSum = (n * (n * n + 1)) / 2;

  let grid = createBaseMagic(n);

  // ① 회전 및 뒤집기
  const k = randInt(rng, 8);
  const rotations = k % 4;
  for (let i = 0; i < rotations; i++) {
    grid = rotate90(grid);
  }
  if (k >= 4) {
    grid = flipH(grid);
  }

  // ② 보수 변환 (50% 확률)
  if (rng() < 0.5) {
    const total = n * n + 1;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        grid[r][c] = total - grid[r][c];
      }
    }
  }

  const solution = grid.map(row => row.slice());

  // ③ givens 선택
  const order = shuffle(rng, Array.from({ length: n * n }, (_, i) => i));
  const givenCount = MAGIC_CONFIG.givens[difficulty];
  const givenSet = new Set(order.slice(0, givenCount));

  const givens = [];
  for (let r = 0; r < n; r++) {
    const row = [];
    for (let c = 0; c < n; c++) {
      const idx = r * n + c;
      row.push(givenSet.has(idx) ? solution[r][c] : null);
    }
    givens.push(row);
  }

  return {
    game: 'MS',
    difficulty,
    code,
    n,
    magicSum,
    givens,
    solution
  };
}

// 마방진 판정
export function validateMagic(puzzle, grid) {
  const { n, magicSum, givens } = puzzle;
  if (!grid || !Array.isArray(grid) || grid.length !== n) {
    return { ok: false, reason: 'SHAPE' };
  }

  for (let r = 0; r < n; r++) {
    if (!Array.isArray(grid[r]) || grid[r].length !== n) {
      return { ok: false, reason: 'SHAPE' };
    }
    for (let c = 0; c < n; c++) {
      if (typeof grid[r][c] !== 'number' || !Number.isInteger(grid[r][c])) {
        return { ok: false, reason: 'SHAPE' };
      }
    }
  }

  // 2. 0(빈칸) 검사
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (grid[r][c] === 0) {
        return { ok: false, reason: 'INCOMPLETE' };
      }
    }
  }

  // 3. 범위 1 ~ n^2 검사
  const maxVal = n * n;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const val = grid[r][c];
      if (val < 1 || val > maxVal) {
        return { ok: false, reason: 'RANGE' };
      }
    }
  }

  // 4. 중복 검사
  const seen = new Set();
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const val = grid[r][c];
      if (seen.has(val)) {
        return { ok: false, reason: 'DUPLICATE' };
      }
      seen.add(val);
    }
  }

  // 5. givens 일치 검사
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (givens[r][c] !== null && grid[r][c] !== givens[r][c]) {
        return { ok: false, reason: 'GIVEN_CHANGED' };
      }
    }
  }

  // 6. 합계 검사 (가로, 세로, 대각선 2줄)
  for (let r = 0; r < n; r++) {
    let rowSum = 0;
    for (let c = 0; c < n; c++) rowSum += grid[r][c];
    if (rowSum !== magicSum) return { ok: false, reason: 'SUM' };
  }

  for (let c = 0; c < n; c++) {
    let colSum = 0;
    for (let r = 0; r < n; r++) colSum += grid[r][c];
    if (colSum !== magicSum) return { ok: false, reason: 'SUM' };
  }

  let diag1 = 0;
  let diag2 = 0;
  for (let i = 0; i < n; i++) {
    diag1 += grid[i][i];
    diag2 += grid[i][n - 1 - i];
  }
  if (diag1 !== magicSum || diag2 !== magicSum) {
    return { ok: false, reason: 'SUM' };
  }

  return { ok: true };
}

// 마방진 화면 상태
export function magicStatus(puzzle, grid) {
  const { n, magicSum } = puzzle;
  const rows = [];
  const cols = [];

  for (let r = 0; r < n; r++) {
    let sum = 0;
    let complete = true;
    for (let c = 0; c < n; c++) {
      const val = grid?.[r]?.[c] || 0;
      sum += val;
      if (val === 0) complete = false;
    }
    rows.push({ sum, complete, ok: complete && sum === magicSum });
  }

  for (let c = 0; c < n; c++) {
    let sum = 0;
    let complete = true;
    for (let r = 0; r < n; r++) {
      const val = grid?.[r]?.[c] || 0;
      sum += val;
      if (val === 0) complete = false;
    }
    cols.push({ sum, complete, ok: complete && sum === magicSum });
  }

  let d1Sum = 0;
  let d1Complete = true;
  let d2Sum = 0;
  let d2Complete = true;
  for (let i = 0; i < n; i++) {
    const v1 = grid?.[i]?.[i] || 0;
    d1Sum += v1;
    if (v1 === 0) d1Complete = false;

    const v2 = grid?.[i]?.[n - 1 - i] || 0;
    d2Sum += v2;
    if (v2 === 0) d2Complete = false;
  }

  const diags = [
    { sum: d1Sum, complete: d1Complete, ok: d1Complete && d1Sum === magicSum },
    { sum: d2Sum, complete: d2Complete, ok: d2Complete && d2Sum === magicSum }
  ];

  const counts = new Map();
  const usedNumbers = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const val = grid?.[r]?.[c];
      if (val && val > 0) {
        usedNumbers.push(val);
        if (!counts.has(val)) counts.set(val, []);
        counts.get(val).push(`${r},${c}`);
      }
    }
  }

  const duplicates = [];
  for (const [, cells] of counts.entries()) {
    if (cells.length > 1) {
      duplicates.push(...cells);
    }
  }

  return {
    rows,
    cols,
    diags,
    duplicates,
    usedNumbers
  };
}
