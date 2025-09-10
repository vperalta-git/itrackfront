// AdminMapsView.js - Direct Maps API for Admin Dashboard
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { buildApiUrl } from '../constants/api';

const AdminMapsView = ({ style }) => {
  const [vehicles, setVehicles] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);

  // Direct API calls - no external dependencies
  const fetchVehicleLocations = async () => {
    try {
      console.log('🗺️ Admin Maps: Fetching vehicle locations...');
      
      // Fetch allocations with proper error handling
      const allocResponse = await fetch(buildApiUrl('/getAllocation'));
      if (allocResponse.ok) {
        const allocText = await allocResponse.text();
        if (allocText && allocText.trim()) {
          try {
            const allocData = JSON.parse(allocText);
            const allocArray = allocData.data || allocData.allocation || allocData || [];
            setAllocations(allocArray);
            console.log(`✅ Admin Maps: Loaded ${allocArray.length} allocations`);
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

  useEffect(() => {
    fetchVehicleLocations();
    // Refresh every 30 seconds
    const interval = setInterval(fetchVehicleLocations, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMapReady = () => {
    console.log('✅ Admin Maps: MapView ready');
    setMapReady(true);
  };

  const handleMapError = (error) => {
    console.error('❌ Admin Maps: MapView error:', error);
    // Don't crash the app
  };

  // Default location (Isuzu Pasig)
  const defaultRegion = {
    latitude: 14.5791,
    longitude: 121.0655,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  if (loading) {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator size="large" color="#CB1E2A" />
        <Text style={styles.loadingText}>Loading Admin Maps...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.title}>🗺️ Vehicle Tracking</Text>
        <Text style={styles.subtitle}>
          {allocations.length} Allocated • {vehicles.length} In Stock
        </Text>
      </View>
      
      <MapView
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        initialRegion={defaultRegion}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={true}
        mapType="standard"
        onMapReady={handleMapReady}
        onError={handleMapError}
      >
        {/* Dealership Marker */}
        <Marker
          coordinate={defaultRegion}
          title="Isuzu Pasig Dealership"
          description="Main dealership location"
          pinColor="red"
        />
        
        {/* Vehicle Markers */}
        {allocations.map((allocation, index) => {
          // Generate mock coordinates around dealership for demo
          const lat = defaultRegion.latitude + (Math.random() - 0.5) * 0.02;
          const lng = defaultRegion.longitude + (Math.random() - 0.5) * 0.02;
          
          return (
            <Marker
              key={allocation._id || index}
              coordinate={{ latitude: lat, longitude: lng }}
              title={`${allocation.unitName} (${allocation.unitId})`}
              description={`Status: ${allocation.status} • Driver: ${allocation.assignedDriver || 'Unassigned'}`}
              pinColor={allocation.status === 'Delivered' ? 'green' : 
                       allocation.status === 'Out for Delivery' ? 'blue' : 'orange'}
            />
          );
        })}
      </MapView>

      {!mapReady && (
        <View style={styles.mapLoadingOverlay}>
          <Text style={styles.mapLoadingText}>Loading map...</Text>
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
});

export default AdminMapsView;
