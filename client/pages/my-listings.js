import { api } from '../assets/js/api.js';
import { requireAuth } from '../assets/js/guards.js';
import { showToast, confirmDialog, formatCurrency, escapeHtml } from '../assets/js/ui.js';

await requireAuth(['owner', 'admin']);

const tbody = document.getElementById('listings-tbody');

async function loadMyListings() {
  tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;">Loading your properties...</td></tr>';

  try {
    const data = await api.get('/users/me/properties');
    tbody.innerHTML = '';

    if (!data.items || data.items.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 2.5rem;">
            <p style="color: var(--color-text-muted); margin-bottom: 1rem;">You don't have any listings yet.</p>
            <a href="/pages/create-listing.html" class="btn btn-primary btn-sm">+ Post Your First Listing</a>
          </td>
        </tr>
      `;
      return;
    }

    const statusBadgeColors = {
      draft: '#64748b',
      pending_review: '#d97706',
      published: '#16a34a',
      rejected: '#dc2626',
      unpublished: '#94a3b8',
      rented: '#475569',
      sold: '#0284c7',
      archived: '#334155'
    };

    data.items.forEach((prop) => {
      const tr = document.createElement('tr');

      const titleLink = `<a href="/pages/details.html?id=${prop._id}"><strong>${escapeHtml(prop.title)}</strong></a><br><small style="color: var(--color-text-muted);">${escapeHtml(prop.locality)}, ${escapeHtml(prop.city)}</small>`;
      const typePurpose = `${(prop.propertyType || '').toUpperCase()} (${prop.purpose === 'rent' ? 'Rent' : 'Sale'})`;
      const priceText = formatCurrency(prop.price, prop.purpose);
      const photoCount = prop.images ? prop.images.length : 0;
      const statusBadge = `<span class="badge" style="background-color: ${statusBadgeColors[prop.status] || '#64748b'}; color: #fff;">${(prop.status || '').replace('_', ' ').toUpperCase()}</span>`;

      tr.innerHTML = `
        <td>${titleLink}</td>
        <td>${escapeHtml(typePurpose)}</td>
        <td><strong>${priceText}</strong></td>
        <td>${photoCount} photo${photoCount === 1 ? '' : 's'}</td>
        <td>${statusBadge}</td>
        <td class="action-buttons" style="display: flex; gap: 0.4rem; flex-wrap: wrap;"></td>
      `;

      const actionsCell = tr.querySelector('.action-buttons');

      // Edit Button
      const editBtn = document.createElement('a');
      editBtn.href = `/pages/edit-listing.html?id=${prop._id}`;
      editBtn.className = 'btn btn-secondary btn-sm';
      editBtn.textContent = 'Edit';
      actionsCell.appendChild(editBtn);

      // Publish / Unpublish actions
      if (['draft', 'unpublished', 'rejected'].includes(prop.status)) {
        const publishBtn = document.createElement('button');
        publishBtn.type = 'button';
        publishBtn.className = 'btn btn-primary btn-sm';
        publishBtn.textContent = 'Publish';
        publishBtn.addEventListener('click', async () => {
          try {
            const res = await api.post(`/properties/${prop._id}/publish`);
            showToast(res.property.status === 'pending_review' ? 'Submitted for moderation review.' : 'Listing published!', 'success');
            loadMyListings();
          } catch (err) {
            showToast(err.message || 'Publishing failed.', 'error');
          }
        });
        actionsCell.appendChild(publishBtn);
      } else if (prop.status === 'published') {
        const unpubBtn = document.createElement('button');
        unpubBtn.type = 'button';
        unpubBtn.className = 'btn btn-secondary btn-sm';
        unpubBtn.textContent = 'Unpublish';
        unpubBtn.addEventListener('click', async () => {
          try {
            await api.post(`/properties/${prop._id}/unpublish`);
            showToast('Listing unpublished.', 'info');
            loadMyListings();
          } catch (err) {
            showToast(err.message || 'Unpublishing failed.', 'error');
          }
        });
        actionsCell.appendChild(unpubBtn);

        // Mark Rented / Sold buttons
        if (prop.purpose === 'rent') {
          const rentedBtn = document.createElement('button');
          rentedBtn.type = 'button';
          rentedBtn.className = 'btn btn-secondary btn-sm';
          rentedBtn.textContent = 'Mark Rented';
          rentedBtn.addEventListener('click', async () => {
            try {
              await api.patch(`/properties/${prop._id}/availability`, { status: 'rented', isAvailable: false });
              showToast('Marked as rented.', 'success');
              loadMyListings();
            } catch (err) {
              showToast(err.message || 'Failed to update status.', 'error');
            }
          });
          actionsCell.appendChild(rentedBtn);
        } else if (prop.purpose === 'sale') {
          const soldBtn = document.createElement('button');
          soldBtn.type = 'button';
          soldBtn.className = 'btn btn-secondary btn-sm';
          soldBtn.textContent = 'Mark Sold';
          soldBtn.addEventListener('click', async () => {
            try {
              await api.patch(`/properties/${prop._id}/availability`, { status: 'sold', isAvailable: false });
              showToast('Marked as sold.', 'success');
              loadMyListings();
            } catch (err) {
              showToast(err.message || 'Failed to update status.', 'error');
            }
          });
          actionsCell.appendChild(soldBtn);
        }
      } else if (['rented', 'sold'].includes(prop.status)) {
        // Re-list button
        const relistBtn = document.createElement('button');
        relistBtn.type = 'button';
        relistBtn.className = 'btn btn-primary btn-sm';
        relistBtn.textContent = 'Re-list';
        relistBtn.addEventListener('click', async () => {
          try {
            await api.patch(`/properties/${prop._id}/availability`, { status: 'published', isAvailable: true });
            showToast('Listing re-listed!', 'success');
            loadMyListings();
          } catch (err) {
            showToast(err.message || 'Failed to re-list.', 'error');
          }
        });
        actionsCell.appendChild(relistBtn);
      }

      // Archive / Delete button
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn btn-danger btn-sm';
      delBtn.textContent = 'Archive';
      delBtn.addEventListener('click', async () => {
        const confirmed = await confirmDialog(`Are you sure you want to archive "${prop.title}"?`);
        if (!confirmed) return;
        try {
          await api.del(`/properties/${prop._id}`);
          showToast('Property listing archived.', 'info');
          loadMyListings();
        } catch (err) {
          showToast(err.message || 'Failed to archive listing.', 'error');
        }
      });
      actionsCell.appendChild(delBtn);

      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--color-danger); padding: 2rem;">${escapeHtml(err.message || 'Failed to load listings.')}</td></tr>`;
  }
}

loadMyListings();
