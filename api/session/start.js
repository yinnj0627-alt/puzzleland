// POST /api/session/start
import { allowMethods, readJson, sendOk, sendError, withErrors } from '../../lib/http.js';
import { getSupabase } from '../../lib/supabase.js';
import { checkNickname } from '../../lib/nickname.js';
import { parseCode } from '../../public/js/core/code.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default withErrors(async function handler(req, res) {
  if (!allowMethods(req, res, ['POST'])) return;
  const body = readJson(req);
  const { code, nickname, playerId } = body;

  const parsed = parseCode(code);
  if (!parsed.ok) {
    return sendError(res, 400, 'INVALID_CODE', '코드 형식이 올바르지 않아요.');
  }

  if (!playerId || !UUID_REGEX.test(playerId)) {
    return sendError(res, 400, 'BAD_REQUEST', '요청 내용이 올바르지 않아요.');
  }

  const nickCheck = await checkNickname(nickname);
  if (!nickCheck.allowed) {
    return sendError(res, 400, 'NICKNAME_REJECTED', '다른 닉네임을 써 주세요.');
  }

  const supabase = getSupabase();
  if (!supabase) {
    return sendError(res, 503, 'DB_NOT_CONFIGURED', '저장소가 아직 준비되지 않았어요.');
  }

  const { data, error } = await supabase
    .from('game_sessions')
    .insert({
      code: parsed.code,
      game: parsed.game,
      difficulty: parsed.difficulty,
      nickname: nickname.trim(),
      player_id: playerId
    })
    .select('id, started_at')
    .single();

  if (error || !data) {
    throw error || new Error('Session insert failed');
  }

  sendOk(res, { sessionId: data.id, startedAt: data.started_at }, 201);
});
