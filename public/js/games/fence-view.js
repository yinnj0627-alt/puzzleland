// 울타리 판 SVG 뷰 렌더러
export function createFenceView({ puzzle, onChange, onClear }) {
  const { rows: R, cols: C, clues } = puzzle;
  const container = document.createElement('div');
  container.className = 'board-container';

  // 상태: h (R+1) x C, v R x (C+1) (0=빈칸, 1=선, 2=✕)
  const state = {
    h: Array.from({ length: R + 1 }, () => Array(C).fill(0)),
    v: Array.from({ length: R }, () => Array(C + 1).fill(0))
  };

  const viewBoxWidth = C * 100 + 40;
  const viewBoxHeight = R * 100 + 40;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`);
  svg.setAttribute('class', 'fence-svg');

  // 우클릭 기본 메뉴 방지
  svg.addEventListener('contextmenu', e => e.preventDefault());

  // 1. 단서 숫자 렌더링
  const cluesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  cluesGroup.setAttribute('class', 'clues-group');

  const clueTexts = [];
  for (let r = 0; r < R; r++) {
    clueTexts[r] = [];
    for (let c = 0; c < C; c++) {
      const clue = clues[r][c];
      if (clue !== null && clue !== undefined) {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', 20 + c * 100 + 50);
        text.setAttribute('y', 20 + r * 100 + 50 + 16); // 중앙 정렬 보정
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('font-size', '48');
        text.setAttribute('font-weight', '700');
        text.setAttribute('fill', '#ffffff');
        text.textContent = clue;
        cluesGroup.appendChild(text);
        clueTexts[r][c] = text;
      }
    }
  }
  svg.appendChild(cluesGroup);

  // 2. 가로/세로 선 및 ✕ 그룹
  const edgesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  const hElements = [];
  for (let r = 0; r <= R; r++) {
    hElements[r] = [];
    for (let c = 0; c < C; c++) {
      const x1 = 20 + c * 100;
      const y1 = 20 + r * 100;
      const x2 = x1 + 100;
      const y2 = y1;

      // 선
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x1);
      line.setAttribute('y1', y1);
      line.setAttribute('x2', x2);
      line.setAttribute('y2', y2);
      line.setAttribute('stroke', '#ffffff');
      line.setAttribute('stroke-width', '10');
      line.setAttribute('stroke-linecap', 'round');
      line.setAttribute('style', 'display: none;');

      // ✕ 표시
      const cross = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      cross.setAttribute('style', 'display: none;');
      const mx = (x1 + x2) / 2;
      const my = y1;
      const cx1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      cx1.setAttribute('x1', mx - 6); cx1.setAttribute('y1', my - 6);
      cx1.setAttribute('x2', mx + 6); cx1.setAttribute('y2', my + 6);
      cx1.setAttribute('stroke', 'rgba(255,255,255,0.36)'); cx1.setAttribute('stroke-width', '4');
      const cx2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      cx2.setAttribute('x1', mx + 6); cx2.setAttribute('y1', my - 6);
      cx2.setAttribute('x2', mx - 6); cx2.setAttribute('y2', my + 6);
      cx2.setAttribute('stroke', 'rgba(255,255,255,0.36)'); cx2.setAttribute('stroke-width', '4');
      cross.appendChild(cx1); cross.appendChild(cx2);

      edgesGroup.appendChild(line);
      edgesGroup.appendChild(cross);
      hElements[r][c] = { line, cross };
    }
  }

  const vElements = [];
  for (let r = 0; r < R; r++) {
    vElements[r] = [];
    for (let c = 0; c <= C; c++) {
      const x1 = 20 + c * 100;
      const y1 = 20 + r * 100;
      const x2 = x1;
      const y2 = y1 + 100;

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x1);
      line.setAttribute('y1', y1);
      line.setAttribute('x2', x2);
      line.setAttribute('y2', y2);
      line.setAttribute('stroke', '#ffffff');
      line.setAttribute('stroke-width', '10');
      line.setAttribute('stroke-linecap', 'round');
      line.setAttribute('style', 'display: none;');

      const cross = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      cross.setAttribute('style', 'display: none;');
      const mx = x1;
      const my = (y1 + y2) / 2;
      const cx1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      cx1.setAttribute('x1', mx - 6); cx1.setAttribute('y1', my - 6);
      cx1.setAttribute('x2', mx + 6); cx1.setAttribute('y2', my + 6);
      cx1.setAttribute('stroke', 'rgba(255,255,255,0.36)'); cx1.setAttribute('stroke-width', '4');
      const cx2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      cx2.setAttribute('x1', mx + 6); cx2.setAttribute('y1', my - 6);
      cx2.setAttribute('x2', mx - 6); cx2.setAttribute('y2', my + 6);
      cx2.setAttribute('stroke', 'rgba(255,255,255,0.36)'); cx2.setAttribute('stroke-width', '4');
      cross.appendChild(cx1); cross.appendChild(cx2);

      edgesGroup.appendChild(line);
      edgesGroup.appendChild(cross);
      vElements[r][c] = { line, cross };
    }
  }
  svg.appendChild(edgesGroup);

  // 3. 점 (꼭짓점) 렌더링
  const verticesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  const vertexCircles = [];
  for (let r = 0; r <= R; r++) {
    vertexCircles[r] = [];
    for (let c = 0; c <= C; c++) {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', 20 + c * 100);
      circle.setAttribute('cy', 20 + r * 100);
      circle.setAttribute('r', '6');
      circle.setAttribute('fill', 'rgba(255,255,255,0.64)');
      verticesGroup.appendChild(circle);
      vertexCircles[r][c] = circle;
    }
  }
  svg.appendChild(verticesGroup);

  // 4. 클릭 감지용 투명 사각형 히트박스
  const hitboxesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  for (let r = 0; r <= R; r++) {
    for (let c = 0; c < C; c++) {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', 20 + c * 100);
      rect.setAttribute('y', 20 + r * 100 - 25);
      rect.setAttribute('width', '100');
      rect.setAttribute('height', '50');
      rect.setAttribute('fill', 'transparent');
      rect.setAttribute('style', 'cursor: pointer;');

      rect.addEventListener('click', () => toggleEdge('h', r, c));
      rect.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        rightClickEdge('h', r, c);
      });
      hitboxesGroup.appendChild(rect);
    }
  }

  for (let r = 0; r < R; r++) {
    for (let c = 0; c <= C; c++) {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', 20 + c * 100 - 25);
      rect.setAttribute('y', 20 + r * 100);
      rect.setAttribute('width', '50');
      rect.setAttribute('height', '100');
      rect.setAttribute('fill', 'transparent');
      rect.setAttribute('style', 'cursor: pointer;');

      rect.addEventListener('click', () => toggleEdge('v', r, c));
      rect.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        rightClickEdge('v', r, c);
      });
      hitboxesGroup.appendChild(rect);
    }
  }
  svg.appendChild(hitboxesGroup);

  function toggleEdge(type, r, c) {
    const current = type === 'h' ? state.h[r][c] : state.v[r][c];
    const next = (current + 1) % 3; // 0 → 1 → 2 → 0
    if (type === 'h') state.h[r][c] = next;
    else state.v[r][c] = next;
    updateView();
  }

  function rightClickEdge(type, r, c) {
    const current = type === 'h' ? state.h[r][c] : state.v[r][c];
    let next;
    if (current === 0 || current === 1) next = 2; // 0/1 → 2
    else next = 0; // 2 → 0
    if (type === 'h') state.h[r][c] = next;
    else state.v[r][c] = next;
    updateView();
  }

  function updateView() {
    // 1. 선 및 ✕ 표시 갱신
    for (let r = 0; r <= R; r++) {
      for (let c = 0; c < C; c++) {
        const val = state.h[r][c];
        hElements[r][c].line.style.display = val === 1 ? 'inline' : 'none';
        hElements[r][c].cross.style.display = val === 2 ? 'inline' : 'none';
      }
    }
    for (let r = 0; r < R; r++) {
      for (let c = 0; c <= C; c++) {
        const val = state.v[r][c];
        vElements[r][c].line.style.display = val === 1 ? 'inline' : 'none';
        vElements[r][c].cross.style.display = val === 2 ? 'inline' : 'none';
      }
    }

    // 2. 단서 색상 상태 반영
    for (let r = 0; r < R; r++) {
      for (let c = 0; c < C; c++) {
        const el = clueTexts[r]?.[c];
        if (el) {
          const clue = clues[r][c];
          const edgeCount =
            (state.h[r][c] === 1 ? 1 : 0) +
            (state.h[r + 1][c] === 1 ? 1 : 0) +
            (state.v[r][c] === 1 ? 1 : 0) +
            (state.v[r][c + 1] === 1 ? 1 : 0);

          if (edgeCount === clue) {
            el.setAttribute('fill', 'rgba(255,255,255,0.36)'); // 충족: 흐리게
          } else if (edgeCount > clue) {
            el.setAttribute('fill', '#ec48bd'); // 넘침: 마젠타
          } else {
            el.setAttribute('fill', '#ffffff'); // 기본: 흰색
          }
        }
      }
    }

    // 3. 점 차수(선 3개 이상 점 마젠타 강조)
    for (let r = 0; r <= R; r++) {
      for (let c = 0; c <= C; c++) {
        let degree = 0;
        if (c > 0 && state.h[r][c - 1] === 1) degree++;
        if (c < C && state.h[r][c] === 1) degree++;
        if (r > 0 && state.v[r - 1][c] === 1) degree++;
        if (r < R && state.v[r][c] === 1) degree++;

        const circle = vertexCircles[r][c];
        if (degree >= 3) {
          circle.setAttribute('fill', '#ec48bd');
          circle.setAttribute('r', '9');
        } else {
          circle.setAttribute('fill', 'rgba(255,255,255,0.64)');
          circle.setAttribute('r', '6');
        }
      }
    }

    if (onChange) {
      onChange(state);
    }
  }

  container.appendChild(svg);

  return {
    element: container,
    getState: () => state,
    reset: () => {
      for (let r = 0; r <= R; r++) state.h[r].fill(0);
      for (let r = 0; r < R; r++) state.v[r].fill(0);
      updateView();
    },
    highlightHint: (target) => {
      if (!target) return;
      if (target.type === 'edge') {
        const el = target.dir === 'h' ? hElements[target.r]?.[target.c] : vElements[target.r]?.[target.c];
        if (el) {
          el.line.setAttribute('stroke', '#ec48bd');
          el.line.style.display = 'inline';
          setTimeout(() => updateView(), 3000);
        }
      } else if (target.type === 'vertex') {
        const circle = vertexCircles[target.r]?.[target.c];
        if (circle) {
          circle.setAttribute('fill', '#ec48bd');
          circle.setAttribute('r', '12');
          setTimeout(() => updateView(), 3000);
        }
      }
    }
  };
}
