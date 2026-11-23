// 라우터 모듈 (해시 # 주소 기반)
import { getNickname } from './state.js';
import * as HomeScreen from './screens/home.js';
import * as SelectScreen from './screens/select.js';
import * as PlayScreen from './screens/play.js';
import * as RankingScreen from './screens/ranking.js';

const app = document.getElementById('app');
const nav = document.getElementById('nav');
const footer = document.getElementById('footer');

let currentScreen = null;

const ROUTES = {
  '#/': { screen: HomeScreen, auth: false },
  '#/select': { screen: SelectScreen, auth: true },
  '#/play': { screen: PlayScreen, auth: true },
  '#/ranking': { screen: RankingScreen, auth: false }
};

export function initRouter() {
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}

function handleRoute() {
  const hash = window.location.hash || '#/';
  const [path, queryString] = hash.split('?');
  const params = new URLSearchParams(queryString || '');

  const route = ROUTES[path] || ROUTES['#/'];

  // 닉네임 필요 화면 검사
  const nickname = getNickname();
  if (route.auth && !nickname) {
    sessionStorage.setItem('honbo.redirect', hash);
    window.location.hash = '#/';
    return;
  }

  // 이전 화면 정리
  if (currentScreen && typeof currentScreen.destroy === 'function') {
    currentScreen.destroy();
  }

  // 네비게이션 렌더링
  renderNav(nickname, path);

  // 푸터 렌더링 (플레이 화면에서는 숨김)
  if (path === '#/play') {
    footer.style.display = 'none';
  } else {
    footer.style.display = 'block';
    renderFooter();
  }

  // 화면 마운트
  app.innerHTML = '';
  currentScreen = route.screen;
  currentScreen.render(app, params);

  // 접근성: 포커스 및 스크롤 초기화
  app.focus();
  window.scrollTo(0, 0);
}

function renderNav(nickname, currentPath) {
  nav.innerHTML = `
    <div class="container nav-bar__inner">
      <a href="#/" class="nav-logo">퍼즐랜드</a>
      <div class="nav-links">
        <a href="#/select" style="${currentPath === '#/select' ? 'color: var(--color-primary);' : ''}">게임 선택</a>
        <a href="#/ranking" style="${currentPath === '#/ranking' ? 'color: var(--color-primary);' : ''}">랭킹</a>
        ${nickname ? `
          <a href="#/" class="badge" style="background-color: var(--color-surface); cursor: pointer;" title="닉네임 변경">
            ${nickname}
          </a>
        ` : `
          <a href="#/" style="font-size: var(--fs-small); color: var(--color-ink-soft);">닉네임 정하기</a>
        `}
      </div>
    </div>
  `;
}

function renderFooter() {
  footer.innerHTML = `
    <div class="container">
      <div class="footer__links">
        <div>
          <a href="#/select">게임 선택</a> · <a href="#/ranking">랭킹</a>
        </div>
        <div>© 2026 퍼즐랜드 PuzzleLand</div>
      </div>
      <div class="footer__huge" aria-hidden="true">PUZZLELAND</div>
    </div>
  `;
}
