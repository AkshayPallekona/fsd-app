import { api } from '../assets/js/api.js';
import { createPropertyCard } from '../components/property-card.js';
import { showLoading, hideLoading } from '../assets/js/ui.js';

const searchForm = document.getElementById('hero-search-form');
searchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const q = document.getElementById('quick-query').value.trim();
  const purpose = document.getElementById('quick-purpose').value;
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (purpose) params.set('purpose', purpose);
  window.location.href = `/pages/search.html?${params.toString()}`;
});

const featuredGrid = document.getElementById('featured-grid');
const recentGrid = document.getElementById('recent-grid');

async function loadHomeData() {
  showLoading(featuredGrid, 'Loading featured properties...');
  showLoading(recentGrid, 'Loading recent properties...');

  try {
    const [featuredData, recentData] = await Promise.all([
      api.get('/properties/featured'),
      api.get('/properties/recent')
    ]);

    hideLoading(featuredGrid);
    hideLoading(recentGrid);

    // Render Featured
    featuredGrid.innerHTML = '';
    if (featuredData && featuredData.items && featuredData.items.length > 0) {
      featuredData.items.forEach((item) => {
        featuredGrid.appendChild(createPropertyCard(item));
      });
    } else {
      featuredGrid.innerHTML = '<div class="state-box"><p>No featured properties currently available.</p></div>';
    }

    // Render Recent
    recentGrid.innerHTML = '';
    if (recentData && recentData.items && recentData.items.length > 0) {
      recentData.items.forEach((item) => {
        recentGrid.appendChild(createPropertyCard(item));
      });
    } else {
      recentGrid.innerHTML = '<div class="state-box"><p>No recently added properties found.</p></div>';
    }
  } catch (error) {
    hideLoading(featuredGrid);
    hideLoading(recentGrid);
    featuredGrid.innerHTML = `<div class="state-box"><p style="color: var(--color-danger);">${error.message || 'Failed to load properties.'}</p></div>`;
  }
}

loadHomeData();
