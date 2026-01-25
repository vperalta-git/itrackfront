// DiagnosticMapScreen.js - Simple test to diagnose map issues
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { MaterialIcons } from '@expo/vector-icons';

const DiagnosticMapScreen = () => {
  const [mapReady, setMapReady] = useState(false);
  const [locationPermission, setLocationPermission] = useState('unknown');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [mapError, setMapError] = useState(null);

  // Manila default region
  const defaultRegion = {
    latitude: 14.5995,
    longitude: 120.9842,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  useEffect(() => {
    checkLocationPermissions();
  }, []);

  const checkLocationPermissions = async () => {
    try {
      console.log('Checking location permissions...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status);
      
      if (status === 'granted') {
        getCurrentLocation();
      }
    } catch (error) {
      console.error('Permission error:', error);
      setLocationPermission('error');
    }
  };

  const getCurrentLocation = async () => {
    try {
      console.log('Getting current location...');
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 10000,
      });
      
      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      
      setCurrentLocation(coords);
      console.log('Location obtained:', coords);
    } catch (error) {
      console.error('Location error:', error);
    }
  };

  const handleMapReady = () => {
    console.log('Map is ready!');
    setMapReady(true);
  };

  const handleMapError = (error) => {
    console.error('Map error:', error);
    setMapError(error.message || 'Unknown map error');
  };

  const retryMap = () => {
    setMapError(null);
    setMapReady(false);
  };

  if (mapError) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.titleRow}>
          <MaterialIcons name="map" size={28} color="#e50914" />
          <Text style={styles.title}>Map Diagnostic</Text>
        </View>
        <View style={styles.errorTitleRow}>
          <MaterialIcons name="error" size={24} color="#dc3545" />
          <Text style={styles.errorTitle}>Map Error</Text>
        </View>
        <Text style={styles.errorText}>{mapError}</Text>
        <TouchableOpacity style={styles.button} onPress={retryMap}>
          <MaterialIcons name="refresh" size={20} color="white" />
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
        <View style={styles.diagnosticInfo}>
          <View style={styles.infoRow}>
            <MaterialIcons name="smartphone" size={16} color="#495057" />
            <Text style={styles.infoText}>Location Permission: {locationPermission}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialIcons name="location-on" size={16} color="#495057" />
            <Text style={styles.infoText}>Current Location: {currentLocation ? 'Available' : 'Not Available'}</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <MaterialIcons name="map" size={28} color="#e50914" />
          <Text style={styles.title}>Map Diagnostic</Text>
        </View>
        <View style={styles.statusRow}>
          <MaterialIcons name={mapReady ? "check-circle" : "hourglass-empty"} size={16} color={mapReady ? "#28a745" : "#ffc107"} />
          <Text style={styles.status}>Map Ready: {mapReady ? 'Yes' : 'Loading'}</Text>
        </View>
        <View style={styles.statusRow}>
          <MaterialIcons name="security" size={16} color="#666" />
          <Text style={styles.status}>Permission: {locationPermission}</Text>
        </View>
        <View style={styles.statusRow}>
          <MaterialIcons name={currentLocation ? "check-circle" : "cancel"} size={16} color={currentLocation ? "#28a745" : "#dc3545"} />
          <Text style={styles.status}>Location: {currentLocation ? 'Available' : 'Not Available'}</Text>
        </View>
      </View>

      {!mapReady && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#e50914" />
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      )}

      <MapView
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        initialRegion={defaultRegion}
        onMapReady={handleMapReady}
        onError={handleMapError}
        showsUserLocation={locationPermission === 'granted'}
        showsMyLocationButton={locationPermission === 'granted'}
        mapType="standard"
      >
        {/* Default marker at Manila */}
        <Marker
          coordinate={defaultRegion}
          title="Manila, Philippines"
          description="Default location for I-Track"
          pinColor="red"
        />
        
        {/* Current location marker if available */}
        {currentLocation && (
          <Marker
            coordinate={currentLocation}
            title="Your Location"
            description="Current GPS position"
            pinColor="blue"
          />
        )}
      </MapView>

      <TouchableOpacity style={styles.refreshButton} onPress={getCurrentLocation}>
        <MaterialIcons name="my-location" size={20} color="white" />
        <Text style={styles.refreshButtonText}>Refresh Location</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e50914',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
    gap: 6,
  },
  status: {
    fontSize: 16,
    color: '#666',
  },
  map: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -50 }],
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#e50914',
  },
  refreshButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#e50914',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  errorTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc3545',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#e50914',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  diagnosticInfo: {
    width: '100%',
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 2,
  },
  infoText: {
    fontSize: 14,
    color: '#495057',
  },
});

export default DiagnosticMapScreen;
