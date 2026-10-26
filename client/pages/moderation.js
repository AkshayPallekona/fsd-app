import { api } from '../assets/js/api.js';
import { requireAuth } from '../assets/js/guards.js';
import { showToast, confirmDialog, formatCurrency, escapeHtml } from '../assets/js/ui.js';

await requireAuth(['admin']);

const tbody = document.getElementById('moderation-tbody');
const statusFilter = document.getElementById('moderation-filter');

statusFilter.addEventListener('change', () => loadModerationListings());

async function loadModerationListings() {
  tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem;">Loading moderation queue...</td></tr>';

  try {
    const status = statusFilter.value;
    const query = status ? `?status=${status}` : '';
    const data = await api.get(`/admin/properties${query}`);
    tbody.innerHTML = '';

    const properties = data.items || [];
    if (properties.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2.5rem; color: var(--color-text-muted);">No listings found matching this status filter.</td></tr>';
      return;
    }

    properties.forEach((prop) => {
      const tr = document.createElement('tr');
      const titleLink = `<a href="/pages/details.html?id=${prop._id}"><strong>${escapeHtml(prop.title)}</strong></a><br><small>ID: ${escapeHtml(prop.publicId || '')}</small>`;
      const ownerName = prop.owner ? `${escapeHtml(prop.owner.name)} (${escapeHtml(prop.owner.email)})` : 'Unknown Owner';
      const priceText = formatCurrency(prop.price, prop.purpose);
      const photoCount = prop.images ? prop.images.length : 0;

      tr.innerHTML = `
        <td>${titleLink}</td>
        <td><small>${ownerName}</small></td>
        <td><strong>${priceText}</strong><br><small style="text-transform: capitalize;">${prop.propertyType} (${prop.purpose})</small></td>
        <td>${escapeHtml(prop.locality)}, ${escapeHtml(prop.city)}</td>
        <td>${photoCount} photo${photoCount === 1 ? '' : 's'}</td>
        <td><span class="badge badge-status" style="text-transform: uppercase;">${escapeHtml(prop.status)}</span></td>
        <td class="action-cell" style="display: flex; gap: 0.4rem; flex-wrap: wrap;"></td>
      `;

      const actionCell = tr.querySelector('.action-cell');

      if (prop.status === 'pending_review' || prop.status === 'rejected') {
        const approveBtn = document.createElement('button');
        approveBtn.type = 'button';
        approveBtn.className = 'btn btn-primary btn-sm';
        approveBtn.textContent = 'Approve';
        approveBtn.addEventListener('click', async () => {
          try {
            await api.patch(`/admin/properties/${prop._id}/moderation`, {
              status: 'approved',
              note: 'Approved by administrator'
            });
            showToast('Listing approved and published!', 'success');
            loadModerationListings();
          } catch (err) {
            showToast(err.message || 'Approval failed.', 'error');
          }
        });
        actionCell.appendChild(approveBtn);
      }

      if (prop.status === 'pending_review' || prop.status === 'published') {
        const rejectBtn = document.createElement('button');
        rejectBtn.type = 'button';
        rejectBtn.className = 'btn btn-secondary btn-sm';
        rejectBtn.textContent = 'Reject';
        rejectBtn.addEventListener('click', () => openRejectModal(prop));
        actionCell.appendChild(rejectBtn);
      }

      // Prohibited listing removal (Archive)
      if (prop.status !== 'archived') {
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'btn btn-danger btn-sm';
        removeBtn.textContent = 'Remove';
        removeBtn.addEventListener('click', async () => {
          const confirmed = await confirmDialog(`Remove and archive prohibited listing "${prop.title}"?`);
          if (!confirmed) return;
          try {
            await api.del(`/admin/properties/${prop._id}`);
            showToast('Listing removed and archived.', 'info');
            loadModerationListings();
          } catch (err) {
            showToast(err.message || 'Failed to remove listing.', 'error');
          }
        });
        actionCell.appendChild(removeBtn);
      }

      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--color-danger); padding: 2rem;">${escapeHtml(err.message || 'Error loading listings.')}</td></tr>`;
  }
}

function openRejectModal(prop) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');

  const content = document.createElement('div');
  content.className = 'modal-content';
  content.innerHTML = `
    <h3 style="color: var(--color-primary); margin-bottom: 0.5rem;">Reject Listing</h3>
    <p style="color: var(--color-text-muted); font-size: 0.9rem; margin-bottom: 1.25rem;">
      Provide a feedback note so the owner can fix issues and re-submit.
    </p>
    <form id="reject-modal-form">
      <div class="form-group">
        <label for="rej-note">Rejection Reason / Note *</label>
        <textarea id="rej-note" class="form-control" rows="3" required placeholder="e.g. Please provide clear photos of interior rooms and verify the deposit amount..."></textarea>
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
        <button type="button" id="rej-cancel-btn" class="btn btn-secondary">Cancel</button>
        <button type="submit" id="rej-submit-btn" class="btn btn-danger">Confirm Rejection</button>
      </div>
    </form>
  `;

  backdrop.appendChild(content);
  document.body.appendChild(backdrop);

  content.querySelector('#rej-cancel-btn').addEventListener('click', () => backdrop.remove());

  content.querySelector('#reject-modal-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const note = content.querySelector('#rej-note').value.trim();
    const submitBtn = content.querySelector('#rej-submit-btn');

    submitBtn.disabled = true;
    try {
      await api.patch(`/admin/properties/${prop._id}/moderation`, {
        status: 'rejected',
        note
      });
      backdrop.remove();
      showToast('Listing marked as rejected.', 'info');
      loadModerationListings();
    } catch (err) {
      showToast(err.message || 'Rejection failed.', 'error');
      submitBtn.disabled = false;
    }
  });
}

loadModerationListings();
