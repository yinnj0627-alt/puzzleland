// 닉네임 검사 도우미
import { NICKNAME_REGEX } from '../public/js/core/constants.js';
import { moderateText } from './openai.js';

export async function checkNickname(nickname) {
  if (!nickname || typeof nickname !== 'string') {
    return { allowed: false, reason: 'RULE' };
  }
  const trimmed = nickname.trim();
  if (!NICKNAME_REGEX.test(trimmed)) {
    return { allowed: false, reason: 'RULE' };
  }

  const mod = await moderateText(trimmed);
  if (mod && mod.flagged) {
    return { allowed: false, reason: 'MODERATION' };
  }

  return { allowed: true, checked: Boolean(mod) };
}
