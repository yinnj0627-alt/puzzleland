# 06. 백엔드 · 데이터베이스 · AI 구현 지침

> 서버 코드는 `api/`(주소가 되는 파일)와 `lib/`(도우미)에만 둡니다.
> 비밀 키는 **여기서만** `process.env`로 읽습니다. 브라우저 코드(`public/`)는 이 문서의 키를 절대 몰라야 합니다.

---

## 1. 전체 구조

```
[브라우저 public/]                [Vercel 서버리스 api/]                 [외부 서비스]
  화면 + core/ 퍼즐 로직  ──fetch──▶  /api/nickname      ──────────────▶ OpenAI Moderation
                                    /api/session/start ──┐
                                    /api/score/submit  ──┼──────────────▶ Supabase (PostgreSQL)
                                    /api/leaderboard   ──┤
                                    /api/hint          ──┴─ + ──────────▶ OpenAI (문장 다듬기)
                                       └ import ../public/js/core/*.js (같은 퍼즐 로직으로 재검증)
```

### 왜 서버를 거치나요?
- **공정성**: 브라우저가 "다 풀었어요, 10초 걸렸어요"라고 보내도, 서버가 같은 코드로 퍼즐을 다시 만들어 **답이 맞는지, 시간이 말이 되는지** 직접 확인합니다.
- **보안**: DB 비밀 키를 브라우저에 두면 누구나 랭킹을 지울 수 있습니다.

---

## 2. 환경변수

| 이름 | 필수 | 설명 | 없을 때 동작 |
|---|---|---|---|
| `SUPABASE_URL` | 예 | Supabase 프로젝트 주소 | DB 쓰는 API가 `503 DB_NOT_CONFIGURED` |
| `SUPABASE_SERVICE_ROLE_KEY` | 예 | 서버용 전체 권한 키 | 위와 같음 |
| `OPENAI_API_KEY` | 아니오 | OpenAI 키 | 닉네임 검사 건너뜀(허용), 힌트는 기본 문장 |
| `OPENAI_MODEL` | 아니오 | 힌트 문장 다듬기 모델 이름 | 힌트는 기본 문장 |

> 모델 이름은 코드에 **직접 쓰지 않고** `OPENAI_MODEL`에서만 읽습니다. (Moderation 모델 이름 `omni-moderation-latest`만 예외로 코드에 씀)

---

## 3. 공통 응답 형식 (`lib/http.js`)

```js
// 성공
{ "ok": true,  "data": { ... } }
// 실패
{ "ok": false, "error": { "code": "INVALID_CODE", "message": "코드 형식이 올바르지 않아요." } }
```

```js
export function sendOk(res, data, status = 200) { res.status(status).json({ ok: true, data }); }
export function sendError(res, status, code, message) { res.status(status).json({ ok: false, error: { code, message } }); }

// 허용 메서드가 아니면 405 응답 후 false
export function allowMethods(req, res, methods) { /* ... */ }

// req.body 가 문자열이면 JSON.parse, 객체면 그대로, 없거나 실패면 {}
export function readJson(req) { /* ... */ }

// 모든 핸들러를 감싸 예상 못 한 에러를 500 SERVER_ERROR 로 바꿈 (console.error 로 code만 기록, 키·답안 전체는 기록 금지)
export function withErrors(handler) { /* ... */ }
```

### 에러 코드 표
| HTTP | code | message (화면에 그대로 보여도 되는 문장) |
|---|---|---|
| 405 | `METHOD_NOT_ALLOWED` | 「허용되지 않은 요청 방식이에요.」 |
| 400 | `BAD_REQUEST` | 「요청 내용이 올바르지 않아요.」 |
| 400 | `INVALID_CODE` | 「코드 형식이 올바르지 않아요.」 |
| 400 | `INVALID_NICKNAME` | 「2~12자의 한글, 영문, 숫자, _ 만 쓸 수 있어요.」 |
| 400 | `NICKNAME_REJECTED` | 「다른 닉네임을 써 주세요.」 |
| 404 | `SESSION_NOT_FOUND` | 「게임 정보를 찾을 수 없어요.」 |
| 409 | `SESSION_FINISHED` | 「이미 끝난 게임이에요.」 |
| 400 | `WRONG_ANSWER` | 「정답이 아니에요.」 |
| 400 | `TIME_MISMATCH` | 「기록 시간을 확인할 수 없어요.」 |
| 400 | `RECORD_TOO_LONG` | 「1시간이 넘은 기록은 랭킹에 오르지 않아요.」 |
| 429 | `HINT_LIMIT` | 「이번 판 힌트를 모두 썼어요.」 |
| 503 | `DB_NOT_CONFIGURED` | 「저장소가 아직 준비되지 않았어요.」 |
| 500 | `SERVER_ERROR` | 「잠시 문제가 생겼어요. 다시 시도해 주세요.」 |

---

## 4. 데이터베이스 (`supabase/schema.sql` — 그대로 작성 후 Supabase SQL Editor에서 실행)

```sql
-- 혼보 HONBO DB 스키마 v1
create extension if not exists pgcrypto;

-- 한 판(세션): 게임 시작 시 생성
create table if not exists public.game_sessions (
  id          uuid primary key default gen_random_uuid(),
  code        text not null check (code ~ '^(FN|MS)-(E|N|H)-[0-9A-HJKMNP-TV-Z]{6}$'),
  game        text not null check (game in ('FN','MS')),
  difficulty  text not null check (difficulty in ('E','N','H')),
  nickname    text not null check (char_length(nickname) between 2 and 12),
  player_id   uuid not null,
  hints_used  int  not null default 0 check (hints_used between 0 and 3),
  started_at  timestamptz not null default now(),
  finished_at timestamptz
);

-- 클리어 기록: 세션당 최대 1개
create table if not exists public.scores (
  id          bigint generated always as identity primary key,
  session_id  uuid not null unique references public.game_sessions(id) on delete cascade,
  code        text not null,
  game        text not null check (game in ('FN','MS')),
  difficulty  text not null check (difficulty in ('E','N','H')),
  nickname    text not null,
  player_id   uuid not null,
  raw_ms      int  not null check (raw_ms between 1000 and 3600000),
  penalty_ms  int  not null default 0 check (penalty_ms >= 0),
  record_ms   int  not null check (record_ms = raw_ms + penalty_ms),
  hints_used  int  not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists scores_board_idx on public.scores (game, difficulty, record_ms, created_at);
create index if not exists scores_code_idx  on public.scores (code, record_ms, created_at);
create index if not exists scores_nick_idx  on public.scores (game, difficulty, nickname);

-- 닉네임별 최고 기록만 모은 뷰 (전체 랭킹용)
create or replace view public.leaderboard_best as
select distinct on (game, difficulty, nickname)
  id, game, difficulty, nickname, record_ms, raw_ms, hints_used, code, created_at
from public.scores
order by game, difficulty, nickname, record_ms asc, created_at asc;

-- 보안: 브라우저용 키(anon)로는 아무것도 못 하게 막음. 서버(service_role)만 접근
alter table public.game_sessions enable row level security;
alter table public.scores        enable row level security;
revoke all on public.game_sessions, public.scores, public.leaderboard_best from anon, authenticated;

-- 힌트 1회 사용 (동시에 여러 번 눌러도 한도를 넘지 않게 DB에서 한 번에 처리)
create or replace function public.use_hint(p_session_id uuid, p_limit int)
returns int
language sql
as $$
  update public.game_sessions
     set hints_used = hints_used + 1
   where id = p_session_id
     and finished_at is null
     and hints_used < p_limit
  returning hints_used;
$$;
revoke execute on function public.use_hint(uuid, int) from public, anon, authenticated;
grant  execute on function public.use_hint(uuid, int) to service_role;
```
> `hints_used between 0 and 3` 의 3은 `HINT_LIMIT`과 같아야 합니다. 상수를 바꾸면 이 줄도 바꿔야 하므로 **사용자에게 먼저 묻습니다.**

### Supabase 클라이언트 (`lib/supabase.js`)
```js
import { createClient } from '@supabase/supabase-js';
let client = null;
// 환경변수가 없으면 null (호출한 쪽에서 503 응답)
export function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  if (!client) client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}
```

---

## 5. API 명세

공통 입력 검사 규칙
- `code`: `parseCode()` 통과 (`core/code.js`)
- `nickname`: 문자열, `trim()` 후 `NICKNAME_REGEX` 통과
- `playerId`, `sessionId`: UUID 형식 `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`
- `rawMs`: 정수(`Number.isInteger`)
- 응답에 `player_id`, `session_id`는 **포함하지 않습니다** (다른 사람 정보 보호)

### 5-1. `POST /api/nickname` — 닉네임 검사 (`api/nickname.js`)
입력 `{ "nickname": "남정_01" }`

처리
1. `NICKNAME_REGEX` 불통과 → `200 { allowed: false, reason: 'RULE' }`
2. `moderateText(nickname)` (6장)
   - `null`(키 없음·실패) → `200 { allowed: true, checked: false }`
   - `flagged: true` → `200 { allowed: false, reason: 'MODERATION' }`
   - 그 외 → `200 { allowed: true, checked: true }`

> 이 API는 DB를 쓰지 않습니다. 검사 로직은 `lib/nickname.js`의 `checkNickname(nickname)`에 두고 5-2에서도 재사용합니다.

### 5-2. `POST /api/session/start` — 게임 시작 (`api/session/start.js`)
입력 `{ "code": "FN-E-7K3QX9", "nickname": "남정_01", "playerId": "uuid" }`

처리
1. 입력 검사 → 실패 시 `INVALID_CODE` / `INVALID_NICKNAME` / `BAD_REQUEST`
2. `checkNickname` → `allowed: false` 면 `NICKNAME_REJECTED`
3. `game_sessions`에 insert (`code`, `game`, `difficulty`, `nickname`, `player_id`)
4. `201 { sessionId, startedAt }`

### 5-3. `POST /api/score/submit` — 클리어 기록 저장 (`api/score/submit.js`)
입력
```json
{ "sessionId": "uuid", "rawMs": 61034, "answer": { "h": [[...]], "v": [[...]] } }
```
(마방진은 `"answer": { "grid": [[2,7,6],[9,5,1],[4,3,8]] }`)

처리 (순서대로)
1. 입력 검사 → `BAD_REQUEST`
2. 세션 조회 → 없음 `SESSION_NOT_FOUND`, `finished_at` 있음 `SESSION_FINISHED`
3. `puzzle = createPuzzle(session.code)` → `validateAnswer(puzzle, answer)` 실패 → `WRONG_ANSWER`
4. 시간 검사
   ```
   serverElapsedMs = 지금 - session.started_at
   rawMs < MIN_RECORD_MS                           → TIME_MISMATCH
   rawMs > MAX_RECORD_MS                           → RECORD_TOO_LONG
   rawMs < serverElapsedMs - TIME_TOLERANCE_MS     → TIME_MISMATCH   (실제 흐른 시간보다 너무 짧게 주장)
   ```
5. 세션 마감 (한 번만 성공하도록):
   `update game_sessions set finished_at = now() where id = ? and finished_at is null` → 바뀐 줄이 0개면 `SESSION_FINISHED`
6. `penaltyMs = session.hints_used × HINT_PENALTY_MS`, `recordMs = rawMs + penaltyMs`
7. `scores`에 insert
8. 전체 순위 계산 (`leaderboard_best`, 같은 game·difficulty)
   ```
   best = 내 닉네임의 record_ms (뷰에서 조회)
   globalRank  = (record_ms < best 인 줄 수) + 1      // 동점은 같은 순위
   globalTotal = 전체 줄 수
   isPersonalBest = (best === recordMs)
   ```
9. 이 퍼즐 순위: `scores`에서 `code` 같은 줄을 `record_ms asc, created_at asc`로 최대 50개 → 닉네임 중복 제거(앞의 것 유지) → 앞 10개 → 순위 계산(동점 같은 순위)
10. 응답 `201`
```json
{
  "recordMs": 91034, "rawMs": 61034, "penaltyMs": 30000, "hintsUsed": 1,
  "isPersonalBest": true, "globalRank": 5, "globalTotal": 128,
  "codeTop": [ { "rank": 1, "nickname": "퍼즐왕", "recordMs": 58100, "hintsUsed": 0 } ]
}
```

### 5-4. `GET /api/leaderboard?game=FN&difficulty=E` — 전체 랭킹 (`api/leaderboard.js`)
처리
1. `game ∈ {FN, MS}`, `difficulty ∈ {E, N, H}` 아니면 `BAD_REQUEST`
2. `leaderboard_best`에서 해당 탭을 `record_ms asc, created_at asc`로 50개
3. 순위 계산: 앞 줄과 `record_ms`가 같으면 같은 순위, 다르면 (자기 위치 + 1)
4. 전체 줄 수(`count: 'exact'`)도 함께

응답 `200`
```json
{
  "game": "FN", "difficulty": "E", "total": 128,
  "entries": [ { "rank": 1, "nickname": "퍼즐왕", "recordMs": 58100, "hintsUsed": 0, "createdAt": "2026-11-23T07:00:00Z" } ]
}
```

### 5-5. `POST /api/hint` — 힌트 (`api/hint.js`)
입력 `{ "sessionId": "uuid", "answer": { ... 5-3과 같은 모양 } }`

처리
1. 입력 검사 → `BAD_REQUEST`
2. 세션 조회 → `SESSION_NOT_FOUND` / `SESSION_FINISHED`
3. `session.hints_used >= HINT_LIMIT` → `HINT_LIMIT`
4. `puzzle = createPuzzle(session.code)`
   `validateAnswer(puzzle, answer).reason === 'SHAPE'` → `BAD_REQUEST` (모양이 틀린 답안 거부)
5. `fact = GAME_REGISTRY[game].hintFact(puzzle, 울타리는 answer / 마방진은 answer.grid)`
6. `rpc('use_hint', { p_session_id, p_limit: HINT_LIMIT })` → 결과 없음(null) → `HINT_LIMIT`
7. `hintText = (await rephraseHint(game, fact)) ?? fact.fallbackText`
8. 응답 `200`
```json
{ "hintText": "...", "kind": "CLUE_OVER", "target": { "type": "cell", "r": 1, "c": 2 }, "hintsUsed": 1, "hintsRemaining": 2 }
```
> OpenAI가 실패해도 6번에서 이미 1회 사용으로 기록되고, 기본 문장을 돌려줍니다.

---

## 6. OpenAI 사용 규칙 (`lib/openai.js`)

### 6-1. 사용하는 곳은 딱 2곳
| 용도 | API | 모델 |
|---|---|---|
| 닉네임 검사 | Moderations | `omni-moderation-latest` |
| 힌트 문장 다듬기 | Chat Completions | `process.env.OPENAI_MODEL` |

> AI가 **퍼즐을 풀거나 정답을 정하지 않습니다.** 정답·힌트 내용은 항상 `core/` 코드가 계산합니다. (AI는 퍼즐 계산을 틀릴 수 있기 때문)

### 6-2. 클라이언트
```js
import OpenAI from 'openai';
let client = null;
// 키가 없으면 null
export function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 8000, maxRetries: 0 });
  return client;
}
```

### 6-3. `moderateText(text)` → `{ flagged: boolean }` 또는 실패 시 `null`
```js
const r = await openai.moderations.create({ model: 'omni-moderation-latest', input: text });
return { flagged: Boolean(r.results?.[0]?.flagged) };
```

### 6-4. `rephraseHint(game, fact)` → 문자열 또는 실패 시 `null`
- `getOpenAI()`가 null이거나 `OPENAI_MODEL`이 비어 있으면 바로 `null`
- `fact.kind === 'NONE'` 이어도 호출 (격려 문장)
- 요청
  ```js
  await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL,
    max_completion_tokens: 300,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `[게임] ${game === 'FN' ? '울타리' : '마방진'}\n[힌트 원문] ${fact.fallbackText}` },
    ],
  });
  ```
- `SYSTEM_PROMPT` (그대로 사용)
  ```
  너는 퍼즐 게임 '혼보'의 다정한 코치야.
  사용자가 준 [힌트 원문]을 더 친근하게 다시 써.
  규칙:
  1. 원문의 뜻, 숫자, 위치 표현(몇 번째 줄, 몇 번째 칸, 반짝이는 칸/선/줄)을 절대 바꾸거나 빼지 마.
  2. 새로운 정답, 숫자, 위치를 지어내지 마.
  3. 한국어 해요체, 1~2문장, 80자 이내.
  4. 이모지는 최대 1개.
  5. 다시 쓴 문장만 출력해. 따옴표나 설명을 붙이지 마.
  ```
- **결과 검사** (하나라도 어기면 `null` → 기본 문장 사용)
  1. 앞뒤 공백·따옴표 제거 후 길이 1~120자
  2. `fact.fallbackText`에 나오는 모든 숫자(`/\d+/g`)가 결과에도 있음
  3. 줄바꿈 2개 이하
- 예외(시간 초과 등)는 잡아서 `null` 반환. 앱이 멈추지 않아야 합니다.

### 6-5. 비용 보호
- 힌트는 세션당 최대 3회 → 판당 OpenAI 호출 최대 3회 + 닉네임 검사(시작·세션마다 1회)
- 재시도 없음(`maxRetries: 0`)

---

## 7. 보안 체크리스트
- [ ] `public/` 안에 `process.env`, Supabase 주소·키, OpenAI 키 없음
- [ ] 브라우저 코드가 `@supabase/supabase-js`를 import 하지 않음
- [ ] 모든 테이블 RLS 켜짐, anon/authenticated 권한 회수 (4장 SQL)
- [ ] 서버 로그에 키·전체 답안을 남기지 않음 (에러 code와 세션 id 앞 8자리 정도만)
- [ ] CORS 헤더를 추가하지 않음 (같은 주소에서만 호출)
- [ ] 답안 배열 크기를 퍼즐 크기와 비교해 다르면 거부 (아주 큰 배열 보내기 방지)

---

## 8. 완료 기준
- [ ] 5장의 5개 API가 명세대로 동작
- [ ] 환경변수가 하나도 없어도 `/api/nickname`은 `allowed:true` 를 돌려주고, DB API는 `503 DB_NOT_CONFIGURED`를 돌려줌 (앱이 멈추지 않음)
- [ ] 같은 세션으로 기록을 두 번 보내면 두 번째는 `409 SESSION_FINISHED`
- [ ] 틀린 답안은 `WRONG_ANSWER`, 너무 짧은 시간은 `TIME_MISMATCH`
- [ ] 힌트를 동시에 5번 보내도 `hints_used`는 3을 넘지 않음

## 9. 검증 방법 (터미널, `npm run dev` 실행 중)

```bash
# 닉네임
curl -s -X POST localhost:3000/api/nickname -H 'content-type: application/json' -d '{"nickname":"남정_01"}'
# → {"ok":true,"data":{"allowed":true,...}}

curl -s -X POST localhost:3000/api/nickname -H 'content-type: application/json' -d '{"nickname":"a"}'
# → {"ok":true,"data":{"allowed":false,"reason":"RULE"}}

# 세션 시작
curl -s -X POST localhost:3000/api/session/start -H 'content-type: application/json' \
  -d '{"code":"MS-E-7K3QX9","nickname":"테스트_1","playerId":"11111111-1111-4111-8111-111111111111"}'
# → {"ok":true,"data":{"sessionId":"...","startedAt":"..."}}

# 틀린 답 제출 (곧바로)
curl -s -X POST localhost:3000/api/score/submit -H 'content-type: application/json' \
  -d '{"sessionId":"<위 sessionId>","rawMs":5000,"answer":{"grid":[[1,2,3],[4,5,6],[7,8,9]]}}'
# → {"ok":false,"error":{"code":"WRONG_ANSWER",...}}

# 랭킹
curl -s 'localhost:3000/api/leaderboard?game=MS&difficulty=E'
# → {"ok":true,"data":{"entries":[...]}}

# 잘못된 탭
curl -s 'localhost:3000/api/leaderboard?game=XX&difficulty=E'
# → {"ok":false,"error":{"code":"BAD_REQUEST",...}}
```

| 추가 확인 | 방법 | 기대 |
|---|---|---|
| 정답 + 정상 시간 | 브라우저에서 실제로 풀기 | `scores`에 1줄 추가, 랭킹 화면에 표시 |
| 시간 조작 | 세션 시작 20초 후 정답 + `rawMs: 2000` 제출 (Node 스크립트나 curl) | `TIME_MISMATCH` |
| 동시 힌트 | 같은 세션으로 힌트 5번 동시 요청 | 성공 3번, `HINT_LIMIT` 2번 |
| anon 차단 | Supabase 대시보드 API 문서의 anon 키로 `scores` 조회 | 권한 오류 또는 빈 결과 |
| OpenAI 없음 | `OPENAI_API_KEY` 비우고 힌트 | 기본 문장이 나옴 |
