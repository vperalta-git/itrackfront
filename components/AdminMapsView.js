import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { buildApiUrl } from '../constants/api';

const AdminMapsView = ({ selectedVehicle = null }) => {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [vehicleLocation, setVehicleLocation] = useState(null);

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
    };

    initLocation();
    fetchMapData();

    // Set up refresh interval
    const refreshInterval = setInterval(fetchMapData, 30000); // 30 seconds
    return () => clearInterval(refreshInterval);
  }, []);

  // Handle selected vehicle tracking
  useEffect(() => {
    if (selectedVehicle) {
      console.log('🎯 Tracking selected vehicle:', selectedVehicle.unitName);
      // Try to get location from various sources
      const location = getVehicleLocation(selectedVehicle);
      if (location) {
        setVehicleLocation(location);
      } else {
        console.warn('⚠️ No location data found for vehicle:', selectedVehicle.unitName);
      }
    }
  }, [selectedVehicle]);

  const getVehicleLocation = (vehicle) => {
    // Try different location sources
    if (vehicle.latitude && vehicle.longitude) {
      return {
        latitude: parseFloat(vehicle.latitude),
        longitude: parseFloat(vehicle.longitude),
      };
    }
    if (vehicle.location?.latitude && vehicle.location?.longitude) {
      return {
        latitude: parseFloat(vehicle.location.latitude),
        longitude: parseFloat(vehicle.location.longitude),
      };
    }
    if (vehicle.currentLocation) {
      return vehicle.currentLocation;
    }
    return null;
  };

  const fetchMapData = async () => {
    setLoading(true);
    setError('');
    
    try {
      console.log('🔄 Admin Maps: Fetching data...');

      // Fetch allocations with proper error handling
      const allocationResponse = await fetch(buildApiUrl('/getAllocation'));
      if (allocationResponse.ok) {
        const allocationText = await allocationResponse.text();
        if (allocationText && allocationText.trim()) {
          try {
            const allocationData = JSON.parse(allocationText);
            const allocationArray = allocationData.data || allocationData.allocations || allocationData || [];
            setAllocations(allocationArray);
            console.log(`✅ Admin Maps: Loaded ${allocationArray.length} allocations`);
          } catch (parseError) {
            console.warn('⚠️ Admin Maps: Allocation JSON parse issue, using empty array');
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
            console.log(`✅ Admin Maps: Loaded ${stockArray.length} vehicles`);
          } catch (parseError) {
            console.warn('⚠️ Admin Maps: Stock JSON parse issue, using empty array');
            setVehicles([]);
          }
        }
      }

    } catch (error) {
      console.error('❌ Admin Maps: API error:', error);
      // Don't crash - just use empty data
      setVehicles([]);
      setAllocations([]);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { requestLocationPermission } = await import('expo-location');
      
      // Request permission
      const { status } = await requestLocationPermission();
      if (status !== 'granted') {
        console.log('Location permission denied');
        // Return default Manila location
        return {
          latitude: 14.5995,
          longitude: 120.9842,
        };
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (error) {
      console.log('Error getting location:', error);
      // Fallback to Manila coordinates
      return {
        latitude: 14.5995,
        longitude: 120.9842,
      };
    }
  };

  const getVehicleStatus = (vehicle) => {
    if (!vehicle) return 'unknown';
    return vehicle.status || 'available';
  };

  const getMarkerColor = (status) => {
    switch (status.toLowerCase()) {
      case 'available': return '#4CAF50';
      case 'allocated': return '#FF9800';
      case 'in transit': return '#2196F3';
      case 'delivered': return '#9C27B0';
      default: return '#757575';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff1e1e" />
        <Text style={styles.loadingText}>Loading Admin Map View...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={selectedVehicle && vehicleLocation ? {
          ...vehicleLocation,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        } : defaultRegion}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        showsScale={true}
      >
        {/* Current Location Marker */}
        {currentLocation && (
          <Marker
            coordinate={currentLocation}
            title="Your Current Location"
            description="Admin Location"
            pinColor="#ff1e1e"
          />
        )}

        {/* Selected Vehicle Marker */}
        {selectedVehicle && vehicleLocation && (
          <Marker
            coordinate={vehicleLocation}
            title={`Vehicle: ${selectedVehicle.unitName}`}
            description={`Driver: ${selectedVehicle.assignedDriverName || 'Unassigned'} | Status: ${selectedVehicle.status || 'Unknown'}`}
            pinColor="#FF6B6B"
          />
        )}

        {/* All Vehicle Markers (when no specific vehicle selected) */}
        {!selectedVehicle && vehicles.map((vehicle, index) => {
          // Use the new location field structure
          const lat = parseFloat(vehicle.location?.latitude || defaultRegion.latitude + (Math.random() - 0.5) * 0.01);
          const lng = parseFloat(vehicle.location?.longitude || defaultRegion.longitude + (Math.random() - 0.5) * 0.01);
          
          if (isNaN(lat) || isNaN(lng)) return null;

          const status = getVehicleStatus(vehicle);
          
          return (
            <Marker
              key={`vehicle-${index}`}
              coordinate={{ latitude: lat, longitude: lng }}
              title={`Vehicle: ${vehicle.unitId || vehicle.id || `V${index + 1}`}`}
              description={`Status: ${status} | Location: ${vehicle.location?.address || 'N/A'}`}
              pinColor={getMarkerColor(status)}
            />
          );
        })}

        {/* Allocation Markers */}
        {allocations.map((allocation, index) => {
          // Use the new location field structure  
          const lat = parseFloat(allocation.location?.latitude || defaultRegion.latitude + (Math.random() - 0.5) * 0.02);
          const lng = parseFloat(allocation.location?.longitude || defaultRegion.longitude + (Math.random() - 0.5) * 0.02);
          
          if (isNaN(lat) || isNaN(lng)) return null;

          return (
            <Marker
              key={`allocation-${index}`}
              coordinate={{ latitude: lat, longitude: lng }}
              title={`Assignment: ${allocation.unitId || `A${index + 1}`}`}
              description={`Driver: ${allocation.assignedDriver || 'N/A'} | Status: ${allocation.status || 'Active'} | ${allocation.location?.address || 'Unknown Location'}`}
              pinColor="#FF6B6B"
            />
          );
        })}
      </MapView>

      {/* Status Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Status Legend</Text>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#4CAF50' }]} />
          <Text style={styles.legendText}>Available</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#FF9800' }]} />
          <Text style={styles.legendText}>Allocated</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#2196F3' }]} />
          <Text style={styles.legendText}>In Transit</Text>
        </View>
      </View>

      {/* Data Summary */}
      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          📊 Vehicles: {vehicles.length} | Allocations: {allocations.length}
        </Text>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  map: {
    flex: 1,
  },
  legend: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 10,
    borderRadius: 8,
    minWidth: 120,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  summary: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(203, 30, 42, 0.9)',
    padding: 8,
    borderRadius: 8,
  },
  summaryText: {
    color: 'white',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  errorContainer: {
    position: 'absolute',
    top: 50,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    padding: 8,
    borderRadius: 8,
  },
  errorText: {
    color: 'white',
    fontSize: 12,
    textAlign: 'center',
  },
});

export default AdminMapsView;
