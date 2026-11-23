// POST /api/score/submit
import { allowMethods, readJson, sendOk, sendError, withErrors } from '../../lib/http.js';
import { getSupabase } from '../../lib/supabase.js';
import { createPuzzle, validateAnswer } from '../../public/js/core/games.js';
import { HINT_PENALTY_MS, MIN_RECORD_MS, MAX_RECORD_MS, TIME_TOLERANCE_MS } from '../../public/js/core/constants.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default withErrors(async function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) return;
  const body = readJson(req);
  const { sessionId, rawMs, answer } = body;

  if (!sessionId || !UUID_REGEX.test(sessionId) || !Number.isInteger(rawMs) || !answer) {
    return sendError(res, 400, 'BAD_REQUEST', '요청 내용이 올바르지 않아요.');
  }

  const supabase = getSupabase();
  if (!supabase) {
    return sendError(res, 503, 'DB_NOT_CONFIGURED', '저장소가 아직 준비되지 않았어요.');
  }

  // 1. 세션 조회
  const { data: session, error: sessErr } = await supabase
    .from('game_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (sessErr || !session) {
    return sendError(res, 404, 'SESSION_NOT_FOUND', '게임 정보를 찾을 수 없어요.');
  }

  if (session.finished_at) {
    return sendError(res, 409, 'SESSION_FINISHED', '이미 끝난 게임이에요.');
  }

  // 2. 답안 검증
  const puzzle = createPuzzle(session.code);
  const valResult = validateAnswer(puzzle, answer);
  if (!valResult.ok) {
    return sendError(res, 400, 'WRONG_ANSWER', '정답이 아니에요.');
  }

  // 3. 시간 검증
  const now = Date.now();
  const startedAt = new Date(session.started_at).getTime();
  const serverElapsedMs = now - startedAt;

  if (rawMs < MIN_RECORD_MS) {
    return sendError(res, 400, 'TIME_MISMATCH', '기록 시간을 확인할 수 없어요.');
  }
  if (rawMs > MAX_RECORD_MS) {
    return sendError(res, 400, 'RECORD_TOO_LONG', '1시간이 넘은 기록은 랭킹에 오르지 않아요.');
  }
  if (rawMs < serverElapsedMs - TIME_TOLERANCE_MS) {
    return sendError(res, 400, 'TIME_MISMATCH', '기록 시간을 확인할 수 없어요.');
  }

  // 4. 세션 마감 업데이트 (원자적)
  const { data: updatedSession, error: updateErr } = await supabase
    .from('game_sessions')
    .update({ finished_at: new Date(now).toISOString() })
    .eq('id', sessionId)
    .is('finished_at', null)
    .select('id, hints_used')
    .single();

  if (updateErr || !updatedSession) {
    return sendError(res, 409, 'SESSION_FINISHED', '이미 끝난 게임이에요.');
  }

  const penaltyMs = (updatedSession.hints_used || 0) * HINT_PENALTY_MS;
  const recordMs = rawMs + penaltyMs;

  // 5. 점수 저장
  const { error: insertScoreErr } = await supabase
    .from('scores')
    .insert({
      session_id: sessionId,
      code: session.code,
      game: session.game,
      difficulty: session.difficulty,
      nickname: session.nickname,
      player_id: session.player_id,
      raw_ms: rawMs,
      penalty_ms: penaltyMs,
      record_ms: recordMs,
      hints_used: updatedSession.hints_used
    });

  if (insertScoreErr) throw insertScoreErr;

  // 6. 전체 랭킹 통계 조회
  const { data: boardList, count: globalTotal } = await supabase
    .from('leaderboard_best')
    .select('nickname, record_ms', { count: 'exact' })
    .eq('game', session.game)
    .eq('difficulty', session.difficulty)
    .order('record_ms', { ascending: true });

  let globalRank = 1;
  let isPersonalBest = true;
  if (boardList) {
    for (let i = 0; i < boardList.length; i++) {
      if (boardList[i].record_ms < recordMs) {
        globalRank = i + 2;
      }
      if (boardList[i].nickname === session.nickname && boardList[i].record_ms < recordMs) {
        isPersonalBest = false;
      }
    }
  }

  // 7. 이 퍼즐 TOP 10 조회
  const { data: codeScores } = await supabase
    .from('scores')
    .select('nickname, record_ms, hints_used, created_at')
    .eq('code', session.code)
    .order('record_ms', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(50);

  const codeTop = [];
  const seenNicks = new Set();
  let codeRank = 1;
  for (const s of codeScores || []) {
    if (!seenNicks.has(s.nickname)) {
      seenNicks.add(s.nickname);
      codeTop.push({
        rank: codeRank++,
        nickname: s.nickname,
        recordMs: s.record_ms,
        hintsUsed: s.hints_used
      });
      if (codeTop.length >= 10) break;
    }
  }

  sendOk(res, {
    recordMs,
    rawMs,
    penaltyMs,
    hintsUsed: updatedSession.hints_used,
    isPersonalBest,
    globalRank,
    globalTotal: globalTotal || 1,
    codeTop
  }, 201);
});
