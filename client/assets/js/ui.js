/**
 * UI Utilities: Accessible toasts, loading states, confirm dialogs, and safe DOM builders.
 */

export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    container.setAttribute('role', 'region');
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-label', 'Notifications');
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'status');

  const textNode = document.createElement('span');
  textNode.textContent = message; // Safe: never innerHTML with user data
  toast.appendChild(textNode);

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'btn-close';
  closeBtn.style.background = 'none';
  closeBtn.style.border = 'none';
  closeBtn.style.color = 'inherit';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.fontSize = '1.2rem';
  closeBtn.style.lineHeight = '1';
  closeBtn.setAttribute('aria-label', 'Close notification');
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', () => toast.remove());
  toast.appendChild(closeBtn);

  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentElement) {
      toast.remove();
    }
  }, 4000);
}

export function showLoading(container, message = 'Loading...') {
  if (!container) return;
  container.setAttribute('aria-busy', 'true');
  const loader = document.createElement('div');
  loader.className = 'state-box loading-state';
  loader.id = 'loader-indicator';

  const spinner = document.createElement('div');
  spinner.className = 'spinner';
  spinner.style.border = '4px solid #e2e8f0';
  spinner.style.borderTop = '4px solid var(--color-accent)';
  spinner.style.borderRadius = '50%';
  spinner.style.width = '36px';
  spinner.style.height = '36px';
  spinner.style.margin = '0 auto 1rem';
  spinner.style.animation = 'spin 1s linear infinite';

  const text = document.createElement('p');
  text.textContent = message;

  loader.appendChild(spinner);
  loader.appendChild(text);
  container.prepend(loader);
}

export function hideLoading(container) {
  if (!container) return;
  container.removeAttribute('aria-busy');
  const loader = container.querySelector('#loader-indicator');
  if (loader) {
    loader.remove();
  }
}

export function confirmDialog(message, title = 'Confirm Action') {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');

    const content = document.createElement('div');
    content.className = 'modal-content';

    const h3 = document.createElement('h3');
    h3.style.marginBottom = '0.75rem';
    h3.style.color = 'var(--color-primary)';
    h3.textContent = title;

    const p = document.createElement('p');
    p.style.marginBottom = '1.5rem';
    p.style.color = 'var(--color-text-muted)';
    p.textContent = message;

    const btnGroup = document.createElement('div');
    btnGroup.style.display = 'flex';
    btnGroup.style.justifyContent = 'flex-end';
    btnGroup.style.gap = '0.75rem';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn btn-secondary';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => {
      backdrop.remove();
      resolve(false);
    });

    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.className = 'btn btn-danger';
    confirmBtn.textContent = 'Confirm';
    confirmBtn.addEventListener('click', () => {
      backdrop.remove();
      resolve(true);
    });

    btnGroup.appendChild(cancelBtn);
    btnGroup.appendChild(confirmBtn);

    content.appendChild(h3);
    content.appendChild(p);
    content.appendChild(btnGroup);
    backdrop.appendChild(content);

    document.body.appendChild(backdrop);
    confirmBtn.focus();
  });
}

export function formatCurrency(amount, purpose = 'rent') {
  if (amount === null || amount === undefined) return '₹0';
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
  return purpose === 'rent' ? `${formatted}/mo` : formatted;
}

export function formatDate(dateString) {
  if (!dateString) return '';
  const d = new Date(dateString);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}
