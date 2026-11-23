// 로컬 스토리지 상태 관리
const KEY_NICKNAME = 'honbo.nickname';
const KEY_PLAYER_ID = 'honbo.playerId';
const KEY_LAST_SELECT = 'honbo.lastSelect';

export function getNickname() {
  return localStorage.getItem(KEY_NICKNAME) || '';
}

export function setNickname(nickname) {
  localStorage.setItem(KEY_NICKNAME, nickname);
}

export function getPlayerId() {
  let id = localStorage.getItem(KEY_PLAYER_ID);
  if (!id) {
    id = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : 'p_' + Math.random().toString(36).slice(2, 11);
    localStorage.setItem(KEY_PLAYER_ID, id);
  }
  return id;
}

export function getLastSelect() {
  try {
    const raw = localStorage.getItem(KEY_LAST_SELECT);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setLastSelect(data) {
  localStorage.setItem(KEY_LAST_SELECT, JSON.stringify(data));
}
