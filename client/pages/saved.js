import { api } from '../assets/js/api.js';
import { requireAuth } from '../assets/js/guards.js';
import { createPropertyCard } from '../components/property-card.js';
import { showToast, showLoading, hideLoading } from '../assets/js/ui.js';

await requireAuth();

const grid = document.getElementById('favorites-grid');

async function loadFavorites() {
  showLoading(grid, 'Loading your saved properties...');
  try {
    const data = await api.get('/users/me/favorites');
    hideLoading(grid);

    grid.innerHTML = '';
    if (!data.items || data.items.length === 0) {
      grid.innerHTML = `
        <div class="state-box" style="grid-column: 1 / -1;">
          <h3>No saved properties yet</h3>
          <p>Click the "Save to Favorites" button on any property listing to keep track of it here.</p>
          <a href="/pages/search.html" class="btn btn-primary">Browse Properties</a>
        </div>
      `;
      return;
    }

    data.items.forEach((item) => {
      if (!item.property) return;
      const card = createPropertyCard(item.property);

      // Add Remove Favorite button
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'btn btn-secondary btn-sm';
      removeBtn.style.margin = '0 1.25rem 1.25rem';
      removeBtn.textContent = 'Remove from Saved';
      removeBtn.addEventListener('click', async () => {
        try {
          await api.del(`/properties/${item.property._id}/favorite`);
          showToast('Property removed from saved listings.', 'info');
          card.remove();
          if (grid.children.length === 0) {
            loadFavorites();
          }
        } catch (err) {
          showToast(err.message || 'Failed to remove favorite.', 'error');
        }
      });
      card.appendChild(removeBtn);

      if (item.isUnavailable) {
        const unavailableBanner = document.createElement('div');
        unavailableBanner.style.backgroundColor = '#fee2e2';
        unavailableBanner.style.color = '#991b1b';
        unavailableBanner.style.padding = '0.5rem';
        unavailableBanner.style.textAlign = 'center';
        unavailableBanner.style.fontSize = '0.8rem';
        unavailableBanner.style.fontWeight = '700';
        unavailableBanner.textContent = 'Listing currently unavailable or rented';
        card.prepend(unavailableBanner);
      }

      grid.appendChild(card);
    });
  } catch (err) {
    hideLoading(grid);
    grid.innerHTML = `
      <div class="state-box" style="grid-column: 1 / -1;">
        <p style="color: var(--color-danger);">${err.message || 'Error loading favorites.'}</p>
      </div>
    `;
  }
}

loadFavorites();
