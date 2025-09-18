// EnhancedAdminMapsView.js - Clean Admin Maps with Google Maps Integration
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import { buildApiUrl } from '../constants/api';
import { getCurrentLocation, reverseGeocodeCoordinates } from '../utils/mapsApi';

const EnhancedAdminMapsView = ({ style }) => {
  const [vehicles, setVehicles] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [dealershipAddress, setDealershipAddress] = useState('Loading address...');

  // Enhanced region with better coverage for Philippines
  const defaultRegion = {
    latitude: 14.5995, // Manila coordinates  
    longitude: 120.9842,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  // Initialize current location and geocode dealership address
  useEffect(() => {
    const initLocation = async () => {
      try {
        const location = await getCurrentLocation();
        setCurrentLocation(location);
        console.log('📍 Admin: Current location obtained:', location);
      } catch (error) {
        console.log('Could not get current location:', error.message);
      }

      // Reverse geocode dealership location to get address
      try {
        const addressResult = await reverseGeocodeCoordinates(
          defaultRegion.latitude, 
          defaultRegion.longitude
        );
        if (addressResult.success && addressResult.address) {
          setDealershipAddress(addressResult.address);
        }
      } catch (error) {
        console.log('Could not reverse geocode dealership:', error.message);
        setDealershipAddress('Isuzu Pasig Dealership, Metro Manila');
      }
    };
    initLocation();
  }, []);

  // Enhanced fetch function with better error handling
  const fetchVehicleLocations = async () => {
    try {
      console.log('🗺️ Enhanced Admin Maps: Fetching vehicle locations...');
      
      // Fetch allocations with proper error handling
      const allocResponse = await fetch(buildApiUrl('/getAllocation'));
      if (allocResponse.ok) {
        const allocText = await allocResponse.text();
        if (allocText && allocText.trim()) {
          try {
            const allocData = JSON.parse(allocText);
            const allocArray = allocData.data || allocData.allocation || allocData || [];
            setAllocations(allocArray);
            console.log(`✅ Enhanced Admin Maps: Loaded ${allocArray.length} allocations`);
          } catch (parseError) {
            console.warn('⚠️ Enhanced Admin Maps: Allocation JSON parse issue, using empty array');
            setAllocations([]);
          }
        }
      }

      // Fetch vehicle stock with proper error handling  
      const stockResponse = await fetch(buildApiUrl('/getStock'));
      if (stockResponse.ok) {
        const stockText = await stockResponse.text();
        if (stockText && stockText.trim()) {
          try {
            const stockData = JSON.parse(stockText);
            const stockArray = stockData.data || stockData.vehicles || stockData || [];
            setVehicles(stockArray);
            console.log(`✅ Enhanced Admin Maps: Loaded ${stockArray.length} vehicles`);
          } catch (parseError) {
            console.warn('⚠️ Enhanced Admin Maps: Stock JSON parse issue, using empty array');
            setVehicles([]);
          }
        }
      }

    } catch (error) {
      console.error('❌ Enhanced Admin Maps: Error fetching data:', error);
      Alert.alert(
        'Connection Error',
        'Unable to fetch vehicle data. Please check your connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchVehicleLocations();
  }, []);

  const handleMapReady = () => {
    setMapReady(true);
    console.log('✅ Enhanced Admin Maps: Google Maps ready');
  };

  const handleMapError = (error) => {
    console.error('❌ Enhanced Admin Maps: Map error:', error);
    Alert.alert('Map Error', 'Failed to load the map. Please try again.');
  };

  const refreshData = () => {
    setLoading(true);
    fetchVehicleLocations();
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, style]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading Enhanced Admin Dashboard Maps...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.title}>🚀 Fleet Management - Enhanced Admin View</Text>
        <Text style={styles.subtitle}>
          {allocations.length} Allocated • {vehicles.length} In Stock • Google Maps Integrated
        </Text>
        <Text style={styles.addressText}>📍 {dealershipAddress}</Text>
        
        <TouchableOpacity style={styles.refreshButton} onPress={refreshData}>
          <Text style={styles.refreshButtonText}>🔄 Refresh Data</Text>
        </TouchableOpacity>
      </View>
      
      <MapView
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        initialRegion={defaultRegion}
        showsUserLocation={!!currentLocation}
        showsMyLocationButton={true}
        showsCompass={true}
        mapType="standard"
        onMapReady={handleMapReady}
        onError={handleMapError}
      >
        {/* Current Location Marker */}
        {currentLocation && (
          <Marker
            coordinate={currentLocation}
            title="Your Location"
            description="Current admin location"
            pinColor="blue"
          />
        )}

        {/* Dealership Marker */}
        <Marker
          coordinate={defaultRegion}
          title="🏢 Isuzu Pasig Dealership"
          description={dealershipAddress}
          pinColor="red"
        />
        
        {/* Vehicle Allocation Markers */}
        {allocations.map((allocation, index) => {
          // Generate mock coordinates around dealership for demo
          const lat = defaultRegion.latitude + (Math.random() - 0.5) * 0.02;
          const lng = defaultRegion.longitude + (Math.random() - 0.5) * 0.02;
          
          return (
            <Marker
              key={allocation._id || `alloc-${index}`}
              coordinate={{ latitude: lat, longitude: lng }}
              title={`🚗 ${allocation.unitName || 'Vehicle'} (${allocation.unitId || 'N/A'})`}
              description={`Status: ${allocation.status || 'Unknown'} • Driver: ${allocation.assignedDriver || 'Unassigned'}`}
              pinColor={
                allocation.status === 'Delivered' ? 'green' : 
                allocation.status === 'Out for Delivery' ? 'blue' : 
                allocation.status === 'In Transit' ? 'orange' : 'gray'
              }
            />
          );
        })}

        {/* Vehicle Stock Markers (different color) */}
        {vehicles.map((vehicle, index) => {
          const lat = defaultRegion.latitude + (Math.random() - 0.5) * 0.01;
          const lng = defaultRegion.longitude + (Math.random() - 0.5) * 0.01;
          
          return (
            <Marker
              key={`stock-${vehicle._id || index}`}
              coordinate={{ latitude: lat, longitude: lng }}
              title={`📦 Stock: ${vehicle.unitName || 'Vehicle'}`}
              description={`${vehicle.bodyColor || 'Unknown Color'} • ${vehicle.variation || 'Standard'} • Available`}
              pinColor="purple"
            />
          );
        })}
      </MapView>

      {!mapReady && (
        <View style={styles.mapLoadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.mapLoadingText}>Loading Google Maps...</Text>
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
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
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
  addressText: {
    fontSize: 12,
    color: '#007AFF',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  refreshButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  map: {
    flex: 1,
  },
  mapLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapLoadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
});

export default EnhancedAdminMapsView;
