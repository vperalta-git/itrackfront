import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import LocationService from '../utils/LocationService';
import { useTheme } from '../context/ThemeContext';

const { width, height } = Dimensions.get('window');

const EnhancedMapView = ({
  vehicles = [],
  onVehiclePress,
  initialRegion,
  showUserLocation = true,
  trackingMode = false,
  vehicleId = null,
  driverId = null,
  style = {},
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const mapRef = useRef(null);

  // State management
  const [permissionStatus, setPermissionStatus] = useState('checking');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [trackingActive, setTrackingActive] = useState(false);

  // Initialize map and permissions
  useEffect(() => {
    initializeMap();
    return () => {
      // Cleanup on unmount
      if (trackingMode && trackingActive) {
        LocationService.stopLocationTracking();
      }
    };
  }, []);

  // Start tracking when in tracking mode
  useEffect(() => {
    if (trackingMode && permissionStatus === 'granted' && !trackingActive) {
      startLocationTracking();
    }
  }, [trackingMode, permissionStatus]);

  /**
   * Initialize map with permission check
   */
  const initializeMap = async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');

      console.log('🗺️ Initializing map...');

      // Check if location services are enabled
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        setErrorMessage('Location services are disabled. Please enable location services in your device settings.');
        setPermissionStatus('disabled');
        setIsLoading(false);
        return;
      }

      // Check and request permissions
      const hasPermission = await LocationService.checkLocationPermission();
      
      if (!hasPermission) {
        console.log('📍 Requesting location permission...');
        const granted = await LocationService.requestLocationPermission();
        
        if (!granted) {
          setErrorMessage('Location permission is required to view the map. Please grant permission in settings.');
          setPermissionStatus('denied');
          setIsLoading(false);
          return;
        }
      }

      setPermissionStatus('granted');

      // Get current location if showing user location
      if (showUserLocation) {
        const location = await LocationService.getCurrentLocation();
        if (location) {
          setCurrentLocation(location);
          
          // Center map on user location if no initial region provided
          if (!initialRegion && mapRef.current) {
            mapRef.current.animateToRegion({
              latitude: location.latitude,
              longitude: location.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }, 1000);
          }
        }
      }

      console.log('✅ Map initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing map:', error);
      setErrorMessage('Failed to initialize map. Please try again.');
      setPermissionStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Start location tracking for vehicles
   */
  const startLocationTracking = async () => {
    if (!vehicleId || !driverId) {
      console.warn('⚠️ Vehicle ID and Driver ID required for tracking');
      return;
    }

    try {
      console.log('🎯 Starting location tracking for vehicle:', vehicleId);
      
      const success = await LocationService.startLocationTracking(
        (newLocation) => {
          // Update current location state
          setCurrentLocation(newLocation);
          
          // Upload to database
          LocationService.uploadLocationToDatabase(
            newLocation,
            vehicleId,
            driverId
          );

          // Center map on new location
          if (mapRef.current) {
            mapRef.current.animateToRegion({
              latitude: newLocation.latitude,
              longitude: newLocation.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }, 500);
          }
        },
        10 // Update every 10 meters
      );

      if (success) {
        setTrackingActive(true);
        console.log('✅ Location tracking started successfully');
      } else {
        Alert.alert('Error', 'Failed to start location tracking');
      }
    } catch (error) {
      console.error('❌ Error starting location tracking:', error);
      Alert.alert('Error', 'Failed to start location tracking: ' + error.message);
    }
  };

  /**
   * Stop location tracking
   */
  const stopLocationTracking = () => {
    LocationService.stopLocationTracking();
    setTrackingActive(false);
    console.log('🛑 Location tracking stopped');
  };

  /**
   * Retry map initialization
   */
  const retryInitialization = () => {
    setIsLoading(true);
    setErrorMessage('');
    initializeMap();
  };

  /**
   * Handle permission request
   */
  const handleRequestPermission = async () => {
    const granted = await LocationService.requestLocationPermission();
    if (granted) {
      initializeMap();
    } else {
      Alert.alert(
        'Permission Required',
        'Location permission is required to use the map. Please go to Settings > Privacy > Location Services and enable location for this app.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Location.requestForegroundPermissionsAsync() }
        ]
      );
    }
  };

  /**
   * Render permission denied state
   */
  const renderPermissionDenied = () => (
    <View style={styles.centerContainer}>
      <Text style={styles.errorIcon}>📍</Text>
      <Text style={styles.errorTitle}>Location Permission Required</Text>
      <Text style={styles.errorText}>
        This app needs location permission to show the map and track vehicles.
      </Text>
      <TouchableOpacity 
        style={styles.retryButton} 
        onPress={handleRequestPermission}
      >
        <Text style={styles.retryButtonText}>Grant Permission</Text>
      </TouchableOpacity>
    </View>
  );

  /**
   * Render error state
   */
  const renderError = () => (
    <View style={styles.centerContainer}>
      <Text style={styles.errorIcon}>⚠️</Text>
      <Text style={styles.errorTitle}>Map Error</Text>
      <Text style={styles.errorText}>{errorMessage}</Text>
      <TouchableOpacity 
        style={styles.retryButton} 
        onPress={retryInitialization}
      >
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  /**
   * Render loading state
   */
  const renderLoading = () => (
    <View style={styles.centerContainer}>
      <ActivityIndicator size="large" color={theme.primary} />
      <Text style={styles.loadingText}>Initializing Map...</Text>
      <Text style={styles.loadingSubText}>
        {permissionStatus === 'checking' ? 'Checking permissions...' : 'Loading map...'}
      </Text>
    </View>
  );

  // Handle different states
  if (isLoading) {
    return renderLoading();
  }

  if (permissionStatus === 'denied') {
    return renderPermissionDenied();
  }

  if (permissionStatus === 'error' || errorMessage) {
    return renderError();
  }

  if (permissionStatus === 'disabled') {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorIcon}>📵</Text>
        <Text style={styles.errorTitle}>Location Services Disabled</Text>
        <Text style={styles.errorText}>
          Please enable location services in your device settings.
        </Text>
      </View>
    );
  }

  // Render map
  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion || {
          latitude: currentLocation?.latitude || 14.5995,
          longitude: currentLocation?.longitude || 120.9842,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        showsUserLocation={showUserLocation && permissionStatus === 'granted'}
        showsMyLocationButton={true}
        showsCompass={true}
        showsScale={true}
        showsTraffic={true}
        loadingEnabled={true}
        loadingIndicatorColor={theme.primary}
        loadingBackgroundColor={theme.cardBackground}
      >
        {/* Current location marker (if tracking) */}
        {currentLocation && trackingMode && (
          <Marker
            coordinate={{
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
            }}
            title="Current Location"
            description={`Accuracy: ${currentLocation.accuracy?.toFixed(0)}m`}
            pinColor="blue"
          />
        )}

        {/* Vehicle markers */}
        {vehicles.map((vehicle, index) => (
          <Marker
            key={vehicle.id || index}
            coordinate={{
              latitude: vehicle.latitude,
              longitude: vehicle.longitude,
            }}
            title={vehicle.name || vehicle.unitId}
            description={vehicle.description || vehicle.readableAddress}
            onPress={() => onVehiclePress && onVehiclePress(vehicle)}
            pinColor={vehicle.pinColor || "red"}
          />
        ))}
      </MapView>

      {/* Tracking controls */}
      {trackingMode && (
        <View style={styles.trackingControls}>
          <TouchableOpacity
            style={[
              styles.trackingButton,
              { backgroundColor: trackingActive ? '#ff4444' : theme.primary }
            ]}
            onPress={trackingActive ? stopLocationTracking : startLocationTracking}
          >
            <Text style={styles.trackingButtonText}>
              {trackingActive ? '🛑 Stop Tracking' : '▶️ Start Tracking'}
            </Text>
          </TouchableOpacity>
          
          {trackingActive && currentLocation && (
            <View style={styles.locationInfo}>
              <Text style={styles.locationInfoText}>
                📍 Lat: {currentLocation.latitude.toFixed(6)}
              </Text>
              <Text style={styles.locationInfoText}>
                📍 Lng: {currentLocation.longitude.toFixed(6)}
              </Text>
              <Text style={styles.locationInfoText}>
                🎯 Accuracy: {currentLocation.accuracy?.toFixed(0)}m
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.background,
    padding: 20,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: theme.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: theme.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  loadingText: {
    fontSize: 18,
    color: theme.text,
    marginTop: 16,
    fontWeight: '600',
  },
  loadingSubText: {
    fontSize: 14,
    color: theme.textSecondary,
    marginTop: 8,
  },
  retryButton: {
    backgroundColor: theme.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  trackingControls: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  trackingButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  trackingButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  locationInfo: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
    padding: 12,
  },
  locationInfoText: {
    fontSize: 12,
    color: theme.text,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
});

export default EnhancedMapView;