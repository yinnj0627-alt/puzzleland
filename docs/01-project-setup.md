# 01. 프로젝트 생성 지침

> 이 문서는 **프로젝트 폴더를 만들고, 실행하고, 배포하는 방법**을 다룹니다.
> 에이전트는 아래 구조와 설정 파일을 **글자 그대로** 만듭니다.

---

## 1. 준비물 (사용자가 직접 설치)

| 준비물 | 확인 방법 | 비고 |
|---|---|---|
| Node.js 20 이상 | 터미널에 `node -v` → `v20.x.x` 이상 | nodejs.org 에서 LTS 설치 |
| Vercel 계정 + CLI | `vercel --version` | `npm install -g vercel` 후 `vercel login` |
| Supabase 계정 | supabase.com 로그인 | 무료 플랜으로 충분 |
| OpenAI API 키 | platform.openai.com → API keys | 없어도 앱은 동작(힌트·닉네임 검사만 기본 동작으로 대체) |
| Git | `git --version` | GitHub 연동 배포 시 필요 |

---

## 2. 폴더 구조 (이대로 만든다)

```
honbo/
├─ AGENTS.md
├─ PRD.md
├─ docs/                         # 세부 구현 문서 (이 폴더)
│
├─ public/                       # 브라우저에 그대로 전달되는 파일 (프론트엔드)
│  ├─ index.html                 # 단 하나의 HTML 파일 (화면 전환은 JS로)
│  ├─ css/
│  │  ├─ tokens.css              # 디자인 토큰(색·글꼴·간격) + @font-face
│  │  ├─ base.css                # 초기화, body, 배경 그라디언트, 공통 레이아웃
│  │  ├─ components.css          # 버튼, 카드, 모달, 토스트, 입력창, 배지, 탭
│  │  └─ screens.css             # 화면별 배치 + 게임판 스타일
│  └─ js/
│     ├─ main.js                 # 앱 시작점: 라우터 연결
│     ├─ router.js               # 해시(#) 주소에 따라 화면 전환
│     ├─ state.js                # 닉네임·playerId를 localStorage에 저장/읽기
│     ├─ api.js                  # 서버 API 호출 함수 모음 (fetch 래퍼)
│     ├─ ui/
│     │  ├─ toast.js             # 토스트 알림
│     │  ├─ modal.js             # 확인/결과 모달
│     │  └─ clipboard.js         # 클립보드 복사
│     ├─ screens/
│     │  ├─ home.js              # #/        닉네임 입력
│     │  ├─ select.js            # #/select  게임 선택
│     │  ├─ play.js              # #/play    게임 플레이
│     │  └─ ranking.js           # #/ranking 전체 랭킹
│     ├─ games/
│     │  ├─ fence-view.js        # 울타리 판 그리기·클릭 처리 (SVG)
│     │  └─ magic-view.js        # 마방진 판 그리기·입력 처리
│     ├─ features/
│     │  └─ game-clock.js        # 스톱워치 + 타이머(카운트다운)
│     └─ core/                   # ★ DOM을 쓰지 않는 순수 로직 (서버와 공유)
│        ├─ constants.js         # 모든 숫자 규칙과 게임 설정
│        ├─ rng.js               # 시드 난수
│        ├─ code.js              # 게임 코드 만들기/해석/검사
│        ├─ fence.js             # 울타리 생성·판정
│        ├─ magic.js             # 마방진 생성·판정
│        ├─ hint-facts.js        # 힌트 내용 계산 (어느 칸/선인지)
│        └─ games.js             # 게임 목록(레지스트리): 코드 → 생성/판정 함수 연결
│
├─ api/                          # Vercel 서버리스 함수 (주소 = 파일 경로)
│  ├─ nickname.js                # POST /api/nickname
│  ├─ hint.js                    # POST /api/hint
│  ├─ leaderboard.js             # GET  /api/leaderboard
│  ├─ session/
│  │  └─ start.js                # POST /api/session/start
│  └─ score/
│     └─ submit.js               # POST /api/score/submit
│
├─ lib/                          # 서버 전용 도우미 (브라우저에 전달되지 않음)
│  ├─ http.js                    # 응답 형식, 메서드 검사, 에러 응답
│  ├─ supabase.js                # Supabase 서버 클라이언트
│  ├─ openai.js                  # OpenAI 클라이언트 + 타임아웃 + 폴백
│  └─ nickname.js                # 닉네임 규칙 + Moderation 검사
│
├─ supabase/
│  └─ schema.sql                 # DB 테이블 만드는 SQL (docs/06 내용 그대로)
│
├─ tests/                        # node --test 로 실행
│  ├─ rng.test.js
│  ├─ code.test.js
│  ├─ fence.test.js
│  ├─ magic.test.js
│  ├─ hint-facts.test.js
│  ├─ make-fixtures.js           # 스냅샷 1회 생성 스크립트 (docs/04 8장)
│  └─ fixtures/
│     └─ puzzles-v1.json         # 생성 결과 스냅샷 (docs/04 7장)
│
├─ .env.example
├─ .gitignore
├─ package.json
└─ vercel.json
```

### 왜 `core/`가 `public/` 안에 있나요?
퍼즐을 만드는 코드는 **브라우저(화면 그리기)** 와 **서버(정답 검증)** 가 **완전히 같은 코드**를 써야 같은 퍼즐이 나옵니다.
`public/` 안에 두면 브라우저가 바로 불러올 수 있고, 서버(`/api`)는 `import '../public/js/core/fence.js'` 처럼 같은 파일을 가져다 씁니다.
그래서 `core/` 파일에는 **비밀 값이나 DOM 코드를 절대 넣지 않습니다**.

---

## 3. 설정 파일 (그대로 작성)

### 3-1. `package.json`
```json
{
  "name": "honbo",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=20" },
  "scripts": {
    "dev": "vercel dev",
    "test": "node --test tests/",
    "fixtures": "node tests/make-fixtures.js"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2",
    "openai": "*"
  }
}
```
> `openai`는 설치 시점의 최신 안정 버전을 쓰기 위해 `npm install openai` 로 설치한 뒤, 설치된 버전으로 `"^x"` 형태로 고정합니다.

### 3-2. `vercel.json`
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "outputDirectory": "public",
  "functions": {
    "api/**/*.js": { "maxDuration": 10 }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "no-store" }]
    }
  ]
}
```

### 3-3. `.env.example`
```bash
# Supabase → Project Settings → API 에서 복사
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# OpenAI → API keys 에서 복사 (비워 두면 AI 기능은 기본 문장으로 대체)
OPENAI_API_KEY=
# 힌트 문장 다듬기에 쓸 모델 이름. 사용 가능한 모델은 OpenAI 문서에서 확인 후 입력
OPENAI_MODEL=
```

### 3-4. `.gitignore`
```
node_modules/
.env
.env.local
.env*.local
.vercel/
.DS_Store
```

### 3-5. `public/index.html` 뼈대
```html
<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>혼보 HONBO — 혼자 하는 보드게임</title>
  <link rel="stylesheet" href="/css/tokens.css" />
  <link rel="stylesheet" href="/css/base.css" />
  <link rel="stylesheet" href="/css/components.css" />
  <link rel="stylesheet" href="/css/screens.css" />
</head>
<body>
  <div class="bg-mesh" aria-hidden="true"></div>
  <header id="nav" class="nav-bar"></header>
  <main id="app" tabindex="-1"></main>
  <footer id="footer" class="footer"></footer>
  <div id="modal-root"></div>
  <div id="toast-root" aria-live="polite"></div>
  <script type="module" src="/js/main.js"></script>
</body>
</html>
```

---

## 4. 화면 주소 규칙 (해시 라우팅)

`index.html` 하나에서 주소의 `#` 뒷부분을 보고 화면을 바꿉니다. (Vercel에서 별도 설정이 필요 없어서 이 방식을 씁니다.)

| 주소 | 화면 | 닉네임 필요 |
|---|---|---|
| `#/` | 홈 (닉네임 입력) | 아니오 |
| `#/select` | 게임 선택 | 예 |
| `#/play?code=FN-E-7K3QX9&timer=180` | 게임 플레이 (`timer`는 초, 없으면 0) | 예 |
| `#/ranking?game=FN&difficulty=E` | 전체 랭킹 (파라미터 없으면 `FN`, `E`) | 아니오 |
| 그 외 | `#/`로 이동 | — |

- 닉네임이 필요한 화면에 닉네임 없이 들어오면 `#/`로 보내고, 원래 가려던 주소를 기억했다가 닉네임 입력 후 그곳으로 보냅니다.
- 화면이 바뀔 때마다 `main#app`에 포커스를 주고 맨 위로 스크롤합니다.

---

## 5. 처음 실행하는 순서 (사용자용)

```bash
# 1) 패키지 설치
npm install

# 2) 환경변수 파일 만들기
cp .env.example .env.local      # 그리고 .env.local 안에 값 채우기

# 3) Vercel 프로젝트 연결 (처음 한 번)
vercel link

# 4) 로컬 실행 → 브라우저에서 http://localhost:3000
npm run dev

# 5) 테스트
npm test
```

---

## 6. Supabase 준비 (사용자용)

1. supabase.com → **New project** → 이름 `honbo`, 지역 **Northeast Asia (Seoul)** 선택
2. 왼쪽 메뉴 **SQL Editor** → `supabase/schema.sql` 내용을 붙여넣고 **Run**
3. **Table Editor**에 `game_sessions`, `scores` 테이블, `leaderboard_best` 뷰가 생겼는지 확인
4. **Project Settings → API**에서
   - `Project URL` → `SUPABASE_URL`
   - `service_role` 키 → `SUPABASE_SERVICE_ROLE_KEY` (**절대 화면 코드에 넣지 말 것**)

---

## 7. Vercel 배포 (사용자용)

1. GitHub에 저장소를 올린 뒤 vercel.com → **Add New → Project** → 저장소 선택
2. Framework Preset: **Other** / Build Command: 비워 둠 / Output Directory: `public`
3. **Settings → Environment Variables**에 `.env.example`의 4개 변수를 등록 (Production, Preview 모두)
4. **Deploy** → 배포 주소에서 7장 검증 실행
5. 환경변수를 바꾼 뒤에는 **Redeploy**를 해야 적용됩니다

---

## 8. 완료 기준

- [ ] 2장 폴더 구조와 실제 폴더가 일치 (빈 파일이라도 경로 존재)
- [ ] `npm install` 이 경고 없이 끝남 (deprecated 경고는 허용)
- [ ] `npm run dev` 실행 후 `http://localhost:3000` 접속 시 홈 화면 표시
- [ ] `npm test` 실행 가능 (M2 이전에는 테스트 0개여도 됨)
- [ ] `.env.local` 이 `git status` 에 나타나지 않음

## 9. 검증 방법

| 확인할 것 | 방법 | 기대 결과 |
|---|---|---|
| 정적 파일 | `http://localhost:3000/css/tokens.css` 접속 | CSS 내용이 보임 |
| API 동작 | `http://localhost:3000/api/leaderboard?game=FN&difficulty=E` 접속 | `{"ok":true,"data":{...}}` JSON (DB 연결 전에는 `ok:false` + 에러 코드여도 형식은 맞아야 함) |
| 비밀 키 노출 | 브라우저 개발자도구 → Sources 에서 `SERVICE_ROLE` 검색 | 결과 없음 |
| 배포 | Vercel 주소에서 위 3개 반복 | 로컬과 같음 |
