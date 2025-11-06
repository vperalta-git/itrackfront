import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildApiUrl } from '../constants/api';

class LocationService {
  constructor() {
    this.watchPositionSubscription = null;
    this.lastKnownPosition = null;
    this.permissionStatus = null;
    this.isTracking = false;
  }

  /**
   * Request location permissions from the user
   * @returns {Promise<boolean>} - Whether permission was granted
   */
  async requestLocationPermission() {
    try {
      console.log('🗺️ Requesting location permission...');
      
      // Request foreground permissions
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (foregroundStatus !== 'granted') {
        console.log('❌ Foreground location permission denied');
        this.permissionStatus = 'denied';
        return false;
      }

      // For background tracking (optional), request background permission
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      
      if (backgroundStatus !== 'granted') {
        console.log('⚠️ Background location permission denied, but foreground is granted');
      }

      this.permissionStatus = 'granted';
      console.log('✅ Location permission granted');
      return true;
    } catch (error) {
      console.error('❌ Error requesting location permission:', error);
      this.permissionStatus = 'error';
      return false;
    }
  }

  /**
   * Check if location permissions are already granted
   * @returns {Promise<boolean>}
   */
  async checkLocationPermission() {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      this.permissionStatus = status;
      return status === 'granted';
    } catch (error) {
      console.error('❌ Error checking location permission:', error);
      return false;
    }
  }

  /**
   * Get current location with high accuracy
   * @returns {Promise<Object|null>} - Location object or null if failed
   */
  async getCurrentLocation() {
    try {
      console.log('📍 Getting current location...');
      
      const hasPermission = await this.checkLocationPermission();
      if (!hasPermission) {
        const granted = await this.requestLocationPermission();
        if (!granted) {
          throw new Error('Location permission not granted');
        }
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 15000,
        maximumAge: 10000,
      });

      this.lastKnownPosition = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        timestamp: location.timestamp,
      };

      console.log('✅ Current location obtained:', this.lastKnownPosition);
      return this.lastKnownPosition;
    } catch (error) {
      console.error('❌ Error getting current location:', error);
      return null;
    }
  }

  /**
   * Start watching location changes with distance-based updates
   * @param {Function} onLocationUpdate - Callback for location updates
   * @param {number} distanceInterval - Minimum distance (meters) for updates (default: 10)
   * @returns {Promise<boolean>} - Whether tracking started successfully
   */
  async startLocationTracking(onLocationUpdate, distanceInterval = 10) {
    try {
      console.log('🎯 Starting location tracking...');
      
      const hasPermission = await this.checkLocationPermission();
      if (!hasPermission) {
        const granted = await this.requestLocationPermission();
        if (!granted) {
          throw new Error('Location permission not granted');
        }
      }

      // Stop any existing tracking
      await this.stopLocationTracking();

      this.watchPositionSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // Check every 5 seconds
          distanceInterval: distanceInterval, // Only update if moved 10+ meters
        },
        (location) => {
          const newPosition = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
            altitude: location.coords.altitude,
            speed: location.coords.speed,
            heading: location.coords.heading,
            timestamp: location.timestamp,
          };

          console.log('📍 Location update:', newPosition);
          this.lastKnownPosition = newPosition;
          
          if (onLocationUpdate) {
            onLocationUpdate(newPosition);
          }
        }
      );

      this.isTracking = true;
      console.log('✅ Location tracking started');
      return true;
    } catch (error) {
      console.error('❌ Error starting location tracking:', error);
      return false;
    }
  }

  /**
   * Stop location tracking
   */
  async stopLocationTracking() {
    try {
      if (this.watchPositionSubscription) {
        this.watchPositionSubscription.remove();
        this.watchPositionSubscription = null;
      }
      this.isTracking = false;
      console.log('🛑 Location tracking stopped');
    } catch (error) {
      console.error('❌ Error stopping location tracking:', error);
    }
  }

  /**
   * Reverse geocode coordinates to readable address
   * @param {number} latitude 
   * @param {number} longitude 
   * @returns {Promise<string>} - Readable address
   */
  async getReadableAddress(latitude, longitude) {
    try {
      console.log('🏠 Getting readable address for:', { latitude, longitude });
      
      const addressResponse = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (addressResponse && addressResponse.length > 0) {
        const address = addressResponse[0];
        const readableAddress = [
          address.streetNumber,
          address.street,
          address.district,
          address.city,
          address.region,
          address.country,
        ].filter(Boolean).join(', ');

        console.log('✅ Readable address:', readableAddress);
        return readableAddress || 'Unknown Location';
      }

      return 'Unknown Location';
    } catch (error) {
      console.error('❌ Error getting readable address:', error);
      return 'Address not available';
    }
  }

  /**
   * Upload location data to database
   * @param {Object} locationData - Location data to upload
   * @param {string} vehicleId - Vehicle ID
   * @param {string} driverId - Driver ID
   * @returns {Promise<boolean>} - Whether upload was successful
   */
  async uploadLocationToDatabase(locationData, vehicleId, driverId) {
    try {
      console.log('📤 Uploading location to database...');
      
      const userData = await AsyncStorage.getItem('accountName');
      const userRole = await AsyncStorage.getItem('role');
      
      // Get readable address
      const readableAddress = await this.getReadableAddress(
        locationData.latitude,
        locationData.longitude
      );

      const payload = {
        vehicleId,
        driverId,
        location: {
          coordinates: [locationData.longitude, locationData.latitude], // GeoJSON format [lng, lat]
          type: 'Point'
        },
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        accuracy: locationData.accuracy,
        altitude: locationData.altitude,
        speed: locationData.speed,
        heading: locationData.heading,
        readableAddress,
        timestamp: new Date(locationData.timestamp).toISOString(),
        updatedBy: userData || 'Unknown',
        userRole: userRole || 'Unknown',
      };

      const response = await fetch(buildApiUrl('/vehicles/location/update'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Location uploaded successfully:', result);
        return true;
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to upload location:', response.status, errorText);
        return false;
      }
    } catch (error) {
      console.error('❌ Error uploading location to database:', error);
      return false;
    }
  }

  /**
   * Get tracking status
   * @returns {Object} - Current tracking status
   */
  getStatus() {
    return {
      isTracking: this.isTracking,
      permissionStatus: this.permissionStatus,
      lastKnownPosition: this.lastKnownPosition,
      hasSubscription: !!this.watchPositionSubscription,
    };
  }

  /**
   * Update vehicle allocation location in database
   * @param {string} allocationId - Allocation ID
   * @param {Object} locationData - Location data to update
   * @returns {Promise<boolean>} - Whether update was successful
   */
  async updateVehicleLocation(allocationId, locationData) {
    try {
      console.log('📤 Updating allocation location...', { allocationId, locationData });
      
      const payload = {
        location: {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          accuracy: locationData.accuracy,
          altitude: locationData.altitude,
          speed: locationData.speed,
          heading: locationData.heading,
          timestamp: locationData.timestamp || Date.now(),
        },
        lastLocationUpdate: new Date().toISOString(),
      };

      const response = await fetch(buildApiUrl(`/updateAllocationLocation/${allocationId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Allocation location updated successfully:', result);
        return true;
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to update allocation location:', response.status, errorText);
        return false;
      }
    } catch (error) {
      console.error('❌ Error updating allocation location:', error);
      return false;
    }
  }

  /**
   * Start location tracking with callback registration
   * @param {Function} callback - Callback function for location updates
   * @param {Object} options - Location tracking options
   * @returns {Promise<string>} - Tracking callback ID
   */
  async startLocationTracking(callback, options = {}) {
    try {
      console.log('🎯 Starting enhanced location tracking...');
      
      const hasPermission = await this.checkLocationPermission();
      if (!hasPermission) {
        const granted = await this.requestLocationPermission();
        if (!granted) {
          throw new Error('Location permission not granted');
        }
      }

      // Stop any existing tracking first
      await this.stopLocationTracking();

      const defaultOptions = {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000, // Check every 5 seconds
        distanceInterval: 10, // Only update if moved 10+ meters
      };

      const mergedOptions = { ...defaultOptions, ...options };

      this.watchPositionSubscription = await Location.watchPositionAsync(
        mergedOptions,
        (location) => {
          const newPosition = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
            altitude: location.coords.altitude,
            speed: location.coords.speed,
            heading: location.coords.heading,
            timestamp: location.timestamp,
          };

          console.log('📍 Enhanced location update:', newPosition);
          this.lastKnownPosition = newPosition;
          
          if (callback && typeof callback === 'function') {
            callback(newPosition);
          }
        }
      );

      this.isTracking = true;
      console.log('✅ Enhanced location tracking started');
      
      // Return a tracking ID (simplified for this implementation)
      return 'enhanced-tracking-id';
    } catch (error) {
      console.error('❌ Error starting enhanced location tracking:', error);
      throw error;
    }
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   * @param {Object} coord1 - {latitude, longitude}
   * @param {Object} coord2 - {latitude, longitude}
   * @returns {number} - Distance in meters
   */
  calculateDistance(coord1, coord2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = coord1.latitude * Math.PI / 180;
    const φ2 = coord2.latitude * Math.PI / 180;
    const Δφ = (coord2.latitude - coord1.latitude) * Math.PI / 180;
    const Δλ = (coord2.longitude - coord1.longitude) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  }
}

// Export singleton instance
export default new LocationService();