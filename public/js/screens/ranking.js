// 랭킹 화면 (#/ranking)
import { getNickname } from '../state.js';
import { DIFFICULTIES } from '../core/constants.js';
import { formatStopwatch } from '../features/game-clock.js';

export function render(container, params) {
  const defaultGame = params.get('game') || 'FN';
  const defaultDiff = params.get('difficulty') || 'E';
  const myNickname = getNickname();

  let currentGame = defaultGame;
  let currentDiff = defaultDiff;

  container.innerHTML = `
    <div class="container ranking-screen">
      <div>
        <h1 style="font-size: var(--fs-display-md); margin-bottom: 8px;">전체 랭킹</h1>
        <p style="color: var(--color-ink-soft);">가장 빨리 푼 기록 순서예요. 닉네임마다 최고 기록만 보여요.</p>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <!-- 게임 칩 -->
          <div class="chip-group" id="rank-game-chips" role="radiogroup">
            <span class="field-label" style="margin-right: 8px;">게임</span>
            <button type="button" class="chip ${currentGame === 'FN' ? 'active' : ''}" data-game="FN">울타리</button>
            <button type="button" class="chip ${currentGame === 'MS' ? 'active' : ''}" data-game="MS">마방진</button>
          </div>
          <!-- 난이도 칩 -->
          <div class="chip-group" id="rank-diff-chips" role="radiogroup">
            <span class="field-label" style="margin-right: 8px;">난이도</span>
            <button type="button" class="chip ${currentDiff === 'E' ? 'active' : ''}" data-diff="E">쉬움</button>
            <button type="button" class="chip ${currentDiff === 'N' ? 'active' : ''}" data-diff="N">보통</button>
            <button type="button" class="chip ${currentDiff === 'H' ? 'active' : ''}" data-diff="H">어려움</button>
          </div>
        </div>

        <button type="button" class="btn btn-ghost-sm" id="refresh-rank-btn">↻ 새로고침</button>
      </div>

      <div id="ranking-content" style="min-height: 200px;">
        <!-- 랭킹 리스트 마운트 -->
      </div>
    </div>
  `;

  const contentEl = container.querySelector('#ranking-content');

  async function loadLeaderboard() {
    contentEl.innerHTML = `
      <div style="color: var(--color-ink-soft); padding: 40px 0; text-align: center;">
        기록을 불러오고 있어요…
      </div>
    `;

    try {
      const res = await fetch(`/api/leaderboard?game=${currentGame}&difficulty=${currentDiff}`).catch(() => null);
      const json = res ? await res.json().catch(() => null) : null;
      const list = json?.data?.leaderboard || [];

      if (list.length === 0) {
        contentEl.innerHTML = `
          <div style="text-align: center; padding: 60px 0; display: flex; flex-direction: column; align-items: center; gap: 16px;">
            <p style="color: var(--color-ink-soft);">아직 기록이 없어요. 첫 번째 주인공이 되어 보세요!</p>
            <a href="#/select" class="btn btn-primary">이 게임 하러 가기</a>
          </div>
        `;
        return;
      }

      // 랭킹 렌더링
      const top3 = list.slice(0, 3);
      const rest = list.slice(3);

      contentEl.innerHTML = `
        <div class="ranking-top3">
          ${top3[1] ? renderTopCard(top3[1], 2, '🥈') : '<div></div>'}
          ${top3[0] ? renderTopCard(top3[0], 1, '🥇') : '<div></div>'}
          ${top3[2] ? renderTopCard(top3[2], 3, '🥉') : '<div></div>'}
        </div>

        <div class="rank-rows">
          <div class="rank-row" style="background: transparent; color: var(--color-ink-soft); font-size: var(--fs-small);">
            <span>순위</span>
            <span>닉네임</span>
            <span>기록</span>
            <span>힌트</span>
            <span class="rank-row__date">날짜</span>
          </div>
          ${list.map((item, idx) => {
            const isMe = myNickname && item.nickname === myNickname;
            return `
              <div class="rank-row ${isMe ? 'is-me' : ''}">
                <span style="font-weight: 700;">${idx + 1}</span>
                <span>${item.nickname} ${isMe ? '(나)' : ''}</span>
                <span style="font-variant-numeric: tabular-nums; font-weight: 700;">${formatStopwatch(item.record_ms)}</span>
                <span>${item.hint_count > 0 ? `💡${item.hint_count}` : '–'}</span>
                <span class="rank-row__date" style="color: var(--color-ink-soft); font-size: var(--fs-small);">${item.date || '–'}</span>
              </div>
            `;
          }).join('')}
        </div>
      `;
    } catch {
      contentEl.innerHTML = `
        <div style="text-align: center; padding: 40px 0;">
          <p style="color: var(--color-magenta); margin-bottom: 12px;">랭킹을 불러오지 못했어요.</p>
          <button type="button" class="btn btn-ghost" id="retry-btn">다시 시도</button>
        </div>
      `;
      container.querySelector('#retry-btn')?.addEventListener('click', loadLeaderboard);
    }
  }

  function renderTopCard(item, rank, medal) {
    const isMe = myNickname && item.nickname === myNickname;
    return `
      <div class="rank-feature ${rank === 1 ? 'first' : ''}">
        <span style="font-size: 24px;">${medal} ${rank}위</span>
        <span style="font-size: var(--fs-heading-sm); font-weight: 700;">${item.nickname} ${isMe ? '(나)' : ''}</span>
        <span style="font-size: var(--fs-display-md); font-weight: 700; font-variant-numeric: tabular-nums;">
          ${formatStopwatch(item.record_ms)}
        </span>
        ${item.hint_count > 0 ? `<span class="badge" style="align-self: center;">💡 ${item.hint_count}</span>` : ''}
      </div>
    `;
  }

  // 게임 칩 이벤트
  container.querySelectorAll('#rank-game-chips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      container.querySelectorAll('#rank-game-chips .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentGame = chip.dataset.game;
      history.replaceState(null, '', `#/ranking?game=${currentGame}&difficulty=${currentDiff}`);
      loadLeaderboard();
    });
  });

  // 난이도 칩 이벤트
  container.querySelectorAll('#rank-diff-chips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      container.querySelectorAll('#rank-diff-chips .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentDiff = chip.dataset.diff;
      history.replaceState(null, '', `#/ranking?game=${currentGame}&difficulty=${currentDiff}`);
      loadLeaderboard();
    });
  });

  // 새로고침
  container.querySelector('#refresh-rank-btn').addEventListener('click', loadLeaderboard);

  loadLeaderboard();
}

export function destroy() {}
