// 게임 선택 화면 (#/select)
import { getNickname, getLastSelect, setLastSelect } from '../state.js';
import { createRandomCode, parseCode } from '../core/code.js';

export function render(container) {
  const nickname = getNickname();
  const saved = getLastSelect() || { game: 'FN', difficulty: 'E', timer: 0 };

  let selectedGame = saved.game || 'FN';
  let selectedDiff = saved.difficulty || 'E';
  let selectedTimer = saved.timer !== undefined ? saved.timer : 0;

  container.innerHTML = `
    <div class="container select-screen">
      <div>
        <h1 style="font-size: var(--fs-display-md); margin-bottom: 8px;">게임을 골라 주세요</h1>
        <p style="color: var(--color-ink-soft);">${nickname} 님, 오늘은 어떤 퍼즐을 풀어 볼까요?</p>
      </div>

      <div class="game-cards">
        <!-- 울타리 카드 -->
        <div class="card-gradient game-select-card ${selectedGame === 'FN' ? 'selected' : ''}" data-game="FN">
          <div class="game-select-card__check">✓</div>
          <span class="badge" style="margin-bottom: 12px;">인기</span>
          <h2 style="font-size: var(--fs-heading-sm); margin-bottom: 8px;">울타리</h2>
          <p style="color: var(--color-ink-soft); margin-bottom: 16px;">점을 이어 하나의 울타리를 완성해요</p>
          <details class="accordion" onclick="event.stopPropagation()">
            <summary>게임 방법</summary>
            <div class="accordion-body">
              <p>점과 점 사이를 눌러 선을 그어요. 한 번 더 누르면 ✕(선 없음 표시), 한 번 더 누르면 지워져요.</p>
              <p>숫자는 그 칸을 둘러싼 선의 개수예요.</p>
              <p>모든 선이 끊기거나 갈라지지 않는 하나의 고리가 되면 성공!</p>
            </div>
          </details>
        </div>

        <!-- 마방진 카드 -->
        <div class="card game-select-card ${selectedGame === 'MS' ? 'selected' : ''}" data-game="MS">
          <div class="game-select-card__check">✓</div>
          <h2 style="font-size: var(--fs-heading-sm); margin-bottom: 8px; margin-top: 24px;">마방진</h2>
          <p style="color: var(--color-ink-soft); margin-bottom: 16px;">모든 줄의 합을 똑같이 맞춰요</p>
          <details class="accordion" onclick="event.stopPropagation()">
            <summary>게임 방법</summary>
            <div class="accordion-body">
              <p>빈칸을 고르고 숫자를 넣어요.</p>
              <p>1부터 마지막 숫자까지 한 번씩만 쓸 수 있어요.</p>
              <p>가로, 세로, 두 대각선의 합이 모두 목표 합과 같으면 성공!</p>
            </div>
          </details>
        </div>
      </div>

      <!-- 난이도 선택 -->
      <div class="input-group">
        <label class="field-label">난이도</label>
        <div class="chip-group" id="diff-chips" role="radiogroup">
          <button type="button" class="chip ${selectedDiff === 'E' ? 'active' : ''}" data-diff="E" role="radio" aria-checked="${selectedDiff === 'E'}">쉬움</button>
          <button type="button" class="chip ${selectedDiff === 'N' ? 'active' : ''}" data-diff="N" role="radio" aria-checked="${selectedDiff === 'N'}">보통</button>
          <button type="button" class="chip ${selectedDiff === 'H' ? 'active' : ''}" data-diff="H" role="radio" aria-checked="${selectedDiff === 'H'}">어려움</button>
          <span id="size-hint" style="font-size: var(--fs-small); color: var(--color-ink-soft); margin-left: 8px;"></span>
        </div>
      </div>

      <!-- 제한 시간 선택 -->
      <div class="input-group">
        <label class="field-label">제한 시간</label>
        <div class="chip-group" id="timer-chips" role="radiogroup">
          <button type="button" class="chip ${selectedTimer === 0 ? 'active' : ''}" data-timer="0" role="radio" aria-checked="${selectedTimer === 0}">없음</button>
          <button type="button" class="chip ${selectedTimer === 60 ? 'active' : ''}" data-timer="60" role="radio" aria-checked="${selectedTimer === 60}">1분</button>
          <button type="button" class="chip ${selectedTimer === 180 ? 'active' : ''}" data-timer="180" role="radio" aria-checked="${selectedTimer === 180}">3분</button>
          <button type="button" class="chip ${selectedTimer === 300 ? 'active' : ''}" data-timer="300" role="radio" aria-checked="${selectedTimer === 300}">5분</button>
          <button type="button" class="chip ${selectedTimer === 600 ? 'active' : ''}" data-timer="600" role="radio" aria-checked="${selectedTimer === 600}">10분</button>
        </div>
      </div>

      <div>
        <button type="button" class="btn btn-green" id="start-game-btn" style="width: 100%; max-width: 360px;">게임 시작</button>
      </div>

      <div class="select-divider">
        <span>또는</span>
      </div>

      <!-- 코드로 참여 -->
      <div class="input-group" style="max-width: 480px;">
        <label class="field-label" for="code-input">코드로 참여</label>
        <div style="display: flex; gap: 8px;">
          <input type="text" id="code-input" class="input" placeholder="예: FN-E-7K3QX9" style="flex: 1;" />
          <button type="button" class="btn btn-primary" id="join-code-btn">참여하기</button>
        </div>
        <div id="code-error" class="field-error" style="display: none;"></div>
      </div>
    </div>
  `;

  const sizeHintEl = container.querySelector('#size-hint');

  function updateSizeHint() {
    if (selectedGame === 'FN') {
      const map = { E: '5×5 판', N: '7×7 판', H: '10×10 판' };
      sizeHintEl.textContent = map[selectedDiff];
    } else {
      const map = { E: '3×3 판', N: '4×4 판', H: '5×5 판' };
      sizeHintEl.textContent = map[selectedDiff];
    }
  }
  updateSizeHint();

  // 게임 카드 선택
  container.querySelectorAll('.game-select-card').forEach(card => {
    card.addEventListener('click', () => {
      container.querySelectorAll('.game-select-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedGame = card.dataset.game;
      updateSizeHint();
      saveState();
    });
  });

  // 난이도 칩
  container.querySelectorAll('#diff-chips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      container.querySelectorAll('#diff-chips .chip').forEach(c => {
        c.classList.remove('active');
        c.setAttribute('aria-checked', 'false');
      });
      chip.classList.add('active');
      chip.setAttribute('aria-checked', 'true');
      selectedDiff = chip.dataset.diff;
      updateSizeHint();
      saveState();
    });
  });

  // 타이머 칩
  container.querySelectorAll('#timer-chips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      container.querySelectorAll('#timer-chips .chip').forEach(c => {
        c.classList.remove('active');
        c.setAttribute('aria-checked', 'false');
      });
      chip.classList.add('active');
      chip.setAttribute('aria-checked', 'true');
      selectedTimer = Number(chip.dataset.timer);
      saveState();
    });
  });

  function saveState() {
    setLastSelect({ game: selectedGame, difficulty: selectedDiff, timer: selectedTimer });
  }

  // 게임 시작 버튼
  container.querySelector('#start-game-btn').addEventListener('click', () => {
    const code = createRandomCode(selectedGame, selectedDiff);
    window.location.hash = `#/play?code=${code}&timer=${selectedTimer}`;
  });

  // 코드로 참여
  const codeInput = container.querySelector('#code-input');
  const codeError = container.querySelector('#code-error');

  function checkAndJoinCode() {
    const raw = codeInput.value;
    const parsed = parseCode(raw);
    if (!parsed.ok) {
      codeError.textContent = '코드 형식이 올바르지 않아요. 예: FN-E-7K3QX9';
      codeError.style.display = 'block';
      codeInput.classList.add('is-error');
      return;
    }
    codeError.style.display = 'none';
    codeInput.classList.remove('is-error');
    window.location.hash = `#/play?code=${parsed.code}&timer=${selectedTimer}`;
  }

  container.querySelector('#join-code-btn').addEventListener('click', checkAndJoinCode);
  codeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') checkAndJoinCode();
  });
  codeInput.addEventListener('input', () => {
    codeError.style.display = 'none';
    codeInput.classList.remove('is-error');
  });
}

export function destroy() {}
