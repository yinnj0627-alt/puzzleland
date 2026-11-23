// POST /api/hint
import { allowMethods, readJson, sendOk, sendError, withErrors } from '../lib/http.js';
import { getSupabase } from '../lib/supabase.js';
import { rephraseHint } from '../lib/openai.js';
import { createPuzzle, GAME_REGISTRY } from '../public/js/core/games.js';
import { HINT_LIMIT } from '../public/js/core/constants.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default withErrors(async function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) return;
  const body = readJson(req);
  const { sessionId, answer } = body;

  if (!sessionId || !UUID_REGEX.test(sessionId) || !answer) {
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

  if (session.hints_used >= HINT_LIMIT) {
    return sendError(res, 429, 'HINT_LIMIT', '이번 판 힌트를 모두 썼어요.');
  }

  const puzzle = createPuzzle(session.code);
  const gameDef = GAME_REGISTRY[session.game];

  // 답안 모양 검사
  const ansPayload = session.game === 'FN' ? answer : answer.grid;
  const fact = gameDef.hintFact(puzzle, ansPayload);

  // 2. use_hint rpc 실행
  const { data: hintsUsed, error: rpcErr } = await supabase.rpc('use_hint', {
    p_session_id: sessionId,
    p_limit: HINT_LIMIT
  });

  if (rpcErr || hintsUsed === null) {
    return sendError(res, 429, 'HINT_LIMIT', '이번 판 힌트를 모두 썼어요.');
  }

  // 3. AI 문장 다듬기 (실패 시 fallbackText 사용)
  const hintText = (await rephraseHint(session.game, fact)) ?? fact.fallbackText;

  sendOk(res, {
    hintText,
    kind: fact.kind,
    target: fact.target,
    hintsUsed,
    hintsRemaining: HINT_LIMIT - hintsUsed
  });
});
