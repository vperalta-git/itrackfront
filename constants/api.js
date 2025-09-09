// Enhanced API Configuration for I-Track Mobile App
// RENDER-FIRST approach for universal network access

// RENDER-FIRST server priority - works on any WiFi network
const RENDER_FIRST_URLS = [
  // 'https://itrack-backend.onrender.com',   // 🚨 TEMPORARILY DISABLED - Render is serving React app instead of API
  'http://192.168.254.147:5000',           // � LOCAL FIRST (until Render is fixed)
  'http://10.97.63.190:5000',              // 🥈 Local fallback 2 (your phone's network)
  'http://localhost:5000',                 // 🥉 Local development
  'http://127.0.0.1:5000',                 // 🥉 Loopback
  'https://itrack-backend.onrender.com',   // 🚨 LAST RESORT (currently broken)
  'http://192.168.1.147:5000',             // 🔄 Common network ranges
  'http://192.168.0.147:5000',
  'http://192.168.43.147:5000',
  'http://192.168.100.147:5000',
  'http://10.0.0.147:5000',
  'http://172.16.0.147:5000',
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
    console.log(`🔍 Testing: ${url}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(`${url}/health`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ ${url} is healthy`);
      return true;
    }
    
    console.log(`❌ ${url} returned status ${response.status}`);
    return false;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log(`⏱️ ${url} timed out`);
    } else {
      console.log(`❌ ${url} failed: ${error.message}`);
    }
    return false;
  }
};

// Find the first working server and fetch its configuration
const discoverServerConfig = async () => {
  console.log('🔍 Discovering server... RENDER FIRST approach');
  
  for (const url of RENDER_FIRST_URLS) {
    console.log(`⏳ Testing server: ${url}`);
    
    try {
      // Test basic connectivity with longer timeout for Render
      const timeout = url.includes('render.com') ? 10000 : 5000; // 10s for Render, 5s for local
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const healthResponse = await fetch(`${url}/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);
      
      if (!healthResponse.ok) {
        console.log(`❌ Health check failed for ${url}: ${healthResponse.status}`);
        continue;
      }
      
      // Try to fetch mobile config (simpler endpoint)
      try {
        const configResponse = await fetch(`${url}/api/mobile-config`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          timeout: timeout,
        });
        
        if (configResponse.ok) {
          const config = await configResponse.json();
          
          if (config.success) {
            console.log(`✅ Server discovered: ${url}`);
            console.log(`🌐 Server URL: ${config.serverUrl}`);
            console.log(`🏷️ Environment: ${config.environment}`);
            
            CURRENT_SERVER_URL = config.serverUrl || url; // Use recommended server URL
            API_CONFIG = {
              serverUrl: CURRENT_SERVER_URL,
              environment: config.environment,
              fallbacks: config.fallbacks || [],
              ...config
            };
            
            return API_CONFIG;
          }
        }
      } catch (configError) {
        console.log(`❌ Config fetch failed for ${url}, but health OK - using as fallback`);
        // If health check passed but config failed, still use this server
        CURRENT_SERVER_URL = url;
        API_CONFIG = {
          serverUrl: url,
          environment: 'unknown',
          fallbacks: []
        };
        return API_CONFIG;
      }
      
    } catch (error) {
      console.log(`❌ Failed to connect to ${url}:`, error.message);
      continue;
    }
  }
  
  // If all servers failed, use Render as last resort
  console.warn('⚠️ All servers failed, forcing Render as last resort');
  CURRENT_SERVER_URL = 'https://itrack-backend.onrender.com';
  API_CONFIG = {
    serverUrl: CURRENT_SERVER_URL,
    environment: 'production',
    fallbacks: []
  };
  
  return API_CONFIG;
};

// Get current API base URL - ALWAYS prioritize configured server URL
export const getApiBaseUrl = () => {
  if (API_CONFIG && API_CONFIG.serverUrl) {
    return API_CONFIG.serverUrl;
  }
  return CURRENT_SERVER_URL || 'https://itrack-backend.onrender.com'; // Default to Render
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
