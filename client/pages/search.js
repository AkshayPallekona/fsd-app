import { api } from '../assets/js/api.js';
import { createPropertyCard } from '../components/property-card.js';
import { showLoading, hideLoading } from '../assets/js/ui.js';

let currentPage = 1;
let totalPages = 1;
const limit = 9;

const inputQ = document.getElementById('filter-q');
const inputCity = document.getElementById('filter-city');
const selectPurpose = document.getElementById('filter-purpose');
const selectType = document.getElementById('filter-type');
const selectFurnishing = document.getElementById('filter-furnishing');
const inputMinPrice = document.getElementById('filter-min-price');
const inputMaxPrice = document.getElementById('filter-max-price');
const selectBedrooms = document.getElementById('filter-bedrooms');
const selectSort = document.getElementById('filter-sort');
const clearBtn = document.getElementById('clear-filters-btn');

const resultsGrid = document.getElementById('results-grid');
const resultsCount = document.getElementById('results-count');
const paginationControls = document.getElementById('pagination-controls');
const prevPageBtn = document.getElementById('prev-page-btn');
const nextPageBtn = document.getElementById('next-page-btn');
const pageIndicator = document.getElementById('page-indicator');

// Parse initial URL query parameters
function initFiltersFromUrl() {
  const params = new URLSearchParams(window.location.search);
  if (params.has('q')) inputQ.value = params.get('q');
  if (params.has('city')) inputCity.value = params.get('city');
  if (params.has('purpose')) selectPurpose.value = params.get('purpose');
  if (params.has('propertyType')) selectType.value = params.get('propertyType');
  if (params.has('furnishing')) selectFurnishing.value = params.get('furnishing');
  if (params.has('minPrice')) inputMinPrice.value = params.get('minPrice');
  if (params.has('maxPrice')) inputMaxPrice.value = params.get('maxPrice');
  if (params.has('bedrooms')) selectBedrooms.value = params.get('bedrooms');
  if (params.has('sort')) selectSort.value = params.get('sort');
  if (params.has('page')) currentPage = parseInt(params.get('page'), 10) || 1;
}

// Debounce helper
function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

async function fetchProperties() {
  showLoading(resultsGrid, 'Searching properties...');

  const params = new URLSearchParams();
  const q = inputQ.value.trim();
  const city = inputCity.value.trim();
  const purpose = selectPurpose.value;
  const propertyType = selectType.value;
  const furnishing = selectFurnishing.value;
  const minPrice = inputMinPrice.value;
  const maxPrice = inputMaxPrice.value;
  const bedrooms = selectBedrooms.value;
  const sort = selectSort.value;

  if (q) params.set('q', q);
  if (city) params.set('city', city);
  if (purpose) params.set('purpose', purpose);
  if (propertyType) params.set('propertyType', propertyType);
  if (furnishing) params.set('furnishing', furnishing);
  if (minPrice) params.set('minPrice', minPrice);
  if (maxPrice) params.set('maxPrice', maxPrice);
  if (bedrooms) params.set('bedrooms', bedrooms);
  if (sort) params.set('sort', sort);
  params.set('page', currentPage);
  params.set('limit', limit);

  // Sync with URL query string
  window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);

  try {
    const data = await api.get(`/properties?${params.toString()}`);
    hideLoading(resultsGrid);

    resultsGrid.innerHTML = '';
    const total = data.total || 0;
    totalPages = data.totalPages || 1;

    resultsCount.textContent = `Showing ${data.items ? data.items.length : 0} of ${total} verified listings`;

    if (!data.items || data.items.length === 0) {
      resultsGrid.innerHTML = `
        <div class="state-box" style="grid-column: 1 / -1;">
          <h3>No properties match your criteria</h3>
          <p>Try broadening your filters, removing keywords, or clearing your price range.</p>
        </div>
      `;
      paginationControls.style.display = 'none';
      return;
    }

    data.items.forEach((item) => {
      resultsGrid.appendChild(createPropertyCard(item));
    });

    // Update pagination controls
    if (totalPages > 1) {
      paginationControls.style.display = 'flex';
      pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
      prevPageBtn.disabled = currentPage <= 1;
      nextPageBtn.disabled = currentPage >= totalPages;
    } else {
      paginationControls.style.display = 'none';
    }
  } catch (err) {
    hideLoading(resultsGrid);
    resultsGrid.innerHTML = `
      <div class="state-box" style="grid-column: 1 / -1;">
        <p style="color: var(--color-danger);">${err.message || 'Error loading properties.'}</p>
      </div>
    `;
    resultsCount.textContent = 'Error loading listings';
  }
}

// Event Listeners with Debounce
const debouncedFetch = debounce(() => {
  currentPage = 1;
  fetchProperties();
}, 300);

inputQ.addEventListener('input', debouncedFetch);
inputCity.addEventListener('input', debouncedFetch);
inputMinPrice.addEventListener('input', debouncedFetch);
inputMaxPrice.addEventListener('input', debouncedFetch);

selectPurpose.addEventListener('change', () => {
  currentPage = 1;
  fetchProperties();
});
selectType.addEventListener('change', () => {
  currentPage = 1;
  fetchProperties();
});
selectFurnishing.addEventListener('change', () => {
  currentPage = 1;
  fetchProperties();
});
selectBedrooms.addEventListener('change', () => {
  currentPage = 1;
  fetchProperties();
});
selectSort.addEventListener('change', () => {
  currentPage = 1;
  fetchProperties();
});

clearBtn.addEventListener('click', () => {
  document.getElementById('filter-form').reset();
  currentPage = 1;
  fetchProperties();
});

prevPageBtn.addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage -= 1;
    fetchProperties();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});

nextPageBtn.addEventListener('click', () => {
  if (currentPage < totalPages) {
    currentPage += 1;
    fetchProperties();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});

// Initialization
initFiltersFromUrl();
fetchProperties();
