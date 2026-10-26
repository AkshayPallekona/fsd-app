import { api } from '../assets/js/api.js';
import { requireAuth } from '../assets/js/guards.js';
import { showLoading, hideLoading } from '../assets/js/ui.js';

await requireAuth(['owner', 'admin']);

const statsGrid = document.getElementById('stats-grid');

async function loadOwnerDashboard() {
  showLoading(statsGrid, 'Loading overview metrics...');
  try {
    const [propertiesData, inquiriesData, reportsData] = await Promise.all([
      api.get('/users/me/properties'),
      api.get('/owner/inquiries'),
      api.get('/owner/reports')
    ]);

    hideLoading(statsGrid);

    const properties = propertiesData.items || [];
    const inquiries = inquiriesData.items || [];
    const reports = reportsData.items || [];

    const publishedCount = properties.filter((p) => p.status === 'published').length;
    const pendingReviewCount = properties.filter((p) => p.status === 'pending_review').length;
    const pendingInquiriesCount = inquiries.filter((i) => i.status === 'pending').length;
    const acceptedToursCount = inquiries.filter((i) => i.type === 'viewing' && i.status === 'accepted').length;

    statsGrid.innerHTML = `
      <div class="form-card" style="margin: 0; max-width: 100%; text-align: center; border-left: 4px solid var(--color-accent);">
        <p style="color: var(--color-text-muted); font-size: 0.85rem; font-weight: 600;">ACTIVE LISTINGS</p>
        <p style="font-size: 2rem; font-weight: 800; color: var(--color-primary); margin: 0.25rem 0;">${publishedCount}</p>
        <span style="font-size: 0.8rem; color: var(--color-text-muted);">${properties.length} total properties</span>
      </div>

      <div class="form-card" style="margin: 0; max-width: 100%; text-align: center; border-left: 4px solid var(--color-warning);">
        <p style="color: var(--color-text-muted); font-size: 0.85rem; font-weight: 600;">PENDING INQUIRIES</p>
        <p style="font-size: 2rem; font-weight: 800; color: var(--color-primary); margin: 0.25rem 0;">${pendingInquiriesCount}</p>
        <span style="font-size: 0.8rem; color: var(--color-text-muted);">Awaiting your reply</span>
      </div>

      <div class="form-card" style="margin: 0; max-width: 100%; text-align: center; border-left: 4px solid var(--color-success);">
        <p style="color: var(--color-text-muted); font-size: 0.85rem; font-weight: 600;">SCHEDULED VIEWINGS</p>
        <p style="font-size: 2rem; font-weight: 800; color: var(--color-primary); margin: 0.25rem 0;">${acceptedToursCount}</p>
        <span style="font-size: 0.8rem; color: var(--color-text-muted);">Accepted appointments</span>
      </div>

      <div class="form-card" style="margin: 0; max-width: 100%; text-align: center; border-left: 4px solid var(--color-primary);">
        <p style="color: var(--color-text-muted); font-size: 0.85rem; font-weight: 600;">REPORTS / MODERATION</p>
        <p style="font-size: 2rem; font-weight: 800; color: var(--color-primary); margin: 0.25rem 0;">${reports.length}</p>
        <span style="font-size: 0.8rem; color: var(--color-text-muted);">${pendingReviewCount} in review</span>
      </div>
    `;
  } catch (err) {
    hideLoading(statsGrid);
    statsGrid.innerHTML = `<div class="state-box"><p style="color: var(--color-danger);">${err.message || 'Error loading dashboard.'}</p></div>`;
  }
}

loadOwnerDashboard();
