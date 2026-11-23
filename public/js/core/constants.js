// 모든 숫자 규칙과 게임 설정
export const APP_NAME = '퍼즐랜드';
export const APP_NAME_EN = 'PuzzleLand';
export const GENERATOR_VERSION = 1;

export const DIFFICULTIES = { E: '쉬움', N: '보통', H: '어려움' };

export const FENCE_CONFIG = {
  size:        { E: 5,    N: 7,    H: 10 },
  revealRatio: { E: 0.70, N: 0.55, H: 0.45 },
  regionMin: 0.45,
  regionRange: 0.15,
};

export const MAGIC_CONFIG = {
  size:   { E: 3, N: 4, H: 5 },
  givens: { E: 3, N: 6, H: 9 },
};

export const CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const CODE_SEED_LENGTH = 6;
export const CODE_REGEX = /^(FN|MS)-(E|N|H)-[0-9A-HJKMNP-TV-Z]{6}$/;

export const NICKNAME_REGEX = /^[가-힣a-zA-Z0-9_]{2,12}$/;

export const TIMER_OPTIONS_SEC = [0, 60, 180, 300, 600];
export const HINT_LIMIT = 3;
export const HINT_PENALTY_MS = 30_000;
export const MIN_RECORD_MS = 1_000;
export const MAX_RECORD_MS = 3_600_000;
export const TIME_TOLERANCE_MS = 5_000;
