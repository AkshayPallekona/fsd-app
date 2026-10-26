import { api } from '../assets/js/api.js';
import { requireAuth } from '../assets/js/guards.js';
import { showToast, formatDate, escapeHtml } from '../assets/js/ui.js';

const currentUser = await requireAuth(['owner', 'admin']);

const tbody = document.getElementById('reports-tbody');

async function loadReports() {
  tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem;">Loading reports...</td></tr>';

  try {
    const endpoint = currentUser.role === 'admin' ? '/admin/reports' : '/owner/reports';
    const data = await api.get(endpoint);
    tbody.innerHTML = '';

    const reports = data.items || [];
    if (reports.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2.5rem; color: var(--color-text-muted);">No reports filed.</td></tr>';
      return;
    }

    const statusColors = {
      pending: '#d97706',
      reviewed: '#2563eb',
      resolved: '#16a34a',
      dismissed: '#64748b'
    };

    reports.forEach((rep) => {
      const tr = document.createElement('tr');
      const propTitle = rep.property ? rep.property.title : 'Listing Unavailable';
      const propLink = rep.property
        ? `<a href="/pages/details.html?id=${rep.property._id}"><strong>${escapeHtml(propTitle)}</strong></a>`
        : '<em>Unavailable</em>';

      const reporterName = rep.reporter ? rep.reporter.name : 'Seeker';

      tr.innerHTML = `
        <td>${propLink}</td>
        <td><small>${escapeHtml(reporterName)}<br>${formatDate(rep.createdAt)}</small></td>
        <td><span class="badge badge-status">${escapeHtml((rep.reason || '').replace(/_/g, ' '))}</span></td>
        <td style="max-width: 200px;"><small>${escapeHtml(rep.details)}</small></td>
        <td style="max-width: 200px;"><small>${escapeHtml(rep.ownerResponse || 'None provided')}</small></td>
        <td>
          <span class="badge" style="background-color: ${statusColors[rep.status] || '#64748b'}; color: #fff; text-transform: uppercase;">
            ${escapeHtml(rep.status)}
          </span>
        </td>
        <td class="action-cell" style="display: flex; gap: 0.4rem; flex-wrap: wrap;"></td>
      `;

      const actionCell = tr.querySelector('.action-cell');

      // If owner and not resolved/dismissed: can add/edit response
      if (currentUser.role === 'owner' && ['pending', 'reviewed'].includes(rep.status)) {
        const respBtn = document.createElement('button');
        respBtn.type = 'button';
        respBtn.className = 'btn btn-secondary btn-sm';
        respBtn.textContent = rep.ownerResponse ? 'Edit Response' : 'Add Response';
        respBtn.addEventListener('click', () => openOwnerResponseModal(rep));
        actionCell.appendChild(respBtn);
      }

      // If admin: can resolve or dismiss
      if (currentUser.role === 'admin' && ['pending', 'reviewed'].includes(rep.status)) {
        const resolveBtn = document.createElement('button');
        resolveBtn.type = 'button';
        resolveBtn.className = 'btn btn-primary btn-sm';
        resolveBtn.textContent = 'Resolve';
        resolveBtn.addEventListener('click', () => updateAdminReportStatus(rep._id, 'resolved'));
        actionCell.appendChild(resolveBtn);

        const dismissBtn = document.createElement('button');
        dismissBtn.type = 'button';
        dismissBtn.className = 'btn btn-secondary btn-sm';
        dismissBtn.textContent = 'Dismiss';
        dismissBtn.addEventListener('click', () => updateAdminReportStatus(rep._id, 'dismissed'));
        actionCell.appendChild(dismissBtn);
      }

      if (actionCell.children.length === 0) {
        actionCell.textContent = '-';
      }

      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--color-danger); padding: 2rem;">${escapeHtml(err.message || 'Failed to load reports.')}</td></tr>`;
  }
}

function openOwnerResponseModal(report) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');

  const content = document.createElement('div');
  content.className = 'modal-content';
  content.innerHTML = `
    <h3 style="color: var(--color-primary); margin-bottom: 0.5rem;">Respond to Safety Report</h3>
    <p style="color: var(--color-text-muted); font-size: 0.9rem; margin-bottom: 1.25rem;">
      Provide clarification or updates regarding the reported concern.
    </p>
    <form id="owner-resp-modal-form">
      <div class="form-group">
        <label for="owner-resp-text">Your Response *</label>
        <textarea id="owner-resp-text" class="form-control" rows="4" minlength="5" maxlength="1500" required placeholder="Clarify the situation or note any corrections made...">${escapeHtml(report.ownerResponse || '')}</textarea>
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
        <button type="button" id="or-cancel-btn" class="btn btn-secondary">Cancel</button>
        <button type="submit" id="or-submit-btn" class="btn btn-primary">Save Response</button>
      </div>
    </form>
  `;

  backdrop.appendChild(content);
  document.body.appendChild(backdrop);

  content.querySelector('#or-cancel-btn').addEventListener('click', () => backdrop.remove());

  content.querySelector('#owner-resp-modal-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const response = content.querySelector('#owner-resp-text').value.trim();
    const submitBtn = content.querySelector('#or-submit-btn');

    submitBtn.disabled = true;
    try {
      await api.patch(`/owner/reports/${report._id}/response`, { response });
      backdrop.remove();
      showToast('Response recorded successfully.', 'success');
      loadReports();
    } catch (err) {
      showToast(err.message || 'Failed to submit response.', 'error');
      submitBtn.disabled = false;
    }
  });
}

async function updateAdminReportStatus(reportId, newStatus) {
  try {
    await api.patch(`/admin/reports/${reportId}`, {
      status: newStatus,
      adminNotes: `Report marked as ${newStatus} by admin review`
    });
    showToast(`Report marked as ${newStatus}.`, 'success');
    loadReports();
  } catch (err) {
    showToast(err.message || 'Failed to update report status.', 'error');
  }
}

loadReports();
