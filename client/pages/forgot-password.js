import { api } from '../assets/js/api.js';

const form = document.getElementById('forgot-form');
const alertBox = document.getElementById('alert-box');
const successBox = document.getElementById('success-box');
const submitBtn = document.getElementById('submit-btn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  alertBox.style.display = 'none';
  successBox.style.display = 'none';

  const email = document.getElementById('email').value.trim();
  if (!email || !email.includes('@')) {
    alertBox.textContent = 'Please enter a valid email address.';
    alertBox.style.display = 'block';
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending...';

  try {
    await api.post('/auth/forgot-password', { email });
    form.reset();
    successBox.textContent = 'If an account with that email exists, password reset instructions have been sent. Please check your inbox or server console in development mode.';
    successBox.style.display = 'block';
  } catch (error) {
    alertBox.textContent = error.message || 'Unable to request password reset.';
    alertBox.style.display = 'block';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Send Reset Link';
  }
});
