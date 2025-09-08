// Enhanced API Configuration for I-Track Mobile App
// Supports dynamic network detection and automatic failover

// Production and development server URLs
const PRODUCTION_SERVER_URL = 'https://itrack-backend.onrender.com'; // Your deployed Render backend
const LOCAL_SERVER_URLS = [
  'http://192.168.254.147:5000', // Your current network (server is running here)
  'http://localhost:5000',       // Local development
  'http://127.0.0.1:5000',       // Loopback
  'http://192.168.1.147:5000',   // Common home network range
  'http://192.168.0.147:5000',   // Another common range
  'http://10.0.0.147:5000',      // Another common range
];

// Determine if we're in production or development
const isProduction = false; // Use local backend for now since Render has deployment issues

// Multiple potential server URLs for network flexibility
const POTENTIAL_SERVER_URLS = isProduction 
  ? [PRODUCTION_SERVER_URL, ...LOCAL_SERVER_URLS] 
  : LOCAL_SERVER_URLS;

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

// Dynamic API configuration (will be fetched from server)
let API_CONFIG = null;
let CURRENT_SERVER_URL = null;

// Test server connectivity
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
    
    if (response.ok) {
      const data = await response.json();
      return data.status === 'OK';
    }
    return false;
  } catch (error) {
    console.log(`❌ Connection test failed for ${url}:`, error.message);
    return false;
  }
};

// Find working server URL
const findWorkingServerUrl = async () => {
  console.log('🔍 Searching for available server...');
  
  for (const url of POTENTIAL_SERVER_URLS) {
    console.log(`⏳ Testing connection to: ${url}`);
    const isWorking = await testServerConnection(url);
    
    if (isWorking) {
      console.log(`✅ Found working server: ${url}`);
      CURRENT_SERVER_URL = url;
      return url;
    }
  }
  
  console.warn('⚠️ No working server found, using default URL');
  CURRENT_SERVER_URL = POTENTIAL_SERVER_URLS[0];
  return CURRENT_SERVER_URL;
};

// Helper function to get current API base URL
export const getApiBaseUrl = () => {
  return API_CONFIG?.backend?.BASE_URL || CURRENT_SERVER_URL || POTENTIAL_SERVER_URLS[0];
};

// Helper function to build API URLs
export const buildApiUrl = (endpoint) => {
  return `${getApiBaseUrl()}${endpoint}`;
};

// Enhanced fetch API configuration from server
export const fetchApiConfig = async (forceRefresh = false) => {
  if (API_CONFIG && !forceRefresh) {
    return API_CONFIG;
  }

  try {
    // First find a working server
    const workingUrl = await findWorkingServerUrl();
    
    console.log(`📡 Fetching API config from: ${workingUrl}`);
    const response = await fetch(`${workingUrl}/api/config`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      timeout: 5000,
    });
    
    const data = await response.json();
    
    if (data.success && data.config) {
      API_CONFIG = data.config;
      CURRENT_SERVER_URL = workingUrl;
      
      console.log(`📱 API Configuration loaded successfully!`);
      console.log(`🌐 Server: ${API_CONFIG.backend.BASE_URL}`);
      console.log(`📍 Local IP: ${API_CONFIG.backend.LOCAL_IP}`);
      console.log(`🖥️ Environment: ${API_CONFIG.backend.ENVIRONMENT}`);
      
      return API_CONFIG;
    } else {
      throw new Error('Invalid config response');
    }
  } catch (error) {
    console.warn(`⚠️ Failed to fetch API config, using defaults:`, error.message);
    
    // Use default configuration with the working URL we found
    const defaultUrl = CURRENT_SERVER_URL || POTENTIAL_SERVER_URLS[0];
    API_CONFIG = {
      backend: {
        BASE_URL: defaultUrl,
        NAME: 'Local Development Backend (Fallback)',
        ENVIRONMENT: 'development'
      },
      endpoints: DEFAULT_ENDPOINTS
    };
    return API_CONFIG;
  }
};

// Network-aware API call with automatic failover
export const safeFetch = async (endpoint, options = {}) => {
  let lastError = null;
  
  // Try current server first
  if (CURRENT_SERVER_URL) {
    try {
      const response = await fetch(`${CURRENT_SERVER_URL}${endpoint}`, {
        ...options,
        timeout: 10000, // 10 second timeout
      });
      
      if (response.ok) {
        return response;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      console.warn(`❌ Request failed on ${CURRENT_SERVER_URL}: ${error.message}`);
      lastError = error;
    }
  }
  
  // If current server failed, try to find another one
  console.log('🔄 Attempting to find alternative server...');
  const workingUrl = await findWorkingServerUrl();
  
  if (workingUrl && workingUrl !== CURRENT_SERVER_URL) {
    try {
      const response = await fetch(`${workingUrl}${endpoint}`, {
        ...options,
        timeout: 10000,
      });
      
      if (response.ok) {
        CURRENT_SERVER_URL = workingUrl;
        console.log(`✅ Switched to working server: ${workingUrl}`);
        return response;
      }
    } catch (error) {
      console.error(`❌ Backup server also failed: ${error.message}`);
      lastError = error;
    }
  }
  
  throw lastError || new Error('No working server found');
};

// Get API endpoints
export const getApiEndpoints = () => {
  return API_CONFIG?.endpoints || DEFAULT_ENDPOINTS;
};

// Get current server status
export const getServerStatus = async () => {
  try {
    const response = await safeFetch('/health');
    const data = await response.json();
    return {
      online: true,
      status: data.status,
      serverUrl: CURRENT_SERVER_URL,
      timestamp: data.timestamp || new Date().toISOString()
    };
  } catch (error) {
    return {
      online: false,
      error: error.message,
      serverUrl: CURRENT_SERVER_URL,
      timestamp: new Date().toISOString()
    };
  }
};

// Refresh server connection (useful when switching networks)
export const refreshConnection = async () => {
  console.log('🔄 Refreshing server connection...');
  CURRENT_SERVER_URL = null;
  API_CONFIG = null;
  
  await fetchApiConfig(true);
  const status = await getServerStatus();
  
  console.log('📊 Connection refresh result:', status);
  return status;
};

// Default endpoints for backwards compatibility
export const API_BASE_URL = getApiBaseUrl();
export const API_ENDPOINTS = DEFAULT_ENDPOINTS;

// Initialize API configuration on import
let initPromise = null;

export const initializeApi = async () => {
  if (initPromise) return initPromise;
  
  initPromise = (async () => {
    try {
      console.log('🚀 Initializing I-Track Mobile API...');
      const config = await fetchApiConfig();
      console.log(`📱 Mobile App API initialized successfully!`);
      console.log(`🌐 Connected to: ${config.backend.BASE_URL}`);
      return config;
    } catch (error) {
      console.error(`❌ Failed to initialize API:`, error.message);
      throw error;
    }
  })();
  
  return initPromise;
};

// Auto-initialize
initializeApi().catch(console.error);
