// Enhanced API Configuration for I-Track Mobile App
// Dynamically fetches server configuration from the backend

// Known server endpoints to try for initial configuration
const INITIAL_SERVER_URLS = [
  'https://itrack-backend.onrender.com',   // Production server
  'http://192.168.254.147:5000',           // Current network
  'http://localhost:5000',                 // Local development
  'http://127.0.0.1:5000',                 // Loopback
  'http://192.168.1.147:5000',             // Common home network
  'http://192.168.0.147:5000',             // Another common range
  'http://192.168.43.147:5000',            // Mobile hotspot
  'http://192.168.100.147:5000',           // Corporate range
  'http://10.0.0.147:5000',                // Another range
  'http://172.16.0.147:5000',              // Corporate network
];

// Global configuration state
let API_CONFIG = null;
let CURRENT_SERVER_URL = null;

// Default endpoints for backwards compatibility
const DEFAULT_ENDPOINTS = {
  LOGIN: '/login',
  GET_USERS: '/getUsers',
  CREATE_USER: '/createUser',
  DELETE_USER: '/deleteUser',
  GET_ALLOCATION: '/getAllocation',
  CREATE_ALLOCATION: '/createAllocation',
  UPDATE_PROCESS: '/updateProcess',
  ADD_PROCESSES: '/addProcesses',
  MARK_READY: '/markReady',
  GET_STOCK: '/getStock',
  CREATE_STOCK: '/createStock',
  UPDATE_STOCK: '/updateStock',
  DELETE_STOCK: '/deleteStock',
  UPDATE_INVENTORY: '/api/inventory',
  GET_REQUEST: '/getRequest',
  GET_COMPLETED_REQUESTS: '/getCompletedRequests',
  DASHBOARD_STATS: '/dashboard/stats',
  CREATE_DISPATCH_ASSIGNMENT: '/api/dispatch/assignments',
  GET_DISPATCH_ASSIGNMENTS: '/api/dispatch/assignments',
  UPDATE_DISPATCH_PROCESS: '/api/dispatch/assignments/:id/process',
  RELEASE_CONFIRM: '/api/release/confirm',
  RELEASE_HISTORY: '/api/release/history',
  TEST: '/test',
  HEALTH: '/health',
  CONFIG: '/api/config'
};

// Test server connectivity with health check
const testServerConnection = async (url) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
    
    const response = await fetch(`${url}/health`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.log(`❌ Connection test failed for ${url}:`, error.message);
    return false;
  }
};

// Find the first working server and fetch its configuration
const discoverServerConfig = async () => {
  console.log('🔍 Discovering available server...');
  
  for (const url of INITIAL_SERVER_URLS) {
    console.log(`⏳ Testing server: ${url}`);
    
    try {
      // Test basic connectivity
      const isHealthy = await testServerConnection(url);
      if (!isHealthy) continue;
      
      // Fetch dynamic configuration
      const configResponse = await fetch(`${url}/api/config`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      });
      
      if (configResponse.ok) {
        const config = await configResponse.json();
        
        if (config.success) {
          console.log(`✅ Server discovered: ${url}`);
          console.log(`🌐 Environment: ${config.environment}`);
          console.log(`📍 Server IP: ${config.serverInfo.primaryIP}`);
          
          CURRENT_SERVER_URL = url;
          API_CONFIG = {
            serverUrl: url,
            ...config
          };
          
          return API_CONFIG;
        }
      }
    } catch (error) {
      console.log(`❌ Config fetch failed for ${url}:`, error.message);
      continue;
    }
  }
  
  // Fallback to first URL if no server responds with config
  console.warn('⚠️ No server responded with config, using fallback');
  CURRENT_SERVER_URL = INITIAL_SERVER_URLS[0];
  API_CONFIG = {
    serverUrl: CURRENT_SERVER_URL,
    environment: 'unknown',
    apiUrls: {
      recommended: CURRENT_SERVER_URL
    }
  };
  
  return API_CONFIG;
};

// Get current API base URL
export const getApiBaseUrl = () => {
  if (API_CONFIG) {
    return API_CONFIG.apiUrls?.recommended || API_CONFIG.serverUrl || CURRENT_SERVER_URL;
  }
  return CURRENT_SERVER_URL || INITIAL_SERVER_URLS[0];
};

// Build full API URL for endpoint
export const buildApiUrl = (endpoint) => {
  return `${getApiBaseUrl()}${endpoint}`;
};

// Initialize API configuration
export const initializeApi = async (forceRefresh = false) => {
  if (API_CONFIG && !forceRefresh) {
    return API_CONFIG;
  }
  
  try {
    console.log('� Initializing I-Track Mobile API...');
    const config = await discoverServerConfig();
    
    console.log(`📱 API initialized successfully!`);
    console.log(`🔗 Server: ${getApiBaseUrl()}`);
    console.log(`🏷️ Environment: ${config.environment}`);
    
    return config;
  } catch (error) {
    console.error(`❌ API initialization failed:`, error.message);
    throw error;
  }
};

// Network-aware fetch with automatic failover
export const safeFetch = async (endpoint, options = {}) => {
  // Ensure API is initialized
  if (!API_CONFIG) {
    await initializeApi();
  }
  
  const url = buildApiUrl(endpoint);
  
  try {
    const response = await fetch(url, {
      ...options,
      timeout: 10000, // 10 second timeout
    });
    
    if (response.ok) {
      return response;
    }
    
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  } catch (error) {
    console.error(`❌ Request failed for ${url}:`, error.message);
    
    // Try to discover new server if current one failed
    console.log('🔄 Attempting to discover alternative server...');
    try {
      await initializeApi(true); // Force refresh
      const newUrl = buildApiUrl(endpoint);
      
      const response = await fetch(newUrl, {
        ...options,
        timeout: 10000,
      });
      
      if (response.ok) {
        console.log(`✅ Successfully switched to: ${getApiBaseUrl()}`);
        return response;
      }
    } catch (retryError) {
      console.error(`❌ Retry also failed:`, retryError.message);
    }
    
    throw error;
  }
};

// Get server status
export const getServerStatus = async () => {
  try {
    const response = await safeFetch('/health');
    const data = await response.json();
    
    return {
      online: true,
      status: data.status,
      serverUrl: getApiBaseUrl(),
      environment: API_CONFIG?.environment,
      timestamp: data.timestamp || new Date().toISOString()
    };
  } catch (error) {
    return {
      online: false,
      error: error.message,
      serverUrl: getApiBaseUrl(),
      timestamp: new Date().toISOString()
    };
  }
};

// Refresh connection (useful when switching networks)
export const refreshConnection = async () => {
  console.log('🔄 Refreshing connection...');
  
  // Reset state
  API_CONFIG = null;
  CURRENT_SERVER_URL = null;
  
  // Rediscover server
  await initializeApi(true);
  const status = await getServerStatus();
  
  console.log('📊 Connection refresh result:', status);
  return status;
};

// Get API endpoints
export const getApiEndpoints = () => {
  return DEFAULT_ENDPOINTS;
};

// Export defaults for backwards compatibility
export const API_BASE_URL = getApiBaseUrl();
export const API_ENDPOINTS = DEFAULT_ENDPOINTS;

// Auto-initialize on import
let initPromise = null;

const autoInit = async () => {
  if (initPromise) return initPromise;
  
  initPromise = initializeApi().catch(error => {
    console.error('❌ Auto-initialization failed:', error.message);
    return null;
  });
  
  return initPromise;
};

// Start auto-initialization
autoInit();
