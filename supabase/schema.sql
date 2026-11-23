-- 퍼즐랜드 PuzzleLand DB 스키마 v1
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
