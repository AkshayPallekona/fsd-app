import { login } from '../assets/js/auth.js';
import { showToast } from '../assets/js/ui.js';
import { redirectIfAuthenticated } from '../assets/js/guards.js';

await redirectIfAuthenticated();

const form = document.getElementById('login-form');
const alertBox = document.getElementById('alert-box');
const submitBtn = document.getElementById('submit-btn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  alertBox.style.display = 'none';
  alertBox.textContent = '';

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!email || !password) {
    showAlert('Please enter both email and password.');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Signing in...';

  try {
    const user = await login(email, password);
    showToast(`Welcome back, ${user.name}!`, 'success');

    const params = new URLSearchParams(window.location.search);
    const destination = params.get('redirect');

    setTimeout(() => {
      if (destination) {
        window.location.href = destination;
      } else if (user.role === 'admin') {
        window.location.href = '/pages/admin-dashboard.html';
      } else if (user.role === 'owner') {
        window.location.href = '/pages/owner-dashboard.html';
      } else {
        window.location.href = '/pages/search.html';
      }
    }, 500);
  } catch (error) {
    showAlert(error.message || 'Invalid email or password.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Sign In';
  }
});

function showAlert(msg) {
  alertBox.textContent = msg;
  alertBox.style.display = 'block';
}
