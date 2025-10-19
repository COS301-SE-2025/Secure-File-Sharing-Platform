// For production (SecureShare server)
const BASE_URL = "https://secureshare.co.za/api";
const FILE_SERVICE_URL = "https://secureshare.co.za/api/files";
const KEY_SERVICE_URL = "https://secureshare.co.za/api/keys";

// For development (localhost)
// const BASE_URL = "http://localhost:5000/api";
// const FILE_SERVICE_URL = "http://localhost:5000/api/files";
// const KEY_SERVICE_URL = "http://localhost:5000/api/keys";

export const API_CONFIG = {
  BASE_URL,
  FILE_SERVICE_URL,
  KEY_SERVICE_URL,
};

// ========================
// Helpers to build full URLs
// ========================

export const getApiUrl = (endpoint) => {
  const fullUrl = `${API_CONFIG.BASE_URL}${endpoint}`;
  console.log('API - Full URL:', fullUrl);
  return fullUrl;
};

export const getFileApiUrl = (endpoint) => {
  const fullUrl = `${API_CONFIG.FILE_SERVICE_URL}${endpoint}`;
  console.log('File API - Full URL:', fullUrl);
  return fullUrl;
};

export const getKeyApiUrl = (endpoint) => {
  const fullUrl = `${API_CONFIG.KEY_SERVICE_URL}${endpoint}`;
  console.log('Key API - Full URL:', fullUrl);
  return fullUrl;
};

// ========================
// Admin-specific endpoints
// ========================

export const getAdminApiUrl = (endpoint) => {
  const fullUrl = `${API_CONFIG.BASE_URL}/admin${endpoint}`;
  console.log('Admin API - Full URL:', fullUrl);
  return fullUrl;
};

// ========================
// Helper for fetch with auth token
// ========================

export const authFetch = async (url, options = {}) => {
  const token = localStorage.getItem('adminToken'); // Electron renderer or browser
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(url, { ...options, headers });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'API request failed');
  }

  return data;
};

// ========================
// Convenience functions
// ========================

export const adminFetch = (endpoint, options = {}) => {
  return authFetch(getAdminApiUrl(endpoint), options);
};

export const fileFetch = (endpoint, options = {}) => {
  return authFetch(getFileApiUrl(endpoint), options);
};

export const keyFetch = (endpoint, options = {}) => {
  return authFetch(getKeyApiUrl(endpoint), options);
};
