import { requireAuth } from '../assets/js/guards.js';
import { formatDate } from '../assets/js/ui.js';

const user = await requireAuth();
if (!user) {
  // Guard will redirect
} else {
  const container = document.getElementById('profile-details');
  container.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem;">
      <div>
        <p style="color: var(--color-text-muted); font-size: 0.85rem; margin: 0;">Full Name</p>
        <p style="font-size: 1.15rem; font-weight: 700; color: var(--color-primary); margin: 0;">${escapeHtml(user.name)}</p>
      </div>
      <div>
        <p style="color: var(--color-text-muted); font-size: 0.85rem; margin: 0;">Email Address</p>
        <p style="font-size: 1.15rem; font-weight: 700; color: var(--color-primary); margin: 0;">${escapeHtml(user.email)}</p>
      </div>
      <div>
        <p style="color: var(--color-text-muted); font-size: 0.85rem; margin: 0;">Account Role</p>
        <p style="font-size: 1.15rem; font-weight: 700; color: var(--color-primary); margin: 0; text-transform: capitalize;">${escapeHtml(user.role)}</p>
      </div>
      <div>
        <p style="color: var(--color-text-muted); font-size: 0.85rem; margin: 0;">Phone</p>
        <p style="font-size: 1.15rem; font-weight: 700; color: var(--color-primary); margin: 0;">${escapeHtml(user.phone || 'Not provided')}</p>
      </div>
      <div>
        <p style="color: var(--color-text-muted); font-size: 0.85rem; margin: 0;">Account Status</p>
        <p style="font-size: 1.15rem; font-weight: 700; color: var(--color-success); margin: 0; text-transform: capitalize;">${escapeHtml(user.status)}</p>
      </div>
      <div>
        <p style="color: var(--color-text-muted); font-size: 0.85rem; margin: 0;">Member Since</p>
        <p style="font-size: 1.15rem; font-weight: 700; color: var(--color-primary); margin: 0;">${formatDate(user.createdAt)}</p>
      </div>
    </div>
  `;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
}
