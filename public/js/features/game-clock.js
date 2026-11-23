// 스톱워치 및 카운트다운 타이머 시계 모듈
export class GameClock {
  constructor({ timerSec = 0, onTick, onExpire }) {
    this.timerSec = timerSec;
    this.onTick = onTick;
    this.onExpire = onExpire;

    this.elapsedMs = 0;
    this.startTime = null;
    this.timerId = null;
    this.running = false;
    this.expired = false;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.startTime = Date.now() - this.elapsedMs;

    this.timerId = setInterval(() => {
      this.elapsedMs = Date.now() - this.startTime;

      if (this.timerSec > 0) {
        const remainingMs = Math.max(0, this.timerSec * 1000 - this.elapsedMs);
        if (remainingMs === 0 && !this.expired) {
          this.expired = true;
          this.stop();
          if (this.onExpire) this.onExpire();
        }
      }

      if (this.onTick) {
        this.onTick({
          elapsedMs: this.elapsedMs,
          remainingMs: this.timerSec > 0 ? Math.max(0, this.timerSec * 1000 - this.elapsedMs) : null
        });
      }
    }, 100);
  }

  stop() {
    this.running = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  reset() {
    this.stop();
    this.elapsedMs = 0;
    this.startTime = null;
    this.expired = false;
  }

  getElapsedMs() {
    return this.elapsedMs;
  }
}

// 시간 포맷 헬퍼: mm:ss.d
export function formatStopwatch(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const tenths = Math.floor((ms % 1000) / 100);

  const mStr = String(minutes).padStart(2, '0');
  const sStr = String(seconds).padStart(2, '0');
  return `${mStr}:${sStr}.${tenths}`;
}

// 카운트다운 포맷 헬퍼: mm:ss
export function formatTimer(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const mStr = String(minutes).padStart(2, '0');
  const sStr = String(seconds).padStart(2, '0');
  return `${mStr}:${sStr}`;
}
