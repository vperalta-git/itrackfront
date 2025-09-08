// Network Test Utility for I-Track Mobile App
// Use this to test server connectivity from your mobile app

import { fetchApiConfig, getServerStatus, refreshConnection, getApiBaseUrl } from '../constants/api';

export const NetworkTest = {
  
  // Test current server connection
  testConnection: async () => {
    console.log('🔍 Testing server connection...');
    try {
      const status = await getServerStatus();
      console.log('📊 Server Status:', status);
      return status;
    } catch (error) {
      console.error('❌ Connection test failed:', error);
      return { online: false, error: error.message };
    }
  },

  // Get current network configuration
  getNetworkInfo: async () => {
    console.log('🌐 Getting network configuration...');
    try {
      const config = await fetchApiConfig();
      const networkInfo = {
        baseUrl: config.backend.BASE_URL,
        localIP: config.backend.LOCAL_IP,
        port: config.backend.PORT,
        environment: config.backend.ENVIRONMENT,
        alternativeUrls: config.backend.ALTERNATIVE_URLS,
        hostname: config.backend.NETWORK_INFO.hostname,
        platform: config.backend.NETWORK_INFO.platform
      };
      console.log('📱 Network Info:', networkInfo);
      return networkInfo;
    } catch (error) {
      console.error('❌ Failed to get network info:', error);
      return null;
    }
  },

  // Test network switching (useful when changing WiFi)
  testNetworkSwitch: async () => {
    console.log('🔄 Testing network switch...');
    try {
      const result = await refreshConnection();
      console.log('✅ Network switch test result:', result);
      return result;
    } catch (error) {
      console.error('❌ Network switch test failed:', error);
      return { success: false, error: error.message };
    }
  },

  // Comprehensive network diagnostics
  runDiagnostics: async () => {
    console.log('🔧 Running network diagnostics...');
    
    const diagnostics = {
      timestamp: new Date().toISOString(),
      tests: {}
    };

    // Test 1: Current connection
    console.log('1️⃣ Testing current connection...');
    diagnostics.tests.currentConnection = await NetworkTest.testConnection();

    // Test 2: Network info
    console.log('2️⃣ Getting network information...');
    diagnostics.tests.networkInfo = await NetworkTest.getNetworkInfo();

    // Test 3: API endpoints test
    console.log('3️⃣ Testing API endpoints...');
    diagnostics.tests.apiEndpoints = await NetworkTest.testApiEndpoints();

    // Test 4: Network switch capability
    console.log('4️⃣ Testing network switch capability...');
    diagnostics.tests.networkSwitch = await NetworkTest.testNetworkSwitch();

    console.log('✅ Network diagnostics complete:', diagnostics);
    return diagnostics;
  },

  // Test specific API endpoints
  testApiEndpoints: async () => {
    const endpoints = [
      '/health',
      '/api/config',
      '/test',
      '/getUsers',
      '/getStock',
      '/api/dispatch/assignments'
    ];

    const results = {};
    const baseUrl = getApiBaseUrl();

    for (const endpoint of endpoints) {
      try {
        console.log(`🔍 Testing ${endpoint}...`);
        const response = await fetch(`${baseUrl}${endpoint}`, {
          method: 'GET',
          timeout: 5000
        });
        
        results[endpoint] = {
          status: response.status,
          ok: response.ok,
          statusText: response.statusText
        };
        
        console.log(`✅ ${endpoint}: ${response.status}`);
      } catch (error) {
        results[endpoint] = {
          status: 'error',
          ok: false,
          error: error.message
        };
        console.log(`❌ ${endpoint}: ${error.message}`);
      }
    }

    return results;
  },

  // Display network info for debugging
  displayNetworkInfo: async () => {
    console.log('\n🌐 === I-TRACK NETWORK INFORMATION ===');
    
    const info = await NetworkTest.getNetworkInfo();
    if (info) {
      console.log(`📍 Server IP: ${info.localIP}`);
      console.log(`🔗 Base URL: ${info.baseUrl}`);
      console.log(`🖥️ Hostname: ${info.hostname}`);
      console.log(`💻 Platform: ${info.platform}`);
      console.log(`🌐 Environment: ${info.environment}`);
      console.log(`📱 Alternative URLs:`);
      info.alternativeUrls?.forEach((url, index) => {
        console.log(`   ${index + 1}. ${url}`);
      });
    }
    
    const status = await NetworkTest.testConnection();
    console.log(`🟢 Server Online: ${status.online ? 'YES' : 'NO'}`);
    if (status.error) {
      console.log(`❌ Error: ${status.error}`);
    }
    
    console.log('=== END NETWORK INFO ===\n');
  }
};

// Export for easy testing
export default NetworkTest;

// Usage examples:
// import NetworkTest from './utils/networkTest';
//
// // Test connection
// NetworkTest.testConnection();
//
// // Get network info
// NetworkTest.getNetworkInfo();
//
// // Run full diagnostics
// NetworkTest.runDiagnostics();
//
// // Display network info
// NetworkTest.displayNetworkInfo();
