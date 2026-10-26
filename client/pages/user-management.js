import { api } from '../assets/js/api.js';
import { requireAuth } from '../assets/js/guards.js';
import { showToast, confirmDialog, formatDate, escapeHtml } from '../assets/js/ui.js';

const currentUser = await requireAuth(['admin']);

const tbody = document.getElementById('users-tbody');
const roleFilter = document.getElementById('user-role-filter');

roleFilter.addEventListener('change', () => loadUsers());

async function loadUsers() {
  tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem;">Loading user directory...</td></tr>';

  try {
    const role = roleFilter.value;
    const query = role ? `?role=${role}` : '';
    const data = await api.get(`/admin/users${query}`);
    tbody.innerHTML = '';

    const users = data.items || [];
    if (users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--color-text-muted);">No users found.</td></tr>';
      return;
    }

    users.forEach((u) => {
      const tr = document.createElement('tr');

      const statusColor = u.status === 'active' ? '#16a34a' : (u.status === 'suspended' ? '#dc2626' : '#64748b');

      tr.innerHTML = `
        <td><strong>${escapeHtml(u.name)}</strong></td>
        <td>${escapeHtml(u.email)}</td>
        <td><span class="badge badge-status" style="text-transform: capitalize;">${escapeHtml(u.role)}</span></td>
        <td>${escapeHtml(u.phone || '-')}</td>
        <td>
          <span class="badge" style="background-color: ${statusColor}; color: #fff; text-transform: uppercase;">
            ${escapeHtml(u.status)}
          </span>
        </td>
        <td>${formatDate(u.createdAt)}</td>
        <td class="action-cell"></td>
      `;

      const actionCell = tr.querySelector('.action-cell');

      // Rule: Admins cannot suspend themselves or other admins
      const isSelf = currentUser && currentUser._id === u._id;
      const isOtherAdmin = u.role === 'admin';

      if (isSelf || isOtherAdmin) {
        actionCell.innerHTML = '<span style="color: var(--color-text-muted); font-size: 0.8rem;">Protected</span>';
      } else {
        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = `btn btn-sm ${u.status === 'active' ? 'btn-danger' : 'btn-primary'}`;
        toggleBtn.textContent = u.status === 'active' ? 'Suspend' : 'Reactivate';

        toggleBtn.addEventListener('click', async () => {
          const newStatus = u.status === 'active' ? 'suspended' : 'active';
          const confirmed = await confirmDialog(`Are you sure you want to change ${u.name}'s status to ${newStatus}?`);
          if (!confirmed) return;

          try {
            await api.patch(`/admin/users/${u._id}/status`, { status: newStatus });
            showToast(`User status updated to ${newStatus}.`, 'success');
            loadUsers();
          } catch (err) {
            showToast(err.message || 'Failed to update user status.', 'error');
          }
        });

        actionCell.appendChild(toggleBtn);
      }

      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--color-danger); padding: 2rem;">${escapeHtml(err.message || 'Error loading users.')}</td></tr>`;
  }
}

loadUsers();
