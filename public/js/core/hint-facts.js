// 힌트 내용 계산 모듈
// 1. 울타리 힌트
export function getFenceHintFact(puzzle, lines) {
  const { rows: R, cols: C, clues, solution } = puzzle;
  const h = lines?.h || [];
  const v = lines?.v || [];

  const normH = Array.from({ length: R + 1 }, (_, r) =>
    Array.from({ length: C }, (_, c) => (h[r]?.[c] === 1 ? 1 : 0))
  );
  const normV = Array.from({ length: R }, (_, r) =>
    Array.from({ length: C + 1 }, (_, c) => (v[r]?.[c] === 1 ? 1 : 0))
  );

  // 1. BRANCH: 선 3개 이상인 점 (점 번호 오름차순 첫 번째)
  for (let r = 0; r <= R; r++) {
    for (let c = 0; c <= C; c++) {
      let degree = 0;
      if (c > 0 && normH[r][c - 1] === 1) degree++;
      if (c < C && normH[r][c] === 1) degree++;
      if (r > 0 && normV[r - 1][c] === 1) degree++;
      if (r < R && normV[r][c] === 1) degree++;
      if (degree >= 3) {
        return {
          kind: 'BRANCH',
          target: { type: 'vertex', r, c },
          fallbackText: `위에서 ${r + 1}번째, 왼쪽에서 ${c + 1}번째 점에 선이 3개 이상 모였어요. 울타리는 갈라지면 안 돼요.`
        };
      }
    }
  }

  // 2. CLUE_OVER: 선이 숫자보다 많은 칸 (칸 번호 순)
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      const clue = clues[r][c];
      if (clue !== null && clue !== undefined) {
        const edgeCount = normH[r][c] + normH[r + 1][c] + normV[r][c] + normV[r][c + 1];
        if (edgeCount > clue) {
          return {
            kind: 'CLUE_OVER',
            target: { type: 'cell', r, c },
            fallbackText: `위에서 ${r + 1}번째 줄, 왼쪽에서 ${c + 1}번째 칸은 숫자 ${clue}보다 선이 많아요.`
          };
        }
      }
    }
  }

  // 3. WRONG_EDGE: 그었지만 참고 해답에 없는 변 (h 먼저 행 순서, 그다음 v)
  for (let r = 0; r <= R; r++) {
    for (let c = 0; c < C; c++) {
      if (normH[r][c] === 1 && solution.h[r][c] !== 1) {
        return {
          kind: 'WRONG_EDGE',
          target: { type: 'edge', dir: 'h', r, c },
          fallbackText: '반짝이는 선은 필요 없을 수도 있어요.'
        };
      }
    }
  }
  for (let r = 0; r < R; r++) {
    for (let c = 0; c <= C; c++) {
      if (normV[r][c] === 1 && solution.v[r][c] !== 1) {
        return {
          kind: 'WRONG_EDGE',
          target: { type: 'edge', dir: 'v', r, c },
          fallbackText: '반짝이는 선은 필요 없을 수도 있어요.'
        };
      }
    }
  }

  // 4. MISSING_EDGE: 참고 해답에 있지만 안 그은 변 (같은 순서)
  for (let r = 0; r <= R; r++) {
    for (let c = 0; c < C; c++) {
      if (solution.h[r][c] === 1 && normH[r][c] !== 1) {
        return {
          kind: 'MISSING_EDGE',
          target: { type: 'edge', dir: 'h', r, c },
          fallbackText: '반짝이는 자리에 선이 필요해요.'
        };
      }
    }
  }
  for (let r = 0; r < R; r++) {
    for (let c = 0; c <= C; c++) {
      if (solution.v[r][c] === 1 && normV[r][c] !== 1) {
        return {
          kind: 'MISSING_EDGE',
          target: { type: 'edge', dir: 'v', r, c },
          fallbackText: '반짝이는 자리에 선이 필요해요.'
        };
      }
    }
  }

  // 5. NONE
  return {
    kind: 'NONE',
    target: null,
    fallbackText: '거의 다 왔어요! 숫자 조건을 하나씩 다시 확인해 보세요.'
  };
}

// 2. 마방진 힌트
export function getMagicHintFact(puzzle, grid) {
  const { n, magicSum, givens, solution } = puzzle;

  // 1. DUPLICATE: 중복 숫자가 있는 칸 중 givens가 아닌 첫 칸
  const valToCells = new Map();
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const val = grid?.[r]?.[c];
      if (val && val > 0) {
        if (!valToCells.has(val)) valToCells.set(val, []);
        valToCells.get(val).push({ r, c });
      }
    }
  }

  for (const [val, cells] of valToCells.entries()) {
    if (cells.length > 1) {
      for (const cell of cells) {
        if (givens[cell.r][cell.c] === null) {
          return {
            kind: 'DUPLICATE',
            target: { type: 'cell', r: cell.r, c: cell.c },
            fallbackText: `숫자 ${val}을(를) 두 번 썼어요. 반짝이는 칸을 바꿔 보세요.`
          };
        }
      }
    }
  }

  // 2. WRONG_SUM: 꽉 찼는데 합이 틀린 줄 (가로→세로→대각 순)
  for (let r = 0; r < n; r++) {
    let sum = 0;
    let full = true;
    for (let c = 0; c < n; c++) {
      const v = grid?.[r]?.[c] || 0;
      sum += v;
      if (v === 0) full = false;
    }
    if (full && sum !== magicSum) {
      return {
        kind: 'WRONG_SUM',
        target: { type: 'line', line: 'row', index: r },
        fallbackText: `반짝이는 줄의 합이 ${sum}이에요. 목표 합은 ${magicSum}이에요.`
      };
    }
  }

  for (let c = 0; c < n; c++) {
    let sum = 0;
    let full = true;
    for (let r = 0; r < n; r++) {
      const v = grid?.[r]?.[c] || 0;
      sum += v;
      if (v === 0) full = false;
    }
    if (full && sum !== magicSum) {
      return {
        kind: 'WRONG_SUM',
        target: { type: 'line', line: 'col', index: c },
        fallbackText: `반짝이는 줄의 합이 ${sum}이에요. 목표 합은 ${magicSum}이에요.`
      };
    }
  }

  let d1Sum = 0;
  let d1Full = true;
  let d2Sum = 0;
  let d2Full = true;
  for (let i = 0; i < n; i++) {
    const v1 = grid?.[i]?.[i] || 0;
    d1Sum += v1;
    if (v1 === 0) d1Full = false;

    const v2 = grid?.[i]?.[n - 1 - i] || 0;
    d2Sum += v2;
    if (v2 === 0) d2Full = false;
  }

  if (d1Full && d1Sum !== magicSum) {
    return {
      kind: 'WRONG_SUM',
      target: { type: 'line', line: 'diag', index: 0 },
      fallbackText: `반짝이는 줄의 합이 ${d1Sum}이에요. 목표 합은 ${magicSum}이에요.`
    };
  }
  if (d2Full && d2Sum !== magicSum) {
    return {
      kind: 'WRONG_SUM',
      target: { type: 'line', line: 'diag', index: 1 },
      fallbackText: `반짝이는 줄의 합이 ${d2Sum}이에요. 목표 합은 ${magicSum}이에요.`
    };
  }

  // 3. WRONG_CELL: 입력한 값이 참고 해답과 다른 첫 칸
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const v = grid?.[r]?.[c] || 0;
      if (v !== 0 && v !== solution[r][c]) {
        return {
          kind: 'WRONG_CELL',
          target: { type: 'cell', r, c },
          fallbackText: `위에서 ${r + 1}번째 줄, 왼쪽에서 ${c + 1}번째 칸 숫자를 다시 생각해 보세요.`
        };
      }
    }
  }

  // 4. REVEAL: 첫 빈칸
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const v = grid?.[r]?.[c] || 0;
      if (v === 0) {
        return {
          kind: 'REVEAL',
          target: { type: 'cell', r, c },
          fallbackText: `위에서 ${r + 1}번째 줄, 왼쪽에서 ${c + 1}번째 칸에는 ${solution[r][c]}이(가) 들어가요.`
        };
      }
    }
  }

  // 5. NONE
  return {
    kind: 'NONE',
    target: null,
    fallbackText: '거의 다 왔어요! 합계를 하나씩 다시 확인해 보세요.'
  };
}
