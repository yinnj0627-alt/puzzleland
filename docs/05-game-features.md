# 05. 기능 구현 지침 (닉네임 · 플레이 흐름 · 공통 기능 · 랭킹 흐름)

> 화면 모양은 `docs/03`, 퍼즐 로직은 `docs/04`, 서버 API는 `docs/06`에 있습니다.
> 이 문서는 **버튼을 눌렀을 때 정확히 무슨 일이 일어나는지**를 정합니다.

---

## 1. 닉네임과 브라우저 저장값 (`js/state.js`)

### 1-1. localStorage 키 (이 3개만 사용)
| 키 | 값 | 언제 만들어지나 |
|---|---|---|
| `honbo.nickname` | 닉네임 문자열 | 홈에서 닉네임 통과 시 |
| `honbo.playerId` | `crypto.randomUUID()` 결과 | 앱 첫 실행 시 (없으면 만들기) |
| `honbo.lastSelect` | `{"game":"FN","difficulty":"E","timer":0}` | 게임 선택 화면에서 시작할 때 |

- `localStorage` 접근은 모두 `try/catch`로 감쌉니다 (사생활 보호 모드에서 오류가 날 수 있음). 실패하면 메모리 변수에만 저장합니다.
- 함수: `getNickname()`, `setNickname(name)`, `getPlayerId()`, `getLastSelect()`, `setLastSelect(obj)`

### 1-2. 닉네임 확인 흐름 (홈 「시작하기」)
```
1. 값 = 입력값.trim()
2. 비어 있음 → 「닉네임을 입력해 주세요.」 표시, 끝
3. NICKNAME_REGEX 불통과 → 「2~12자의 한글, 영문, 숫자, _ 만 쓸 수 있어요.」 표시, 끝
4. 버튼 「확인 중…」 + 비활성
5. POST /api/nickname { nickname }  (4초 안에 응답 없으면 중단)
   ├ data.allowed === true            → 6으로
   ├ data.allowed === false           → 「다른 닉네임을 써 주세요.」 표시, 버튼 복구, 끝
   └ 네트워크 실패 / 시간 초과 / ok:false → 6으로 (규칙 검사는 이미 통과했으므로 허용)
6. setNickname(값) → 기억해 둔 주소 또는 #/select 로 이동
```

---

## 2. 플레이 화면 생명주기 (`screens/play.js`)

### 2-1. 화면에 들어올 때 (`render`)
```
1. 닉네임 없음 → #/ 로 이동 (현재 주소 기억)
2. parseCode(params.code) 실패 → 토스트 「코드 형식이 올바르지 않아요. 예: FN-E-7K3QX9」 → #/select
3. timer = Number(params.timer); TIMER_OPTIONS_SEC 에 없으면 0
4. puzzle = createPuzzle(code)
5. 판 그리기 + HUD 그리기
6. clock = createGameClock({ limitSec: timer, ... }); clock.start()
7. state = 'PLAYING', hintsUsed = 0
8. startSession() 을 비동기로 호출 (기다리지 않음 — 3장 참고)
```

### 2-2. 상태 (3가지뿐)
```
PLAYING ──(퍼즐 완성)──▶ CLEARED
   │
   └────(타이머 0초)───▶ TIME_OVER

CLEARED / TIME_OVER ──(처음부터)──▶ PLAYING (같은 퍼즐)
어느 상태든       ──(새 게임)────▶ 화면 새로 렌더 (새 퍼즐)
```
- `PLAYING`이 아닐 때 판 클릭·키 입력·힌트 버튼은 **모두 무시**합니다.

### 2-3. 입력할 때마다
```
1. 상태값 바꾸기 (울타리: 0→1→2→0 / 마방진: 숫자 넣기·지우기)
2. status = GAME_REGISTRY[game].status(puzzle, 현재값) → 판 색칠 갱신
3. result = validateAnswer(puzzle, getAnswer())
4. result.ok → onClear()
```
- `getAnswer()`: 울타리 `{ h, v }` (2는 0으로 바꿈), 마방진 `{ grid }` (빈칸 0)

### 2-4. 화면을 떠날 때 (`destroy`)
- `clock.destroy()`, 키보드 이벤트 제거, 힌트 강조 타이머 제거, 열린 모달 닫기
- 진행 중인 판을 떠날 때 경고는 **띄우지 않습니다** (범위 밖)

### 2-5. 브라우저 새로고침(F5)
- 주소에 코드가 있으므로 **같은 퍼즐이 처음 상태로** 다시 시작됩니다 (새 세션). 진행 상황 복원은 하지 않습니다.

---

## 3. 서버 세션 연결

```
startSession():
  POST /api/session/start { code, nickname, playerId }
  ├ 성공 → sessionId 저장, 힌트 버튼 활성화
  └ 실패 → sessionId = null
          토스트 「서버에 연결하지 못했어요. 게임은 할 수 있지만 기록은 저장되지 않아요.」
          힌트 버튼 비활성 + title="서버 연결이 필요해요"
```
- 세션 시작을 기다리지 않고 게임은 바로 시작합니다 (스톱워치도 바로 시작).
- 「처음부터」를 누를 때마다 **새 세션**을 시작합니다 (이전 세션은 버려짐).

---

## 4. 판 조작 상세

### 4-1. 울타리
| 조작 | 결과 |
|---|---|
| 변 클릭/탭 | 0(빈칸) → 1(선) → 2(✕) → 0 |
| 변 오른쪽 클릭 | 0 또는 1 → 2, 2 → 0 (브라우저 메뉴 막기) |
| 키보드 | 지원하지 않음 (범위 밖) |

### 4-2. 마방진
| 조작 | 결과 |
|---|---|
| 칸 클릭 | 그 칸 선택 (주어진 숫자 칸은 선택 안 됨) |
| 숫자 패드 버튼 | 선택된 칸에 그 숫자 넣기. 선택된 칸이 없으면 무시 |
| 「지우기」 | 선택된 칸 비우기 |
| 방향키 ←↑→↓ | 선택 이동 (판 끝에서 멈춤). 주어진 숫자 칸은 **건너뛰고** 그 방향의 다음 빈칸/입력칸으로 |
| 숫자 키 0~9 | 아래 규칙 |
| Backspace / Delete | 선택된 칸 비우기 |
| 판 첫 진입 | 첫 번째 편집 가능한 칸(행 순서) 자동 선택 |

**숫자 키 규칙** (n²이 10 이상인 4×4, 5×5 를 위해)
```
d = 누른 숫자
if 같은 칸에 1초 안에 연속으로 눌렀고, (현재값 × 10 + d) ≤ n²:
    값 = 현재값 × 10 + d          // 예: 1 → 12
else if d ≥ 1 and d ≤ n²:
    값 = d
else:
    무시                            // 예: 3×3에서 0
```
- 같은 숫자를 두 칸에 넣는 것은 **허용**하고, 중복 칸을 마젠타로 표시합니다.

---

## 5. 스톱워치 + 타이머 (`features/game-clock.js`)

### 5-1. 함수 모양
```js
export function createGameClock({ limitSec = 0, onTick, onTimeUp }) {
  // onTick({ elapsedMs, remainingMs })  — 100ms마다 호출 (remainingMs는 limitSec=0이면 null)
  // onTimeUp()                          — 남은 시간이 0이 되는 순간 딱 한 번
  return { start, stop, reset, getElapsedMs, destroy };
}
```

### 5-2. 규칙
| 항목 | 규칙 |
|---|---|
| 시간 측정 | `performance.now()` 시작 시각과의 **차이**로 계산. 1씩 더해 가는 방식 금지 (탭이 느려져도 정확하게) |
| 화면 갱신 | `setInterval` 100ms |
| 탭 숨김 | **계속 흐름** (일시정지 기능 없음) |
| 스톱워치 표시 | `MM:SS.d` — 분 2자리(100분 이상이면 3자리), 초 2자리, 1/10초. 내림(floor). 예 `00:42.3` |
| 타이머 표시 | `MM:SS` — 남은 ms를 1000으로 나눠 **올림**(ceil). 예 남은 136.2초 → `02:17` |
| 경고 | 남은 시간 ≤ 10초 → HUD 타이머에 `.is-warning` (마젠타 + 1초 간격 깜빡임) |
| 시간 끝 | 남은 시간 ≤ 0 → 타이머 `00:00` 고정, `stop()`, `onTimeUp()` |
| `stop()` | 멈추고 그 순간의 `elapsedMs` 반환 |
| `reset()` | 0으로 되돌림 (멈춘 상태). 다시 `start()` 해야 흐름 |
| 랭킹 기록 | 스톱워치 `elapsedMs`(정수, 반올림) |

### 5-3. 시간 표시 함수 (`features/game-clock.js` 안에 함께 둠 — 별도 파일을 만들지 않음)
```js
export function formatStopwatch(ms) { /* '00:42.3' */ }
export function formatCountdown(ms) { /* '02:17' */ }
export function formatRecord(ms)    { return formatStopwatch(ms); } // 랭킹·모달에서 같은 형식
```
> 랭킹 화면도 `formatRecord`를 import 해서 같은 형식을 씁니다.

---

## 6. 코드 복사 (`ui/clipboard.js`)

```js
export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch {
    // 대체 방법: 숨긴 textarea → select() → document.execCommand('copy')
    // 성공하면 true, 실패하면 false
  }
}
```
| 항목 | 규칙 |
|---|---|
| 복사되는 내용 | **코드 문자열만** (예: `FN-E-7K3QX9`). 링크·설명 문구를 붙이지 않음 |
| 버튼 위치 | 플레이 HUD 「코드 복사」, 클리어 모달 「코드 복사」 |
| 성공 | 토스트 「코드를 복사했어요」 + 버튼 글자 1.5초간 「복사됨 ✓」 |
| 실패 | 토스트 「복사하지 못했어요. 코드를 길게 눌러 직접 복사해 주세요.」 (코드 칩은 `user-select: all` 로 길게 눌러 선택 가능) |
| 상태 제한 | 어느 상태(PLAYING/CLEARED/TIME_OVER)에서든 동작 |

## 7. 코드로 참여

- 게임 선택 화면의 「코드로 참여」 (화면 모양 `docs/03` 2장)
- 흐름: `normalizeCode` → `parseCode` → 실패 시 오류 문구, 성공 시 `#/play?code={코드}&timer={화면에서 선택한 제한 시간}`
- 같은 코드면 **판 구조(울타리 숫자 위치·값, 마방진 주어진 숫자 위치·값)가 완전히 같아야** 합니다 (`docs/04` 결정성)
- 제한 시간은 코드에 포함되지 않습니다 (각자 선택). 랭킹은 제한 시간과 관계없이 하나로 합쳐집니다.

---

## 8. 처음부터 다시 하기

```
onRestart():
  if state === 'PLAYING' and 입력한 내용이 하나라도 있음:
      ok = await openConfirm({ title:'처음부터 다시 할까요?', message:'지금까지 입력한 내용과 시간이 모두 지워져요.', confirmText:'처음부터', cancelText:'계속하기' })
      if !ok: return
  열린 결과 모달 닫기
  판 입력값 모두 지우기 (울타리: 모든 변 0 / 마방진: givens 외 모두 빈칸, 첫 편집 칸 선택)
  힌트 강조·말풍선 제거, hintsUsed = 0, 힌트 버튼 「💡 힌트 3」
  clock.reset(); clock.start()
  state = 'PLAYING'
  startSession()   // 새 세션
```
- **코드와 주소는 그대로**입니다. 퍼즐을 다시 생성할 필요 없이 같은 `puzzle` 객체를 씁니다.
- "입력한 내용이 있음" = 울타리는 값이 0이 아닌 변이 1개 이상, 마방진은 givens 외에 채운 칸이 1개 이상.

## 9. 게임 새로고침 (새 게임)

```
onNewGame():
  if state === 'PLAYING' and 입력한 내용이 있음:
      ok = await openConfirm({ title:'새 퍼즐로 바꿀까요?', message:'지금 퍼즐은 사라지고 새로운 퍼즐이 나와요.', confirmText:'새 게임', cancelText:'계속하기' })
      if !ok: return
  newCode = createRandomCode(현재 game, 현재 difficulty)
  location.hash = `#/play?code=${newCode}&timer=${현재 timer}`
  // 라우터가 destroy() → render() 를 다시 호출
```
- 게임·난이도·제한 시간은 그대로, **퍼즐과 코드만** 바뀝니다.
- 브라우저의 새로고침(F5)과는 다른 기능입니다.

---

## 10. 힌트

```
onHint():
  if state !== 'PLAYING' or sessionId 없음 or 남은 힌트 0: return
  버튼 「💡 …」 + 비활성
  res = POST /api/hint { sessionId, answer: getAnswer() }
  ├ 성공 (data: { hintText, target, hintsUsed, hintsRemaining })
  │    hintsUsed = data.hintsUsed
  │    말풍선 .hint-bubble 에 hintText 6초 표시
  │    target 이 있으면 그 칸/변/점/줄에 .is-hint (마젠타 깜빡임 3초)
  │    버튼 「💡 힌트 {hintsRemaining}」, 0이면 비활성
  ├ 실패 error.code === 'HINT_LIMIT' → 토스트 「이번 판 힌트를 모두 썼어요.」, 버튼 비활성
  └ 그 밖의 실패 → 토스트 「힌트를 불러오지 못했어요. 잠시 후 다시 눌러 주세요.」, 버튼 복구
```
- 힌트 횟수의 **진짜 값은 서버**가 가지고 있습니다. 화면은 서버가 알려 준 값을 따릅니다.
- 힌트 1회 = 기록 +30초 (`HINT_PENALTY_MS`). 페널티는 서버가 기록 저장 시 더합니다.

---

## 11. 클리어

```
onClear():
  rawMs = Math.round(clock.stop())
  state = 'CLEARED'  → 판 잠금
  클리어 애니메이션 600ms (docs/02 8장)
  openClearModal({ rawMs, hintsUsed })   // 우선 화면에서 계산한 값으로 표시
     표시 기록 = rawMs + hintsUsed × HINT_PENALTY_MS
     힌트를 썼으면 「순수 시간 {raw} + 힌트 {n}회 {n×30}초」

  if rawMs > MAX_RECORD_MS: 「1시간이 넘은 기록은 랭킹에 오르지 않아요.」, 끝
  if sessionId 없음:       「기록을 저장하지 못했어요. 게임은 끝났지만 랭킹에는 오르지 않아요.」, 끝

  「기록 저장 중…」
  res = POST /api/score/submit { sessionId, rawMs, answer: getAnswer() }
  ├ 성공 → 서버 값으로 모달 갱신
  │        기록 = data.recordMs, 「전체 순위 {data.globalRank}위 / {data.globalTotal}명」
  │        「이 퍼즐 TOP 10」 = data.codeTop (내 줄 「(나)」)
  │        data.codeTop.length === 1 이면 「이 퍼즐을 처음 푼 사람이에요! 코드를 친구에게 보내 보세요.」
  └ 실패 → 「기록을 저장하지 못했어요. 게임은 끝났지만 랭킹에는 오르지 않아요.」
```
- 모달 버튼: 「코드 복사」(6장), 「새 게임」(9장, 확인 모달 없이), 「랭킹 보기」(→ `#/ranking?game={game}&difficulty={difficulty}`)

## 12. 시간 초과
```
onTimeUp():
  state = 'TIME_OVER' → 판 잠금 + 판 위 「시간 초과」 덮개
  시간 초과 모달 (docs/03 5-2): 「처음부터」(8장, 확인 없이) / 「새 게임」(9장, 확인 없이) / 「게임 선택으로」(→ #/select)
  기록은 서버에 보내지 않음
```

---

## 13. 랭킹 화면 흐름 (`screens/ranking.js`)
```
render(params):
  game = params.game ∈ {FN, MS} ? params.game : 'FN'
  difficulty = params.difficulty ∈ {E, N, H} ? params.difficulty : 'E'
  칩 선택 표시 → load()

load():
  스켈레톤 표시
  res = GET /api/leaderboard?game={game}&difficulty={difficulty}
  ├ 성공, data.entries.length === 0 → 빈 상태
  ├ 성공 → entries[0..2] 큰 카드(2위·1위·3위 순서로 배치), entries[3..] 줄 목록
  │        entry.nickname === getNickname() 인 줄에 「(나)」 + 강조
  └ 실패 → 「랭킹을 불러오지 못했어요.」 + 「다시 시도」
칩 변경 → history.replaceState 로 주소 바꾸고 load()
「↻ 새로고침」 → load()
```
- 화면에 표시하는 순위 숫자는 서버가 준 `rank` 값을 그대로 씁니다 (동점 같은 순위).

---

## 14. API 호출 공통 (`js/api.js`)
```js
// 모든 호출은 이 함수로. 응답 형식은 docs/06 3장
async function request(path, { method = 'GET', body, timeoutMs = 8000 } = {}) {
  // AbortController 로 timeoutMs 지나면 중단
  // 성공: { ok: true, data }  /  실패(네트워크 포함): { ok: false, error: { code, message } }
  // 절대 throw 하지 않음 → 화면 코드는 res.ok 만 확인
}
export const api = {
  checkNickname: (nickname)                 => request('/api/nickname', { method: 'POST', body: { nickname }, timeoutMs: 4000 }),
  startSession:  (code, nickname, playerId) => request('/api/session/start', { method: 'POST', body: { code, nickname, playerId } }),
  submitScore:   (sessionId, rawMs, answer) => request('/api/score/submit', { method: 'POST', body: { sessionId, rawMs, answer } }),
  getHint:       (sessionId, answer)        => request('/api/hint', { method: 'POST', body: { sessionId, answer }, timeoutMs: 12000 }),
  getLeaderboard:(game, difficulty)         => request(`/api/leaderboard?game=${game}&difficulty=${difficulty}`),
};
```
- 네트워크 실패 시 `error.code = 'NETWORK'`, 시간 초과 시 `'TIMEOUT'`.

---

## 15. 완료 기준
- [ ] 1~14장의 흐름이 모두 구현됨
- [ ] 서버를 꺼도(`vercel dev` 대신 정적 서버로 열어도) 두 게임을 끝까지 풀 수 있고 앱이 멈추지 않음
- [ ] `alert/confirm/prompt` 사용 0회

## 16. 검증 체크리스트
| # | 해 볼 것 | 기대 결과 |
|---|---|---|
| 1 | 홈에서 `가나다라마바사아자차카타파`(13자) 입력 | 규칙 오류 문구, 이동 안 함 |
| 2 | 닉네임 없이 주소창에 `#/play?code=FN-E-7K3QX9` | 홈으로 이동 → 닉네임 입력 후 그 퍼즐로 이동 |
| 3 | 게임 시작 후 10초 기다리기 | 스톱워치 `00:10.x` |
| 4 | 다른 탭에 30초 있다가 돌아오기 | 스톱워치가 30초 이상 흐른 값 |
| 5 | 타이머 1분으로 시작, 50초 이후 | 타이머 마젠타 깜빡임 |
| 6 | 타이머 0초 도달 | 시간 초과 모달, 판 클릭 무반응, 서버 요청 없음(Network 탭) |
| 7 | 「코드 복사」 → 메모장 붙여넣기 | `FN-E-xxxxxx` 형식 코드만 |
| 8 | 그 코드를 시크릿 창에서 「코드로 참여」 | 숫자 배치가 완전히 같음 |
| 9 | 선 3개 그은 뒤 「처음부터」 → 「계속하기」 | 아무것도 안 바뀜 |
| 10 | 다시 「처음부터」 → 「처음부터」 | 판 비워짐, 스톱워치 `00:00.0`부터, 코드 그대로 |
| 11 | 「새 게임」 → 확인 | 코드 바뀜, 퍼즐 바뀜, 난이도·제한 시간 유지 |
| 12 | 아무것도 입력 안 하고 「새 게임」 | 확인 모달 없이 바로 바뀜 |
| 13 | 마방진 4×4에서 칸 선택 후 `1`,`2` 빠르게 | `12` 입력 |
| 14 | 마방진 4×4에서 `1` 누르고 2초 뒤 `2` | `2` 입력 |
| 15 | 힌트 3회 | 버튼 「💡 힌트 0」 비활성, 클리어 시 기록 = 순수 시간 + 1:30 |
| 16 | 클리어 | 600ms 애니메이션 후 모달, 순위 표시 |
| 17 | 랭킹 화면 탭 변경 | 주소가 바뀌고 목록 갱신, 뒤로가기 시 탭별 기록이 쌓이지 않음 |
