import { register } from '../assets/js/auth.js';
import { showToast } from '../assets/js/ui.js';
import { redirectIfAuthenticated } from '../assets/js/guards.js';

await redirectIfAuthenticated();

const form = document.getElementById('register-form');
const alertBox = document.getElementById('alert-box');
const submitBtn = document.getElementById('submit-btn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  alertBox.style.display = 'none';
  alertBox.textContent = '';

  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const role = document.getElementById('role').value;
  const phone = document.getElementById('phone').value.trim();

  // Basic client validation
  if (!name || name.length < 2) {
    showAlert('Please enter your full name (minimum 2 characters).');
    return;
  }
  if (!email || !email.includes('@')) {
    showAlert('Please enter a valid email address.');
    return;
  }
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  if (!passwordRegex.test(password)) {
    showAlert('Password must be at least 8 characters with at least one uppercase letter, one lowercase letter, and one number.');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating Account...';

  try {
    const user = await register({ name, email, password, role, phone });
    showToast('Account created successfully! Welcome to Rental Portal.', 'success');
    setTimeout(() => {
      if (user.role === 'owner') {
        window.location.href = '/pages/owner-dashboard.html';
      } else {
        window.location.href = '/pages/search.html';
      }
    }, 600);
  } catch (error) {
    showAlert(error.message || 'Registration failed.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create Account';
  }
});

function showAlert(msg) {
  alertBox.textContent = msg;
  alertBox.style.display = 'block';
}
