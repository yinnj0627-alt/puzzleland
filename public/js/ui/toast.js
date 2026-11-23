// 토스트 알림 모듈
const root = document.getElementById('toast-root');

export function showToast(message, { type = 'info' } = {}) {
  if (!root) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'toast-error' : ''}`;
  toast.textContent = message;

  // 최대 3개 쌓기
  while (root.children.length >= 3) {
    root.removeChild(root.firstChild);
  }

  root.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => {
      if (toast.parentElement) toast.parentElement.removeChild(toast);
    }, 200);
  }, 2500);
}
