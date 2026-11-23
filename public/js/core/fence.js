// 울타리(Fence) 생성·판정 모듈
import { FENCE_CONFIG } from './constants.js';
import { createRng, randInt, shuffle } from './rng.js';

// 땅 검증 함수 (구멍 없음 & 대각선 맞닿음 없음)
function isValidRegion(inside, R, C) {
  const N = R * C;
  let outsideCount = 0;
  const visited = new Uint8Array(N);
  const queue = [];

  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      const idx = r * C + c;
      if (!inside[idx]) {
        outsideCount++;
        if (r === 0 || r === R - 1 || c === 0 || c === C - 1) {
          visited[idx] = 1;
          queue.push(idx);
        }
      }
    }
  }

  // 바깥 칸이 아예 없으면 false
  if (outsideCount === 0) return false;

  let reachedOutside = 0;
  let head = 0;
  while (head < queue.length) {
    const curr = queue[head++];
    reachedOutside++;
    const r = Math.floor(curr / C);
    const c = curr % C;

    const neighbors = [
      [r - 1, c],
      [r + 1, c],
      [r, c - 1],
      [r, c + 1]
    ];

    for (const [nr, nc] of neighbors) {
      if (nr >= 0 && nr < R && nc >= 0 && nc < C) {
        const nidx = nr * C + nc;
        if (!inside[nidx] && !visited[nidx]) {
          visited[nidx] = 1;
          queue.push(nidx);
        }
      }
    }
  }

  // 구멍 없음 검사: 가장자리에서 출발해 모든 바깥 칸에 도달해야 함
  if (reachedOutside !== outsideCount) return false;

  // 대각선 맞닿음 없음 검사: 안쪽 점 (1..R-1, 1..C-1)
  for (let r = 1; r < R; r++) {
    for (let c = 1; c < C; c++) {
      const a = inside[(r - 1) * C + (c - 1)];
      const b = inside[(r - 1) * C + c];
      const d = inside[r * C + (c - 1)];
      const e = inside[r * C + c];
      if (a === e && b === d && a !== b) {
        return false;
      }
    }
  }

  return true;
}

// 울타리 퍼즐 생성
export function generateFence(code, difficulty) {
  const rng = createRng(code);
  const size = FENCE_CONFIG.size[difficulty];
  const R = size;
  const C = size;
  const N = R * C;

  const inside = new Uint8Array(N);

  // ① startIndex
  const startIndex = randInt(rng, N);
  inside[startIndex] = 1;

  // ② target
  const regionMin = FENCE_CONFIG.regionMin;
  const regionRange = FENCE_CONFIG.regionRange;
  const target = Math.round(N * (regionMin + rng() * regionRange));

  // ③ 땅 키우기 반복
  let count = 1;
  while (count < target) {
    const frontier = [];
    for (let idx = 0; idx < N; idx++) {
      if (!inside[idx]) {
        const r = Math.floor(idx / C);
        const c = idx % C;
        const hasInsideNeighbor =
          (r > 0 && inside[(r - 1) * C + c]) ||
          (r < R - 1 && inside[(r + 1) * C + c]) ||
          (c > 0 && inside[r * C + (c - 1)]) ||
          (c < C - 1 && inside[r * C + (c + 1)]);
        if (hasInsideNeighbor) {
          frontier.push(idx);
        }
      }
    }

    let added = false;
    while (frontier.length > 0) {
      const k = randInt(rng, frontier.length);
      const cell = frontier[k];
      inside[cell] = 1;
      if (isValidRegion(inside, R, C)) {
        added = true;
        count++;
        break;
      } else {
        inside[cell] = 0;
        frontier.splice(k, 1);
      }
    }

    if (!added) break;
  }

  // ④ solution 계산
  const isInside = (r, c) => (r >= 0 && r < R && c >= 0 && c < C ? inside[r * C + c] === 1 : false);

  const h = [];
  for (let r = 0; r <= R; r++) {
    const row = [];
    for (let c = 0; c < C; c++) {
      row.push(isInside(r - 1, c) !== isInside(r, c) ? 1 : 0);
    }
    h.push(row);
  }

  const v = [];
  for (let r = 0; r < R; r++) {
    const row = [];
    for (let c = 0; c <= C; c++) {
      row.push(isInside(r, c - 1) !== isInside(r, c) ? 1 : 0);
    }
    v.push(row);
  }

  // ⑤ clues 계산
  const fullClues = [];
  for (let r = 0; r < R; r++) {
    const row = [];
    for (let c = 0; c < C; c++) {
      const edges = h[r][c] + h[r + 1][c] + v[r][c] + v[r][c + 1];
      row.push(edges);
    }
    fullClues.push(row);
  }

  // ⑥ order 및 visibleCount
  const order = shuffle(rng, Array.from({ length: N }, (_, i) => i));
  const visibleCount = Math.round(N * FENCE_CONFIG.revealRatio[difficulty]);
  const visibleSet = new Set(order.slice(0, visibleCount));

  const clues = [];
  for (let r = 0; r < R; r++) {
    const row = [];
    for (let c = 0; c < C; c++) {
      const idx = r * C + c;
      row.push(visibleSet.has(idx) ? fullClues[r][c] : null);
    }
    clues.push(row);
  }

  return {
    game: 'FN',
    difficulty,
    code,
    rows: R,
    cols: C,
    clues,
    solution: { h, v }
  };
}

// 울타리 판정
export function validateFence(puzzle, lines) {
  const { rows: R, cols: C, clues } = puzzle;
  if (!lines || !Array.isArray(lines.h) || !Array.isArray(lines.v)) {
    return { ok: false, reason: 'SHAPE' };
  }

  const { h, v } = lines;

  if (h.length !== R + 1 || v.length !== R) {
    return { ok: false, reason: 'SHAPE' };
  }
  for (let r = 0; r <= R; r++) {
    if (!Array.isArray(h[r]) || h[r].length !== C) return { ok: false, reason: 'SHAPE' };
    for (let c = 0; c < C; c++) {
      const val = h[r][c] === 2 ? 0 : h[r][c];
      if (val !== 0 && val !== 1) return { ok: false, reason: 'SHAPE' };
    }
  }
  for (let r = 0; r < R; r++) {
    if (!Array.isArray(v[r]) || v[r].length !== C + 1) return { ok: false, reason: 'SHAPE' };
    for (let c = 0; c <= C; c++) {
      const val = v[r][c] === 2 ? 0 : v[r][c];
      if (val !== 0 && val !== 1) return { ok: false, reason: 'SHAPE' };
    }
  }

  const normH = h.map(row => row.map(cell => (cell === 2 ? 0 : cell)));
  const normV = v.map(row => row.map(cell => (cell === 2 ? 0 : cell)));

  let totalEdges = 0;
  for (let r = 0; r <= R; r++) {
    for (let c = 0; c < C; c++) {
      if (normH[r][c] === 1) totalEdges++;
    }
  }
  for (let r = 0; r < R; r++) {
    for (let c = 0; c <= C; c++) {
      if (normV[r][c] === 1) totalEdges++;
    }
  }
  if (totalEdges === 0) return { ok: false, reason: 'EMPTY' };

  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      const clue = clues[r][c];
      if (clue !== null && clue !== undefined) {
        const edgeCount = normH[r][c] + normH[r + 1][c] + normV[r][c] + normV[r][c + 1];
        if (edgeCount !== clue) {
          return { ok: false, reason: 'CLUE' };
        }
      }
    }
  }

  const vertexEdges = Array.from({ length: R + 1 }, () => Array(C + 1).fill(0));
  for (let r = 0; r <= R; r++) {
    for (let c = 0; c < C; c++) {
      if (normH[r][c] === 1) {
        vertexEdges[r][c]++;
        vertexEdges[r][c + 1]++;
      }
    }
  }
  for (let r = 0; r < R; r++) {
    for (let c = 0; c <= C; c++) {
      if (normV[r][c] === 1) {
        vertexEdges[r][c]++;
        vertexEdges[r + 1][c]++;
      }
    }
  }

  for (let r = 0; r <= R; r++) {
    for (let c = 0; c <= C; c++) {
      const d = vertexEdges[r][c];
      if (d !== 0 && d !== 2) {
        return { ok: false, reason: 'BRANCH' };
      }
    }
  }

  let startEdge = null;
  for (let r = 0; r <= R; r++) {
    for (let c = 0; c < C; c++) {
      if (normH[r][c] === 1) {
        startEdge = { type: 'h', r, c };
        break;
      }
    }
    if (startEdge) break;
  }
  if (!startEdge) {
    for (let r = 0; r < R; r++) {
      for (let c = 0; c <= C; c++) {
        if (normV[r][c] === 1) {
          startEdge = { type: 'v', r, c };
          break;
        }
      }
      if (startEdge) break;
    }
  }

  const visitedH = Array.from({ length: R + 1 }, () => Array(C).fill(false));
  const visitedV = Array.from({ length: R }, () => Array(C + 1).fill(false));

  const edgeQueue = [startEdge];
  if (startEdge.type === 'h') visitedH[startEdge.r][startEdge.c] = true;
  else visitedV[startEdge.r][startEdge.c] = true;

  let visitedEdgesCount = 0;

  while (edgeQueue.length > 0) {
    const e = edgeQueue.pop();
    visitedEdgesCount++;

    const endpoints = [];
    if (e.type === 'h') {
      endpoints.push([e.r, e.c], [e.r, e.c + 1]);
    } else {
      endpoints.push([e.r, e.c], [e.r + 1, e.c]);
    }

    for (const [vr, vc] of endpoints) {
      if (vc > 0 && normH[vr][vc - 1] === 1 && !visitedH[vr][vc - 1]) {
        visitedH[vr][vc - 1] = true;
        edgeQueue.push({ type: 'h', r: vr, c: vc - 1 });
      }
      if (vc < C && normH[vr][vc] === 1 && !visitedH[vr][vc]) {
        visitedH[vr][vc] = true;
        edgeQueue.push({ type: 'h', r: vr, c: vc });
      }
      if (vr > 0 && normV[vr - 1][vc] === 1 && !visitedV[vr - 1][vc]) {
        visitedV[vr - 1][vc] = true;
        edgeQueue.push({ type: 'v', r: vr - 1, c: vc });
      }
      if (vr < R && normV[vr][vc] === 1 && !visitedV[vr][vc]) {
        visitedV[vr][vc] = true;
        edgeQueue.push({ type: 'v', r: vr, c: vc });
      }
    }
  }

  if (visitedEdgesCount !== totalEdges) {
    return { ok: false, reason: 'DISCONNECTED' };
  }

  return { ok: true };
}

// 화면용 상태 계산
export function fenceStatus(puzzle, lines) {
  const { rows: R, cols: C, clues } = puzzle;
  const h = lines?.h || [];
  const v = lines?.v || [];

  const normH = Array.from({ length: R + 1 }, (_, r) =>
    Array.from({ length: C }, (_, c) => (h[r]?.[c] === 1 ? 1 : 0))
  );
  const normV = Array.from({ length: R }, (_, r) =>
    Array.from({ length: C + 1 }, (_, c) => (v[r]?.[c] === 1 ? 1 : 0))
  );

  let lineCount = 0;
  for (let r = 0; r <= R; r++) {
    for (let c = 0; c < C; c++) {
      if (normH[r][c] === 1) lineCount++;
    }
  }
  for (let r = 0; r < R; r++) {
    for (let c = 0; c <= C; c++) {
      if (normV[r][c] === 1) lineCount++;
    }
  }

  const clueState = [];
  for (let r = 0; r < R; r++) {
    const row = [];
    for (let c = 0; c < C; c++) {
      const clue = clues[r][c];
      if (clue === null || clue === undefined) {
        row.push('none');
      } else {
        const edgeCount = normH[r][c] + normH[r + 1][c] + normV[r][c] + normV[r][c + 1];
        if (edgeCount < clue) row.push('under');
        else if (edgeCount === clue) row.push('ok');
        else row.push('over');
      }
    }
    clueState.push(row);
  }

  const branchVertices = [];
  for (let r = 0; r <= R; r++) {
    for (let c = 0; c <= C; c++) {
      let degree = 0;
      if (c > 0 && normH[r][c - 1] === 1) degree++;
      if (c < C && normH[r][c] === 1) degree++;
      if (r > 0 && normV[r - 1][c] === 1) degree++;
      if (r < R && normV[r][c] === 1) degree++;
      if (degree >= 3) {
        branchVertices.push({ r, c });
      }
    }
  }

  return {
    lineCount,
    clueState,
    branchVertices
  };
}
