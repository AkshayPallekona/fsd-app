import * as auth from './auth.js';

/**
 * Route guard helper for frontend pages.
 * Note: Guards provide client-side UX navigation; server authorization is strictly enforced on all API routes.
 */
export async function requireAuth(allowedRoles = []) {
  const user = await auth.getCurrentUser();

  if (!user) {
    const currentPath = window.location.pathname + window.location.search;
    window.location.href = `/pages/login.html?redirect=${encodeURIComponent(currentPath)}`;
    return null;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    window.location.href = '/pages/access-denied.html';
    return null;
  }

  return user;
}

export async function redirectIfAuthenticated(destination = '/pages/home.html') {
  const user = await auth.getCurrentUser();
  if (user) {
    const params = new URLSearchParams(window.location.search);
    const redirectUrl = params.get('redirect') || destination;
    window.location.href = redirectUrl;
    return user;
  }
  return null;
}
