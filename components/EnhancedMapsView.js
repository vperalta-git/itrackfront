// EnhancedMapsView.js - Advanced Google Maps integration with routes and satellite view
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { buildApiUrl } from '../constants/api';

const EnhancedMapsView = ({ userRole, userName, style }) => {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [allocations, setAllocations] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapType, setMapType] = useState('standard'); // 'standard', 'satellite', 'hybrid'
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const mapRef = useRef(null);

  // Manila area default region
  const defaultRegion = {
    latitude: 14.5791,
    longitude: 121.0655,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  // Get user location
  useEffect(() => {
    const getLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          setCurrentLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
          console.log('📍 Enhanced Maps: User location obtained');
        }
      } catch (error) {
        console.error('❌ Enhanced Maps: Location error:', error);
      }
    };
    getLocation();
  }, []);

  // Fetch data based on user role
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        console.log('🗺️ Enhanced Maps: Fetching data for', userRole, userName);
        
        // Fetch allocations
        const allocResponse = await fetch(buildApiUrl('/getAllocation'));
        if (allocResponse.ok) {
          const allocData = await allocResponse.json();
          let userAllocations = allocData.data || allocData.allocations || allocData || [];
          
          // Filter based on user role
          if (userRole === 'Driver') {
            userAllocations = userAllocations.filter(alloc => 
              alloc.assignedDriver === userName
            );
          } else if (userRole === 'Sales Agent') {
            userAllocations = userAllocations.filter(alloc => 
              alloc.assignedAgent === userName
            );
          }
          
          setAllocations(userAllocations);
          console.log(`✅ Enhanced Maps: Loaded ${userAllocations.length} allocations`);
        }

        // Fetch vehicles
        const vehicleResponse = await fetch(buildApiUrl('/getInventory'));
        if (vehicleResponse.ok) {
          const vehicleData = await vehicleResponse.json();
          const allVehicles = vehicleData.data || vehicleData.vehicles || vehicleData || [];
          setVehicles(allVehicles);
          console.log(`✅ Enhanced Maps: Loaded ${allVehicles.length} vehicles`);
        }

      } catch (error) {
        console.error('❌ Enhanced Maps: Fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userName && userRole) {
      fetchData();
    }
  }, [userName, userRole]);

  // Get route between two points
  const getRoute = async (origin, destination) => {
    try {
      console.log('🛣️ Getting route from backend API...');
      const response = await fetch(buildApiUrl('/getRoute'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: `${origin.latitude},${origin.longitude}`,
          destination: `${destination.latitude},${destination.longitude}`,
          mode: 'driving'
        })
      });

      if (response.ok) {
        const routeData = await response.json();
        if (routeData.success && routeData.route && routeData.route.legs) {
          // Extract coordinates from Google Directions response
          const coordinates = [];
          routeData.route.legs.forEach(leg => {
            leg.steps.forEach(step => {
              coordinates.push({
                latitude: step.start_location.lat,
                longitude: step.start_location.lng
              });
              coordinates.push({
                latitude: step.end_location.lat,
                longitude: step.end_location.lng
              });
            });
          });
          setRouteCoordinates(coordinates);
          console.log('✅ Route loaded with', coordinates.length, 'points');
          return coordinates;
        }
      }
    } catch (error) {
      console.error('❌ Route error:', error);
    }
    return [];
  };

  // Handle marker press to show route
  const onMarkerPress = async (marker) => {
    if (currentLocation && marker.location) {
      Alert.alert(
        "Show Route",
        `Show route to ${marker.unitId || marker.title}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Show Route",
            onPress: async () => {
              const route = await getRoute(currentLocation, marker.location);
              if (route.length > 0 && mapRef.current) {
                // Fit map to show route
                mapRef.current.fitToCoordinates([currentLocation, marker.location], {
                  edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                  animated: true
                });
              }
            }
          }
        ]
      );
    }
  };

  // Toggle map type
  const toggleMapType = () => {
    const types = ['standard', 'satellite', 'hybrid'];
    const currentIndex = types.indexOf(mapType);
    const nextIndex = (currentIndex + 1) % types.length;
    setMapType(types[nextIndex]);
  };

  // Get marker color based on status
  const getMarkerColor = (status, type = 'vehicle') => {
    if (type === 'user') return '#2196F3'; // Blue for user location
    
    switch (status?.toLowerCase()) {
      case 'assigned': return '#FF9800'; // Orange
      case 'ready for delivery': return '#4CAF50'; // Green
      case 'in transit': return '#9C27B0'; // Purple
      case 'delivered': return '#607D8B'; // Blue-gray
      case 'available': return '#FFC107'; // Yellow
      default: return '#757575'; // Gray
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, style, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#ff1e1e" />
        <Text style={styles.loadingText}>Loading Enhanced Maps...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Map Controls */}
      <View style={styles.mapControls}>
        <TouchableOpacity style={styles.controlButton} onPress={toggleMapType}>
          <Text style={styles.controlButtonText}>
            {mapType === 'standard' ? '🗺️' : mapType === 'satellite' ? '🛰️' : '🔀'}
          </Text>
        </TouchableOpacity>
      </View>

      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={currentLocation || defaultRegion}
        mapType={mapType}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        showsScale={true}
        showsIndoors={false}
        showsTraffic={false}
        loadingEnabled={true}
        loadingIndicatorColor="#ff1e1e"
        loadingBackgroundColor="#ffffff"
      >
        {/* User Location */}
        {currentLocation && (
          <Marker
            coordinate={currentLocation}
            title="Your Location"
            description={`${userRole}: ${userName}`}
            pinColor={getMarkerColor(null, 'user')}
          />
        )}

        {/* Vehicle Allocations */}
        {allocations.map((allocation, index) => {
          if (allocation.location?.latitude && allocation.location?.longitude) {
            return (
              <Marker
                key={`allocation-${index}`}
                coordinate={{
                  latitude: allocation.location.latitude,
                  longitude: allocation.location.longitude
                }}
                title={allocation.unitId}
                description={`${allocation.unitName} • Status: ${allocation.status}`}
                pinColor={getMarkerColor(allocation.status)}
                onPress={() => onMarkerPress(allocation)}
              />
            );
          }
          return null;
        })}

        {/* Available Vehicles */}
        {vehicles.map((vehicle, index) => {
          if (vehicle.location?.latitude && vehicle.location?.longitude) {
            return (
              <Marker
                key={`vehicle-${index}`}
                coordinate={{
                  latitude: vehicle.location.latitude,
                  longitude: vehicle.location.longitude
                }}
                title={vehicle.unitId}
                description={`${vehicle.unitName} • ${vehicle.status}`}
                pinColor={getMarkerColor(vehicle.status)}
                onPress={() => onMarkerPress(vehicle)}
              />
            );
          }
          return null;
        })}

        {/* Route Polyline */}
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#ff1e1e"
            strokeWidth={4}
            lineDashPattern={[5, 10, 15, 10]}
          />
        )}
      </MapView>

      {/* Map Info */}
      <View style={styles.mapInfo}>
        <Text style={styles.infoText}>
          📍 {allocations.length + vehicles.length} locations • {mapType} view
        </Text>
        {userRole === 'Driver' && (
          <Text style={styles.roleInfo}>
            🚗 Your assignments: {allocations.length}
          </Text>
        )}
        {userRole === 'Sales Agent' && (
          <Text style={styles.roleInfo}>
            📋 Your clients: {allocations.length}
          </Text>
        )}
        {currentLocation && (
          <Text style={styles.locationText}>
            📍 GPS: {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  mapControls: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1000,
  },
  controlButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  controlButtonText: {
    fontSize: 18,
  },
  map: {
    flex: 1,
  },
  mapInfo: {
    position: 'absolute',
    bottom: 20,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 12,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  roleInfo: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginBottom: 2,
  },
  locationText: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    fontFamily: 'monospace',
  },
});

export default EnhancedMapsView;
