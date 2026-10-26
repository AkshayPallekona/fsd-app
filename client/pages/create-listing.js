import { api, apiRequest } from '../assets/js/api.js';
import { requireAuth } from '../assets/js/guards.js';
import { showToast } from '../assets/js/ui.js';

await requireAuth(['owner', 'admin']);

const form = document.getElementById('create-property-form');
const alertBox = document.getElementById('alert-box');
const submitBtn = document.getElementById('submit-btn');

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

  const amenities = Array.from(document.querySelectorAll('input[name="amenities"]:checked')).map(
    (cb) => cb.value
  );

  const fileInput = document.getElementById('property-images');
  const files = fileInput.files;

  if (files.length > 10) {
    showAlert('Maximum 10 images allowed per listing.');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating Listing...';

  try {
    // 1. Create property document
    const propPayload = {
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
      description,
      amenities
    };

    const resData = await api.post('/properties', propPayload);
    const newProperty = resData.property;

    // 2. Upload images if any selected
    if (files && files.length > 0) {
      submitBtn.textContent = 'Uploading Photos...';
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('images', files[i]);
      }

      await apiRequest(`/properties/${newProperty._id}/images`, {
        method: 'POST',
        body: formData
      });
    }

    showToast('Listing draft created successfully!', 'success');
    setTimeout(() => {
      window.location.href = '/pages/my-listings.html';
    }, 600);
  } catch (err) {
    showAlert(err.message || 'Failed to create listing.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create Listing & Save Draft';
  }
});

function showAlert(msg) {
  alertBox.textContent = msg;
  alertBox.style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
