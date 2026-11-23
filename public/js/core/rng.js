// 시드 난수 모듈
// 문자열 → 32비트 정수 (FNV-1a 해시)
export function hashString(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// 32비트 정수 → 0 이상 1 미만 난수를 계속 내놓는 함수 (mulberry32)
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(code) {
  return mulberry32(hashString(code));
}

// 0 ~ n-1 정수
export function randInt(rng, n) {
  return Math.floor(rng() * n);
}

// 배열 섞기 (Fisher–Yates, 뒤에서부터). 원본을 바꾸지 않고 새 배열 반환
export function shuffle(rng, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
