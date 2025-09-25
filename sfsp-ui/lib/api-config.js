// API Configuration for production deployment
console.log('Environment API URL:', process.env.NEXT_PUBLIC_API_URL);
console.log('Environment FILE API URL:', process.env.NEXT_PUBLIC_FILE_API_URL);

export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  FILE_SERVICE_URL: process.env.NEXT_PUBLIC_FILE_API_URL || 'http://localhost:5000/api/files',
  KEY_SERVICE_URL: process.env.NEXT_PUBLIC_KEY_API_URL || 'http://localhost:5000/api/keys'
};

// Helper functions for API endpoints with debugging
export const getApiUrl = (endpoint) => {
  const baseUrl = API_CONFIG.BASE_URL;
  const fullUrl = `${baseUrl}${endpoint}`;
  console.log('API Config - BASE_URL:', baseUrl);
  console.log('API Config - Endpoint:', endpoint);
  console.log('API Config - Full URL:', fullUrl);
  return fullUrl;
};

export const getFileApiUrl = (endpoint) => {
  const baseUrl = API_CONFIG.FILE_SERVICE_URL;
  const fullUrl = `${baseUrl}${endpoint}`;
  console.log('File API Config - BASE_URL:', baseUrl);
  console.log('File API Config - Full URL:', fullUrl);
  return fullUrl;
};

export const getKeyApiUrl = (endpoint) => {
  const baseUrl = API_CONFIG.KEY_SERVICE_URL;
  const fullUrl = `${baseUrl}${endpoint}`;
  console.log('Key API Config - BASE_URL:', baseUrl);
  console.log('Key API Config - Full URL:', fullUrl);
  return fullUrl;
};