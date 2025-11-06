import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { buildApiUrl } from '../constants/api';
import LocationService from '../utils/LocationService';

const { width, height } = Dimensions.get('window');

const ViewShipment = ({ isOpen, onClose, data }) => {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [locationHistory, setLocationHistory] = useState([]);
  const [locationError, setLocationError] = useState(null);
  const [lastLocationUpdate, setLastLocationUpdate] = useState(null);
  const [trackingStatus, setTrackingStatus] = useState('inactive');
  const mapRef = useRef(null);
  const locationTrackingId = useRef(null);

  useEffect(() => {
    if (!isOpen || !data?._id) {
      // Cleanup when modal is closed
      if (locationTrackingId.current) {
        LocationService.stopLocationTracking(locationTrackingId.current);
        locationTrackingId.current = null;
      }
      return;
    }

    initializeLocationTracking();
    fetchLocationHistory();

    // Cleanup function
    return () => {
      if (locationTrackingId.current) {
        LocationService.stopLocationTracking(locationTrackingId.current);
        locationTrackingId.current = null;
      }
    };
  }, [isOpen, data?._id]);

  const initializeLocationTracking = async () => {
    setIsLoadingLocation(true);
    setLocationError(null);
    
    try {
      // First, get the current location from API
      await fetchCurrentLocationFromAPI();

      // Then start real-time tracking for admin monitoring
      await startRealTimeTracking();
      
    } catch (error) {
      console.error('Error initializing location tracking:', error);
      setLocationError('Failed to initialize location tracking');
      setTrackingStatus('error');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const fetchCurrentLocationFromAPI = async () => {
    try {
      const response = await fetch(buildApiUrl(`/getAllocation/${data._id}`));
      const result = await response.json();
      
      const loc = result.data?.location || result?.location;
      if (loc?.latitude && loc?.longitude) {
        const locationData = {
          latitude: loc.latitude,
          longitude: loc.longitude,
          accuracy: loc.accuracy || 0,
          timestamp: loc.timestamp || Date.now(),
        };
        
        setCurrentLocation(locationData);
        setLastLocationUpdate(new Date(loc.timestamp || Date.now()));
        
        // Center map on vehicle location
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: loc.latitude,
            longitude: loc.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching location from API:', error);
      throw error;
    }
  };

  const startRealTimeTracking = async () => {
    try {
      setTrackingStatus('requesting');
      
      // Request permission first
      const hasPermission = await LocationService.requestLocationPermission();
      if (!hasPermission) {
        setLocationError('Location permission denied');
        setTrackingStatus('denied');
        return;
      }

      setTrackingStatus('active');

      // Start location tracking with callback
      locationTrackingId.current = await LocationService.startLocationTracking(
        (location) => {
          handleLocationUpdate(location);
        },
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 3000, // Update every 3 seconds
          distanceInterval: 5, // Update when moved 5 meters
        }
      );

      console.log('Real-time tracking started for allocation:', data._id);
    } catch (error) {
      console.error('Error starting real-time tracking:', error);
      setLocationError('Failed to start location tracking');
      setTrackingStatus('error');
    }
  };

  const handleLocationUpdate = async (location) => {
    try {
      setCurrentLocation(location);
      setLastLocationUpdate(new Date());
      
      // Add to location history for path tracking
      setLocationHistory(prev => {
        const newHistory = [...prev, location];
        // Keep only last 50 locations to prevent memory issues
        return newHistory.slice(-50);
      });

      // Update vehicle location in backend
      await LocationService.updateVehicleLocation(data._id, location);

      // Optionally animate map to new position
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      }
    } catch (error) {
      console.error('Error handling location update:', error);
    }
  };

  const fetchLocationHistory = async () => {
    try {
      const response = await fetch(buildApiUrl(`/getAllocation/${data._id}/locationHistory`));
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setLocationHistory(result.data);
        }
      }
    } catch (error) {
      console.error('Error fetching location history:', error);
    }
  };

  const refreshLocation = async () => {
    setIsLoadingLocation(true);
    try {
      await fetchCurrentLocationFromAPI();
      Alert.alert('Success', 'Location refreshed successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to refresh location');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const getTrackingStatusInfo = () => {
    switch (trackingStatus) {
      case 'active':
        return { 
          color: '#059669', 
          text: '🟢 Live Tracking Active', 
          icon: '📡' 
        };
      case 'requesting':
        return { 
          color: '#f59e0b', 
          text: '🟡 Requesting Permission...', 
          icon: '⚡' 
        };
      case 'denied':
        return { 
          color: '#ef4444', 
          text: '🔴 Permission Denied', 
          icon: '🚫' 
        };
      case 'error':
        return { 
          color: '#ef4444', 
          text: '🔴 Tracking Error', 
          icon: '⚠️' 
        };
      default:
        return { 
          color: '#6b7280', 
          text: '⚪ Tracking Inactive', 
          icon: '📍' 
        };
    }
  };

  const defaultRegion = {
    latitude: 14.5995, // Manila coordinates
    longitude: 120.9842,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  const mapRegion = currentLocation || 
    (data?.location ? {
      latitude: data.location.latitude,
      longitude: data.location.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    } : defaultRegion);

  if (!isOpen) return null;

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>View Shipment</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
            {data ? (
              <>
                {/* Shipment Information */}
                <View style={styles.infoSection}>
                  <Text style={styles.sectionTitle}>Shipment Details</Text>
                  
                  <View style={styles.infoGrid}>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Date:</Text>
                      <Text style={styles.infoValue}>
                        {data.date ? new Date(data.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        }) : 'Not set'}
                      </Text>
                    </View>

                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Unit Name:</Text>
                      <Text style={styles.infoValue}>{data.unitName || 'N/A'}</Text>
                    </View>

                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Conduction Number:</Text>
                      <Text style={styles.infoValue}>{data.unitId || 'N/A'}</Text>
                    </View>

                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Body Color:</Text>
                      <Text style={styles.infoValue}>{data.bodyColor || 'N/A'}</Text>
                    </View>

                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Variation:</Text>
                      <Text style={styles.infoValue}>{data.variation || 'N/A'}</Text>
                    </View>

                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Assigned Driver:</Text>
                      <Text style={styles.infoValue}>{data.assignedDriver || 'Unassigned'}</Text>
                    </View>

                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Status:</Text>
                      <View style={[styles.statusBadge, getStatusStyle(data.status)]}>
                        <Text style={[styles.statusText, getStatusTextStyle(data.status)]}>
                          {data.status || 'Pending'}
                        </Text>
                      </View>
                    </View>

                    {data.pickupPoint && (
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Pickup Point:</Text>
                        <Text style={styles.infoValue}>{data.pickupPoint}</Text>
                      </View>
                    )}

                    {data.dropoffPoint && (
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Drop-off Point:</Text>
                        <Text style={styles.infoValue}>{data.dropoffPoint}</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Enhanced Map Section */}
                <View style={styles.mapSection}>
                  <View style={styles.mapHeader}>
                    <Text style={styles.sectionTitle}>Live Vehicle Tracking</Text>
                    <View style={styles.mapControls}>
                      <TouchableOpacity 
                        style={styles.refreshButton}
                        onPress={refreshLocation}
                        disabled={isLoadingLocation}
                      >
                        {isLoadingLocation ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.refreshButtonText}>🔄</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Tracking Status Bar */}
                  <View style={[styles.trackingStatusBar, { backgroundColor: getTrackingStatusInfo().color + '20' }]}>
                    <Text style={[styles.trackingStatusText, { color: getTrackingStatusInfo().color }]}>
                      {getTrackingStatusInfo().icon} {getTrackingStatusInfo().text}
                      {lastLocationUpdate && (
                        ` • Updated: ${lastLocationUpdate.toLocaleTimeString()}`
                      )}
                    </Text>
                  </View>

                  {locationError && (
                    <View style={styles.errorContainer}>
                      <Text style={styles.errorText}>⚠️ {locationError}</Text>
                      <TouchableOpacity style={styles.retryButton} onPress={initializeLocationTracking}>
                        <Text style={styles.retryButtonText}>Retry</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  <View style={styles.mapContainer}>
                    <MapView
                      ref={mapRef}
                      provider={PROVIDER_GOOGLE}
                      style={styles.map}
                      region={mapRegion}
                      showsUserLocation={false}
                      showsMyLocationButton={false}
                      showsTraffic={true}
                      showsCompass={true}
                      zoomEnabled={true}
                      scrollEnabled={true}
                      loadingEnabled={true}
                      loadingIndicatorColor="#dc2626"
                    >
                      {/* Vehicle Marker */}
                      {(currentLocation || data?.location) && (
                        <Marker
                          coordinate={{
                            latitude: currentLocation?.latitude || data.location?.latitude || defaultRegion.latitude,
                            longitude: currentLocation?.longitude || data.location?.longitude || defaultRegion.longitude,
                          }}
                          title={data.unitName || 'Vehicle'}
                          description={`Status: ${data.status || 'Unknown'} • Driver: ${data.assignedDriver || 'N/A'}`}
                          pinColor={trackingStatus === 'active' ? '#059669' : '#f59e0b'}
                        />
                      )}

                      {/* Path Polyline for Location History */}
                      {locationHistory.length > 1 && (
                        <Polyline
                          coordinates={locationHistory.map(loc => ({
                            latitude: loc.latitude,
                            longitude: loc.longitude
                          }))}
                          strokeColor="#dc2626"
                          strokeWidth={3}
                          strokePattern={[1, 1]}
                        />
                      )}

                      {/* Pickup Point Marker */}
                      {(data?.pickupCoordinates || data?.pickupPoint) && (
                        <Marker
                          coordinate={data.pickupCoordinates || getLocationCoordinates(data.pickupPoint)}
                          title="📍 Pickup Point"
                          description={data.pickupPoint}
                          pinColor="#059669"
                        />
                      )}

                      {/* Drop-off Point Marker */}
                      {(data?.dropoffCoordinates || data?.dropoffPoint) && (
                        <Marker
                          coordinate={data.dropoffCoordinates || getLocationCoordinates(data.dropoffPoint)}
                          title="🎯 Drop-off Point"
                          description={data.dropoffPoint}
                          pinColor="#dc2626"
                        />
                      )}

                      {/* Route Path (if both pickup and dropoff coordinates exist) */}
                      {data?.pickupCoordinates && data?.dropoffCoordinates && (
                        <Polyline
                          coordinates={[
                            data.pickupCoordinates,
                            data.dropoffCoordinates
                          ]}
                          strokeColor="#3b82f6"
                          strokeWidth={4}
                          strokePattern={[1, 1]}
                          lineDashPhase={0}
                        />
                      )}
                    </MapView>

                    {/* Enhanced Location Status */}
                    <View style={styles.locationStatusContainer}>
                      <View style={styles.locationStatus}>
                        <Text style={styles.locationStatusTitle}>📍 Current Position</Text>
                        <Text style={styles.locationStatusText}>
                          {currentLocation 
                            ? `${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}`
                            : data?.location 
                              ? `${data.location.latitude.toFixed(6)}, ${data.location.longitude.toFixed(6)}`
                              : 'Location unavailable'
                          }
                        </Text>
                        {currentLocation?.accuracy && (
                          <Text style={styles.accuracyText}>
                            Accuracy: ±{Math.round(currentLocation.accuracy)}m
                          </Text>
                        )}
                        {currentLocation?.speed && currentLocation.speed > 0 && (
                          <Text style={styles.speedText}>
                            Speed: {Math.round(currentLocation.speed * 3.6)} km/h
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                </View>

                {/* Route Information */}
                {(data.pickupPoint || data.dropoffPoint) && (
                  <View style={styles.infoSection}>
                    <Text style={styles.sectionTitle}>📍 Designated Route</Text>
                    
                    <View style={styles.routeContainer}>
                      {data.pickupPoint && (
                        <View style={styles.routePoint}>
                          <View style={styles.routePointHeader}>
                            <Text style={styles.routePointIcon}>📍</Text>
                            <Text style={styles.routePointTitle}>Pickup Location</Text>
                          </View>
                          <Text style={styles.routePointAddress}>{data.pickupPoint}</Text>
                          {data.pickupCoordinates && (
                            <Text style={styles.routePointCoords}>
                              {data.pickupCoordinates.latitude.toFixed(6)}, {data.pickupCoordinates.longitude.toFixed(6)}
                            </Text>
                          )}
                        </View>
                      )}

                      {data.pickupPoint && data.dropoffPoint && (
                        <View style={styles.routeArrow}>
                          <Text style={styles.routeArrowText}>↓</Text>
                          {data.routeDistance && (
                            <Text style={styles.routeDistance}>~{data.routeDistance} km</Text>
                          )}
                        </View>
                      )}

                      {data.dropoffPoint && (
                        <View style={styles.routePoint}>
                          <View style={styles.routePointHeader}>
                            <Text style={styles.routePointIcon}>🎯</Text>
                            <Text style={styles.routePointTitle}>Drop-off Location</Text>
                          </View>
                          <Text style={styles.routePointAddress}>{data.dropoffPoint}</Text>
                          {data.dropoffCoordinates && (
                            <Text style={styles.routePointCoords}>
                              {data.dropoffCoordinates.latitude.toFixed(6)}, {data.dropoffCoordinates.longitude.toFixed(6)}
                            </Text>
                          )}
                        </View>
                      )}

                      {data.estimatedTime && (
                        <View style={styles.routeMetrics}>
                          <Text style={styles.routeMetricText}>
                            ⏱️ Estimated Time: {data.estimatedTime} minutes
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {/* Customer Information (if available) */}
                {(data.customerName || data.customerEmail || data.customerPhone) && (
                  <View style={styles.infoSection}>
                    <Text style={styles.sectionTitle}>Customer Information</Text>
                    
                    <View style={styles.infoGrid}>
                      {data.customerName && (
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Customer Name:</Text>
                          <Text style={styles.infoValue}>{data.customerName}</Text>
                        </View>
                      )}

                      {data.customerEmail && (
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Email:</Text>
                          <Text style={styles.infoValue}>{data.customerEmail}</Text>
                        </View>
                      )}

                      {data.customerPhone && (
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Phone:</Text>
                          <Text style={styles.infoValue}>{data.customerPhone}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.noDataContainer}>
                <Text style={styles.noDataText}>No shipment data available</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// Helper function to get location coordinates for predefined locations
const getLocationCoordinates = (locationName) => {
  const predefinedLocations = {
    'Isuzu Stockyard': { latitude: 14.5995, longitude: 120.9842 },
    'Isuzu Pasig': { latitude: 14.5764, longitude: 121.0851 },
  };
  
  return predefinedLocations[locationName] || { latitude: 14.5995, longitude: 120.9842 };
};

// Helper functions for status styling
const getStatusStyle = (status) => {
  switch (status?.toLowerCase()) {
    case 'pending':
      return { backgroundColor: '#fef3c7' };
    case 'in transit':
      return { backgroundColor: '#dbeafe' };
    case 'delivered':
    case 'completed':
      return { backgroundColor: '#d1fae5' };
    default:
      return { backgroundColor: '#f3f4f6' };
  }
};

const getStatusTextStyle = (status) => {
  switch (status?.toLowerCase()) {
    case 'pending':
      return { color: '#92400e' };
    case 'in transit':
      return { color: '#1e40af' };
    case 'delivered':
    case 'completed':
      return { color: '#065f46' };
    default:
      return { color: '#6b7280' };
  }
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: width * 0.95,
    height: height * 0.9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#6b7280',
    fontWeight: 'bold',
  },
  contentContainer: {
    flex: 1,
    padding: 20,
  },
  infoSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
  },
  infoGrid: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
    textAlign: 'right',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  mapSection: {
    marginBottom: 24,
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mapControls: {
    flexDirection: 'row',
    gap: 8,
  },
  refreshButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  trackingStatusBar: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
  },
  trackingStatusText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  retryButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  mapContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    position: 'relative',
  },
  map: {
    width: '100%',
    height: 300,
  },
  locationStatusContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  locationStatus: {
    backgroundColor: 'rgba(31, 41, 55, 0.9)',
    padding: 16,
    backdropFilter: 'blur(10px)',
  },
  locationStatusTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  locationStatusText: {
    color: '#ffffff',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  accuracyText: {
    color: '#d1d5db',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  speedText: {
    color: '#10b981',
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  
  // Route Information Styles
  routeContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
  },
  routePoint: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
  },
  routePointHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  routePointIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  routePointTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
  },
  routePointAddress: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  routePointCoords: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#6b7280',
  },
  routeArrow: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  routeArrowText: {
    fontSize: 24,
    color: '#059669',
    fontWeight: 'bold',
  },
  routeDistance: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
    marginTop: 4,
  },
  routeMetrics: {
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  routeMetricText: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '600',
    textAlign: 'center',
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
});

export default ViewShipment;