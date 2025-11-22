/**
 * API Configuration for I-Track Mobile App
 * Connects to the backend server (itrack-backend)
 */

// Backend server URL - change this based on environment
const API_BASE_URL = __DEV__ 
  ? 'http://192.168.254.147:5000'  // Development - your local server
  : 'https://itrack-backend-1.onrender.com';  // Production - Render

/**
 * Build full API URL
 * @param {string} endpoint - API endpoint (e.g., '/login', '/getUsers')
 * @returns {string} Full API URL
 */
export const buildApiUrl = (endpoint) => {
  return `${API_BASE_URL}${endpoint}`;
};

/**
 * API Endpoints
 */
export const API_ENDPOINTS = {
  // Authentication
  LOGIN: '/login',
  LOGOUT: '/logout',
  FORGOT_PASSWORD: '/forgot-password',
  CHANGE_PASSWORD: '/change-password',
  PROFILE: '/profile',
  
  // Users
  GET_USERS: '/getUsers',
  CREATE_USER: '/createUser',
  UPDATE_USER: '/updateUser',
  DELETE_USER: '/deleteUser',
  UPDATE_PROFILE: '/updateProfile',
  GET_USER: '/api/getUser',
  
  // Inventory/Stock
  GET_STOCK: '/getStock',
  CREATE_STOCK: '/createStock',
  UPDATE_STOCK: '/updateStock',
  DELETE_STOCK: '/deleteStock',
  
  // Driver Allocations
  DRIVER_ALLOCATIONS: '/api/getAllocation',
  GET_ALLOCATION: '/getAllocation',
  CREATE_ALLOCATION: '/createAllocation',
  UPDATE_ALLOCATION: '/updateAllocation',
  DELETE_ALLOCATION: '/deleteAllocation',
  
  // Reports & Audit
  AUDIT_TRAIL: '/api/audit-trail',
  COMPLETED_REQUESTS: '/api/getCompletedRequests',
  COMPLETED_ALLOCATIONS: '/api/getCompletedAllocations',
  GET_REQUEST: '/api/getRequest',
  GET_REQUEST_BY_ID: (id) => `/api/getRequest/${id}`,
  
  // Inventory reference
  INVENTORY: '/api/getStock',
  USERS: '/api/getUsers',
  
  // Unit Allocations (Sales Agent)
  GET_UNIT_ALLOCATIONS: '/api/getUnitAllocations',
  CREATE_UNIT_ALLOCATION: '/api/createUnitAllocation',
  DELETE_UNIT_ALLOCATION: '/api/deleteUnitAllocation',
  
  // Dispatch
  GET_DISPATCH_ASSIGNMENTS: '/api/dispatch/assignments',
  CREATE_DISPATCH_ASSIGNMENT: '/api/dispatch/assignments',
  UPDATE_DISPATCH_ASSIGNMENT: '/api/dispatch/assignments',
  UPDATE_DISPATCH_PROCESS: '/api/dispatch/assignments',
  DELETE_DISPATCH_ASSIGNMENT: '/api/dispatch/assignments',
  
  // Location Tracking
  UPDATE_DRIVER_LOCATION: '/updateDriverLocation',
  GET_DRIVER_LOCATION: '/getDriverLocation',
  GET_ALL_DRIVER_LOCATIONS: '/getAllDriverLocations',
  
  // Google Maps
  GET_ROUTE: '/getRoute',
  GEOCODE: '/geocode',
  REVERSE_GEOCODE: '/reverseGeocode',
};

export default {
  buildApiUrl,
  API_ENDPOINTS,
  API_BASE_URL,
};
