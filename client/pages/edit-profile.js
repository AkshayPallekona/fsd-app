import { requireAuth } from '../assets/js/guards.js';
import { updateProfile, changePassword } from '../assets/js/auth.js';
import { showToast } from '../assets/js/ui.js';

const user = await requireAuth();
if (user) {
  const nameInput = document.getElementById('name');
  const phoneInput = document.getElementById('phone');
  nameInput.value = user.name || '';
  phoneInput.value = user.phone || '';

  const profileForm = document.getElementById('profile-form');
  const profileAlert = document.getElementById('profile-alert');
  const saveProfileBtn = document.getElementById('save-profile-btn');

  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    profileAlert.style.display = 'none';

    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();

    if (!name || name.length < 2) {
      profileAlert.textContent = 'Name must be at least 2 characters long.';
      profileAlert.style.display = 'block';
      return;
    }

    saveProfileBtn.disabled = true;
    try {
      await updateProfile({ name, phone });
      showToast('Profile updated successfully!', 'success');
    } catch (err) {
      profileAlert.textContent = err.message || 'Failed to update profile.';
      profileAlert.style.display = 'block';
    } finally {
      saveProfileBtn.disabled = false;
    }
  });

  const passwordForm = document.getElementById('password-form');
  const passwordAlert = document.getElementById('password-alert');
  const changePasswordBtn = document.getElementById('change-password-btn');

  passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    passwordAlert.style.display = 'none';

    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmNewPassword = document.getElementById('confirm-new-password').value;

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      passwordAlert.textContent = 'New password must be at least 8 characters with at least one uppercase letter, one lowercase letter, and one number.';
      passwordAlert.style.display = 'block';
      return;
    }

    if (newPassword !== confirmNewPassword) {
      passwordAlert.textContent = 'New passwords do not match.';
      passwordAlert.style.display = 'block';
      return;
    }

    changePasswordBtn.disabled = true;
    try {
      await changePassword(currentPassword, newPassword);
      passwordForm.reset();
      showToast('Password changed successfully.', 'success');
    } catch (err) {
      passwordAlert.textContent = err.message || 'Failed to update password.';
      passwordAlert.style.display = 'block';
    } finally {
      changePasswordBtn.disabled = false;
    }
  });
}
