import { api } from '../assets/js/api.js';
import { showToast } from '../assets/js/ui.js';

const params = new URLSearchParams(window.location.search);
const token = params.get('token');

const form = document.getElementById('reset-form');
const alertBox = document.getElementById('alert-box');
const successBox = document.getElementById('success-box');
const submitBtn = document.getElementById('submit-btn');

if (!token) {
  alertBox.textContent = 'Invalid or missing reset token link. Please request a new password reset.';
  alertBox.style.display = 'block';
  form.style.display = 'none';
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  alertBox.style.display = 'none';
  successBox.style.display = 'none';

  const newPassword = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  if (!passwordRegex.test(newPassword)) {
    alertBox.textContent = 'Password must be at least 8 characters with at least one uppercase letter, one lowercase letter, and one number.';
    alertBox.style.display = 'block';
    return;
  }

  if (newPassword !== confirmPassword) {
    alertBox.textContent = 'Passwords do not match.';
    alertBox.style.display = 'block';
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Resetting...';

  try {
    await api.post('/auth/reset-password', { token, newPassword });
    form.style.display = 'none';
    successBox.textContent = 'Your password has been reset successfully! Redirecting to login...';
    successBox.style.display = 'block';
    showToast('Password reset successfully.', 'success');
    setTimeout(() => {
      window.location.href = '/pages/login.html';
    }, 1500);
  } catch (error) {
    alertBox.textContent = error.message || 'Reset failed or token has expired.';
    alertBox.style.display = 'block';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Update Password';
  }
});
