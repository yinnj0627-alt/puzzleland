// 마방진 판 Grid 뷰 렌더러
export function createMagicView({ puzzle, onChange }) {
  const { n, magicSum, givens } = puzzle;
  const container = document.createElement('div');
  container.className = 'board-container';

  // 상태: n x n grid (빈칸=0, givens는 초기값)
  const grid = givens.map(row => row.map(v => (v !== null ? v : 0)));
  let selectedCoord = null; // { r, c }

  const wrapper = document.createElement('div');
  wrapper.className = 'magic-grid-wrapper';

  const gridEl = document.createElement('div');
  gridEl.className = 'magic-grid';
  gridEl.style.gridTemplateColumns = `repeat(${n}, 1fr)`;

  const cellButtons = [];
  for (let r = 0; r < n; r++) {
    cellButtons[r] = [];
    for (let c = 0; c < n; c++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'magic-cell';
      btn.dataset.r = r;
      btn.dataset.c = c;

      const isGiven = givens[r][c] !== null;
      if (isGiven) {
        btn.classList.add('given');
        btn.setAttribute('aria-disabled', 'true');
        btn.textContent = givens[r][c];
      } else {
        btn.addEventListener('click', () => selectCell(r, c));
      }

      gridEl.appendChild(btn);
      cellButtons[r][c] = btn;
    }
  }

  // 숫자 키패드 (1 ~ n^2 + 지우기)
  const keypad = document.createElement('div');
  keypad.className = 'magic-keypad';
  const totalNumbers = n * n;

  for (let i = 1; i <= totalNumbers; i++) {
    const numBtn = document.createElement('button');
    numBtn.type = 'button';
    numBtn.className = 'btn btn-ghost';
    numBtn.textContent = i;
    numBtn.addEventListener('click', () => setNumber(i));
    keypad.appendChild(numBtn);
  }

  const eraseBtn = document.createElement('button');
  eraseBtn.type = 'button';
  eraseBtn.className = 'btn btn-ghost';
  eraseBtn.textContent = '지우기';
  eraseBtn.addEventListener('click', () => setNumber(0));
  keypad.appendChild(eraseBtn);

  wrapper.appendChild(gridEl);
  wrapper.appendChild(keypad);
  container.appendChild(wrapper);

  function selectCell(r, c) {
    if (givens[r][c] !== null) return;
    selectedCoord = { r, c };
    updateView();
  }

  function setNumber(val) {
    if (!selectedCoord) return;
    const { r, c } = selectedCoord;
    if (givens[r][c] !== null) return;
    grid[r][c] = val;
    updateView();
  }

  // 키보드 이벤트
  function handleKeyDown(e) {
    if (!selectedCoord) return;
    const num = parseInt(e.key, 10);
    if (!isNaN(num) && num >= 1 && num <= totalNumbers) {
      setNumber(num);
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      setNumber(0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveSelect(-1, 0);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveSelect(1, 0);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      moveSelect(0, -1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      moveSelect(0, 1);
    }
  }

  function moveSelect(dr, dc) {
    if (!selectedCoord) return;
    let nr = (selectedCoord.r + dr + n) % n;
    let nc = (selectedCoord.c + dc + n) % n;
    // givens 건너뛰기
    let attempts = 0;
    while (givens[nr][nc] !== null && attempts < n * n) {
      nr = (nr + dr + n) % n;
      nc = (nc + dc + n) % n;
      attempts++;
    }
    if (givens[nr][nc] === null) {
      selectCell(nr, nc);
    }
  }

  window.addEventListener('keydown', handleKeyDown);

  function updateView() {
    // 1. 중복 숫자 검출
    const valCounts = new Map();
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const v = grid[r][c];
        if (v > 0) {
          valCounts.set(v, (valCounts.get(v) || 0) + 1);
        }
      }
    }

    // 2. 셀 UI 갱신
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const btn = cellButtons[r][c];
        const isGiven = givens[r][c] !== null;
        const val = grid[r][c];

        btn.classList.toggle('selected', selectedCoord?.r === r && selectedCoord?.c === c);

        if (!isGiven) {
          btn.textContent = val > 0 ? val : '';
          const isDup = val > 0 && valCounts.get(val) > 1;
          btn.classList.toggle('duplicate', isDup);
        }
      }
    }

    if (onChange) {
      onChange({ grid });
    }
  }

  updateView();

  return {
    element: container,
    getState: () => ({ grid }),
    reset: () => {
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          grid[r][c] = givens[r][c] !== null ? givens[r][c] : 0;
        }
      }
      selectedCoord = null;
      updateView();
    },
    destroy: () => {
      window.removeEventListener('keydown', handleKeyDown);
    },
    highlightHint: (target) => {
      if (!target) return;
      if (target.type === 'cell') {
        const btn = cellButtons[target.r]?.[target.c];
        if (btn) {
          btn.style.outline = '3px solid #ec48bd';
          setTimeout(() => (btn.style.outline = ''), 3000);
        }
      }
    }
  };
}
