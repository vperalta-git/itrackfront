// utils/mapsApi.js - Google Maps API Integration for I-Track Mobile App
import { buildApiUrl } from '../constants/api';

/**
 * Utility functions for Google Maps API integration
 * All functions use the backend API endpoints which handle Google Maps API calls
 */

// Cache for frequently used geocoding results
const geocodeCache = new Map();
const CACHE_EXPIRY_TIME = 30 * 60 * 1000; // 30 minutes

/**
 * Geocode an address to get coordinates
 * @param {string} address - The address to geocode
 * @returns {Promise<Object>} - Geocoding results with coordinates
 */
export const geocodeAddress = async (address) => {
  if (!address || typeof address !== 'string') {
    throw new Error('Valid address string is required');
  }

  // Check cache first
  const cacheKey = address.toLowerCase();
  const cached = geocodeCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_EXPIRY_TIME) {
    console.log('📍 Using cached geocoding result for:', address);
    return cached.data;
  }

  try {
    console.log('🔍 Geocoding address:', address);
    const response = await fetch(
      buildApiUrl(`/api/maps/geocode?address=${encodeURIComponent(address)}`),
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10 second timeout
      }
    );

    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Geocoding request failed');
    }

    // Cache the result
    geocodeCache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });

    console.log('✅ Geocoding successful:', data);
    return data;

  } catch (error) {
    console.error('❌ Geocoding error:', error);
    throw new Error(`Failed to geocode address: ${error.message}`);
  }
};

/**
 * Reverse geocode coordinates to get address
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @returns {Promise<Object>} - Reverse geocoding results with address
 */
export const reverseGeocodeCoordinates = async (latitude, longitude) => {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    throw new Error('Valid latitude and longitude numbers are required');
  }

  // Check cache
  const cacheKey = `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
  const cached = geocodeCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_EXPIRY_TIME) {
    console.log('📍 Using cached reverse geocoding result');
    return cached.data;
  }

  try {
    console.log('🔍 Reverse geocoding coordinates:', latitude, longitude);
    const response = await fetch(
      buildApiUrl(`/api/maps/reverse-geocode?lat=${latitude}&lon=${longitude}`),
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    if (!response.ok) {
      throw new Error(`Reverse geocoding failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Reverse geocoding request failed');
    }

    // Cache the result
    geocodeCache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });

    console.log('✅ Reverse geocoding successful:', data);
    return data;

  } catch (error) {
    console.error('❌ Reverse geocoding error:', error);
    throw new Error(`Failed to reverse geocode coordinates: ${error.message}`);
  }
};

/**
 * Get directions between two points
 * @param {Object} start - Start coordinates {latitude, longitude}
 * @param {Object} end - End coordinates {latitude, longitude}
 * @param {string} mode - Travel mode (driving, walking, transit, bicycling)
 * @returns {Promise<Object>} - Directions with route information
 */
export const getDirections = async (start, end, mode = 'driving') => {
  if (!start?.latitude || !start?.longitude || !end?.latitude || !end?.longitude) {
    throw new Error('Valid start and end coordinates are required');
  }

  try {
    console.log('🗺️ Getting directions from:', start, 'to:', end, 'mode:', mode);
    const response = await fetch(
      buildApiUrl(`/api/maps/directions?start_lat=${start.latitude}&start_lon=${start.longitude}&end_lat=${end.latitude}&end_lon=${end.longitude}&mode=${mode}`),
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 15000, // 15 second timeout for directions
      }
    );

    if (!response.ok) {
      throw new Error(`Directions failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Directions request failed');
    }

    console.log('✅ Directions successful:', data);
    return data;

  } catch (error) {
    console.error('❌ Directions error:', error);
    throw new Error(`Failed to get directions: ${error.message}`);
  }
};

/**
 * Find nearby places
 * @param {number} latitude - Center latitude
 * @param {number} longitude - Center longitude
 * @param {number} radius - Search radius in meters (default: 1000)
 * @param {string} type - Place type (restaurant, gas_station, hospital, etc.)
 * @returns {Promise<Object>} - Nearby places results
 */
export const findNearbyPlaces = async (latitude, longitude, radius = 1000, type = 'restaurant') => {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    throw new Error('Valid latitude and longitude numbers are required');
  }

  try {
    console.log('🔍 Finding nearby places:', { latitude, longitude, radius, type });
    const response = await fetch(
      buildApiUrl(`/api/maps/nearby?lat=${latitude}&lon=${longitude}&radius=${radius}&type=${type}`),
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    if (!response.ok) {
      throw new Error(`Nearby places search failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Nearby places request failed');
    }

    console.log('✅ Nearby places found:', data);
    return data;

  } catch (error) {
    console.error('❌ Nearby places error:', error);
    throw new Error(`Failed to find nearby places: ${error.message}`);
  }
};

/**
 * Get current location with permission handling
 * @param {Object} options - Geolocation options (React Native)
 * @returns {Promise<Object>} - Current location coordinates
 */
export const getCurrentLocation = async () => {
  try {
    // Import expo-location dynamically to avoid import errors
    const Location = await import('expo-location');
    
    console.log('📍 Requesting location permissions...');
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      console.warn('📍 Location permission denied, using default location');
      // Return default Manila location instead of throwing error
      return {
        latitude: DEFAULT_LOCATIONS.MANILA.latitude,
        longitude: DEFAULT_LOCATIONS.MANILA.longitude,
        accuracy: null,
        timestamp: Date.now(),
      };
    }

    console.log('📍 Getting current position...');
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
      timeout: 15000,
      maximumAge: 300000, // 5 minutes
    });

    const result = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
      timestamp: location.timestamp,
    };

    console.log('✅ Current location obtained:', result);
    return result;

  } catch (error) {
    console.error('❌ Location error:', error);
    // Don't throw error, return default location
    console.log('📍 Using default Manila location as fallback');
    return {
      latitude: DEFAULT_LOCATIONS.MANILA.latitude,
      longitude: DEFAULT_LOCATIONS.MANILA.longitude,
      accuracy: null,
      timestamp: Date.now(),
    };
  }
};

/**
 * Clear geocoding cache
 */
export const clearGeocodeCache = () => {
  geocodeCache.clear();
  console.log('🗑️ Geocoding cache cleared');
};

/**
 * Common place types for nearby search
 */
export const PLACE_TYPES = {
  RESTAURANT: 'restaurant',
  GAS_STATION: 'gas_station',
  HOSPITAL: 'hospital',
  BANK: 'bank',
  ATM: 'atm',
  PHARMACY: 'pharmacy',
  SHOPPING_MALL: 'shopping_mall',
  HOTEL: 'lodging',
  PARKING: 'parking',
  REPAIR_SHOP: 'car_repair',
  DEALERSHIP: 'car_dealer',
  POLICE: 'police',
  FIRE_STATION: 'fire_station',
  BUS_STATION: 'bus_station',
  SUBWAY_STATION: 'subway_station',
};

/**
 * Common travel modes for directions
 */
export const TRAVEL_MODES = {
  DRIVING: 'driving',
  WALKING: 'walking',
  TRANSIT: 'transit',
  BICYCLING: 'bicycling',
};

// Default locations for fallback
export const DEFAULT_LOCATIONS = {
  MANILA: { latitude: 14.5995, longitude: 120.9842 },
  PASIG: { latitude: 14.5764, longitude: 121.0851 },
  MAKATI: { latitude: 14.5547, longitude: 121.0244 },
  BGC: { latitude: 14.5511, longitude: 121.0497 },
  ORTIGAS: { latitude: 14.5832, longitude: 121.0610 },
};

console.log('🗺️ Maps API utility module loaded with Google Maps integration');
