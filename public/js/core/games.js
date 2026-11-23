// 게임 목록 및 공통 생성/판정 진입점
import { generateFence, validateFence, fenceStatus } from './fence.js';
import { generateMagic, validateMagic, magicStatus } from './magic.js';
import { getFenceHintFact, getMagicHintFact } from './hint-facts.js';
import { parseCode } from './code.js';

export const GAME_REGISTRY = {
  FN: {
    id: 'FN',
    name: '울타리',
    generate: generateFence,
    validate: validateFence,
    status: fenceStatus,
    hintFact: getFenceHintFact
  },
  MS: {
    id: 'MS',
    name: '마방진',
    generate: generateMagic,
    validate: validateMagic,
    status: magicStatus,
    hintFact: getMagicHintFact
  }
};

// 코드 → 퍼즐 (잘못된 코드면 null)
export function createPuzzle(code) {
  const parsed = parseCode(code);
  if (!parsed.ok) return null;
  const game = GAME_REGISTRY[parsed.game];
  if (!game) return null;
  return game.generate(parsed.code, parsed.difficulty);
}

// 답안 표준 모양: FN → { h, v } (0/1), MS → { grid } (빈칸 0)
export function validateAnswer(puzzle, answer) {
  if (!puzzle) return { ok: false, reason: 'INVALID_PUZZLE' };
  return puzzle.game === 'FN'
    ? validateFence(puzzle, answer)
    : validateMagic(puzzle, answer.grid);
}
