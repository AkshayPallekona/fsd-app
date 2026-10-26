/**
 * @jest-environment jsdom
 */

const { apiRequest, ApiError } = require('../client/assets/js/api.js');
const { requireAuth } = require('../client/assets/js/guards.js');
const { escapeHtml, formatCurrency, showToast } = require('../client/assets/js/ui.js');
const authModule = require('../client/assets/js/auth.js');

describe('Frontend Modules Suite (JSDOM)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    jest.restoreAllMocks();
    delete window.location;
    window.location = {
      href: 'http://localhost:5000/pages/home.html',
      pathname: '/pages/home.html',
      search: ''
    };
  });

  describe('api.js fetch wrapper & error normalization', () => {
    test('attaches X-Requested-With header, credentials, and parses successful JSON', async () => {
      const mockData = { success: true, data: { message: 'hello' } };
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockData
      });

      const res = await apiRequest('/test-endpoint', {
        method: 'POST',
        body: { key: 'value' }
      });

      expect(res).toEqual({ message: 'hello' });
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/v1/test-endpoint',
        expect.objectContaining({
          credentials: 'include',
          method: 'POST',
          body: JSON.stringify({ key: 'value' })
        })
      );

      const calledHeaders = global.fetch.mock.calls[0][1].headers;
      expect(calledHeaders.get('X-Requested-With')).toBe('XMLHttpRequest');
      expect(calledHeaders.get('Content-Type')).toBe('application/json');
    });

    test('normalizes error responses into ApiError instances', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity',
        json: async () => ({
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Invalid title',
            details: [{ field: 'title', message: 'Too short' }]
          }
        })
      });

      await expect(apiRequest('/properties', { method: 'POST' })).rejects.toThrow(ApiError);

      try {
        await apiRequest('/properties', { method: 'POST' });
      } catch (err) {
        expect(err.code).toBe('VALIDATION_FAILED');
        expect(err.message).toBe('Invalid title');
        expect(err.status).toBe(422);
        expect(err.details).toEqual([{ field: 'title', message: 'Too short' }]);
      }
    });

    test('handles network failure gracefully', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Failed to fetch'));

      await expect(apiRequest('/test')).rejects.toThrow(ApiError);
      try {
        await apiRequest('/test');
      } catch (err) {
        expect(err.code).toBe('NETWORK_ERROR');
        expect(err.status).toBe(0);
      }
    });
  });

  describe('guards.js route guards', () => {
    test('redirects unauthenticated user to login with return path', async () => {
      jest.spyOn(authModule, 'getCurrentUser').mockResolvedValue(null);
      window.location.pathname = '/pages/create-listing.html';

      const user = await requireAuth(['owner']);
      expect(user).toBeNull();
      expect(window.location.href).toContain('/pages/login.html?redirect=');
    });

    test('redirects authenticated user to access-denied if role is not permitted', async () => {
      jest.spyOn(authModule, 'getCurrentUser').mockResolvedValue({
        _id: '123',
        role: 'seeker'
      });

      const user = await requireAuth(['owner', 'admin']);
      expect(user).toBeNull();
      expect(window.location.href).toBe('/pages/access-denied.html');
    });

    test('allows user with permitted role', async () => {
      const mockUser = { _id: '123', role: 'owner' };
      jest.spyOn(authModule, 'getCurrentUser').mockResolvedValue(mockUser);

      const user = await requireAuth(['owner', 'admin']);
      expect(user).toEqual(mockUser);
    });
  });

  describe('ui.js safe helpers & toasts', () => {
    test('escapeHtml safely handles malicious script injection strings', () => {
      const malicious = '<script>alert("xss")</script>&"\'';
      const escaped = escapeHtml(malicious);
      expect(escaped).not.toContain('<script>');
      expect(escaped).toContain('&lt;script&gt;');
      expect(escaped).toContain('&amp;');
      expect(escaped).toContain('&quot;');
    });

    test('formatCurrency handles rent and sale formatting', () => {
      expect(formatCurrency(2500, 'rent')).toBe('$2,500/mo');
      expect(formatCurrency(500000, 'sale')).toBe('$500,000');
    });

    test('showToast creates accessible toast with textContent', () => {
      showToast('Profile updated!', 'success');
      const container = document.getElementById('toast-container');
      expect(container).not.toBeNull();
      expect(container.getAttribute('role')).toBe('region');
      expect(container.getAttribute('aria-live')).toBe('polite');

      const toast = container.querySelector('.toast');
      expect(toast).not.toBeNull();
      expect(toast.textContent).toContain('Profile updated!');
    });
  });
});
