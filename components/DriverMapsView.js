// DriverMapsView.js - Enhanced route display for Driver Dashboard
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildApiUrl } from '../constants/api';

const DriverMapsView = ({ style, selectedAllocation: propsSelectedAllocation }) => {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [pickupLocation, setPickupLocation] = useState(null);
  const [dropoffLocation, setDropoffLocation] = useState(null);

  // Get current location
  useEffect(() => {
    const getLocation = async () => {
      try {
        // Request location permission
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          // Get current location
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          setCurrentLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        }
      } catch (error) {
        console.error('❌ Driver Maps: Location error:', error);
      } finally {
        setLoading(false);
      }
    };

    getLocation();
  }, []);

  // Parse route information from selected allocation
  useEffect(() => {
    if (propsSelectedAllocation) {
      console.log('🗺️ Driver Maps: Processing allocation route data');
      
      // Parse pickup location
      if (propsSelectedAllocation.pickupCoordinates) {
        setPickupLocation(propsSelectedAllocation.pickupCoordinates);
        console.log('✅ Pickup location:', propsSelectedAllocation.pickupCoordinates);
      } else if (propsSelectedAllocation.pickupPoint) {
        // Try to geocode or use default location
        console.log('⚠️ No pickup coordinates, using pickup point name:', propsSelectedAllocation.pickupPoint);
      }
      
      // Parse dropoff location
      if (propsSelectedAllocation.dropoffCoordinates) {
        setDropoffLocation(propsSelectedAllocation.dropoffCoordinates);
        console.log('✅ Dropoff location:', propsSelectedAllocation.dropoffCoordinates);
      } else if (propsSelectedAllocation.dropoffPoint) {
        // Try to geocode or use default location
        console.log('⚠️ No dropoff coordinates, using dropoff point name:', propsSelectedAllocation.dropoffPoint);
      }
    } else {
      setPickupLocation(null);
      setDropoffLocation(null);
    }
  }, [propsSelectedAllocation]);

  const handleMapReady = () => {
    console.log('✅ Driver Maps: MapView ready');
    setMapReady(true);
  };

  const handleMapError = (error) => {
    console.error('❌ Driver Maps: MapView error:', error);
    // Don't crash the app
  };

  const getMapRegion = () => {
    // If we have route points, show both pickup and dropoff
    if (pickupLocation && dropoffLocation) {
      const midLat = (pickupLocation.latitude + dropoffLocation.latitude) / 2;
      const midLng = (pickupLocation.longitude + dropoffLocation.longitude) / 2;
      const latDelta = Math.abs(pickupLocation.latitude - dropoffLocation.latitude) * 1.5;
      const lngDelta = Math.abs(pickupLocation.longitude - dropoffLocation.longitude) * 1.5;
      
      return {
        latitude: midLat,
        longitude: midLng,
        latitudeDelta: Math.max(latDelta, 0.05),
        longitudeDelta: Math.max(lngDelta, 0.05),
      };
    }
    
    // Otherwise, center on current location
    if (currentLocation) {
      return {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }
    
    // Default to Philippines
    return {
      latitude: 14.5995,
      longitude: 120.9842,
      latitudeDelta: 0.5,
      longitudeDelta: 0.5,
    };
  };

  if (loading) {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator size="large" color="#ff1e1e" />
        <Text style={styles.loadingText}>Loading Driver Maps...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.title}>🗺️ Delivery Route</Text>
        {propsSelectedAllocation ? (
          <>
            <Text style={styles.subtitle}>
              {propsSelectedAllocation.unitName} ({propsSelectedAllocation.unitId})
            </Text>
            {propsSelectedAllocation.pickupPoint && propsSelectedAllocation.dropoffPoint && (
              <Text style={styles.routeText}>
                📍 {propsSelectedAllocation.pickupPoint} → 🎯 {propsSelectedAllocation.dropoffPoint}
              </Text>
            )}
            {propsSelectedAllocation.routeDistance && (
              <Text style={styles.distanceText}>
                Distance: ~{propsSelectedAllocation.routeDistance} km
              </Text>
            )}
          </>
        ) : (
          <Text style={styles.subtitle}>Select an assignment to view route</Text>
        )}
      </View>
      
      <MapView
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        region={getMapRegion()}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        mapType="standard"
        onMapReady={handleMapReady}
        onError={handleMapError}
      >
        {/* Pickup Location Marker */}
        {pickupLocation && (
          <Marker
            coordinate={pickupLocation}
            title="📍 Pickup Location"
            description={propsSelectedAllocation?.pickupPoint || 'Vehicle pickup point'}
            pinColor="green"
          />
        )}
        
        {/* Dropoff Location Marker */}
        {dropoffLocation && (
          <Marker
            coordinate={dropoffLocation}
            title="🎯 Drop-off Location"
            description={propsSelectedAllocation?.dropoffPoint || 'Delivery destination'}
            pinColor="red"
          />
        )}
        
        {/* Current Location Marker */}
        {currentLocation && (
          <Marker
            coordinate={currentLocation}
            title="🚛 Your Current Location"
            description="You are here"
            pinColor="blue"
          />
        )}
        
        {/* Planned Route Line (Pickup to Dropoff) */}
        {pickupLocation && dropoffLocation && (
          <Polyline
            coordinates={[pickupLocation, dropoffLocation]}
            strokeColor="#3b82f6"
            strokeWidth={4}
            lineDashPattern={[10, 5]}
          />
        )}
        
        {/* Current Progress Line (Current Location to Dropoff) */}
        {currentLocation && dropoffLocation && (
          <Polyline
            coordinates={[currentLocation, dropoffLocation]}
            strokeColor="#ef4444"
            strokeWidth={3}
          />
        )}
      </MapView>

      {!mapReady && (
        <View style={styles.mapLoadingOverlay}>
          <Text style={styles.mapLoadingText}>Loading map...</Text>
        </View>
      )}

      {/* Enhanced Location Info */}
      {(currentLocation || pickupLocation || dropoffLocation) && (
        <View style={styles.locationInfo}>
          {currentLocation && (
            <Text style={styles.infoText}>
              🚛 Current: {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
            </Text>
          )}
          {pickupLocation && (
            <Text style={styles.infoText}>
              📍 Pickup: {propsSelectedAllocation?.pickupPoint || 'Pickup location'}
            </Text>
          )}
          {dropoffLocation && (
            <Text style={styles.infoText}>
              🎯 Dropoff: {propsSelectedAllocation?.dropoffPoint || 'Drop-off location'}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  routeText: {
    fontSize: 13,
    color: '#3b82f6',
    fontWeight: '500',
    marginBottom: 4,
  },
  distanceText: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  map: {
    flex: 1,
    minHeight: 300,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  mapLoadingOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -25 }],
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 10,
    borderRadius: 8,
  },
  mapLoadingText: {
    fontSize: 14,
    color: '#666',
  },
  locationInfo: {
    position: 'absolute',
    bottom: 20,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  infoText: {
    fontSize: 12,
    color: '#333',
    marginBottom: 4,
  },
});

export default DriverMapsView;
