# 02. UI 디자인 시스템

> 첨부된 디자인 분석 문서(Discord 스타일 분석)를 **이 프로젝트용으로 옮겨 적은** 디자인 규칙입니다.
> 에이전트는 원본 문서가 아니라 **이 문서의 값**을 씁니다.
> 분위기·색 구성·형태만 참고했습니다. **Discord 로고·이름·워드마크·마스코트·공식 일러스트는 쓰지 않습니다.**

---

## 1. 디자인 한 줄 요약

**깊은 인디고 밤하늘 배경** 위에 **보라(primary)·핑크(magenta)·초록(green)** 세 가지 포인트 색이 빛나는, 둥글고 통통 튀는 **오락실 감성**.
글씨는 크고 굵게, 모서리는 넉넉하게 둥글게, 그림자 대신 **색과 그라디언트**로 깊이를 만든다.

### 핵심 원칙 5가지
1. 배경은 항상 인디고(`--color-canvas`) + 천천히 움직이는 보라→핑크 그라디언트. 회색·순수 검정 배경 금지.
2. 행동 버튼은 기본 **보라(primary)**. **초록(green)은 화면당 딱 1개**, 가장 중요한 버튼에만.
3. 핑크(magenta)는 **강조 패널, 배지, 경고·오류 표시**에 쓴다.
4. 제목은 **NexonMaplestory Bold(700)**, 본문은 **Light(300)**. 중간 굵기는 없다.
5. 각진 모서리 금지. 버튼 12~16px, 카드 40px.

---

## 2. 글꼴

### 2-1. 웹폰트 선언 (`tokens.css` 맨 위에 그대로)
```css
@font-face {
    font-family: 'NexonMaplestory';
    src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_20-04@2.1/MaplestoryOTFLight.woff') format('woff');
    font-weight: 300;
    font-display: swap;
}

@font-face {
    font-family: 'NexonMaplestory';
    src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_20-04@2.1/MaplestoryOTFBold.woff') format('woff');
    font-weight: 700;
    font-display: swap;
}
```

### 2-2. 원본 글꼴 → 이 프로젝트 글꼴 대응
| 원본 분석 문서 | 이 프로젝트 | 굵기 |
|---|---|---|
| ABC Ginto Nord 700~800 (제목) | NexonMaplestory Bold | **700** (이 글꼴의 최대 굵기) |
| ABC Ginto 500 (버튼·링크) | NexonMaplestory Bold | **700** |
| ggsans 400 (본문) | NexonMaplestory Light | **300** |

> 글꼴 파일은 300, 700 두 개만 있습니다. `font-weight: 400/500/800`을 쓰면 브라우저가 가짜 굵기를 만들어 흐려지므로 **300과 700만 사용**합니다.

### 2-3. 글자 크기 단계 (타이포그래피 토큰)

한글은 영문보다 꽉 차 보여서 원본보다 조금 작게, 화면 폭에 따라 줄어들도록 `clamp()`를 씁니다.

| 토큰 | 크기 | 굵기 | 줄 간격 | 쓰는 곳 |
|---|---|---|---|---|
| `--fs-display-xl` | `clamp(40px, 7vw, 82px)` | 700 | 1.05 | 홈 히어로 제목 |
| `--fs-display-lg` | `clamp(32px, 5.5vw, 62px)` | 700 | 1.1 | 마키 띠 글자, 큰 제목 |
| `--fs-display-md` | `clamp(28px, 4.5vw, 56px)` | 700 | 1.1 | 화면 제목, 클리어 기록 숫자 |
| `--fs-heading-lg` | `clamp(24px, 3.5vw, 40px)` | 700 | 1.2 | 섹션 제목 |
| `--fs-heading-sm` | `22px` | 700 | 1.3 | 카드 제목, 단계 이름 |
| `--fs-body-lg` | `18px` | 300 | 1.6 | 안내 문단 |
| `--fs-button-lg` | `18px` | 700 | 1.4 | 큰 버튼 |
| `--fs-body` | `16px` | 300 | 1.6 | 기본 본문 |
| `--fs-button` | `16px` | 700 | 1.4 | 기본 버튼, 메뉴 링크 |
| `--fs-small` | `14px` | 700 | 1.4 | 배지, 표 머리, 작은 안내 |

- 영어 라벨(HONBO, NEW 등)은 `text-transform: uppercase; letter-spacing: 0.02em;`
- 시간·숫자 표시는 `font-variant-numeric: tabular-nums;` + 고정 폭 컨테이너(`min-width`)로 숫자가 바뀔 때 흔들리지 않게 합니다.

---

## 3. 색

### 3-1. 색 토큰

| 토큰 | 값 | 이름 | 쓰는 곳 |
|---|---|---|---|
| `--color-primary` | `#5865f2` | 인디고 바이올렛 | 기본 버튼, 선택된 탭, 마키 띠, 기록 카드, 선택된 칸 |
| `--color-on-primary` | `#ffffff` | | primary 위 글자 |
| `--color-green` | `#35ed7e` | 일렉트릭 그린 | **화면당 1개** 핵심 버튼(시작하기, 게임 시작) |
| `--color-magenta` | `#ec48bd` | 비비드 마젠타 | 강조 패널, 배지, 오류·규칙 위반 표시 |
| `--color-link` | `#00b0f4` | 시안 | 글자 링크 |
| `--color-canvas` | `#0a0d3a` | 인디고 캔버스 | 페이지 배경, 네비, 푸터 |
| `--color-surface` | `#1e2353` | 한 단계 밝은 인디고 | 카드, 입력창, 랭킹 줄, 보조 버튼 |
| `--color-surface-onyx` | `#23272a` | 오닉스 | 구분선, 게임판 바탕 |
| `--color-black` | `#000000` | 블랙 | 게임판 쇼케이스 띠 |
| `--color-ink` | `#ffffff` | | 기본 글자 |
| `--color-ink-dark` | `#000000` | | 초록·흰 버튼 위 글자 |
| `--color-ink-soft` | `rgba(255,255,255,0.64)` | | 보조 글자, 설명 |
| `--color-ink-faint` | `rgba(255,255,255,0.36)` | | 비활성, 충족된 숫자, X 표시 |
| `--color-hairline` | `rgba(255,255,255,0.12)` | | 얇은 테두리 |

### 3-2. 상태 색 규칙 (새 색을 추가하지 않는다)
원본 원칙: "네 번째 화려한 색을 추가하지 않는다." 그래서 상태 표시는 아래처럼 기존 색으로만 합니다.

| 상태 | 표현 |
|---|---|
| 오류 / 규칙 위반 | `--color-magenta` 글자 또는 2px 테두리 |
| 성공 / 충족 | 글자를 `--color-ink-faint`로 흐리게 (조건을 다 채웠으니 신경 안 써도 됨) |
| 맞은 합계 | `--color-primary` 배경 칩 |
| 선택됨 / 포커스 | `--color-primary` 3px 테두리 |
| 비활성 | `opacity: 0.4; cursor: not-allowed;` |

### 3-3. 배경 그라디언트 메시 (`.bg-mesh`)
```css
.bg-mesh {
  position: fixed; inset: 0; z-index: -1;
  background:
    radial-gradient(60% 50% at 15% 10%, rgba(88,101,242,0.55) 0%, transparent 60%),
    radial-gradient(50% 45% at 85% 20%, rgba(236,72,189,0.40) 0%, transparent 60%),
    radial-gradient(70% 60% at 50% 100%, rgba(98,60,200,0.45) 0%, transparent 65%),
    var(--color-canvas);
  background-size: 200% 200%;
  animation: mesh-drift 24s ease-in-out infinite alternate;
}
@keyframes mesh-drift {
  0%   { background-position: 0% 0%,   100% 0%,  50% 100%, 0 0; }
  100% { background-position: 30% 20%, 70% 30%, 40% 80%,  0 0; }
}
@media (prefers-reduced-motion: reduce) {
  .bg-mesh { animation: none; }
}
```

### 3-4. 강조 패널 그라디언트
```css
--gradient-magenta: linear-gradient(135deg, #ec48bd 0%, #a23cd8 55%, #5865f2 100%);
--gradient-primary: linear-gradient(135deg, #5865f2 0%, #7a4be6 100%);
```

---

## 4. 간격·모서리·그림자

### 4-1. 간격 (8px 기준)
| 토큰 | 값 | | 토큰 | 값 |
|---|---|---|---|---|
| `--space-xxs` | 4px | | `--space-lg` | 20px |
| `--space-xs` | 8px | | `--space-xl` | 24px |
| `--space-sm` | 12px | | `--space-xxl` | 32px |
| `--space-md` | 16px | | `--space-section` | 40px |
| | | | `--space-page` | `clamp(48px, 8vw, 96px)` (섹션 사이 세로 간격) |

### 4-2. 모서리
| 토큰 | 값 | 쓰는 곳 |
|---|---|---|
| `--radius-xs` | 6px | 작은 칩, 마방진 칸 |
| `--radius-sm` | 12px | 기본·초록 버튼, 입력창 |
| `--radius-md` | 14px | 랭킹 줄 |
| `--radius-lg` | 16px | 보조 버튼, 작은 카드, 모달 |
| `--radius-xl` | 40px | 게임 카드, 강조 패널, 띠 |
| `--radius-pill` | 50px | 배지, 탭, 난이도 선택 |
| `--radius-jumbo` | 120px | 홈 히어로 아래쪽 곡선(아래 모서리만) |
| `--radius-full` | 9999px | 동그란 아이콘 버튼 |

### 4-3. 그림자 (딱 하나)
```css
--shadow-float: 0 3px 68px rgba(69, 42, 124, 0.35);
```
모달, 토스트, 게임판에만 씁니다. 다른 곳은 그림자 없이 색 차이로 구분합니다.

---

## 5. `tokens.css` 전체 (그대로 작성)

```css
/* ===== 웹폰트 ===== */
@font-face { font-family: 'NexonMaplestory'; src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_20-04@2.1/MaplestoryOTFLight.woff') format('woff'); font-weight: 300; font-display: swap; }
@font-face { font-family: 'NexonMaplestory'; src: url('https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_20-04@2.1/MaplestoryOTFBold.woff') format('woff'); font-weight: 700; font-display: swap; }

:root {
  /* 글꼴 */
  --font-base: 'NexonMaplestory', 'Apple SD Gothic Neo', 'Malgun Gothic', system-ui, sans-serif;
  --fw-light: 300;
  --fw-bold: 700;
  --fs-display-xl: clamp(40px, 7vw, 82px);
  --fs-display-lg: clamp(32px, 5.5vw, 62px);
  --fs-display-md: clamp(28px, 4.5vw, 56px);
  --fs-heading-lg: clamp(24px, 3.5vw, 40px);
  --fs-heading-sm: 22px;
  --fs-body-lg: 18px;
  --fs-button-lg: 18px;
  --fs-body: 16px;
  --fs-button: 16px;
  --fs-small: 14px;

  /* 색 */
  --color-primary: #5865f2;
  --color-on-primary: #ffffff;
  --color-green: #35ed7e;
  --color-magenta: #ec48bd;
  --color-link: #00b0f4;
  --color-canvas: #0a0d3a;
  --color-surface: #1e2353;
  --color-surface-onyx: #23272a;
  --color-black: #000000;
  --color-ink: #ffffff;
  --color-ink-dark: #000000;
  --color-ink-soft: rgba(255, 255, 255, 0.64);
  --color-ink-faint: rgba(255, 255, 255, 0.36);
  --color-hairline: rgba(255, 255, 255, 0.12);
  --gradient-magenta: linear-gradient(135deg, #ec48bd 0%, #a23cd8 55%, #5865f2 100%);
  --gradient-primary: linear-gradient(135deg, #5865f2 0%, #7a4be6 100%);

  /* 간격 */
  --space-xxs: 4px; --space-xs: 8px; --space-sm: 12px; --space-md: 16px;
  --space-lg: 20px; --space-xl: 24px; --space-xxl: 32px; --space-section: 40px;
  --space-page: clamp(48px, 8vw, 96px);

  /* 모서리 */
  --radius-xs: 6px; --radius-sm: 12px; --radius-md: 14px; --radius-lg: 16px;
  --radius-xl: 40px; --radius-pill: 50px; --radius-jumbo: 120px; --radius-full: 9999px;

  /* 그림자·레이아웃·움직임 */
  --shadow-float: 0 3px 68px rgba(69, 42, 124, 0.35);
  --container: 1200px;
  --nav-height: 64px;
  --ease: cubic-bezier(0.2, 0.8, 0.2, 1);
  --dur-fast: 120ms;
  --dur: 220ms;
}
```

---

## 6. 레이아웃·반응형

| 이름 | 폭 | 바뀌는 점 |
|---|---|---|
| 모바일 | `< 768px` | 한 줄 배치, 버튼 폭 100%, 네비는 로고 + 메뉴 버튼(☰), 좌우 여백 16px |
| 태블릿 | `768px ~ 1023px` | 게임 카드 2열 → 1열, 좌우 여백 24px |
| 노트북 | `1024px ~ 1279px` | 컨테이너 폭 960px |
| 데스크톱 | `≥ 1280px` | 컨테이너 폭 1200px, 가운데 정렬 |

```css
.container { width: min(100% - 32px, var(--container)); margin-inline: auto; }
@media (min-width: 768px) { .container { width: min(100% - 48px, var(--container)); } }
```

- 모든 터치 대상은 **최소 44×44px**.
- 게임판은 화면 폭에 맞춰 줄어들되 최대 560px (`width: min(100%, 560px)`).

---

## 7. 공통 컴포넌트

에이전트는 아래 **클래스 이름 그대로** `components.css`에 만듭니다. (괄호 안은 원본 분석 문서의 컴포넌트 이름)

### 7-1. 버튼
| 클래스 | 배경 | 글자 | 모서리 | 안쪽 여백 | 글자 크기 | 쓰는 곳 |
|---|---|---|---|---|---|---|
| `.btn.btn-primary` (button-primary) | `--color-primary` | 흰색 | `--radius-sm` | `20px 24px` | `--fs-button-lg` | 일반 행동 |
| `.btn.btn-green` (button-green) | `--color-green` | 검정 | `--radius-sm` | `12px 24px` | `--fs-button-lg` | 화면당 1개 핵심 행동 |
| `.btn.btn-white` (button-white) | 흰색 | 검정 | `--radius-lg` | `8px 16px` | `--fs-button` | 보라 띠 위 버튼 |
| `.btn.btn-ghost` (button-ghost) | `--color-surface` | 흰색 | `--radius-lg` | `16px` | `--fs-button` | 보조 행동(처음부터, 새 게임) |
| `.btn.btn-ghost-sm` (button-ghost-sm) | `--color-surface` | 흰색 | `--radius-xs` | `12px 32px` | `--fs-small` | 작은 보조 버튼(복사) |
| `.btn-icon` | `--color-surface` | 흰색 | `--radius-full` | 44×44px | — | 닫기(×), 메뉴(☰) |

공통 상태:
- `:hover` → `filter: brightness(1.1); transform: translateY(-1px);`
- `:active` → `transform: translateY(1px) scale(0.98);`
- `:focus-visible` → `outline: 3px solid var(--color-link); outline-offset: 3px;`
- `:disabled` → `opacity: 0.4; cursor: not-allowed; transform: none;`
- 전환: `transition: transform var(--dur-fast) var(--ease), filter var(--dur-fast);`

### 7-2. 카드·패널
| 클래스 | 배경 | 모서리 | 여백 | 쓰는 곳 |
|---|---|---|---|---|
| `.card` (feature-card-dark) | `--color-surface` | `--radius-xl` | `32px` | 게임 카드(마방진), 일반 카드 |
| `.card-gradient` (feature-card-gradient) | `--gradient-magenta` | `--radius-xl` | `40px` | 강조 게임 카드(울타리) |
| `.band-black` (showcase-band-black) | 검정 | `--radius-xl` | `40px` | 플레이 화면의 게임판 영역 |
| `.stat-card` (stat-card) | `--color-primary` | `--radius-xl` | `32px` | 클리어 기록 숫자 |
| `.step-card` (step-card) | `--gradient-magenta` | `--radius-lg` | `24px` | 홈의 1·2·3 단계 안내 |
| `.cta-band` (cta-band) | `--color-primary` | `--radius-xl` | `40px` | 홈 하단 "랭킹 도전" 띠 |
| `.marquee` (marquee-band) | `--color-primary` | 없음(화면 가득) | `20px 0` | 흐르는 글자 띠 |

### 7-3. 마키 띠 (`.marquee`)
- 글자: `퍼즐 · 집중 · 기록 · 랭킹 · 혼자서도 꽉 차게 ·` 를 2번 이어 붙여 왼쪽으로 30초에 한 바퀴 흐름
- 글자 크기 `--fs-display-lg`, 굵기 700
- `prefers-reduced-motion: reduce` 이면 멈춤
- 스크린리더용: 띠 전체에 `aria-hidden="true"`

### 7-4. 입력창 `.input`
- 배경 `--color-surface`, 테두리 `2px solid var(--color-hairline)`, 모서리 `--radius-sm`, 여백 `16px 20px`, 글자 `--fs-body-lg`
- 포커스: 테두리 `--color-primary`
- 오류: `.input.is-error` → 테두리 `--color-magenta`, 아래 `.field-error`(마젠타 14px 글자)
- 라벨 `.field-label`: `--fs-small`, `--color-ink-soft`, 입력창 위 8px

### 7-5. 선택 칩 `.chip-group` / `.chip` (난이도, 타이머, 랭킹 탭)
- `role="radiogroup"` / 각 칩 `role="radio"` + `aria-checked`
- 기본: 배경 `--color-surface`, 모서리 `--radius-pill`, 여백 `10px 20px`, 높이 44px
- 선택됨: 배경 `--color-primary`
- 키보드: ←/→ 로 선택 이동

### 7-6. 배지 `.badge` (badge)
- 배경 `--color-magenta`, 흰 글자 `--fs-small`, 모서리 `--radius-pill`, 여백 `4px 12px`
- 예: `NEW`, `💡 2`, `TOP 3`

### 7-7. 모달 `.modal`
- 뒤 배경 `.modal-backdrop`: `rgba(5, 6, 30, 0.72)` + `backdrop-filter: blur(4px)`
- 상자: 배경 `--color-surface`, 모서리 `--radius-xl`, 여백 `32px`, 최대 폭 480px, 그림자 `--shadow-float`
- 열릴 때: 아래에서 12px 올라오며 나타남(220ms)
- `role="dialog"`, `aria-modal="true"`, 제목에 `aria-labelledby`
- Esc 키 = 취소, 바깥 클릭 = 취소 (결과 모달은 바깥 클릭으로 닫히지 않음)
- 열려 있는 동안 포커스가 모달 밖으로 나가지 않음(포커스 트랩), 닫히면 연 버튼으로 포커스 복귀
- API (`ui/modal.js`):
  ```js
  openConfirm({ title, message, confirmText, cancelText }) // → Promise<boolean>
  openModal({ title, bodyEl, actions, dismissible })       // → { close() }
  ```

### 7-8. 토스트 `.toast`
- 화면 아래 가운데, 아래에서 24px. 배경 `--color-surface`, 모서리 `--radius-lg`, 여백 `12px 16px`, 그림자 `--shadow-float`
- 종류: 기본 / `.toast-error`(왼쪽 4px 마젠타 띠)
- 2.5초 후 사라짐, 최대 3개 쌓임
- API (`ui/toast.js`): `showToast(message, { type: 'info' | 'error' })`

### 7-9. 아코디언 `.accordion` (faq-accordion) — "게임 방법"
- `<details><summary>` 사용. 배경 `--color-surface`, 모서리 `--radius-lg`, 여백 `24px`, 제목 `--fs-button-lg`
- 오른쪽에 `+` → 열리면 `−`

### 7-10. 네비게이션 `.nav-bar` (nav-bar)
- 높이 `--nav-height`, 배경 `rgba(10,13,58,0.8)` + `backdrop-filter: blur(8px)`, 위에 고정(sticky)
- 왼쪽: 로고 글자 `HONBO` (700, 22px, 대문자) — 이미지 로고 없음
- 오른쪽: `게임 선택` · `랭킹` 링크 + 닉네임 칩(`.badge` 모양, 배경 `--color-surface`) — 닉네임 칩 누르면 `#/`(닉네임 변경)
- 모바일(<768px): 링크는 ☰ 버튼을 누르면 아래로 펼쳐짐

### 7-11. 푸터 `.footer` (footer)
- 배경 `--color-canvas`, 여백 `40px`
- 위: 작은 링크 줄 (`게임 선택 · 랭킹`) + `© 2026 HONBO`
- 아래: 화면 폭 가득 거대한 `HONBO` 글자 (`font-size: clamp(64px, 18vw, 240px)`, 700, `color: transparent; -webkit-text-stroke: 1px var(--color-hairline);`)

---

## 8. 움직임 규칙
| 대상 | 움직임 | 시간 |
|---|---|---|
| 버튼 누름 | 살짝 눌림 | 120ms |
| 모달·토스트 등장 | 아래→위 + 투명→불투명 | 220ms |
| 힌트 대상 강조 | 마젠타 빛 깜빡임 3회 | 총 3초 |
| 클리어 | 게임판 선/칸이 primary→magenta 그라디언트로 물듦 + 판 전체 살짝 커졌다 돌아옴(1.03배) | 600ms |
| 배경 메시 | 천천히 흐름 | 24초 |

`@media (prefers-reduced-motion: reduce)` 에서는 배경·마키·클리어 확대 애니메이션을 끄고 색 변화만 남깁니다.

---

## 9. 해야 할 것 / 하지 말 것

### 해야 할 것
- 모든 값은 `var(--...)` 토큰으로
- 제목 700, 본문 300 — 굵기 대비를 크게
- 카드·패널은 40px 둥근 모서리
- 게임판은 검정 띠(`.band-black`) 안에 놓아 집중되게

### 하지 말 것
- 배경을 회색·흰색으로 바꾸기
- 초록 버튼 2개 이상 한 화면에 두기
- 새로운 화려한 색(빨강, 주황, 노랑 등) 추가
- 그림자로 카드 띄우기 (`--shadow-float` 쓰는 3곳 제외)
- Discord 로고·이름·캐릭터, 외부 일러스트 사용
- 300·700 이외의 `font-weight`

---

## 10. 완료 기준
- [ ] `tokens.css`가 5장과 같고, 다른 CSS 파일에 색 코드(`#xxxxxx`)가 직접 쓰여 있지 않다 (검색으로 확인, `tokens.css`만 예외)
- [ ] 7장의 모든 클래스가 `components.css`에 있다
- [ ] 개발자도구 → Network에서 두 woff 파일이 200으로 받아진다
- [ ] 화면의 모든 글자가 NexonMaplestory로 보인다 (개발자도구 → Computed → Rendered Fonts)

## 11. 검증 방법
| 확인 | 방법 | 기대 |
|---|---|---|
| 초록 버튼 개수 | 각 화면에서 `document.querySelectorAll('.btn-green').length` | 1 이하 |
| 색 직접 사용 | `public/css/` 검색 `#[0-9a-fA-F]{6}` (정규식) | `tokens.css` 에만 있음. `rgba()`는 `.bg-mesh`, `.modal-backdrop`, `.nav-bar` 에만 있음 |
| 움직임 줄이기 | OS 설정에서 "동작 줄이기" 켜기 | 배경·마키 멈춤 |
| 키보드 | Tab으로 모든 버튼 이동 | 시안색 포커스 테두리 보임 |
