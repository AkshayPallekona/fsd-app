import { getCurrentUser, logout } from './auth.js';
import { showToast } from './ui.js';

export async function initLayout() {
  const user = await getCurrentUser();
  renderNavbar(user);
  renderFooter();
}

function renderNavbar(user) {
  const navContainer = document.getElementById('navbar-placeholder');
  if (!navContainer) return;

  const currentPath = window.location.pathname;

  navContainer.innerHTML = '';
  const nav = document.createElement('nav');
  nav.className = 'navbar';
  nav.setAttribute('aria-label', 'Main Navigation');

  const container = document.createElement('div');
  container.className = 'container';

  // Brand Link
  const brand = document.createElement('a');
  brand.className = 'brand';
  brand.href = '/pages/home.html';
  brand.textContent = '🏠 RentalPortal';
  container.appendChild(brand);

  // Nav links list
  const ul = document.createElement('ul');
  ul.className = 'nav-links';

  const addLink = (href, label) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = href;
    a.textContent = label;
    if (currentPath.endsWith(href) || (href === '/pages/home.html' && currentPath === '/')) {
      a.className = 'active';
      a.setAttribute('aria-current', 'page');
    }
    li.appendChild(a);
    ul.appendChild(li);
  };

  addLink('/pages/home.html', 'Home');
  addLink('/pages/search.html', 'Search');

  if (user) {
    if (user.role === 'seeker') {
      addLink('/pages/saved.html', 'Saved');
      addLink('/pages/my-inquiries.html', 'My Inquiries');
    } else if (user.role === 'owner') {
      addLink('/pages/owner-dashboard.html', 'Dashboard');
      addLink('/pages/my-listings.html', 'My Listings');
      addLink('/pages/create-listing.html', '+ Post Listing');
      addLink('/pages/inquiry-management.html', 'Inquiries');
    } else if (user.role === 'admin') {
      addLink('/pages/admin-dashboard.html', 'Admin Dashboard');
      addLink('/pages/user-management.html', 'Users');
      addLink('/pages/moderation.html', 'Moderation');
      addLink('/pages/reports.html', 'Reports');
    }

    // Profile link
    addLink('/pages/profile.html', user.name || 'Profile');

    // Logout button
    const logoutLi = document.createElement('li');
    const logoutBtn = document.createElement('button');
    logoutBtn.type = 'button';
    logoutBtn.className = 'btn btn-secondary btn-sm';
    logoutBtn.textContent = 'Log Out';
    logoutBtn.addEventListener('click', async () => {
      await logout();
      showToast('Logged out successfully.', 'info');
      setTimeout(() => {
        window.location.href = '/pages/login.html';
      }, 500);
    });
    logoutLi.appendChild(logoutBtn);
    ul.appendChild(logoutLi);
  } else {
    addLink('/pages/login.html', 'Log In');
    const signupLi = document.createElement('li');
    const signupBtn = document.createElement('a');
    signupBtn.href = '/pages/register.html';
    signupBtn.className = 'btn btn-primary btn-sm';
    signupBtn.textContent = 'Sign Up';
    signupLi.appendChild(signupBtn);
    ul.appendChild(signupLi);
  }

  container.appendChild(ul);
  nav.appendChild(container);
  navContainer.appendChild(nav);
}

function renderFooter() {
  const footerContainer = document.getElementById('footer-placeholder');
  if (!footerContainer) return;

  footerContainer.innerHTML = '';
  const footer = document.createElement('footer');
  footer.className = 'footer';

  const container = document.createElement('div');
  container.className = 'container';

  const grid = document.createElement('div');
  grid.className = 'footer-grid';

  // Col 1: About
  const col1 = document.createElement('div');
  const h41 = document.createElement('h4');
  h41.style.color = '#ffffff';
  h41.style.marginBottom = '0.75rem';
  h41.textContent = 'Rental Portal';
  const p1 = document.createElement('p');
  p1.textContent = 'Find verified rental homes, apartments, villas, and commercial real estate properties with direct owner inquiry messaging.';
  col1.appendChild(h41);
  col1.appendChild(p1);

  // Col 2: Navigation
  const col2 = document.createElement('div');
  const h42 = document.createElement('h4');
  h42.style.color = '#ffffff';
  h42.style.marginBottom = '0.75rem';
  h42.textContent = 'Quick Links';
  const ul2 = document.createElement('ul');
  ul2.style.listStyle = 'none';
  ul2.style.lineHeight = '2';
  ul2.innerHTML = `
    <li><a href="/pages/home.html">Home</a></li>
    <li><a href="/pages/search.html">Explore Listings</a></li>
    <li><a href="/pages/privacy.html">Privacy Policy</a></li>
    <li><a href="/pages/terms.html">Terms of Service</a></li>
  `;
  col2.appendChild(h42);
  col2.appendChild(ul2);

  // Col 3: Portal Info
  const col3 = document.createElement('div');
  const h43 = document.createElement('h4');
  h43.style.color = '#ffffff';
  h43.style.marginBottom = '0.75rem';
  h43.textContent = 'Portal Notice';
  const p3 = document.createElement('p');
  p3.textContent = 'Verified listings with rigorous moderation standards and safe owner-seeker communication.';
  col3.appendChild(h43);
  col3.appendChild(p3);

  grid.appendChild(col1);
  grid.appendChild(col2);
  grid.appendChild(col3);

  // Disclaimer requirement
  const disclaimer = document.createElement('div');
  disclaimer.className = 'footer-disclaimer';
  disclaimer.textContent =
    'Important Notice: The platform provides discovery and inquiry messaging only. The platform does not handle contracts, agreements, or payments.';

  container.appendChild(grid);
  container.appendChild(disclaimer);
  footer.appendChild(container);
  footerContainer.appendChild(footer);
}

// Auto-run if DOM is ready or on DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLayout);
} else {
  initLayout();
}
