// Simple API configuration - PRODUCTION MODE
const API_BASE_URL = 'https://itrack-backend-1.onrender.com';

// Main function to build API URLs
export const buildApiUrl = (endpoint = '') => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  const url = `${API_BASE_URL}/${cleanEndpoint}`;
  
  console.log(`🔗 API URL: ${url}`);
  return url;
};

// Export server status
export const getServerStatus = () => ({
  serverUrl: API_BASE_URL,
});

console.log('📡 API configured for production:', API_BASE_URL);