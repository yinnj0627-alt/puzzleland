// 게임 플레이 화면 (#/play)
import { parseCode } from '../core/code.js';
import { createPuzzle, validateAnswer } from '../core/games.js';
import { DIFFICULTIES, HINT_LIMIT, HINT_PENALTY_MS } from '../core/constants.js';
import { copyToClipboard } from '../ui/clipboard.js';
import { showToast } from '../ui/toast.js';
import { openConfirm, openModal } from '../ui/modal.js';
import { GameClock, formatStopwatch, formatTimer } from '../features/game-clock.js';
import { createFenceView } from '../games/fence-view.js';
import { createMagicView } from '../games/magic-view.js';
import { getFenceHintFact, getMagicHintFact } from '../core/hint-facts.js';

let activeClock = null;
let activeGameView = null;

export function render(container, params) {
  const code = params.get('code');
  const timerSec = parseInt(params.get('timer') || '0', 10);

  const parsed = parseCode(code);
  if (!parsed.ok) {
    window.location.hash = '#/select';
    return;
  }

  const puzzle = createPuzzle(parsed.code);
  if (!puzzle) {
    window.location.hash = '#/select';
    return;
  }

  const gameName = parsed.game === 'FN' ? '울타리' : '마방진';
  const diffName = DIFFICULTIES[parsed.difficulty];

  let hintCount = 0;
  let cleared = false;

  container.innerHTML = `
    <div class="container" style="padding-top: 16px;">
      <!-- 상단 HUD -->
      <div class="play-hud">
        <div class="play-hud__left">
          <span style="font-size: var(--fs-heading-sm); font-weight: var(--fw-bold);">${gameName} · ${diffName}</span>
          <span class="chip" style="min-height: 32px; padding: 4px 12px; font-size: var(--fs-small);">${parsed.code}</span>
          <button type="button" class="btn btn-ghost-sm" id="copy-code-btn">코드 복사</button>
        </div>
        <div class="play-hud__right">
          <span id="stopwatch-display" aria-label="경과 시간">⏱ 00:00.0</span>
          ${timerSec > 0 ? `<span id="timer-display" class="play-hud__timer" aria-label="남은 시간">⏳ ${formatTimer(timerSec * 1000)}</span>` : ''}
        </div>
      </div>

      <!-- 보드 영역 -->
      <div class="band-black play-board-area">
        <div id="game-view-mount" style="width: 100%; display: flex; justify-content: center;"></div>
        <div id="board-status-line" style="color: var(--color-ink-soft); font-size: var(--fs-small);">
          ${parsed.game === 'FN' ? '선 0개' : `목표 합 ${puzzle.magicSum}`}
        </div>
      </div>

      <!-- 액션 버튼들 -->
      <div class="play-actions">
        <button type="button" class="btn btn-ghost" id="reset-btn">처음부터</button>
        <button type="button" class="btn btn-ghost" id="new-game-btn">새 게임</button>
        <button type="button" class="btn btn-ghost" id="hint-btn">💡 힌트 3</button>
      </div>

      <!-- 게임 방법 아코디언 -->
      <details class="accordion" style="margin: 24px 0;">
        <summary>게임 방법</summary>
        <div class="accordion-body">
          ${parsed.game === 'FN' ? `
            <p>점과 점 사이를 눌러 선을 그어요. 한 번 더 누르면 ✕(선 없음 표시), 한 번 더 누르면 지워져요.</p>
            <p>숫자는 그 칸을 둘러싼 선의 개수예요.</p>
            <p>모든 선이 끊기거나 갈라지지 않는 하나의 고리가 되면 성공!</p>
          ` : `
            <p>빈칸을 고르고 숫자를 넣어요.</p>
            <p>1부터 마지막 숫자까지 한 번씩만 쓸 수 있어요.</p>
            <p>가로, 세로, 두 대각선의 합이 모두 목표 합과 같으면 성공!</p>
          `}
        </div>
      </details>
    </div>
  `;

  // HUD 요소 캐싱
  const stopwatchEl = container.querySelector('#stopwatch-display');
  const timerEl = container.querySelector('#timer-display');
  const statusLineEl = container.querySelector('#board-status-line');
  const hintBtn = container.querySelector('#hint-btn');

  // 코드 복사 버튼
  container.querySelector('#copy-code-btn').addEventListener('click', () => {
    copyToClipboard(parsed.code);
  });

  // 게임 시계 초기화
  activeClock = new GameClock({
    timerSec,
    onTick: ({ elapsedMs, remainingMs }) => {
      stopwatchEl.textContent = `⏱ ${formatStopwatch(elapsedMs)}`;
      if (timerEl && remainingMs !== null) {
        timerEl.textContent = `⏳ ${formatTimer(remainingMs)}`;
        if (remainingMs <= 10000) {
          timerEl.classList.add('warning');
        } else {
          timerEl.classList.remove('warning');
        }
      }
    },
    onExpire: () => {
      onTimeExpired();
    }
  });

  // 게임 뷰 생성
  const mount = container.querySelector('#game-view-mount');
  if (parsed.game === 'FN') {
    activeGameView = createFenceView({
      puzzle,
      onChange: (state) => {
        if (cleared) return;
        let lineCount = 0;
        for (const row of state.h) for (const c of row) if (c === 1) lineCount++;
        for (const row of state.v) for (const c of row) if (c === 1) lineCount++;
        statusLineEl.textContent = `선 ${lineCount}개`;

        // 정답 검증
        const res = validateAnswer(puzzle, state);
        if (res.ok) {
          onGameCleared();
        }
      }
    });
  } else {
    activeGameView = createMagicView({
      puzzle,
      onChange: (state) => {
        if (cleared) return;
        const res = validateAnswer(puzzle, state);
        if (res.ok) {
          onGameCleared();
        }
      }
    });
  }

  mount.appendChild(activeGameView.element);
  activeClock.start();

  // 처음부터 버튼
  container.querySelector('#reset-btn').addEventListener('click', async () => {
    const ok = await openConfirm({
      title: '처음부터 다시 할까요?',
      message: '지금까지 입력한 내용과 시간이 모두 지워져요.',
      confirmText: '처음부터',
      cancelText: '계속하기'
    });
    if (ok) {
      activeClock.reset();
      activeGameView.reset();
      hintCount = 0;
      updateHintBtn();
      activeClock.start();
    }
  });

  // 새 게임 버튼
  container.querySelector('#new-game-btn').addEventListener('click', async () => {
    const ok = await openConfirm({
      title: '새 퍼즐로 바꿀까요?',
      message: '지금 퍼즐은 사라지고 새로운 퍼즐이 나와요.',
      confirmText: '새 게임',
      cancelText: '계속하기'
    });
    if (ok) {
      window.location.hash = '#/select';
    }
  });

  // 힌트 버튼
  function updateHintBtn() {
    const left = HINT_LIMIT - hintCount;
    hintBtn.textContent = `💡 힌트 ${left}`;
    hintBtn.disabled = left <= 0;
  }

  hintBtn.addEventListener('click', () => {
    if (hintCount >= HINT_LIMIT) {
      showToast('이번 판 힌트를 모두 썼어요.', { type: 'info' });
      return;
    }

    const state = activeGameView.getState();
    const fact = parsed.game === 'FN'
      ? getFenceHintFact(puzzle, state)
      : getMagicHintFact(puzzle, state.grid);

    hintCount++;
    updateHintBtn();

    if (fact.target) {
      activeGameView.highlightHint(fact.target);
    }
    showToast(fact.fallbackText, { type: 'info' });
  });

  // 시간 초과 처리
  function onTimeExpired() {
    openModal({
      title: '⏳ 시간 초과',
      bodyEl: (() => {
        const p = document.createElement('p');
        p.className = 'modal-message';
        p.textContent = '제한 시간 안에 풀지 못했어요. 같은 퍼즐로 다시 도전해 볼까요?';
        return p;
      })(),
      actions: [
        {
          text: '처음부터',
          className: 'btn-primary',
          onClick: (close) => {
            close();
            activeClock.reset();
            activeGameView.reset();
            activeClock.start();
          }
        },
        {
          text: '새 게임',
          className: 'btn-ghost',
          onClick: (close) => {
            close();
            window.location.hash = '#/select';
          }
        },
        {
          text: '게임 선택으로',
          className: 'btn-ghost',
          onClick: (close) => {
            close();
            window.location.hash = '#/select';
          }
        }
      ],
      dismissible: false
    });
  }

  // 클리어 처리
  function onGameCleared() {
    cleared = true;
    activeClock.stop();

    const rawMs = activeClock.getElapsedMs();
    const finalMs = rawMs + hintCount * HINT_PENALTY_MS;

    setTimeout(() => {
      openClearModal({ rawMs, finalMs, hintCount, code: parsed.code });
    }, 600);
  }

  function openClearModal({ rawMs, finalMs, hintCount, code }) {
    const body = document.createElement('div');
    body.innerHTML = `
      <div class="stat-card" style="margin-bottom: 20px;">
        <div style="font-size: var(--fs-display-md); font-weight: 700; font-variant-numeric: tabular-nums;">
          ${formatStopwatch(finalMs)}
        </div>
        ${hintCount > 0 ? `
          <div style="font-size: var(--fs-small); color: var(--color-ink-soft); margin-top: 4px;">
            순수 시간 ${formatStopwatch(rawMs)} + 힌트 ${hintCount}회 30초
          </div>
        ` : ''}
      </div>
      <p style="color: var(--color-ink-soft); margin-bottom: 16px;">
        이 퍼즐을 멋지게 풀었어요! 랭킹에 도전해 보세요.
      </p>
    `;

    openModal({
      title: '🎉 클리어!',
      bodyEl: body,
      actions: [
        {
          text: '코드 복사',
          className: 'btn-ghost-sm',
          onClick: () => copyToClipboard(code)
        },
        {
          text: '새 게임',
          className: 'btn-ghost',
          onClick: (close) => {
            close();
            window.location.hash = '#/select';
          }
        },
        {
          text: '랭킹 보기',
          className: 'btn-primary',
          onClick: (close) => {
            close();
            window.location.hash = `#/ranking?game=${parsed.game}&difficulty=${parsed.difficulty}`;
          }
        }
      ],
      dismissible: false
    });
  }
}

export function destroy() {
  if (activeClock) {
    activeClock.stop();
    activeClock = null;
  }
  if (activeGameView && activeGameView.destroy) {
    activeGameView.destroy();
    activeGameView = null;
  }
}
