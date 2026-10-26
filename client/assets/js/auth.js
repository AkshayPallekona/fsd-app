import { api } from './api.js';

let cachedUser = null;
let userPromise = null;

export async function getCurrentUser(forceRefresh = false) {
  if (cachedUser && !forceRefresh) {
    return cachedUser;
  }

  if (userPromise && !forceRefresh) {
    return userPromise;
  }

  userPromise = (async () => {
    try {
      const data = await api.get('/auth/me');
      cachedUser = data ? data.user : null;
      return cachedUser;
    } catch {
      cachedUser = null;
      return null;
    } finally {
      userPromise = null;
    }
  })();

  return userPromise;
}

export async function login(email, password) {
  const data = await api.post('/auth/login', { email, password });
  cachedUser = data.user;
  return cachedUser;
}

export async function register(userData) {
  const data = await api.post('/auth/register', userData);
  cachedUser = data.user;
  return cachedUser;
}

export async function logout() {
  try {
    await api.post('/auth/logout');
  } finally {
    cachedUser = null;
  }
}

export async function updateProfile(profileData) {
  const data = await api.patch('/users/me', profileData);
  cachedUser = data.user;
  return cachedUser;
}

export async function changePassword(currentPassword, newPassword) {
  return await api.patch('/auth/change-password', { currentPassword, newPassword });
}
