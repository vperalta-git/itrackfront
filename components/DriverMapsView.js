// DriverMapsView.js - Direct Maps API for Driver Dashboard
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildApiUrl } from '../constants/api';

const DriverMapsView = ({ style }) => {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [driverAllocations, setDriverAllocations] = useState([]);
  const [selectedAllocation, setSelectedAllocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [driverName, setDriverName] = useState('');

  const DESTINATION_COORDS = { latitude: 14.5791, longitude: 121.0655 }; // Isuzu Pasig

  // Get driver name and setup location tracking
  useEffect(() => {
    const setupDriver = async () => {
      try {
        // Get driver name
        const name = await AsyncStorage.getItem('userName') || await AsyncStorage.getItem('accountName');
        setDriverName(name || 'Unknown Driver');

        // Request location permission
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          // Get current location
          const location = await Location.getCurrentPositionAsync();
          setCurrentLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });

          // Start location tracking
          const subscription = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.High,
              timeInterval: 15000, // Update every 15 seconds
              distanceInterval: 100, // Update every 100 meters
            },
            (newLocation) => {
              setCurrentLocation({
                latitude: newLocation.coords.latitude,
                longitude: newLocation.coords.longitude,
              });
            }
          );

          return () => subscription?.remove();
        }
      } catch (error) {
        console.error('❌ Driver Maps: Setup error:', error);
      }
    };

    setupDriver();
  }, []);

  // Fetch driver allocations with proper error handling
  const fetchDriverAllocations = async () => {
    if (!driverName || driverName === 'Unknown Driver') return;

    try {
      console.log('🗺️ Driver Maps: Fetching allocations for:', driverName);
      
      const response = await fetch(buildApiUrl('/getAllocation'));
      if (response.ok) {
        const responseText = await response.text();
        if (responseText && responseText.trim()) {
          try {
            const data = JSON.parse(responseText);
            const allocationsArray = data.data || data.allocation || data || [];
            
            // Filter for current driver
            const driverAllocations = allocationsArray.filter(allocation => 
              allocation.assignedDriver === driverName
            );
            
            setDriverAllocations(driverAllocations);
            console.log(`✅ Driver Maps: Found ${driverAllocations.length} allocations for ${driverName}`);
            
            // Auto-select first allocation if none selected
            if (!selectedAllocation && driverAllocations.length > 0) {
              setSelectedAllocation(driverAllocations[0]);
            }
          } catch (parseError) {
            console.warn('⚠️ Driver Maps: JSON parse issue, using empty array');
            setDriverAllocations([]);
          }
        }
      }
    } catch (error) {
      console.error('❌ Driver Maps: Fetch error:', error);
      setDriverAllocations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (driverName && driverName !== 'Unknown Driver') {
      fetchDriverAllocations();
      // Refresh every 30 seconds
      const interval = setInterval(fetchDriverAllocations, 30000);
      return () => clearInterval(interval);
    }
  }, [driverName]);

  const handleMapReady = () => {
    console.log('✅ Driver Maps: MapView ready');
    setMapReady(true);
  };

  const handleMapError = (error) => {
    console.error('❌ Driver Maps: MapView error:', error);
    // Don't crash the app
  };

  const getMapRegion = () => {
    if (currentLocation) {
      return {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }
    return {
      latitude: DESTINATION_COORDS.latitude,
      longitude: DESTINATION_COORDS.longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
  };

  if (loading) {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator size="large" color="#CB1E2A" />
        <Text style={styles.loadingText}>Loading Driver Maps...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.title}>🚛 My Route</Text>
        <Text style={styles.subtitle}>
          Driver: {driverName} • {driverAllocations.length} Assignments
        </Text>
        {selectedAllocation && (
          <Text style={styles.selectedText}>
            Selected: {selectedAllocation.unitName} ({selectedAllocation.unitId})
          </Text>
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
        {/* Destination Marker */}
        <Marker
          coordinate={DESTINATION_COORDS}
          title="Isuzu Pasig Dealership"
          description="Final delivery destination"
          pinColor="red"
        />
        
        {/* Current Location Marker */}
        {currentLocation && (
          <Marker
            coordinate={currentLocation}
            title="Your Location"
            description={`Driver: ${driverName}`}
            pinColor="blue"
          />
        )}
        
        {/* Route Line */}
        {currentLocation && (
          <Polyline
            coordinates={[currentLocation, DESTINATION_COORDS]}
            strokeColor="#CB1E2A"
            strokeWidth={3}
            lineDashPattern={[5, 5]}
          />
        )}
      </MapView>

      {!mapReady && (
        <View style={styles.mapLoadingOverlay}>
          <Text style={styles.mapLoadingText}>Loading map...</Text>
        </View>
      )}

      {/* Location Info */}
      {currentLocation && (
        <View style={styles.locationInfo}>
          <Text style={styles.infoText}>
            📍 Your Location: {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
          </Text>
          <Text style={styles.infoText}>
            🏭 Destination: Isuzu Pasig Dealership
          </Text>
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
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  selectedText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
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
