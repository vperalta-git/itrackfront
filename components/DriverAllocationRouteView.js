// DriverAllocationRouteView.js - Route visualization with pickup and destination
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { buildApiUrl } from '../constants/api';

const TRUCK_ICON = require('../assets/icons/truck1.png');

const DriverAllocationRouteView = ({ allocation, currentLocation, style }) => {
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mapType, setMapType] = useState('standard');
  const mapRef = useRef(null);

  // Fetch route from Google Directions API
  useEffect(() => {
    if (allocation && currentLocation) {
      fetchRoute();
    }
  }, [allocation, currentLocation]);

  const fetchRoute = async () => {
    if (!allocation.pickupCoordinates || !allocation.dropoffCoordinates) {
      console.log('⚠️ Missing coordinates for route');
      return;
    }

    setLoading(true);
    try {
      const origin = `${allocation.pickupCoordinates.latitude},${allocation.pickupCoordinates.longitude}`;
      const destination = `${allocation.dropoffCoordinates.latitude},${allocation.dropoffCoordinates.longitude}`;

      console.log('🗺️ Fetching route:', { origin, destination });

      const response = await fetch(buildApiUrl('/getRoute'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin, destination })
      });

      const data = await response.json();

      if (data.success && data.route) {
        setRoute(data.route);
        console.log('✅ Route fetched successfully');
        
        // Fit map to show all markers
        setTimeout(() => {
          if (mapRef.current) {
            const coordinates = [
              allocation.pickupCoordinates,
              allocation.dropoffCoordinates,
            ];
            if (currentLocation) {
              coordinates.push(currentLocation);
            }
            mapRef.current.fitToCoordinates(coordinates, {
              edgePadding: { top: 100, right: 50, bottom: 100, left: 50 },
              animated: true,
            });
          }
        }, 500);
      } else {
        console.error('❌ Failed to fetch route:', data.message);
      }
    } catch (error) {
      console.error('❌ Error fetching route:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInitialRegion = () => {
    if (allocation?.pickupCoordinates) {
      return {
        latitude: allocation.pickupCoordinates.latitude,
        longitude: allocation.pickupCoordinates.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }
    return {
      latitude: 14.5995, // Manila
      longitude: 120.9842,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    };
  };

  const recenterMap = () => {
    if (mapRef.current && allocation) {
      const coordinates = [
        allocation.pickupCoordinates,
        allocation.dropoffCoordinates,
      ];
      if (currentLocation) {
        coordinates.push(currentLocation);
      }
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 100, right: 50, bottom: 100, left: 50 },
        animated: true,
      });
    }
  };

  if (!allocation) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.emptyState}>
          <Ionicons name="map-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>Select an allocation to view route</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Route Info Header */}
      <View style={styles.routeInfoContainer}>
        <View style={styles.routeInfoRow}>
          <View style={styles.locationInfo}>
            <View style={styles.locationRow}>
              <View style={styles.pickupDot} />
              <View style={styles.locationText}>
                <Text style={styles.locationLabel}>Pickup</Text>
                <Text style={styles.locationAddress} numberOfLines={1}>
                  {allocation.pickupPoint || allocation.pickupLocation?.address || 'Pickup Location'}
                </Text>
              </View>
            </View>
            
            <View style={styles.routeLine} />
            
            <View style={styles.locationRow}>
              <View style={styles.destinationDot} />
              <View style={styles.locationText}>
                <Text style={styles.locationLabel}>Destination</Text>
                <Text style={styles.locationAddress} numberOfLines={1}>
                  {allocation.dropoffPoint || allocation.deliveryDestination?.address || 'Destination'}
                </Text>
              </View>
            </View>
          </View>

          {route && (
            <View style={styles.routeStats}>
              <View style={styles.statItem}>
                <Ionicons name="navigate" size={16} color="#007AFF" />
                <Text style={styles.statValue}>{route.distance}</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="time" size={16} color="#007AFF" />
                <Text style={styles.statValue}>{route.duration}</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Map View */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={getInitialRegion()}
        mapType={mapType}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={true}
        showsScale={true}
      >
        {/* Pickup Marker */}
        {allocation.pickupCoordinates && (
          <Marker
            coordinate={allocation.pickupCoordinates}
            title="Pickup Location"
            description={allocation.pickupPoint || 'Start Point'}
            pinColor="#4CAF50"
          >
            <View style={styles.pickupMarker}>
              <Ionicons name="location" size={32} color="#4CAF50" />
              <Text style={styles.markerLabel}>A</Text>
            </View>
          </Marker>
        )}

        {/* Current Location (Driver) Marker */}
        {currentLocation && (
          <Marker
            coordinate={currentLocation}
            title="Your Location"
            description="Current Position"
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <Image
              source={TRUCK_ICON}
              style={styles.truckIcon}
              resizeMode="contain"
            />
          </Marker>
        )}

        {/* Destination Marker */}
        {allocation.dropoffCoordinates && (
          <Marker
            coordinate={allocation.dropoffCoordinates}
            title="Destination"
            description={allocation.dropoffPoint || 'End Point'}
            pinColor="#F44336"
          >
            <View style={styles.destinationMarker}>
              <Ionicons name="location" size={32} color="#F44336" />
              <Text style={styles.markerLabel}>B</Text>
            </View>
          </Marker>
        )}

        {/* Route Polyline */}
        {route && route.polyline && (
          <Polyline
            coordinates={route.polyline}
            strokeColor="#007AFF"
            strokeWidth={4}
            lineDashPattern={[0]}
          />
        )}
      </MapView>

      {/* Map Controls */}
      <View style={styles.mapControls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => setMapType(mapType === 'standard' ? 'hybrid' : 'standard')}
        >
          <Ionicons name="layers" size={20} color="#007AFF" />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.controlButton}
          onPress={recenterMap}
        >
          <Ionicons name="locate" size={20} color="#007AFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={fetchRoute}
        >
          <Ionicons name="refresh" size={20} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading route...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  routeInfoContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  routeInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationInfo: {
    flex: 1,
    marginRight: 16,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  pickupDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    marginTop: 2,
  },
  destinationDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#F44336',
    marginTop: 2,
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: '#007AFF',
    marginLeft: 7,
    marginVertical: 4,
  },
  locationText: {
    marginLeft: 12,
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginBottom: 2,
  },
  locationAddress: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  routeStats: {
    alignItems: 'flex-end',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  statValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    marginLeft: 6,
  },
  map: {
    flex: 1,
  },
  pickupMarker: {
    alignItems: 'center',
  },
  destinationMarker: {
    alignItems: 'center',
  },
  markerLabel: {
    position: 'absolute',
    top: 6,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  truckIcon: {
    width: 40,
    height: 40,
  },
  mapControls: {
    position: 'absolute',
    right: 16,
    bottom: 80,
    gap: 12,
  },
  controlButton: {
    backgroundColor: '#fff',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
});

export default DriverAllocationRouteView;
