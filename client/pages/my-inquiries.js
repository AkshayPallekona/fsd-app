import { api } from '../assets/js/api.js';
import { requireAuth } from '../assets/js/guards.js';
import { showToast, confirmDialog, formatDate, escapeHtml } from '../assets/js/ui.js';

await requireAuth(['seeker', 'owner', 'admin']);

const tbody = document.getElementById('inquiries-tbody');

async function loadMyInquiries() {
  tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem;">Loading inquiries...</td></tr>';

  try {
    const data = await api.get('/users/me/inquiries');
    tbody.innerHTML = '';

    if (!data.items || data.items.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--color-text-muted);">You have not submitted any inquiries or viewing requests yet.</td></tr>';
      return;
    }

    data.items.forEach((inq) => {
      const tr = document.createElement('tr');

      const propTitle = inq.property ? inq.property.title : 'Property Deleted';
      const propLink = inq.property
        ? `<a href="/pages/details.html?id=${inq.property._id}"><strong>${escapeHtml(propTitle)}</strong></a>`
        : '<em>Unavailable</em>';

      const typeLabel = inq.type === 'viewing' ? '🗓️ Viewing' : '💬 Inquiry';
      const scheduleLabel = inq.type === 'viewing' && inq.viewingDate
        ? new Date(inq.viewingDate).toLocaleString()
        : formatDate(inq.createdAt);

      const statusColors = {
        pending: '#d97706',
        accepted: '#16a34a',
        rejected: '#dc2626',
        cancelled: '#64748b',
        completed: '#2563eb'
      };

      tr.innerHTML = `
        <td>${propLink}</td>
        <td><span class="badge badge-status">${typeLabel}</span></td>
        <td style="max-width: 250px;">${escapeHtml(inq.message)}</td>
        <td>${scheduleLabel}</td>
        <td>${escapeHtml(inq.responseMessage || 'Awaiting response')}</td>
        <td>
          <span class="badge" style="background-color: ${statusColors[inq.status] || '#64748b'}; color: #fff; text-transform: uppercase;">
            ${escapeHtml(inq.status)}
          </span>
        </td>
        <td class="action-cell"></td>
      `;

      const actionCell = tr.querySelector('.action-cell');
      if (inq.status === 'pending') {
        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'btn btn-secondary btn-sm';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.addEventListener('click', async () => {
          const confirmed = await confirmDialog('Are you sure you want to cancel this pending inquiry?');
          if (!confirmed) return;
          try {
            await api.patch(`/users/me/inquiries/${inq._id}/cancel`);
            showToast('Inquiry cancelled.', 'info');
            loadMyInquiries();
          } catch (err) {
            showToast(err.message || 'Failed to cancel inquiry.', 'error');
          }
        });
        actionCell.appendChild(cancelBtn);
      } else {
        actionCell.textContent = '-';
      }

      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--color-danger); padding: 2rem;">${escapeHtml(err.message || 'Error loading inquiries.')}</td></tr>`;
  }
}

loadMyInquiries();
