import { api } from '../assets/js/api.js';
import { requireAuth } from '../assets/js/guards.js';
import { showLoading, hideLoading, escapeHtml } from '../assets/js/ui.js';

await requireAuth(['admin']);

const statsGrid = document.getElementById('admin-stats-grid');
const auditTbody = document.getElementById('audit-logs-tbody');

async function loadAdminDashboard() {
  showLoading(statsGrid, 'Loading system stats...');
  try {
    const [dashData, auditData] = await Promise.all([
      api.get('/admin/dashboard'),
      api.get('/admin/audit-logs?limit=10')
    ]);

    hideLoading(statsGrid);
    const stats = dashData.stats;

    statsGrid.innerHTML = `
      <div class="form-card" style="margin: 0; max-width: 100%; border-top: 4px solid var(--color-primary);">
        <p style="color: var(--color-text-muted); font-size: 0.8rem; font-weight: 700;">TOTAL USERS</p>
        <p style="font-size: 2rem; font-weight: 800; color: var(--color-primary); margin: 0.25rem 0;">${stats.users.total}</p>
        <p style="font-size: 0.8rem; color: var(--color-text-muted); margin: 0;">${stats.users.seekers} Seekers • ${stats.users.owners} Owners • ${stats.users.suspended} Suspended</p>
      </div>

      <div class="form-card" style="margin: 0; max-width: 100%; border-top: 4px solid var(--color-accent);">
        <p style="color: var(--color-text-muted); font-size: 0.8rem; font-weight: 700;">LISTINGS INVENTORY</p>
        <p style="font-size: 2rem; font-weight: 800; color: var(--color-primary); margin: 0.25rem 0;">${stats.properties.total}</p>
        <p style="font-size: 0.8rem; color: var(--color-text-muted); margin: 0;">${stats.properties.published} Published • ${stats.properties.rented} Rented • ${stats.properties.sold} Sold</p>
      </div>

      <div class="form-card" style="margin: 0; max-width: 100%; border-top: 4px solid var(--color-warning);">
        <p style="color: var(--color-text-muted); font-size: 0.8rem; font-weight: 700;">PENDING REVIEW</p>
        <p style="font-size: 2rem; font-weight: 800; color: var(--color-warning); margin: 0.25rem 0;">${stats.properties.pendingReview}</p>
        <p style="font-size: 0.8rem; color: var(--color-text-muted); margin: 0;">Listings awaiting moderation</p>
      </div>

      <div class="form-card" style="margin: 0; max-width: 100%; border-top: 4px solid var(--color-danger);">
        <p style="color: var(--color-text-muted); font-size: 0.8rem; font-weight: 700;">FLAGGED REPORTS</p>
        <p style="font-size: 2rem; font-weight: 800; color: var(--color-danger); margin: 0.25rem 0;">${stats.reports.pending}</p>
        <p style="font-size: 0.8rem; color: var(--color-text-muted); margin: 0;">Open user safety reports</p>
      </div>
    `;

    // Render Audit Logs Table
    auditTbody.innerHTML = '';
    const logs = auditData.items || [];
    if (logs.length === 0) {
      auditTbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--color-text-muted);">No administrative actions recorded yet.</td></tr>';
      return;
    }

    logs.forEach((log) => {
      const tr = document.createElement('tr');
      const adminName = log.admin ? log.admin.name : 'System';
      const actionBadge = `<span class="badge" style="background-color: #e2e8f0; color: var(--color-primary);">${escapeHtml(log.action)}</span>`;

      tr.innerHTML = `
        <td><small>${new Date(log.createdAt).toLocaleString()}</small></td>
        <td><strong>${escapeHtml(adminName)}</strong></td>
        <td>${actionBadge}</td>
        <td>${escapeHtml(log.targetType)} (${log.targetId ? log.targetId.substring(0, 8) + '...' : ''})</td>
        <td style="max-width: 300px;"><small>${escapeHtml(JSON.stringify(log.details || {}))}</small></td>
        <td><code>${escapeHtml(log.ip || '127.0.0.1')}</code></td>
      `;
      auditTbody.appendChild(tr);
    });
  } catch (err) {
    hideLoading(statsGrid);
    statsGrid.innerHTML = `<div class="state-box"><p style="color: var(--color-danger);">${err.message || 'Error loading dashboard.'}</p></div>`;
  }
}

loadAdminDashboard();
