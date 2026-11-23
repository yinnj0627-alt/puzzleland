// 모달 컴포넌트 모듈
const root = document.getElementById('modal-root');

export function openConfirm({ title, message, confirmText = '확인', cancelText = '취소' }) {
  return new Promise((resolve) => {
    let closed = false;
    const previouslyFocused = document.activeElement;

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'modal-title');

    modal.innerHTML = `
      <h3 id="modal-title" class="modal-title">${title}</h3>
      <p class="modal-message">${message}</p>
      <div class="modal-actions">
        <button type="button" class="btn btn-ghost" id="modal-cancel">${cancelText}</button>
        <button type="button" class="btn btn-primary" id="modal-confirm">${confirmText}</button>
      </div>
    `;

    backdrop.appendChild(modal);
    root.appendChild(backdrop);

    const cancelBtn = modal.querySelector('#modal-cancel');
    const confirmBtn = modal.querySelector('#modal-confirm');

    // 포커스는 취소 버튼에 먼저
    cancelBtn.focus();

    function close(result) {
      if (closed) return;
      closed = true;
      document.removeEventListener('keydown', onKeyDown);
      if (backdrop.parentElement) backdrop.parentElement.removeChild(backdrop);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
      resolve(result);
    }

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        close(false);
      } else if (e.key === 'Tab') {
        // 포커스 트랩
        if (e.shiftKey && document.activeElement === cancelBtn) {
          e.preventDefault();
          confirmBtn.focus();
        } else if (!e.shiftKey && document.activeElement === confirmBtn) {
          e.preventDefault();
          cancelBtn.focus();
        }
      }
    }

    document.addEventListener('keydown', onKeyDown);
    cancelBtn.addEventListener('click', () => close(false));
    confirmBtn.addEventListener('click', () => close(true));
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close(false);
    });
  });
}

export function openModal({ title, bodyEl, actions = [], dismissible = true }) {
  const previouslyFocused = document.activeElement;
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';

  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');

  const titleEl = document.createElement('h3');
  titleEl.className = 'modal-title';
  titleEl.textContent = title;
  modal.appendChild(titleEl);

  if (bodyEl) {
    modal.appendChild(bodyEl);
  }

  if (actions.length > 0) {
    const actionsEl = document.createElement('div');
    actionsEl.className = 'modal-actions';
    for (const act of actions) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `btn ${act.className || 'btn-ghost'}`;
      btn.textContent = act.text;
      btn.addEventListener('click', () => {
        if (act.onClick) act.onClick(close);
      });
      actionsEl.appendChild(btn);
    }
    modal.appendChild(actionsEl);
  }

  backdrop.appendChild(modal);
  root.appendChild(backdrop);

  function close() {
    if (backdrop.parentElement) backdrop.parentElement.removeChild(backdrop);
    if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
      previouslyFocused.focus();
    }
  }

  if (dismissible) {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close();
    });
  }

  return { close };
}
