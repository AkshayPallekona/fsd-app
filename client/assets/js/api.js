/**
 * Universal Fetch API wrapper with credentials, CSRF header, and error normalization.
 */

const API_BASE = '/api/v1';

export class ApiError extends Error {
  constructor({ code, message, details, status }) {
    super(message || 'An error occurred during the request.');
    this.name = 'ApiError';
    this.code = code || 'UNKNOWN_ERROR';
    this.status = status !== undefined ? status : 500;
    this.details = details || null;
  }
}

export async function apiRequest(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

  const headers = new Headers(options.headers || {});
  headers.set('X-Requested-With', 'XMLHttpRequest');
  headers.set('Accept', 'application/json');

  let body = options.body;
  if (body && typeof body === 'object' && !(body instanceof FormData) && !(body instanceof URLSearchParams)) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(body);
  }

  const fetchOptions = {
    ...options,
    headers,
    credentials: 'include',
    body
  };

  let response;
  try {
    response = await fetch(url, fetchOptions);
  } catch (networkError) {
    throw new ApiError({
      code: 'NETWORK_ERROR',
      message: 'Network connection failed. Please check your internet connection.',
      status: 0
    });
  }

  if (response.status === 204) {
    return null;
  }

  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const errorPayload = data && data.error ? data.error : {};
    throw new ApiError({
      code: errorPayload.code || `HTTP_${response.status}`,
      message: errorPayload.message || response.statusText || 'Request failed',
      details: errorPayload.details,
      status: response.status
    });
  }

  return data ? data.data : null;
}

export const api = {
  get: (endpoint, options) => apiRequest(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options) => apiRequest(endpoint, { ...options, method: 'POST', body }),
  patch: (endpoint, body, options) => apiRequest(endpoint, { ...options, method: 'PATCH', body }),
  del: (endpoint, options) => apiRequest(endpoint, { ...options, method: 'DELETE' })
};
