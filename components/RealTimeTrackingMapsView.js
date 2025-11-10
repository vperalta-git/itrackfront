// RealTimeTrackingMapsView.js - Real GPS tracking with no mock data
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { buildApiUrl } from '../constants/api';

const RealTimeTrackingMapsView = ({ userRole, userName, style }) => {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapType, setMapType] = useState('standard');
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [selectedAllocation, setSelectedAllocation] = useState(null);
  const mapRef = useRef(null);
  const locationSubscription = useRef(null);

  // Isuzu Pasig Dealership coordinates (REAL DESTINATION)
  const ISUZU_PASIG = {
    latitude: 14.5791,
    longitude: 121.0655,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  // Setup real-time location tracking
  useEffect(() => {
    const setupLocationTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Location permission is required for GPS tracking');
          return;
        }

        // Get initial location
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Highest,
        });
        
        const userLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        
        setCurrentLocation(userLocation);
        console.log('📍 Real GPS location obtained:', userLocation);

        // Send location to backend for driver tracking
        if (userRole === 'Driver' && userName) {
          await updateDriverLocation(location.coords.latitude, location.coords.longitude, location.coords.speed, location.coords.heading);
        }

        // Setup continuous location tracking
        if (userRole === 'Driver') {
          locationSubscription.current = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.High,
              timeInterval: 10000, // Update every 10 seconds
              distanceInterval: 50, // Update every 50 meters
            },
            async (newLocation) => {
              const coords = {
                latitude: newLocation.coords.latitude,
                longitude: newLocation.coords.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              };
              
              setCurrentLocation(coords);
              console.log('📍 Location updated:', coords);
              
              // Update backend with new location
              await updateDriverLocation(
                newLocation.coords.latitude, 
                newLocation.coords.longitude,
                newLocation.coords.speed,
                newLocation.coords.heading
              );
            }
          );
        }

      } catch (error) {
        console.error('❌ Location setup error:', error);
        Alert.alert('Location Error', 'Unable to get your location. Using default region.');
        setCurrentLocation(ISUZU_PASIG);
      }
    };

    setupLocationTracking();

    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, [userRole, userName]);

  // Update driver location in backend
  const updateDriverLocation = async (latitude, longitude, speed = 0, heading = 0) => {
    try {
      const response = await fetch(buildApiUrl('/updateDriverLocation'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverName: userName,
          location: {
            latitude,
            longitude,
            speed,
            heading,
            timestamp: Date.now()
          }
        })
      });

      const result = await response.json();
      if (result.success) {
        console.log('✅ Location updated in backend');
      }
    } catch (error) {
      console.error('❌ Location update failed:', error);
    }
  };

  // Fetch real allocations with GPS data
  useEffect(() => {
    const fetchRealAllocations = async () => {
      setLoading(true);
      try {
        console.log('🗺️ Fetching REAL allocations for', userRole, userName);
        
        const response = await fetch(buildApiUrl('/getAllocation'));
        if (response.ok) {
          const data = await response.json();
          let userAllocations = data.data || [];
          
          // Filter based on user role - NO MOCK DATA
          if (userRole === 'Driver') {
            userAllocations = userAllocations.filter(alloc => 
              alloc.assignedDriver === userName
            );
          } else if (userRole === 'Sales Agent') {
            userAllocations = userAllocations.filter(alloc => 
              alloc.assignedAgent === userName
            );
          }
          
          // Only show allocations with REAL GPS coordinates
          const realAllocations = userAllocations.filter(alloc => 
            alloc.currentLocation?.latitude && alloc.currentLocation?.longitude
          );
          
          setAllocations(realAllocations);
          console.log(`✅ Loaded ${realAllocations.length} REAL GPS allocations`);
          
          if (realAllocations.length === 0) {
            console.log('ℹ️ No allocations with GPS data found. Enable location tracking.');
          }
        }

      } catch (error) {
        console.error('❌ Fetch allocations error:', error);
        setAllocations([]); // No fallback to mock data
      } finally {
        setLoading(false);
      }
    };

    if (userName && userRole) {
      fetchRealAllocations();
      // Refresh every 30 seconds for real-time updates
      const interval = setInterval(fetchRealAllocations, 30000);
      return () => clearInterval(interval);
    }
  }, [userName, userRole]);

  // Get real route using Google Maps API (Direct API call)
  const getRealRoute = async (origin, destination) => {
    try {
      console.log('🛣️ Getting REAL route from Google Maps API...');
      
      const GOOGLE_API_KEY = 'AIzaSyAT5fZoyDVluzfdq4Rz2uuVJDocqBLDTGo';
      const directUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${GOOGLE_API_KEY}`;
      
      // Try direct API call first (works if restrictions allow mobile apps)
      try {
        const directResponse = await fetch(directUrl);
        const directData = await directResponse.json();
        
        if (directData.status === 'OK' && directData.routes && directData.routes.length > 0) {
          const route = directData.routes[0];
          const decodedCoordinates = decodePolyline(route.overview_polyline.points);
          setRouteCoordinates(decodedCoordinates);
          console.log('✅ Real route loaded (direct API):', route.summary);
          return decodedCoordinates;
        }
      } catch (directError) {
        console.log('Direct API failed, trying backend...', directError.message);
      }
      
      // Fallback to backend endpoint
      const response = await fetch(buildApiUrl('/api/directions/route'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: `${origin.latitude},${origin.longitude}`,
          destination: `${destination.latitude},${destination.longitude}`
        })
      });

      if (response.ok) {
        const routeData = await response.json();
        if (routeData.success && routeData.route) {
          // Decode polyline to coordinates
          const decodedCoordinates = decodePolyline(routeData.route.overview_polyline);
          setRouteCoordinates(decodedCoordinates);
          console.log('✅ Real route loaded (backend):', routeData.summary);
          return decodedCoordinates;
        }
      }
    } catch (error) {
      console.error('❌ Real route error:', error);
    }
    return [];
  };

  // Simple polyline decoder
  const decodePolyline = (encoded) => {
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;
    const points = [];

    while (index < len) {
      let b, shift = 0, result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const deltaLat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += deltaLat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const deltaLng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += deltaLng;

      points.push({
        latitude: lat / 1E5,
        longitude: lng / 1E5
      });
    }
    return points;
  };

  // Handle allocation selection for routing
  const onAllocationPress = async (allocation) => {
    if (currentLocation && allocation.deliveryDestination) {
      setSelectedAllocation(allocation);
      
      Alert.alert(
        "Show Route",
        `Show route to ${allocation.deliveryDestination.address}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Show Route",
            onPress: async () => {
              const route = await getRealRoute(currentLocation, allocation.deliveryDestination);
              if (route.length > 0 && mapRef.current) {
                mapRef.current.fitToCoordinates([currentLocation, allocation.deliveryDestination], {
                  edgePadding: { top: 100, right: 100, bottom: 100, left: 100 },
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
    if (type === 'user') return '#2196F3';
    if (type === 'destination') return '#FF0000';
    
    switch (status?.toLowerCase()) {
      case 'assigned': return '#FF9800';
      case 'in transit': return '#9C27B0';
      case 'delivered': return '#4CAF50';
      case 'ready for delivery': return '#00BCD4';
      default: return '#757575';
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, style, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#ff1e1e" />
        <Text style={styles.loadingText}>Loading Real-Time GPS Tracking...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Real-time Controls */}
      <View style={styles.mapControls}>
        <TouchableOpacity style={styles.controlButton} onPress={toggleMapType}>
          <Text style={styles.controlButtonText}>
            {mapType === 'standard' ? '🗺️' : mapType === 'satellite' ? '🛰️' : '🔀'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.controlButton, styles.trackingButton]} 
          onPress={() => {
            if (currentLocation && mapRef.current) {
              mapRef.current.animateToRegion(currentLocation, 1000);
            }
          }}
        >
          <Text style={styles.controlButtonText}>📍</Text>
        </TouchableOpacity>
      </View>

      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={currentLocation || ISUZU_PASIG}
        mapType={mapType}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={true}
        showsScale={true}
        showsTraffic={true}
        loadingEnabled={true}
        loadingIndicatorColor="#ff1e1e"
      >
        {/* User's Real Location */}
        {currentLocation && (
          <Marker
            coordinate={currentLocation}
            title="Your Live Location"
            description={`${userRole}: ${userName} (GPS Active)`}
            pinColor={getMarkerColor(null, 'user')}
          />
        )}

        {/* Isuzu Pasig Dealership - REAL DESTINATION */}
        <Marker
          coordinate={ISUZU_PASIG}
          title="🏢 Isuzu Pasig Dealership"
          description="Main delivery destination"
          pinColor={getMarkerColor(null, 'destination')}
        />

        {/* Real Vehicle Allocations with GPS */}
        {allocations.map((allocation, index) => {
          const { currentLocation: allocLocation } = allocation;
          
          if (!allocLocation?.latitude || !allocLocation?.longitude) {
            return null; // Skip allocations without real GPS data
          }
          
          return (
            <Marker
              key={`real-allocation-${index}`}
              coordinate={{
                latitude: allocLocation.latitude,
                longitude: allocLocation.longitude
              }}
              title={`🚗 ${allocation.unitId}`}
              description={`${allocation.unitName} • Status: ${allocation.status}\nDriver: ${allocation.assignedDriver}\nLast Update: ${new Date(allocLocation.lastUpdated).toLocaleTimeString()}`}
              pinColor={getMarkerColor(allocation.status)}
              onPress={() => onAllocationPress(allocation)}
            />
          );
        })}

        {/* Real Route Polyline */}
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#ff1e1e"
            strokeWidth={4}
            lineDashPattern={[5, 10]}
          />
        )}
      </MapView>

      {/* Real-time Info Panel */}
      <View style={styles.mapInfo}>
        <Text style={styles.infoText}>
          📍 Live GPS: {allocations.length} tracked vehicles • {mapType} view
        </Text>
        {userRole === 'Driver' && (
          <Text style={styles.roleInfo}>
            🚗 Your active deliveries: {allocations.length} → Isuzu Pasig
          </Text>
        )}
        {userRole === 'Sales Agent' && (
          <Text style={styles.roleInfo}>
            📋 Your client vehicles: {allocations.length}
          </Text>
        )}
        {currentLocation && (
          <Text style={styles.locationText}>
            📍 GPS: {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
          </Text>
        )}
        {selectedAllocation && (
          <Text style={styles.selectedText}>
            🎯 Selected: {selectedAllocation.unitId} → {selectedAllocation.deliveryDestination?.address}
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
    textAlign: 'center',
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
  trackingButton: {
    backgroundColor: 'rgba(203, 30, 42, 0.9)',
  },
  controlButtonText: {
    fontSize: 18,
    color: '#333',
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
  selectedText: {
    fontSize: 12,
    color: '#ff1e1e',
    textAlign: 'center',
    fontWeight: '600',
    marginTop: 2,
  },
});

export default RealTimeTrackingMapsView;
