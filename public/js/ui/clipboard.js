// 클립보드 복사 모듈
import { showToast } from './toast.js';

export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      showToast('코드를 복사했어요', { type: 'info' });
      return true;
    }
    // 폴백
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);
    if (successful) {
      showToast('코드를 복사했어요', { type: 'info' });
      return true;
    }
    throw new Error('Fallback failed');
  } catch {
    showToast('복사하지 못했어요. 코드를 길게 눌러 직접 복사해 주세요.', { type: 'error' });
    return false;
  }
}
