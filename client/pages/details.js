import { api } from '../assets/js/api.js';
import { getCurrentUser } from '../assets/js/auth.js';
import { showToast, showLoading, hideLoading, formatCurrency, formatDate, escapeHtml } from '../assets/js/ui.js';
import { createPropertyCard } from '../components/property-card.js';

const params = new URLSearchParams(window.location.search);
const propertyId = params.get('id');

const container = document.getElementById('details-container');

if (!propertyId) {
  container.innerHTML = `
    <div class="state-box">
      <h3>No property specified</h3>
      <p><a href="/pages/search.html">Explore all property listings</a></p>
    </div>
  `;
} else {
  loadPropertyDetails();
}

async function loadPropertyDetails() {
  showLoading(container, 'Loading listing details...');
  try {
    const [propData, currentUser, similarData] = await Promise.all([
      api.get(`/properties/${encodeURIComponent(propertyId)}`),
      getCurrentUser(),
      api.get(`/properties/${encodeURIComponent(propertyId)}/similar`).catch(() => ({ items: [] }))
    ]);

    hideLoading(container);
    const property = propData.property;
    if (!property) throw new Error('Listing not found');

    renderProperty(property, currentUser, similarData ? similarData.items : []);
  } catch (err) {
    hideLoading(container);
    container.innerHTML = `
      <div class="state-box">
        <h2 style="color: var(--color-danger);">Listing Unavailable</h2>
        <p>${escapeHtml(err.message || 'This property does not exist or has been archived.')}</p>
        <a href="/pages/search.html" class="btn btn-primary">Back to Search</a>
      </div>
    `;
  }
}

function renderProperty(prop, user, similarListings) {
  container.innerHTML = '';

  const headerDiv = document.createElement('div');
  headerDiv.style.marginBottom = '1.5rem';

  const titleRow = document.createElement('div');
  titleRow.style.display = 'flex';
  titleRow.style.justifyContent = 'space-between';
  titleRow.style.alignItems = 'flex-start';
  titleRow.style.gap = '1rem';
  titleRow.style.flexWrap = 'wrap';

  const titleWrap = document.createElement('div');
  const h1 = document.createElement('h1');
  h1.style.color = 'var(--color-primary)';
  h1.style.fontSize = '2rem';
  h1.style.marginBottom = '0.25rem';
  h1.textContent = prop.title;

  const loc = document.createElement('p');
  loc.style.color = 'var(--color-text-muted)';
  loc.style.fontSize = '1.05rem';
  loc.textContent = `📍 ${prop.address}, ${prop.locality}, ${prop.city.toUpperCase()}, ${prop.state} ${prop.postalCode} • ID: ${prop.publicId || ''}`;

  titleWrap.appendChild(h1);
  titleWrap.appendChild(loc);
  titleRow.appendChild(titleWrap);

  // Favorite button
  const favBtn = document.createElement('button');
  favBtn.type = 'button';
  favBtn.className = 'btn btn-secondary';
  favBtn.id = 'fav-btn';
  favBtn.textContent = '❤️ Save to Favorites';
  favBtn.addEventListener('click', () => toggleFavorite(prop._id, favBtn, user));
  titleRow.appendChild(favBtn);

  headerDiv.appendChild(titleRow);
  container.appendChild(headerDiv);

  // Main Grid Layout
  const grid = document.createElement('div');
  grid.className = 'details-grid';

  // Left Column
  const leftCol = document.createElement('div');

  // Gallery
  const gallery = document.createElement('div');
  const mainPhotoBox = document.createElement('div');
  mainPhotoBox.className = 'gallery-main';

  const mainImg = document.createElement('img');
  mainImg.id = 'main-property-image';
  const defaultImage = prop.images && prop.images.length > 0 ? prop.images[0].url : 'data:image/svg+xml,%3Csvg%20width%3D%22600%22%20height%3D%22400%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20fill%3D%22%23cbd5e1%22%20width%3D%22600%22%20height%3D%22400%22%2F%3E%3Ctext%20fill%3D%22%2364748b%22%20x%3D%2250%25%22%20y%3D%2250%25%22%20text-anchor%3D%22middle%22%20font-size%3D%2224%22%20font-family%3Asans-serif%3ENo%20Image%3C%2Ftext%3E%3C%2Fsvg%3E';
  mainImg.src = defaultImage;
  mainImg.alt = prop.title;
  mainPhotoBox.appendChild(mainImg);
  gallery.appendChild(mainPhotoBox);

  // Thumbnails
  if (prop.images && prop.images.length > 1) {
    const thumbs = document.createElement('div');
    thumbs.className = 'gallery-thumbs';
    prop.images.forEach((imgObj, idx) => {
      const tb = document.createElement('button');
      tb.type = 'button';
      tb.className = `thumb-btn ${idx === 0 ? 'active' : ''}`;
      tb.setAttribute('aria-label', `Thumbnail image ${idx + 1}`);
      const tImg = document.createElement('img');
      tImg.src = imgObj.url;
      tImg.alt = `Photo ${idx + 1}`;
      tb.appendChild(tImg);
      tb.addEventListener('click', () => {
        mainImg.src = imgObj.url;
        gallery.querySelectorAll('.thumb-btn').forEach((b) => b.classList.remove('active'));
        tb.classList.add('active');
      });
      thumbs.appendChild(tb);
    });
    gallery.appendChild(thumbs);
  }
  leftCol.appendChild(gallery);

  // Key Specs Banner
  const specs = document.createElement('div');
  specs.className = 'form-card';
  specs.style.margin = '1.5rem 0';
  specs.style.maxWidth = '100%';
  specs.style.padding = '1.25rem';
  specs.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 1rem; text-align: center;">
      <div>
        <span style="font-size: 0.8rem; color: var(--color-text-muted);">PRICE</span>
        <p style="font-size: 1.25rem; font-weight: 800; color: var(--color-primary); margin: 0;">${formatCurrency(prop.price, prop.purpose)}</p>
      </div>
      ${prop.deposit ? `<div><span style="font-size: 0.8rem; color: var(--color-text-muted);">SECURITY DEPOSIT</span><p style="font-size: 1.25rem; font-weight: 700; color: var(--color-primary); margin: 0;">$${prop.deposit.toLocaleString()}</p></div>` : ''}
      <div>
        <span style="font-size: 0.8rem; color: var(--color-text-muted);">BEDROOMS</span>
        <p style="font-size: 1.25rem; font-weight: 700; color: var(--color-primary); margin: 0;">${prop.bedrooms || 0}</p>
      </div>
      <div>
        <span style="font-size: 0.8rem; color: var(--color-text-muted);">BATHROOMS</span>
        <p style="font-size: 1.25rem; font-weight: 700; color: var(--color-primary); margin: 0;">${prop.bathrooms || 0}</p>
      </div>
      <div>
        <span style="font-size: 0.8rem; color: var(--color-text-muted);">AREA</span>
        <p style="font-size: 1.25rem; font-weight: 700; color: var(--color-primary); margin: 0;">${prop.area} ${prop.areaUnit || 'sqft'}</p>
      </div>
      <div>
        <span style="font-size: 0.8rem; color: var(--color-text-muted);">FURNISHING</span>
        <p style="font-size: 1.1rem; font-weight: 700; color: var(--color-primary); margin: 0; text-transform: capitalize;">${(prop.furnishing || '').replace('_', ' ')}</p>
      </div>
    </div>
  `;
  leftCol.appendChild(specs);

  // Description
  const descSection = document.createElement('div');
  descSection.className = 'form-card';
  descSection.style.margin = '1.5rem 0';
  descSection.style.maxWidth = '100%';
  const descH2 = document.createElement('h2');
  descH2.style.fontSize = '1.3rem';
  descH2.style.marginBottom = '1rem';
  descH2.style.color = 'var(--color-primary)';
  descH2.textContent = 'About This Property';
  const descP = document.createElement('p');
  descP.style.lineHeight = '1.7';
  descP.style.whiteSpace = 'pre-line';
  descP.textContent = prop.description;
  descSection.appendChild(descH2);
  descSection.appendChild(descP);
  leftCol.appendChild(descSection);

  // Amenities
  if (prop.amenities && prop.amenities.length > 0) {
    const amenSection = document.createElement('div');
    amenSection.className = 'form-card';
    amenSection.style.margin = '1.5rem 0';
    amenSection.style.maxWidth = '100%';
    const amenH2 = document.createElement('h2');
    amenH2.style.fontSize = '1.3rem';
    amenH2.style.color = 'var(--color-primary)';
    amenH2.textContent = 'Amenities & Features';
    const aList = document.createElement('div');
    aList.className = 'amenities-list';
    prop.amenities.forEach((a) => {
      const badge = document.createElement('span');
      badge.className = 'badge badge-status';
      badge.style.padding = '0.4rem 0.8rem';
      badge.style.fontSize = '0.85rem';
      badge.textContent = `✓ ${a.replace(/_/g, ' ').toUpperCase()}`;
      aList.appendChild(badge);
    });
    amenSection.appendChild(amenH2);
    amenSection.appendChild(aList);
    leftCol.appendChild(amenSection);
  }

  grid.appendChild(leftCol);

  // Right Column (Inquiry / Viewing Sidebar)
  const rightCol = document.createElement('div');

  const inquiryCard = document.createElement('div');
  inquiryCard.className = 'form-card';
  inquiryCard.style.margin = '0 0 1.5rem';
  inquiryCard.style.maxWidth = '100%';

  const inqH2 = document.createElement('h2');
  inqH2.style.fontSize = '1.25rem';
  inqH2.style.color = 'var(--color-primary)';
  inqH2.style.marginBottom = '0.5rem';
  inqH2.textContent = 'Contact Listing Owner';

  const ownerInfo = document.createElement('p');
  ownerInfo.style.fontSize = '0.9rem';
  ownerInfo.style.color = 'var(--color-text-muted)';
  ownerInfo.style.marginBottom = '1.25rem';
  ownerInfo.textContent = `Listed by ${prop.owner ? prop.owner.name : 'Verified Owner'} (Member since ${formatDate(prop.owner?.createdAt)})`;

  inquiryCard.appendChild(inqH2);
  inquiryCard.appendChild(ownerInfo);

  // Inquiry Form
  const inqForm = document.createElement('form');
  inqForm.id = 'inquiry-form';

  const typeGroup = document.createElement('div');
  typeGroup.className = 'form-group';
  typeGroup.innerHTML = `
    <label for="inq-type">Request Type</label>
    <select id="inq-type" class="form-control">
      <option value="inquiry">General Question / Inquiry</option>
      <option value="viewing">Schedule a Property Viewing</option>
    </select>
  `;
  inqForm.appendChild(typeGroup);

  const dateGroup = document.createElement('div');
  dateGroup.className = 'form-group';
  dateGroup.id = 'viewing-date-group';
  dateGroup.style.display = 'none';
  dateGroup.innerHTML = `
    <label for="inq-viewing-date">Preferred Viewing Date & Time</label>
    <input type="datetime-local" id="inq-viewing-date" class="form-control">
    <p class="form-help">Choose a future appointment slot. Slots are booked in 60-minute windows.</p>
  `;
  inqForm.appendChild(dateGroup);

  const msgGroup = document.createElement('div');
  msgGroup.className = 'form-group';
  msgGroup.innerHTML = `
    <label for="inq-message">Message</label>
    <textarea id="inq-message" class="form-control" rows="4" required placeholder="Introduce yourself or ask about availability..."></textarea>
  `;
  inqForm.appendChild(msgGroup);

  const sendBtn = document.createElement('button');
  sendBtn.type = 'submit';
  sendBtn.className = 'btn btn-primary';
  sendBtn.style.width = '100%';
  sendBtn.textContent = 'Send Inquiry';
  inqForm.appendChild(sendBtn);

  // Type change toggle
  const typeSelect = inqForm.querySelector('#inq-type');
  typeSelect.addEventListener('change', () => {
    dateGroup.style.display = typeSelect.value === 'viewing' ? 'block' : 'none';
  });

  // Submit Inquiry Handler
  inqForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!user) {
      showToast('Please log in as a seeker to contact the owner.', 'error');
      setTimeout(() => {
        window.location.href = `/pages/login.html?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      }, 800);
      return;
    }

    const type = typeSelect.value;
    const message = inqForm.querySelector('#inq-message').value.trim();
    const viewingDate = inqForm.querySelector('#inq-viewing-date').value;

    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending...';

    try {
      await api.post(`/properties/${prop._id}/inquiries`, {
        type,
        message,
        viewingDate: type === 'viewing' ? viewingDate : undefined
      });
      showToast('Your inquiry has been submitted to the owner!', 'success');
      inqForm.reset();
      dateGroup.style.display = 'none';
    } catch (err) {
      showToast(err.message || 'Failed to submit inquiry.', 'error');
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = 'Send Inquiry';
    }
  });

  inquiryCard.appendChild(inqForm);
  rightCol.appendChild(inquiryCard);

  // Report property card
  const reportCard = document.createElement('div');
  reportCard.className = 'form-card';
  reportCard.style.margin = '0 0 1.5rem';
  reportCard.style.maxWidth = '100%';
  reportCard.innerHTML = `
    <h3 style="font-size: 1rem; color: var(--color-primary); margin-bottom: 0.5rem;">Listing Trust & Safety</h3>
    <p style="font-size: 0.85rem; color: var(--color-text-muted); margin-bottom: 1rem;">Noticed incorrect info, fraud, or an unavailable property?</p>
  `;
  const reportBtn = document.createElement('button');
  reportBtn.type = 'button';
  reportBtn.className = 'btn btn-secondary btn-sm';
  reportBtn.style.width = '100%';
  reportBtn.textContent = '🚩 Report This Listing';
  reportBtn.addEventListener('click', () => openReportModal(prop._id, user));
  reportCard.appendChild(reportBtn);
  rightCol.appendChild(reportCard);

  grid.appendChild(rightCol);
  container.appendChild(grid);

  // Similar properties section
  if (similarListings && similarListings.length > 0) {
    const simSection = document.createElement('section');
    simSection.style.marginTop = '3rem';
    simSection.innerHTML = `
      <h2 style="font-size: 1.5rem; color: var(--color-primary); margin-bottom: 1.25rem;">Similar Listings You Might Like</h2>
    `;
    const simGrid = document.createElement('div');
    simGrid.className = 'property-grid';
    similarListings.forEach((item) => {
      simGrid.appendChild(createPropertyCard(item));
    });
    simSection.appendChild(simGrid);
    container.appendChild(simSection);
  }
}

async function toggleFavorite(id, btn, user) {
  if (!user) {
    showToast('Please log in to save favorites.', 'error');
    return;
  }
  btn.disabled = true;
  try {
    if (btn.classList.contains('saved')) {
      await api.del(`/properties/${id}/favorite`);
      btn.classList.remove('saved');
      btn.textContent = '❤️ Save to Favorites';
      showToast('Removed from favorites.', 'info');
    } else {
      await api.post(`/properties/${id}/favorite`);
      btn.classList.add('saved');
      btn.textContent = '💖 Saved to Favorites';
      showToast('Property saved to your favorites!', 'success');
    }
  } catch (err) {
    showToast(err.message || 'Action failed.', 'error');
  } finally {
    btn.disabled = false;
  }
}

function openReportModal(id, user) {
  if (!user) {
    showToast('Please log in to report a listing.', 'error');
    return;
  }

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');

  const content = document.createElement('div');
  content.className = 'modal-content';
  content.innerHTML = `
    <h3 style="color: var(--color-primary); margin-bottom: 0.5rem;">Report Listing</h3>
    <p style="color: var(--color-text-muted); font-size: 0.85rem; margin-bottom: 1.25rem;">Our trust and safety team will inspect this listing.</p>
    <form id="report-modal-form">
      <div class="form-group">
        <label for="rep-reason">Reason</label>
        <select id="rep-reason" class="form-control" required>
          <option value="misleading_info">Misleading Information / Photos</option>
          <option value="fraud_or_scam">Suspected Fraud or Scam</option>
          <option value="unavailable_property">Property is Rented or Unavailable</option>
          <option value="prohibited_listing">Prohibited Listing Content</option>
          <option value="other">Other Violation</option>
        </select>
      </div>
      <div class="form-group">
        <label for="rep-details">Explanation</label>
        <textarea id="rep-details" class="form-control" rows="4" minlength="10" maxlength="1500" required placeholder="Please describe the issue in detail (at least 10 characters)..."></textarea>
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
        <button type="button" id="rep-cancel-btn" class="btn btn-secondary">Cancel</button>
        <button type="submit" id="rep-submit-btn" class="btn btn-danger">Submit Report</button>
      </div>
    </form>
  `;

  backdrop.appendChild(content);
  document.body.appendChild(backdrop);

  content.querySelector('#rep-cancel-btn').addEventListener('click', () => backdrop.remove());

  content.querySelector('#report-modal-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const reason = content.querySelector('#rep-reason').value;
    const details = content.querySelector('#rep-details').value.trim();
    const submitBtn = content.querySelector('#rep-submit-btn');

    submitBtn.disabled = true;
    try {
      await api.post(`/properties/${id}/reports`, { reason, details });
      backdrop.remove();
      showToast('Thank you. Your report has been submitted for moderation.', 'success');
    } catch (err) {
      showToast(err.message || 'Report submission failed.', 'error');
      submitBtn.disabled = false;
    }
  });
}
