// Enhanced API configuration with dynamic server URL fetching - DEVELOPMENT MODE
let cachedServerUrl = 'http://localhost:5000'; // Default to local development
let isInitialized = false;

// Function to fetch server configuration from backend
const fetchServerConfig = async () => {
  const fallbackUrls = [
    'http://localhost:5000',                  // Primary - Local development for testing
    'http://192.168.254.147:5000',            // Local network fallback 1
    'http://10.0.2.2:5000',                   // Android emulator host
    'https://itrack-backend-1.onrender.com',   // Production Render deployment
    'https://itrack-web-backend.onrender.com', // Secondary - Web backup
    'http://10.97.63.190:5000'                // Local network fallback 2
  ];

  // Try each URL until one works
  for (const url of fallbackUrls) {
    try {
      console.log(`🔄 Trying to fetch server config from: ${url}/api/mobile-config`);
      const response = await fetch(`${url}/api/mobile-config`, {
        method: 'GET',
        timeout: 5000, // 5 second timeout
      });

      if (response.ok) {
        const config = await response.json();
        console.log('✅ Successfully fetched server config:', config);
        cachedServerUrl = config.serverUrl || url;
        isInitialized = true;
        return cachedServerUrl;
      }
    } catch (error) {
      console.log(`❌ Failed to connect to ${url}:`, error.message);
      continue; // Try next URL
    }
  }

  // If all URLs fail, use the primary URL as fallback
  console.log('⚠️ All server URLs failed, using primary fallback');
  cachedServerUrl = fallbackUrls[0];
  isInitialized = true;
  return cachedServerUrl;
};

// Initialize server URL in the background (non-blocking)
const initializeApiAsync = async () => {
  if (!isInitialized) {
    try {
      await fetchServerConfig();
    } catch (error) {
      console.log('Failed to fetch server config, using default URL');
    }
  }
};

// Start initialization immediately when module loads
initializeApiAsync();

// Main function to build API URLs (synchronous for compatibility)
export const buildApiUrl = (endpoint = '') => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  const url = `${cachedServerUrl}/${cleanEndpoint}`;
  
  console.log(`🔗 Built API URL: ${url}`);
  return url;
};

// Function to reset and re-fetch server configuration
export const refreshServerConfig = async () => {
  isInitialized = false;
  return await fetchServerConfig();
};

// Export server status
export const getServerStatus = () => ({
  isInitialized,
  cachedServerUrl,
});

console.log('📡 API configuration module loaded with default URL:', cachedServerUrl);