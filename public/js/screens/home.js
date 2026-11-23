// 홈 화면 (#/)
import { getNickname, setNickname } from '../state.js';
import { NICKNAME_REGEX } from '../core/constants.js';

export function render(container) {
  const currentNick = getNickname();

  container.innerHTML = `
    <div class="container">
      <section class="hero">
        <div class="hero__badge-row">
          <span class="badge">NEW</span>
          <span>혼자 하는 보드게임</span>
        </div>
        <h1 class="hero__title">혼자서도<br>꽉 찬 퍼즐 한 판</h1>
        <p class="hero__desc">닉네임만 정하면 바로 시작해요. 울타리와 마방진을 풀고 전체 랭킹에 도전해 보세요.</p>
        <form class="hero__form" id="nickname-form" novalidate>
          <label class="field-label" for="nickname-input">닉네임</label>
          <div class="hero__input-row">
            <input
              type="text"
              id="nickname-input"
              class="input"
              placeholder="2~12자, 한글·영문·숫자·_"
              value="${currentNick}"
              maxlength="12"
              autocomplete="off"
            />
            <button type="submit" class="btn btn-green" id="start-btn">시작하기</button>
          </div>
          <div id="nickname-error" class="field-error" style="display: none;"></div>
        </form>
      </section>
    </div>

    <div class="marquee" aria-hidden="true">
      <div class="marquee__inner">
        <span>퍼즐 · 집중 · 기록 · 랭킹 · 혼자서도 꽉 차게 · 퍼즐 · 집중 · 기록 · 랭킹 · 혼자서도 꽉 차게 ·&nbsp;</span>
        <span>퍼즐 · 집중 · 기록 · 랭킹 · 혼자서도 꽉 차게 · 퍼즐 · 집중 · 기록 · 랭킹 · 혼자서도 꽉 차게 ·&nbsp;</span>
      </div>
    </div>

    <div class="container">
      <div class="step-cards">
        <div class="step-card">
          <div class="step-card__num">1</div>
          <h3 class="step-card__title">닉네임 정하기</h3>
          <p class="step-card__desc">가입 없이 이름만 정하면 끝</p>
        </div>
        <div class="step-card">
          <div class="step-card__num">2</div>
          <h3 class="step-card__title">게임 고르기</h3>
          <p class="step-card__desc">울타리, 마방진 중 골라서 바로 시작</p>
        </div>
        <div class="step-card">
          <div class="step-card__num">3</div>
          <h3 class="step-card__title">랭킹 도전</h3>
          <p class="step-card__desc">빨리 풀수록 높은 순위</p>
        </div>
      </div>

      <div class="cta-band">
        <h2>지금 1등은 누구일까요?</h2>
        <a href="#/ranking" class="btn btn-white">랭킹 보기</a>
      </div>
    </div>
  `;

  const form = container.querySelector('#nickname-form');
  const input = container.querySelector('#nickname-input');
  const errorEl = container.querySelector('#nickname-error');
  const submitBtn = container.querySelector('#start-btn');

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.style.display = 'block';
    input.classList.add('is-error');
  }

  function clearError() {
    errorEl.textContent = '';
    errorEl.style.display = 'none';
    input.classList.remove('is-error');
  }

  input.addEventListener('input', clearError);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const val = input.value.trim();

    if (!val) {
      showError('닉네임을 입력해 주세요.');
      input.focus();
      return;
    }

    if (!NICKNAME_REGEX.test(val)) {
      showError('2~12자의 한글, 영문, 숫자, _ 만 쓸 수 있어요.');
      input.focus();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = '확인 중…';

    try {
      // API moderation 검사 연동 (없으면 기본 패스)
      const res = await fetch('/api/nickname', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: val })
      }).catch(() => ({ ok: true, json: () => ({ ok: true }) }));

      const data = await res.json().catch(() => ({ ok: true }));

      if (data && data.ok === false) {
        showError('다른 닉네임을 써 주세요.');
        submitBtn.disabled = false;
        submitBtn.textContent = '시작하기';
        input.focus();
        return;
      }
    } catch {
      // 네트워크 등 에러 시 기본 허용
    }

    setNickname(val);
    const redirect = sessionStorage.getItem('honbo.redirect') || '#/select';
    sessionStorage.removeItem('honbo.redirect');
    window.location.hash = redirect;
  });
}

export function destroy() {
  // 정리할 타이머 없음
}
