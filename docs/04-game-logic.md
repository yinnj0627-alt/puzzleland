# 04. 게임 로직 구현 지침 (울타리 · 마방진 · 게임 코드)

> 이 문서의 코드는 모두 `public/js/core/` 에 들어가며, **브라우저와 서버가 똑같이 씁니다.**
> 그래서 아래 규칙을 지켜야 합니다.
> 1. `document`, `window`, `localStorage` 사용 금지 (순수 함수)
> 2. 퍼즐 생성에 `Math.random()` 사용 금지 → `rng.js`만 사용
> 3. **난수를 꺼내 쓰는 순서까지** 이 문서와 똑같이 구현 (순서가 바뀌면 같은 코드라도 다른 퍼즐이 나옴)

---

## 1. 공통 상수 (`core/constants.js`)

```js
export const APP_NAME = 'HONBO';
export const GENERATOR_VERSION = 1;                 // 생성 알고리즘 버전 (바꾸지 않음)

export const DIFFICULTIES = { E: '쉬움', N: '보통', H: '어려움' };

export const FENCE_CONFIG = {
  size:        { E: 5,    N: 7,    H: 10 },          // 가로=세로 칸 수
  revealRatio: { E: 0.70, N: 0.55, H: 0.45 },        // 숫자를 보여 주는 칸 비율
  regionMin: 0.45,                                   // 울타리 안쪽 칸 비율 최소
  regionRange: 0.15,                                 // 최소 + (0~0.15) → 45~60%
};

export const MAGIC_CONFIG = {
  size:   { E: 3, N: 4, H: 5 },
  givens: { E: 3, N: 6, H: 9 },                      // 처음부터 채워 주는 칸 수
};

export const CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // 32자 (I, L, O, U 제외)
export const CODE_SEED_LENGTH = 6;
export const CODE_REGEX = /^(FN|MS)-(E|N|H)-[0-9A-HJKMNP-TV-Z]{6}$/;

export const NICKNAME_REGEX = /^[가-힣a-zA-Z0-9_]{2,12}$/;

export const TIMER_OPTIONS_SEC = [0, 60, 180, 300, 600]; // 0 = 타이머 없음
export const HINT_LIMIT = 3;
export const HINT_PENALTY_MS = 30_000;
export const MIN_RECORD_MS = 1_000;
export const MAX_RECORD_MS = 3_600_000;              // 1시간
export const TIME_TOLERANCE_MS = 5_000;              // 서버 시간 비교 허용 오차
```

---

## 2. 게임 코드 (`core/code.js`)

### 2-1. 형식
```
FN-E-7K3QX9
│  │ └──── 시드: CODE_ALPHABET 중 6글자 (32⁶ ≈ 10억 가지)
│  └────── 난이도: E(쉬움) / N(보통) / H(어려움)
└───────── 게임: FN(울타리, Fence) / MS(마방진, Magic Square)
```

### 2-2. 함수
```js
// 새 무작위 코드 만들기 (퍼즐 생성용이 아니라 "씨앗 고르기"용이므로 crypto 사용 가능)
export function createRandomCode(game, difficulty) {
  const bytes = new Uint8Array(CODE_SEED_LENGTH);
  globalThis.crypto.getRandomValues(bytes);
  const seed = Array.from(bytes, b => CODE_ALPHABET[b % 32]).join('');
  return `${game}-${difficulty}-${seed}`;
}

// 입력값 정리: 앞뒤 공백 제거 + 대문자
export function normalizeCode(input) { return String(input ?? '').trim().toUpperCase(); }

// 코드 해석 → { ok: true, code, game, difficulty, seed } 또는 { ok: false }
export function parseCode(input) {
  const code = normalizeCode(input);
  if (!CODE_REGEX.test(code)) return { ok: false };
  const [game, difficulty, seed] = code.split('-');
  return { ok: true, code, game, difficulty, seed };
}
```

---

## 3. 시드 난수 (`core/rng.js`)

**코드 문자열 전체**(예: `"FN-E-7K3QX9"`)를 씨앗으로 씁니다. 그래서 시드 6글자가 같아도 게임·난이도가 다르면 다른 퍼즐이 됩니다.

```js
// 문자열 → 32비트 정수 (FNV-1a 해시)
export function hashString(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// 32비트 정수 → 0 이상 1 미만 난수를 계속 내놓는 함수 (mulberry32)
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(code) { return mulberry32(hashString(code)); }

// 0 ~ n-1 정수
export function randInt(rng, n) { return Math.floor(rng() * n); }

// 배열 섞기 (Fisher–Yates, 뒤에서부터). 원본을 바꾸지 않고 새 배열 반환
export function shuffle(rng, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
```

---

## 4. 울타리 (`core/fence.js`)

### 4-1. 규칙 (사용자에게 보이는 설명은 `docs/03`)
- R×C 칸 판, 꼭짓점(점)은 (R+1)×(C+1)개.
- 점과 점 사이 변에 선을 긋는다.
- **성공 조건**: ① 그은 선이 1개 이상 ② 모든 점에 연결된 선이 0개 또는 2개 ③ 모든 선이 **하나의 고리**로 이어짐 ④ 숫자가 보이는 모든 칸은 주변 선 개수 = 숫자.

### 4-2. 좌표 약속
```
점 (r, c): r = 0..R, c = 0..C   (위→아래, 왼→오른)
칸 (r, c): r = 0..R-1, c = 0..C-1

가로 변 h[r][c]: 점(r,c) ─ 점(r,c+1)   r = 0..R,   c = 0..C-1   → 크기 (R+1) × C
세로 변 v[r][c]: 점(r,c) │ 점(r+1,c)   r = 0..R-1, c = 0..C     → 크기 R × (C+1)

칸 (r,c)를 둘러싼 4변: h[r][c](위), h[r+1][c](아래), v[r][c](왼쪽), v[r][c+1](오른쪽)
```
- 화면 상태값: `0` = 빈칸, `1` = 선, `2` = ✕ 표시
- 판정·서버 전송 시에는 `2`를 `0`으로 바꿔 보냄 (✕는 화면 표시용)

### 4-3. 퍼즐 데이터 모양
```js
{
  game: 'FN', difficulty: 'E', code: 'FN-E-7K3QX9',
  rows: 5, cols: 5,
  clues: [[2, null, 3, ...], ...],          // rows × cols, 숨긴 칸은 null
  solution: { h: [[0,1,...],...], v: [[...]] } // 참고 해답 (힌트용)
}
```

### 4-4. 생성 알고리즘 `generateFence(code, difficulty)`

**원리**: 판 안에서 "울타리 안쪽 땅"을 한 덩어리로 키운 뒤, 그 땅의 **테두리**를 정답 울타리로 삼는다. 땅에 구멍이 없고 대각선으로만 맞닿는 곳이 없으면 테두리는 항상 하나의 고리가 된다.

**난수 사용 순서 (반드시 이 순서)**
```
rng = createRng(code)
R = C = FENCE_CONFIG.size[difficulty]
N = R × C

① startIndex = randInt(rng, N)                     → inside[startIndex] = true
② target = round(N × (regionMin + rng() × regionRange))
③ 땅 키우기 반복 (count < target 인 동안):
     frontier = "inside가 아니면서, inside 칸과 상하좌우로 맞닿은 칸"을
                칸 번호(r*C + c) 오름차순으로 모은 배열
     added = false
     while frontier가 비어 있지 않음:
        k = randInt(rng, frontier.length)
        cell = frontier[k]
        inside[cell] = true
        if isValidRegion(inside): added = true; count++; break
        else: inside[cell] = false; frontier에서 k번째 제거
     if !added: 반복 종료  (더 키울 수 없으면 현재 크기로 확정)
④ solution 계산 (난수 사용 없음)
⑤ clues 계산 (난수 사용 없음): 모든 칸의 주변 선 개수
⑥ order = shuffle(rng, [0, 1, ..., N-1])
   visibleCount = round(N × revealRatio[difficulty])
   order 앞쪽 visibleCount개 칸만 숫자 표시, 나머지는 null
```

**`isValidRegion(inside)`** — 둘 다 만족해야 true
1. **구멍 없음**: 판 가장자리에 있는 바깥 칸(inside=false)들에서 출발해 상하좌우로 바깥 칸만 따라 퍼졌을 때, **모든 바깥 칸에 도달**해야 함. (바깥 칸이 하나도 없으면 false)
2. **대각선 맞닿음 없음**: 안쪽 점 (r, c) (r = 1..R-1, c = 1..C-1)마다 주변 4칸 a=(r-1,c-1), b=(r-1,c), d=(r,c-1), e=(r,c)에 대해 `a === e && b === d && a !== b` 이면 false.

**solution 계산**: 판 밖은 inside=false 로 본다.
```
h[r][c] = inside(r-1, c) !== inside(r, c) ? 1 : 0
v[r][c] = inside(r, c-1) !== inside(r, c) ? 1 : 0
```

### 4-5. 판정 `validateFence(puzzle, lines)`
- 입력 `lines = { h, v }` (값 0 또는 1)
- 반환 `{ ok: true }` 또는 `{ ok: false, reason }`

| 순서 | 검사 | 실패 reason |
|---|---|---|
| 1 | 배열 크기가 (R+1)×C, R×(C+1) 이고 값이 0/1 | `SHAPE` |
| 2 | 선이 1개 이상 | `EMPTY` |
| 3 | 보이는 숫자 칸 모두 주변 선 수 = 숫자 | `CLUE` |
| 4 | 모든 점의 선 수가 0 또는 2 | `BRANCH` |
| 5 | 아무 선 하나에서 출발해 이어진 선을 따라가면 모든 선을 방문 | `DISCONNECTED` |

> 정답 판정에 `solution`을 쓰지 않습니다. 규칙만 맞으면 다른 모양도 정답입니다.

### 4-6. 화면용 상태 계산 `fenceStatus(puzzle, lines)`
```js
{
  lineCount: 14,
  clueState: [['ok', 'none', 'under', ...], ...], // none(숨김) / under(부족) / ok(같음) / over(넘침)
  branchVertices: [{ r: 2, c: 3 }],               // 선 3개 이상인 점
}
```

---

## 5. 마방진 (`core/magic.js`)

### 5-1. 규칙
- n×n 칸에 1 ~ n² 을 한 번씩 넣는다.
- 목표 합(마방진 상수) `M = n × (n² + 1) / 2` → 3×3: 15, 4×4: 34, 5×5: 65
- **성공 조건**: ① 모든 칸이 채워짐 ② 1~n² 각각 정확히 한 번 ③ 주어진 숫자가 바뀌지 않음 ④ 모든 가로 n줄, 세로 n줄, 대각선 2줄의 합 = M

### 5-2. 퍼즐 데이터 모양
```js
{
  game: 'MS', difficulty: 'E', code: 'MS-E-7K3QX9',
  n: 3, magicSum: 15,
  givens: [[2, null, null], [null, 5, null], [null, null, 8]], // 고정 숫자, 나머지 null
  solution: [[2, 7, 6], [9, 5, 1], [4, 3, 8]]                 // 참고 해답 (힌트용)
}
```

### 5-3. 기본 마방진 만들기 (난수 사용 없음)
- **홀수 n (3, 5) — 시암 방법**
  ```
  grid 모두 0, r = 0, c = floor(n/2)
  for k = 1 .. n²:
     grid[r][c] = k
     nr = (r - 1 + n) % n,  nc = (c + 1) % n
     if grid[nr][nc] !== 0:  nr = (r + 1) % n,  nc = c
     r = nr, c = nc
  ```
  (n=3 결과: `[[8,1,6],[3,5,7],[4,9,2]]` — 테스트로 확인)
- **n = 4 — 이중 짝수 방법**
  ```
  v = r*n + c + 1
  if (r % 4 === c % 4) || ((r % 4) + (c % 4) === 3):  grid[r][c] = n*n + 1 - v
  else: grid[r][c] = v
  ```
  (결과: `[[16,2,3,13],[5,11,10,8],[9,7,6,12],[4,14,15,1]]` — 테스트로 확인)

### 5-4. 생성 알고리즘 `generateMagic(code, difficulty)` — 난수 사용 순서
```
rng = createRng(code)
n = MAGIC_CONFIG.size[difficulty]
base = 기본 마방진(n)

① k = randInt(rng, 8)
   → 시계 방향 90° 회전을 (k % 4)번 적용
   → k >= 4 이면 좌우 뒤집기 적용
② if rng() < 0.5:  모든 칸 x → n² + 1 - x  (보수 변환, 마방진 성질 유지)
   → 결과가 solution
③ order = shuffle(rng, [0, 1, ..., n²-1])
   order 앞쪽 MAGIC_CONFIG.givens[difficulty]개 칸만 givens에 solution 값 복사, 나머지 null
```
- 회전 1회: `rotated[c][n-1-r] = grid[r][c]`
- 좌우 뒤집기: `flipped[r][n-1-c] = grid[r][c]`

### 5-5. 판정 `validateMagic(puzzle, grid)`
- 입력 `grid`: n×n 정수 배열, 빈칸은 0
| 순서 | 검사 | 실패 reason |
|---|---|---|
| 1 | 크기 n×n, 모두 정수 | `SHAPE` |
| 2 | 0(빈칸) 없음 | `INCOMPLETE` |
| 3 | 모든 값이 1 ~ n² | `RANGE` |
| 4 | 중복 없음 | `DUPLICATE` |
| 5 | givens가 있는 칸은 값이 같음 | `GIVEN_CHANGED` |
| 6 | 가로·세로·대각선 합 모두 M | `SUM` |

### 5-6. 화면용 상태 `magicStatus(puzzle, grid)`
```js
{
  rows:  [{ sum: 8, complete: false, ok: false }, ...],
  cols:  [ ... ],
  diags: [ {/* ↘ 왼쪽 위→오른쪽 아래 */}, {/* ↙ 오른쪽 위→왼쪽 아래 */} ],
  duplicates: ['0,1', '2,2'],   // 중복 숫자가 있는 칸 "r,c" 목록
  usedNumbers: [2, 5, 8],
}
```

---

## 6. 게임 목록 (`core/games.js`) — 새 게임을 쉽게 붙이는 구조

```js
import { generateFence, validateFence, fenceStatus } from './fence.js';
import { generateMagic, validateMagic, magicStatus } from './magic.js';
import { getFenceHintFact, getMagicHintFact } from './hint-facts.js';
import { parseCode } from './code.js';

export const GAME_REGISTRY = {
  FN: { id: 'FN', name: '울타리', generate: generateFence, validate: validateFence, status: fenceStatus, hintFact: getFenceHintFact },
  MS: { id: 'MS', name: '마방진', generate: generateMagic, validate: validateMagic, status: magicStatus, hintFact: getMagicHintFact },
};

// 코드 → 퍼즐 (잘못된 코드면 null)
export function createPuzzle(code) {
  const parsed = parseCode(code);
  if (!parsed.ok) return null;
  return GAME_REGISTRY[parsed.game].generate(parsed.code, parsed.difficulty);
}

// 답안 표준 모양: FN → { h, v } (0/1), MS → { grid } (빈칸 0)
export function validateAnswer(puzzle, answer) {
  return puzzle.game === 'FN'
    ? validateFence(puzzle, answer)
    : validateMagic(puzzle, answer.grid);
}
```
화면(`play.js`)과 서버(`/api`)는 `fence.js`, `magic.js`를 직접 부르지 않고 **항상 `games.js`를 통해** 씁니다.

---

## 7. 힌트 내용 계산 (`core/hint-facts.js`)

힌트의 **내용**은 여기서 정하고, OpenAI는 말투만 다듬습니다(`docs/06` 5장).
위치는 사람이 읽기 쉽게 **1부터** 셉니다: 「위에서 {r+1}번째 줄, 왼쪽에서 {c+1}번째 칸」.

반환 모양:
```js
{
  kind: 'BRANCH',                               // 힌트 종류
  target: { type: 'vertex', r: 2, c: 3 },       // 판에서 반짝일 대상
  fallbackText: '위에서 3번째, 왼쪽에서 4번째 점에 선이 3개 이상 모였어요. 울타리는 갈라지면 안 돼요.'
}
```

### 7-1. 울타리 `getFenceHintFact(puzzle, lines)` — 위에서부터 처음 해당하는 것 하나
| 순서 | kind | 조건 | target | fallbackText |
|---|---|---|---|---|
| 1 | `BRANCH` | 선 3개 이상인 점 (점 번호 오름차순 첫 번째) | `{type:'vertex', r, c}` | 「위에서 {r+1}번째, 왼쪽에서 {c+1}번째 점에 선이 3개 이상 모였어요. 울타리는 갈라지면 안 돼요.」 |
| 2 | `CLUE_OVER` | 선이 숫자보다 많은 칸 (칸 번호 순) | `{type:'cell', r, c}` | 「위에서 {r+1}번째 줄, 왼쪽에서 {c+1}번째 칸은 숫자 {clue}보다 선이 많아요.」 |
| 3 | `WRONG_EDGE` | 그었지만 참고 해답에 없는 변 (h 먼저 행 순서, 그다음 v) | `{type:'edge', dir:'h'|'v', r, c}` | 「반짝이는 선은 필요 없을 수도 있어요.」 |
| 4 | `MISSING_EDGE` | 참고 해답에 있지만 안 그은 변 (같은 순서) | `{type:'edge', dir, r, c}` | 「반짝이는 자리에 선이 필요해요.」 |
| 5 | `NONE` | 해당 없음 | `null` | 「거의 다 왔어요! 숫자 조건을 하나씩 다시 확인해 보세요.」 |

### 7-2. 마방진 `getMagicHintFact(puzzle, grid)`
| 순서 | kind | 조건 | target | fallbackText |
|---|---|---|---|---|
| 1 | `DUPLICATE` | 중복 숫자가 있는 칸 중 givens가 아닌 첫 칸 | `{type:'cell', r, c}` | 「숫자 {value}을(를) 두 번 썼어요. 반짝이는 칸을 바꿔 보세요.」 |
| 2 | `WRONG_SUM` | 꽉 찼는데 합이 틀린 줄 (가로→세로→대각 순) | `{type:'line', line:'row'|'col'|'diag', index}` | 「반짝이는 줄의 합이 {sum}이에요. 목표 합은 {magicSum}이에요.」 |
| 3 | `WRONG_CELL` | 입력한 값이 참고 해답과 다른 첫 칸 | `{type:'cell', r, c}` | 「위에서 {r+1}번째 줄, 왼쪽에서 {c+1}번째 칸 숫자를 다시 생각해 보세요.」 |
| 4 | `REVEAL` | 첫 빈칸 | `{type:'cell', r, c}` | 「위에서 {r+1}번째 줄, 왼쪽에서 {c+1}번째 칸에는 {value}이(가) 들어가요.」 |
| 5 | `NONE` | 해당 없음 | `null` | 「거의 다 왔어요! 합계를 하나씩 다시 확인해 보세요.」 |

> `WRONG_EDGE`, `MISSING_EDGE`, `WRONG_CELL`, `REVEAL` 은 참고 해답 기준이라 다른 정답과 다를 수 있습니다. 이는 알려진 한계로 받아들입니다.

---

## 8. 테스트 (`tests/`, `node --test`)

| 파일 | 꼭 확인할 것 |
|---|---|
| `rng.test.js` | 같은 문자열 → 같은 난수 100개 / 다른 문자열 → 다른 난수 / 값 범위 0 이상 1 미만 / `shuffle`이 원본을 안 바꿈 |
| `code.test.js` | `createRandomCode` 결과가 `CODE_REGEX` 통과(1000회) / `parseCode(' fn-e-7k3qx9 ')` 성공 / `FN-X-123456`, `FN-E-12345`, `FN-E-1234IO`, 빈 문자열 실패 |
| `fence.test.js` | 같은 코드 2번 생성 → `JSON.stringify` 동일 / 난이도별 크기 5·7·10 / 각 난이도 200개 코드로 생성 후 **자기 solution을 validateFence에 넣으면 ok** / 숫자 공개 비율 일치 / 선 하나 지우면 실패 / ✕만 있는 빈 답안 `EMPTY` / 고리 2개 답안 `DISCONNECTED` |
| `magic.test.js` | 시암 n=3, 이중짝수 n=4 기본값이 5-3과 같음 / 200개 코드 각 난이도 solution이 validateMagic ok / givens 개수 일치 / 두 칸 맞바꾸면 `SUM` 또는 실패 / 숫자 중복 `DUPLICATE` / 주어진 숫자 변경 `GIVEN_CHANGED` / 빈칸 `INCOMPLETE` |
| `hint-facts.test.js` | 7장 각 kind가 조건에 맞게 나옴 (직접 만든 작은 상태로) / 빈 판에서 울타리 → `MISSING_EDGE`, 마방진 → `REVEAL` |
| **스냅샷** | `tests/fixtures/puzzles-v1.json` 과 현재 생성 결과가 같음 |

### 스냅샷 만들기 (M2에서 딱 한 번)
- `tests/make-fixtures.js`: 아래 6개 코드의 퍼즐을 생성해 `tests/fixtures/puzzles-v1.json`에 저장
  ```
  FN-E-000000, FN-N-7K3QX9, FN-H-ZZZZZZ, MS-E-000000, MS-N-7K3QX9, MS-H-ZZZZZZ
  ```
- 실행: `npm run fixtures` (`package.json`에 이미 등록, `docs/01` 3-1)
- 한 번 만든 뒤에는 **다시 만들지 않습니다.** 스냅샷 테스트가 실패하면 생성 알고리즘이 바뀐 것이므로 코드를 되돌립니다.

---

## 9. 완료 기준
- [ ] `npm test` 전부 통과 (위 표의 모든 항목)
- [ ] `public/js/core/` 검색 결과 `Math.random`, `document`, `window` 없음
- [ ] 어려움(울타리 10×10, 마방진 5×5) 퍼즐 1개 생성이 50ms 이내 (`console.time`으로 확인, 일반 노트북 기준)
- [ ] `tests/fixtures/puzzles-v1.json` 이 저장소에 있음

## 10. 검증 방법
| 확인 | 방법 | 기대 |
|---|---|---|
| 결정성 | 브라우저 콘솔에서 `createPuzzle('FN-E-7K3QX9')` 두 번 → `JSON.stringify` 비교 | 같음 |
| 브라우저·서버 일치 | 브라우저 콘솔 결과와 `node -e "import('./public/js/core/games.js').then(m=>console.log(JSON.stringify(m.createPuzzle('FN-E-7K3QX9').clues)))"` 결과 비교 | 같음 |
| 다른 정답 인정 | 마방진 3×3에서 참고 해답과 다른 대칭형 정답이 givens와 맞을 때 입력 | 클리어 |
