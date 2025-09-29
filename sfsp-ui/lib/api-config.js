export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  FILE_SERVICE_URL: process.env.NEXT_PUBLIC_FILE_API_URL || 'http://localhost:5000/api/files',
  KEY_SERVICE_URL: process.env.NEXT_PUBLIC_KEY_API_URL || 'http://localhost:5000/api/keys'
};

// Helper functions for API endpoints with debugging
export const getApiUrl = (endpoint) => {
  const baseUrl = API_CONFIG.BASE_URL;
  const fullUrl = `${baseUrl}${endpoint}`;
  return fullUrl;
};

export const getFileApiUrl = (endpoint) => {
  const baseUrl = API_CONFIG.FILE_SERVICE_URL;
  const fullUrl = `${baseUrl}${endpoint}`;
  return fullUrl;
};

export const getKeyApiUrl = (endpoint) => {
  const baseUrl = API_CONFIG.KEY_SERVICE_URL;
  const fullUrl = `${baseUrl}${endpoint}`;
  return fullUrl;
};