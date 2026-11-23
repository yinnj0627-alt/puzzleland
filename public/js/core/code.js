// 게임 코드 모듈
import { CODE_ALPHABET, CODE_SEED_LENGTH, CODE_REGEX } from './constants.js';

// 새 무작위 코드 만들기 (퍼즐 생성용이 아니라 "씨앗 고르기"용이므로 crypto 사용 가능)
export function createRandomCode(game, difficulty) {
  const bytes = new Uint8Array(CODE_SEED_LENGTH);
  globalThis.crypto.getRandomValues(bytes);
  const seed = Array.from(bytes, b => CODE_ALPHABET[b % 32]).join('');
  return `${game}-${difficulty}-${seed}`;
}

// 입력값 정리: 앞뒤 공백 제거 + 대문자
export function normalizeCode(input) {
  return String(input ?? '').trim().toUpperCase();
}

// 코드 해석 → { ok: true, code, game, difficulty, seed } 또는 { ok: false }
export function parseCode(input) {
  const code = normalizeCode(input);
  if (!CODE_REGEX.test(code)) return { ok: false };
  const [game, difficulty, seed] = code.split('-');
  return { ok: true, code, game, difficulty, seed };
}
