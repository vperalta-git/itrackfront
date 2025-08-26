// API Configuration for I-Track Mobile App
// This file centralizes API endpoint configuration

// Backend Configuration
export const API_CONFIG = {
  // Production Web App Backend (same as web version)
  WEB_BACKEND: {
    BASE_URL: 'http://192.168.254.147:8000/api',
    NAME: 'Web App Backend (Shared)'
  },
  
  // Development Mobile Backend (original)
  MOBILE_BACKEND: {
    BASE_URL: 'http://192.168.254.147:5001',
    NAME: 'Mobile Development Backend'
  },
  
  // Production Render Backend
  RENDER_BACKEND: {
    BASE_URL: 'https://itrack-backend-1.onrender.com',
    NAME: 'Render Production Backend'
  }
};

// Current active backend - Change this to switch backends
// Use MOBILE_BACKEND for local development
// Use RENDER_BACKEND for production deployment
export const ACTIVE_BACKEND = API_CONFIG.RENDER_BACKEND;

// API endpoints mapping to match web app structure
export const API_ENDPOINTS = {
  // Authentication
  LOGIN: '/login',
  LOGOUT: '/logout',
  CHECK_AUTH: '/checkAuth',
  
  // Users
  GET_USERS: '/getUsers',
  CREATE_USER: '/createUser',
  DELETE_USER: '/deleteUser',
  UPDATE_USER: '/updateUser',
  
  // Driver Allocations
  GET_ALLOCATION: '/getAllocation',
  CREATE_ALLOCATION: '/createAllocation',
  
  // Service Requests
  GET_REQUEST: '/getRequest',
  CREATE_REQUEST: '/createRequest',
  GET_COMPLETED_REQUESTS: '/getCompletedRequests',
  
  // Inventory/Stock
  GET_STOCK: '/getStock',
  CREATE_STOCK: '/createStock',
  
  // Password Reset
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password'
};

// Helper function to build full API URL
export const buildApiUrl = (endpoint) => {
  return `${ACTIVE_BACKEND.BASE_URL}${endpoint}`;
};

// Helper function to get API config info
export const getApiInfo = () => {
  return {
    backend: ACTIVE_BACKEND.NAME,
    baseUrl: ACTIVE_BACKEND.BASE_URL
  };
};

console.log(`📱 Mobile App connected to: ${ACTIVE_BACKEND.NAME}`);
console.log(`🔗 Base URL: ${ACTIVE_BACKEND.BASE_URL}`);
