// Enhanced Network Request Handler for I-Track Mobile App
// Handles network switching, retries, and fallback connections

import { safeFetch, refreshConnection, getApiBaseUrl } from '../constants/api';

export class NetworkRequestHandler {
  
  static async makeRequest(endpoint, options = {}) {
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second
    
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt}/${maxRetries} for ${endpoint}`);
        
        // Use the enhanced safeFetch from api.js
        const response = await safeFetch(endpoint, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...options.headers
          }
        });
        
        if (response.ok) {
          console.log(`✅ Request successful on attempt ${attempt}`);
          return response;
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        
      } catch (error) {
        console.warn(`❌ Attempt ${attempt} failed:`, error.message);
        lastError = error;
        
        // If it's a network error and not the last attempt, try refreshing connection
        if (attempt < maxRetries && NetworkRequestHandler.isNetworkError(error)) {
          console.log('🔄 Network error detected, refreshing connection...');
          await refreshConnection();
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }
    
    // All attempts failed
    console.error(`❌ All ${maxRetries} attempts failed for ${endpoint}`);
    throw lastError;
  }
  
  static isNetworkError(error) {
    const networkErrorMessages = [
      'Network request failed',
      'Unable to connect',
      'Connection refused',
      'Network error',
      'fetch failed',
      'ECONNREFUSED',
      'ETIMEDOUT'
    ];
    
    return networkErrorMessages.some(msg => 
      error.message.toLowerCase().includes(msg.toLowerCase())
    );
  }
  
  // Convenience methods for common HTTP operations
  static async get(endpoint, options = {}) {
    return NetworkRequestHandler.makeRequest(endpoint, {
      ...options,
      method: 'GET'
    });
  }
  
  static async post(endpoint, data, options = {}) {
    return NetworkRequestHandler.makeRequest(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  
  static async put(endpoint, data, options = {}) {
    return NetworkRequestHandler.makeRequest(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
  
  static async delete(endpoint, options = {}) {
    return NetworkRequestHandler.makeRequest(endpoint, {
      ...options,
      method: 'DELETE'
    });
  }
  
  // Enhanced JSON response handler
  static async getJson(endpoint, options = {}) {
    const response = await NetworkRequestHandler.get(endpoint, options);
    return response.json();
  }
  
  static async postJson(endpoint, data, options = {}) {
    const response = await NetworkRequestHandler.post(endpoint, data, options);
    return response.json();
  }
  
  static async putJson(endpoint, data, options = {}) {
    const response = await NetworkRequestHandler.put(endpoint, data, options);
    return response.json();
  }
}

// Export for use in your components
export default NetworkRequestHandler;

// Usage examples:
// import NetworkRequestHandler from './utils/networkRequestHandler';
//
// // GET request with automatic retry
// const users = await NetworkRequestHandler.getJson('/getUsers');
//
// // POST request with network resilience
// const result = await NetworkRequestHandler.postJson('/login', {
//   username: 'admin',
//   password: 'admin123'
// });
//
// // The handler will automatically:
// - Retry failed requests up to 3 times
// - Refresh network connection on network errors
// - Switch to alternative server URLs if needed
// - Handle network switching (WiFi to mobile data, etc.)
