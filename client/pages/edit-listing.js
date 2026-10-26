import { api, apiRequest } from '../assets/js/api.js';
import { requireAuth } from '../assets/js/guards.js';
import { showToast, confirmDialog } from '../assets/js/ui.js';

await requireAuth(['owner', 'admin']);

const params = new URLSearchParams(window.location.search);
const propertyId = params.get('id');

const form = document.getElementById('edit-property-form');
const alertBox = document.getElementById('alert-box');
const saveBtn = document.getElementById('save-btn');
const imagePreviewGrid = document.getElementById('image-gallery-preview');

let currentProperty = null;

async function loadProperty() {
  if (!propertyId) {
    showAlert('No property ID provided in URL.');
    form.style.display = 'none';
    return;
  }

  try {
    const data = await api.get(`/properties/${encodeURIComponent(propertyId)}`);
    currentProperty = data.property;

    document.getElementById('title').value = currentProperty.title || '';
    document.getElementById('propertyType').value = currentProperty.propertyType || 'apartment';
    document.getElementById('purpose').value = currentProperty.purpose || 'rent';
    document.getElementById('furnishing').value = currentProperty.furnishing || 'unfurnished';
    document.getElementById('price').value = currentProperty.price || 0;
    document.getElementById('deposit').value = currentProperty.deposit || 0;
    document.getElementById('area').value = currentProperty.area || 0;
    document.getElementById('areaUnit').value = currentProperty.areaUnit || 'sqft';
    document.getElementById('bedrooms').value = currentProperty.bedrooms || 0;
    document.getElementById('bathrooms').value = currentProperty.bathrooms || 0;
    document.getElementById('address').value = currentProperty.address || '';
    document.getElementById('locality').value = currentProperty.locality || '';
    document.getElementById('city').value = currentProperty.city || '';
    document.getElementById('state').value = currentProperty.state || '';
    document.getElementById('postalCode').value = currentProperty.postalCode || '';
    document.getElementById('description').value = currentProperty.description || '';

    renderImages(currentProperty.images || []);
  } catch (err) {
    showAlert(err.message || 'Error loading listing.');
    form.style.display = 'none';
  }
}

function renderImages(images) {
  imagePreviewGrid.innerHTML = '';
  if (images.length === 0) {
    imagePreviewGrid.innerHTML = '<p style="color: var(--color-text-muted); font-size: 0.9rem;">No photos uploaded yet.</p>';
    return;
  }

  images.forEach((img) => {
    const card = document.createElement('div');
    card.className = 'preview-card';

    const imageEl = document.createElement('img');
    imageEl.src = img.url;
    imageEl.alt = 'Uploaded property photo';
    card.appendChild(imageEl);

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'delete-img-btn';
    deleteBtn.textContent = '×';
    deleteBtn.setAttribute('aria-label', 'Delete photo');
    deleteBtn.addEventListener('click', async () => {
      const confirmed = await confirmDialog('Delete this photo from the listing?');
      if (!confirmed) return;
      try {
        await api.del(`/properties/${propertyId}/images/${img._id}`);
        showToast('Photo removed.', 'info');
        loadProperty();
      } catch (err) {
        showToast(err.message || 'Failed to remove photo.', 'error');
      }
    });

    card.appendChild(deleteBtn);
    imagePreviewGrid.appendChild(card);
  });
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  alertBox.style.display = 'none';

  const title = document.getElementById('title').value.trim();
  const propertyType = document.getElementById('propertyType').value;
  const purpose = document.getElementById('purpose').value;
  const furnishing = document.getElementById('furnishing').value;
  const price = parseFloat(document.getElementById('price').value);
  const deposit = parseFloat(document.getElementById('deposit').value) || 0;
  const area = parseFloat(document.getElementById('area').value);
  const areaUnit = document.getElementById('areaUnit').value;
  const bedrooms = parseInt(document.getElementById('bedrooms').value, 10) || 0;
  const bathrooms = parseInt(document.getElementById('bathrooms').value, 10) || 0;
  const address = document.getElementById('address').value.trim();
  const locality = document.getElementById('locality').value.trim();
  const city = document.getElementById('city').value.trim();
  const state = document.getElementById('state').value.trim();
  const postalCode = document.getElementById('postalCode').value.trim();
  const description = document.getElementById('description').value.trim();

  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    // 1. Update property document
    await api.patch(`/properties/${propertyId}`, {
      title,
      propertyType,
      purpose,
      furnishing,
      price,
      deposit,
      area,
      areaUnit,
      bedrooms,
      bathrooms,
      address,
      locality,
      city,
      state,
      postalCode,
      description
    });

    // 2. Upload additional images if any selected
    const fileInput = document.getElementById('new-images');
    const files = fileInput.files;
    if (files && files.length > 0) {
      saveBtn.textContent = 'Uploading New Photos...';
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('images', files[i]);
      }
      await apiRequest(`/properties/${propertyId}/images`, {
        method: 'POST',
        body: formData
      });
      fileInput.value = '';
    }

    showToast('Listing updated successfully!', 'success');
    await loadProperty();
  } catch (err) {
    showAlert(err.message || 'Failed to update property.');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Changes';
  }
});

function showAlert(msg) {
  alertBox.textContent = msg;
  alertBox.style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

loadProperty();
