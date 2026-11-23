// GET /api/leaderboard?game=FN&difficulty=E
import { allowMethods, sendOk, sendError, withErrors } from '../lib/http.js';
import { getSupabase } from '../lib/supabase.js';

export default withErrors(async function handler(req, res) {
  if (!allowMethods(req, res, ['GET'])) return;
  const { game, difficulty } = req.query;

  if (!['FN', 'MS'].includes(game) || !['E', 'N', 'H'].includes(difficulty)) {
    return sendError(res, 400, 'BAD_REQUEST', '요청 내용이 올바르지 않아요.');
  }

  const supabase = getSupabase();
  if (!supabase) {
    return sendError(res, 503, 'DB_NOT_CONFIGURED', '저장소가 아직 준비되지 않았어요.');
  }

  const { data, count, error } = await supabase
    .from('leaderboard_best')
    .select('id, game, difficulty, nickname, record_ms, hints_used, created_at', { count: 'exact' })
    .eq('game', game)
    .eq('difficulty', difficulty)
    .order('record_ms', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(50);

  if (error) throw error;

  let currentRank = 1;
  const entries = (data || []).map((row, idx, arr) => {
    if (idx > 0 && row.record_ms > arr[idx - 1].record_ms) {
      currentRank = idx + 1;
    }
    const d = new Date(row.created_at);
    const dateStr = `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
    return {
      rank: currentRank,
      nickname: row.nickname,
      record_ms: row.record_ms,
      hint_count: row.hints_used,
      date: dateStr
    };
  });

  sendOk(res, {
    game,
    difficulty,
    total: count || 0,
    leaderboard: entries
  });
});
