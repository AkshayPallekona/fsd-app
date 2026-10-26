import { api } from '../assets/js/api.js';
import { requireAuth } from '../assets/js/guards.js';
import { showToast, formatDate, escapeHtml } from '../assets/js/ui.js';

await requireAuth(['owner', 'admin']);

const tbody = document.getElementById('owner-inquiries-tbody');

async function loadOwnerInquiries() {
  tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem;">Loading inquiries...</td></tr>';

  try {
    const data = await api.get('/owner/inquiries');
    tbody.innerHTML = '';

    if (!data.items || data.items.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2.5rem; color: var(--color-text-muted);">No inquiries or viewing requests received yet.</td></tr>';
      return;
    }

    const statusColors = {
      pending: '#d97706',
      accepted: '#16a34a',
      rejected: '#dc2626',
      cancelled: '#64748b',
      completed: '#2563eb'
    };

    data.items.forEach((inq) => {
      const tr = document.createElement('tr');

      const propTitle = inq.property ? inq.property.title : 'Listing Deleted';
      const propLink = inq.property
        ? `<a href="/pages/details.html?id=${inq.property._id}"><strong>${escapeHtml(propTitle)}</strong></a>`
        : '<em>Unavailable</em>';

      const clientName = inq.seeker ? inq.seeker.name : 'Unknown User';
      const typeLabel = inq.type === 'viewing' ? '🗓️ Viewing' : '💬 Inquiry';
      const scheduleLabel = inq.type === 'viewing' && inq.viewingDate
        ? new Date(inq.viewingDate).toLocaleString()
        : formatDate(inq.createdAt);

      tr.innerHTML = `
        <td>${propLink}</td>
        <td><strong>${escapeHtml(clientName)}</strong></td>
        <td><span class="badge badge-status">${typeLabel}</span></td>
        <td style="max-width: 250px;">${escapeHtml(inq.message)}</td>
        <td>${scheduleLabel}</td>
        <td>
          <span class="badge" style="background-color: ${statusColors[inq.status] || '#64748b'}; color: #fff; text-transform: uppercase;">
            ${escapeHtml(inq.status)}
          </span>
        </td>
        <td class="action-cell" style="display: flex; gap: 0.4rem; flex-wrap: wrap;"></td>
      `;

      const actionCell = tr.querySelector('.action-cell');

      if (inq.status === 'pending') {
        // Accept button
        const acceptBtn = document.createElement('button');
        acceptBtn.type = 'button';
        acceptBtn.className = 'btn btn-primary btn-sm';
        acceptBtn.textContent = 'Accept';
        acceptBtn.addEventListener('click', () => openRespondModal(inq, 'accepted'));
        actionCell.appendChild(acceptBtn);

        // Reject button
        const rejectBtn = document.createElement('button');
        rejectBtn.type = 'button';
        rejectBtn.className = 'btn btn-secondary btn-sm';
        rejectBtn.textContent = 'Decline';
        rejectBtn.addEventListener('click', () => openRespondModal(inq, 'rejected'));
        actionCell.appendChild(rejectBtn);
      } else if (inq.status === 'accepted') {
        const completeBtn = document.createElement('button');
        completeBtn.type = 'button';
        completeBtn.className = 'btn btn-secondary btn-sm';
        completeBtn.textContent = 'Mark Completed';
        completeBtn.addEventListener('click', async () => {
          try {
            await api.patch(`/owner/inquiries/${inq._id}/status`, { status: 'completed' });
            showToast('Inquiry marked as completed.', 'success');
            loadOwnerInquiries();
          } catch (err) {
            showToast(err.message || 'Status update failed.', 'error');
          }
        });
        actionCell.appendChild(completeBtn);
      } else {
        actionCell.textContent = '-';
      }

      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--color-danger); padding: 2rem;">${escapeHtml(err.message || 'Failed to load inquiries.')}</td></tr>`;
  }
}

function openRespondModal(inquiry, targetStatus) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');

  const content = document.createElement('div');
  content.className = 'modal-content';
  content.innerHTML = `
    <h3 style="color: var(--color-primary); margin-bottom: 0.5rem; text-transform: capitalize;">${targetStatus} Inquiry</h3>
    <p style="color: var(--color-text-muted); font-size: 0.9rem; margin-bottom: 1.25rem;">
      ${targetStatus === 'accepted' ? 'Confirm this request and optionally add meeting instructions or contact details.' : 'Decline this inquiry with an optional polite note.'}
    </p>
    <form id="respond-modal-form">
      <div class="form-group">
        <label for="resp-msg">Response Message (Optional)</label>
        <textarea id="resp-msg" class="form-control" rows="3" placeholder="e.g. Confirmed! Looking forward to meeting you at the property."></textarea>
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
        <button type="button" id="resp-cancel-btn" class="btn btn-secondary">Cancel</button>
        <button type="submit" id="resp-submit-btn" class="btn ${targetStatus === 'accepted' ? 'btn-primary' : 'btn-danger'}">
          Confirm ${targetStatus === 'accepted' ? 'Accept' : 'Decline'}
        </button>
      </div>
    </form>
  `;

  backdrop.appendChild(content);
  document.body.appendChild(backdrop);

  content.querySelector('#resp-cancel-btn').addEventListener('click', () => backdrop.remove());

  content.querySelector('#respond-modal-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const responseMessage = content.querySelector('#resp-msg').value.trim();
    const submitBtn = content.querySelector('#resp-submit-btn');

    submitBtn.disabled = true;
    try {
      await api.patch(`/owner/inquiries/${inquiry._id}/status`, {
        status: targetStatus,
        responseMessage
      });
      backdrop.remove();
      showToast(`Inquiry ${targetStatus} successfully!`, 'success');
      loadOwnerInquiries();
    } catch (err) {
      showToast(err.message || 'Action failed.', 'error');
      submitBtn.disabled = false;
    }
  });
}

loadOwnerInquiries();
