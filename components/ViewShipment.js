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
  ActivityIndicator,
  Linking
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { buildApiUrl } from '../constants/api';
const { width, height } = Dimensions.get('window');

const truckIcon = require('../assets/icons/truck1.png');

const ViewShipment = ({ isOpen, onClose, data }) => {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [locationHistory, setLocationHistory] = useState([]);
  const [locationError, setLocationError] = useState(null);
  const [lastLocationUpdate, setLastLocationUpdate] = useState(null);
  const [trackingStatus, setTrackingStatus] = useState('inactive');
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [googleApiKey, setGoogleApiKey] = useState('AIzaSyAT5fZoyDVluzfdq4Rz2uuVJDocqBLDTGo');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const mapRef = useRef(null);
  const locationSubscription = useRef(null);
  const timerInterval = useRef(null);

  useEffect(() => {
    if (!isOpen || !data?._id) {
      // Cleanup when modal is closed
      if (locationSubscription.current) {
        locationSubscription.current.remove();
        locationSubscription.current = null;
      }
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
        timerInterval.current = null;
      }
      return;
    }

    initializeLocationTracking();
    fetchLocationHistory();
    startElapsedTimer();

    // Cleanup function
    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
        locationSubscription.current = null;
      }
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
        timerInterval.current = null;
      }
    };
  }, [isOpen, data?._id]);

  const startElapsedTimer = () => {
    // Only start timer if status is "In Transit" and routeStarted exists
    if (data?.status?.toLowerCase() === 'in transit' && data?.routeInfo?.routeStarted) {
      // Clear any existing timer
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }

      // Calculate initial elapsed time
      const startTime = new Date(data.routeInfo.routeStarted).getTime();
      const updateTimer = () => {
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000); // in seconds
        setElapsedTime(elapsed);
      };

      updateTimer(); // Initial update
      timerInterval.current = setInterval(updateTimer, 1000); // Update every second
    }
  };

  const formatElapsedTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const formatActualDuration = (seconds) => {
    if (!seconds) return 'N/A';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
  };

  const handleCompleteDelivery = async () => {
    Alert.alert(
      'Complete Delivery',
      'Mark this delivery as completed and remove from active allocations?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          style: 'default',
          onPress: async () => {
            setIsCompleting(true);
            try {
              const response = await fetch(buildApiUrl('/completeAllocation'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ allocationId: data._id })
              });

              const result = await response.json();

              if (result.success) {
                Alert.alert('Success', 'Delivery completed successfully!');
                onClose();
              } else {
                Alert.alert('Error', result.message || 'Failed to complete delivery');
              }
            } catch (error) {
              console.error('Complete delivery error:', error);
              Alert.alert('Error', 'Failed to complete delivery. Please try again.');
            } finally {
              setIsCompleting(false);
            }
          }
        }
      ]
    );
  };

  const initializeLocationTracking = async () => {
    // Skip location tracking for pending shipments
    if (data?.status?.toLowerCase() === 'pending') {
      setTrackingStatus('pending');
      setIsLoadingLocation(false);
      return;
    }

    setIsLoadingLocation(true);
    setLocationError(null);
    
    try {
      // Only fetch vehicle location from API (no GPS tracking for admin)
      // Admin viewing shipment doesn't need their own location tracked
      await fetchCurrentLocationFromAPI();
      setTrackingStatus('monitoring');
      
    } catch (error) {
      // Completely silent - no errors shown for missing location data
      console.log('ℹ Location not available:', error.message);
      setTrackingStatus('inactive');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const requestLocationPermissions = async () => {
    try {
      console.log('🗺️ Requesting location permissions...');
      
      // Request foreground location permission
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (foregroundStatus !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'This app needs location access to show vehicle tracking. Please enable location permissions in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Location.openAppSettingsAsync() }
          ]
        );
        return false;
      }

      console.log('✅ Location permission granted');
      return true;
    } catch (error) {
      console.error('❌ Error requesting location permission:', error);
      Alert.alert(
        'Permission Error',
        'Failed to request location permission. Please try again or check your device settings.'
      );
      return false;
    }
  };

  const fetchCurrentLocationFromAPI = async () => {
    try {
      const response = await fetch(buildApiUrl(`/getAllocation/${data._id}`));
      
      if (!response.ok) {
        // Silent return for 404 - allocation may not exist yet
        return;
      }
      
      const text = await response.text();
      if (!text || !text.trim()) {
        return; // Silent return for empty response
      }
      
      let result;
      try {
        result = JSON.parse(text);
      } catch (parseError) {
        // Silent return for parse errors
        return;
      }
      
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
        console.log('✓ Location loaded from API');
        
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
      // Silent fail - location from API is not critical
      console.error('Error fetching location from API:', error.message);
    }
  };

  const startRealTimeTracking = async () => {
    try {
      setTrackingStatus('requesting');
      
      // Request permission first
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission denied');
        setTrackingStatus('denied');
        return;
      }

      setTrackingStatus('active');

      // Start location tracking with expo-location directly
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 5, // Update only when moved 5 meters
        },
        (location) => {
          handleLocationUpdate({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
            timestamp: location.timestamp,
          });
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
      try {
        const response = await fetch(buildApiUrl(`/updateAllocation/${data._id}`), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            driverLocation: {
              latitude: location.latitude,
              longitude: location.longitude,
              lastUpdated: new Date()
            }
          })
        });
        
        if (response.ok) {
          const text = await response.text();
          if (text && text.trim()) {
            const result = JSON.parse(text);
            console.log('✓ Vehicle location updated');
          }
        }
      } catch (err) {
        // Silent fail - location update is not critical
        console.error('Failed to update vehicle location:', err.message);
      }

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
        const text = await response.text();
        if (text && text.trim()) {
          const result = JSON.parse(text);
          if (result.success && result.data) {
            setLocationHistory(result.data);
          }
        }
      }
    } catch (error) {
      // Silent fail - history is not critical
      console.error('Error fetching location history:', error.message);
    }
  };

  // Fetch route from Google Directions API
  const fetchRoute = async (pickup, dropoff) => {
    if (!pickup || !dropoff || !googleApiKey) {
      return;
    }

    setIsLoadingRoute(true);
    try {
      const origin = `${pickup.latitude},${pickup.longitude}`;
      const destination = `${dropoff.latitude},${dropoff.longitude}`;
      
      const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&key=${googleApiKey}`;
      
      const response = await fetch(directionsUrl);
      
      if (!response.ok) {
        throw new Error('Failed to fetch route');
      }
      
      const text = await response.text();
      const data = text ? JSON.parse(text) : { status: 'ERROR' };

      if (data.status === 'OK' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const points = decodePolyline(route.overview_polyline.points);
        setRouteCoordinates(points);
        
        console.log('✓ Route loaded with', points.length, 'points');
      } else {
        console.log('ℹ No route found');
        setRouteCoordinates([]);
      }
    } catch (error) {
      console.error('Route fetch error:', error.message);
      setRouteCoordinates([]);
    } finally {
      setIsLoadingRoute(false);
    }
  };

  // Decode Google's encoded polyline format
  const decodePolyline = (encoded) => {
    const points = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;

    while (index < len) {
      let b, shift = 0, result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      points.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }

    return points;
  };

  // Auto-fetch route when data has pickup and dropoff coordinates
  useEffect(() => {
    if (isOpen && data?.pickupCoordinates && data?.dropoffCoordinates && googleApiKey) {
      fetchRoute(data.pickupCoordinates, data.dropoffCoordinates);
    } else {
      setRouteCoordinates([]);
    }
  }, [isOpen, data?.pickupCoordinates, data?.dropoffCoordinates, googleApiKey]);

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

  const clearDelivery = async () => {
    // Validation checks
    if (!data?._id) {
      Alert.alert('Error', 'Invalid delivery data');
      return;
    }

    const currentStatus = data.status?.toLowerCase();
    const canClear = currentStatus === 'delivered' || currentStatus === 'completed';
    if (!canClear) {
      Alert.alert(
        'Cannot Clear Delivery',
        `This delivery cannot be cleared because its status is "${data.status}".\n\nOnly deliveries marked Delivered or Completed can be cleared.`,
        [{ text: 'OK' }]
      );
      return;
    }

    // Confirmation dialog
    Alert.alert(
      'Clear Delivery',
      `Are you sure you want to mark this delivery as completed and clear it from the active list?\n\nVehicle: ${data.unitName || 'N/A'}\nDriver: ${data.assignedDriver || 'Unassigned'}\n\nThis action will move the delivery to history.`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Clear Delivery',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(buildApiUrl(`/driver-allocations/${data._id}`), {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  status: 'Completed',
                  completedAt: new Date().toISOString(),
                  completedBy: data.assignedDriver || 'Admin',
                  clearedByAdmin: true
                })
              });

              if (!response.ok) {
                throw new Error('Failed to clear delivery');
              }

              Alert.alert(
                'Success',
                'Delivery has been marked as completed and cleared from active list.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      onClose();
                      if (data.onClear) {
                        data.onClear(data._id);
                      }
                      // Trigger refresh if callback exists
                      if (data.onRefresh) {
                        data.onRefresh();
                      }
                    }
                  }
                ]
              );
            } catch (error) {
              console.log('Error clearing delivery:', error);
              Alert.alert(
                'Error',
                'Failed to clear delivery. Please try again.',
                [{ text: 'OK' }]
              );
            }
          }
        }
      ]
    );
  };

  const getTrackingStatusInfo = () => {
    switch (trackingStatus) {
      case 'pending':
        return { 
          color: '#f59e0b', 
          text: 'Awaiting Driver Acceptance', 
          icon: 'hourglass-empty' 
        };
      case 'monitoring':
        return { 
          color: '#3b82f6', 
          text: 'Monitoring Vehicle Location', 
          icon: 'visibility' 
        };
      case 'active':
        return { 
          color: '#059669', 
          text: 'Vehicle Location Available', 
          icon: 'location-on' 
        };
      case 'inactive':
        return { 
          color: '#6b7280', 
          text: 'Location Not Available', 
          icon: 'location-off' 
        };
      default:
        return { 
          color: '#6b7280', 
          text: 'Loading Vehicle Data', 
          icon: 'location-searching' 
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
                          <MaterialIcons name="refresh" size={20} color="#ffffff" />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Tracking Status Bar */}
                  <View style={[styles.trackingStatusBar, { backgroundColor: getTrackingStatusInfo().color + '20' }]}>
                    <View style={styles.trackingStatusRow}>
                      <MaterialIcons name={getTrackingStatusInfo().icon} size={18} color={getTrackingStatusInfo().color} />
                      <Text style={[styles.trackingStatusText, { color: getTrackingStatusInfo().color }]}>
                        {getTrackingStatusInfo().text}
                        {lastLocationUpdate && (
                          ` • Updated: ${lastLocationUpdate.toLocaleTimeString()}`
                        )}
                      </Text>
                    </View>
                    {isLoadingRoute && (
                      <View style={[styles.trackingStatusRow, { marginTop: 4 }]}>
                        <MaterialIcons name="map" size={16} color="#007AFF" />
                        <Text style={[styles.trackingStatusText, { color: '#007AFF' }]}>
                          Loading route...
                        </Text>
                      </View>
                    )}
                    {!isLoadingRoute && routeCoordinates.length > 0 && (
                      <View style={[styles.trackingStatusRow, { marginTop: 4 }]}>
                        <MaterialIcons name="check-circle" size={16} color="#059669" />
                        <Text style={[styles.trackingStatusText, { color: '#059669' }]}>
                          Route displayed ({routeCoordinates.length} points)
                        </Text>
                      </View>
                    )}
                  </View>

                  {locationError && (
                    <View style={styles.errorContainer}>
                      <MaterialIcons name="warning" size={20} color="#ef4444" />
                      <Text style={styles.errorText}>{locationError}</Text>
                      <TouchableOpacity style={styles.retryButton} onPress={initializeLocationTracking}>
                        <Text style={styles.retryButtonText}>Retry</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Pending Status Message */}
                  {data?.status?.toLowerCase() === 'pending' ? (
                    <View style={styles.pendingContainer}>
                      <MaterialIcons name="hourglass-empty" size={64} color="#92400e" style={{ marginBottom: 16 }} />
                      <Text style={styles.pendingTitle}>Awaiting Driver Acceptance</Text>
                      <Text style={styles.pendingMessage}>
                        {data.assignedDriver || 'Driver'} has not started delivery yet.
                      </Text>
                      <Text style={styles.pendingSubtext}>
                        Live tracking will be available once the driver accepts and starts the delivery.
                      </Text>
                    </View>
                  ) : (
                    <>
                      {/* Fallback Map Information */}
                      {(locationError || trackingStatus === 'denied') && (currentLocation || data?.location) && (
                        <View style={styles.mapFallback}>
                          <View style={styles.fallbackTitleRow}>
                            <MaterialIcons name="location-on" size={20} color="#1f2937" />
                            <Text style={styles.fallbackTitle}>Location Information</Text>
                          </View>
                          <Text style={styles.fallbackText}>
                            Lat: {(currentLocation?.latitude || data?.location?.latitude || 0).toFixed(6)}
                          </Text>
                          <Text style={styles.fallbackText}>
                            Lng: {(currentLocation?.longitude || data?.location?.longitude || 0).toFixed(6)}
                          </Text>
                          {currentLocation?.accuracy && (
                            <Text style={styles.fallbackAccuracy}>
                              Accuracy: ±{Math.round(currentLocation.accuracy)}m
                            </Text>
                          )}
                        </View>
                      )}

                      <View style={styles.mapContainer}>
                    <MapView
                      ref={mapRef}
                      provider={PROVIDER_GOOGLE}
                      style={styles.map}
                      initialRegion={mapRegion}
                      showsUserLocation={false}
                      showsMyLocationButton={false}
                      showsTraffic={true}
                      showsCompass={true}
                      zoomEnabled={true}
                      scrollEnabled={true}
                      loadingEnabled={true}
                      loadingIndicatorColor="#dc2626"
                      onMapReady={() => console.log('🗺️ Map loaded successfully')}
                      onError={(error) => {
                        console.error('🗺️ Map error:', error);
                        setLocationError('Map failed to load. Please check your internet connection.');
                      }}
                    >
                      {/* Planned Route Polyline */}
                      {routeCoordinates.length > 0 && (
                        <Polyline
                          coordinates={routeCoordinates}
                          strokeColor="#007AFF"
                          strokeWidth={4}
                          lineCap="round"
                          lineJoin="round"
                        />
                      )}

                      {/* Vehicle Marker with Truck Icon */}
                      {(currentLocation || data?.location) && (
                        <Marker
                          coordinate={{
                            latitude: currentLocation?.latitude || data.location?.latitude || defaultRegion.latitude,
                            longitude: currentLocation?.longitude || data.location?.longitude || defaultRegion.longitude,
                          }}
                          title={data.unitName || 'Vehicle'}
                          description={`Status: ${data.status || 'Unknown'} • Driver: ${data.assignedDriver || 'N/A'}`}
                          image={truckIcon}
                          anchor={{ x: 0.5, y: 0.5 }}
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

                    </MapView>

                        {/* Enhanced Location Status */}
                        <View style={styles.locationStatusContainer}>
                          <View style={styles.locationStatus}>
                            <View style={styles.locationStatusHeader}>
                              <MaterialIcons name="my-location" size={16} color="#ffffff" />
                              <Text style={styles.locationStatusTitle}>Current Position</Text>
                            </View>
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
                    </>
                  )}
                </View>

                {/* Route Information */}
                {(data.pickupPoint || data.dropoffPoint) && (
                  <View style={styles.infoSection}>
                    <View style={styles.sectionTitleRow}>
                      <MaterialIcons name="map" size={20} color="#1f2937" />
                      <Text style={styles.sectionTitle}>Designated Route</Text>
                    </View>
                    
                    <View style={styles.routeContainer}>
                      {data.pickupPoint && (
                        <View style={styles.routePoint}>
                          <View style={styles.routePointHeader}>
                            <MaterialIcons name="location-on" size={18} color="#059669" style={{ marginRight: 8 }} />
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
                          <MaterialIcons name="arrow-downward" size={24} color="#059669" />
                          {data.routeDistance && (
                            <Text style={styles.routeDistance}>~{data.routeDistance} km</Text>
                          )}
                        </View>
                      )}

                      {data.dropoffPoint && (
                        <View style={styles.routePoint}>
                          <View style={styles.routePointHeader}>
                            <MaterialIcons name="flag" size={18} color="#dc2626" style={{ marginRight: 8 }} />
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
                          <View style={styles.routeMetricRow}>
                            <MaterialIcons name="schedule" size={16} color="#059669" />
                            <Text style={styles.routeMetricText}>
                              Estimated Time: {data.estimatedTime} minutes
                            </Text>
                          </View>
                        </View>
                      )}

                      {/* Elapsed Time - Only show during In Transit */}
                      {data?.status?.toLowerCase() === 'in transit' && data?.routeInfo?.routeStarted && (
                        <View style={[styles.routeMetrics, { backgroundColor: '#dbeafe', marginTop: 8 }]}>
                          <View style={styles.routeMetricRow}>
                            <MaterialIcons name="local-shipping" size={16} color="#1e40af" />
                            <Text style={[styles.routeMetricText, { color: '#1e40af' }]}>
                              Elapsed Time: {formatElapsedTime(elapsedTime)}
                            </Text>
                          </View>
                        </View>
                      )}

                      {/* Actual Delivery Time - Only show when completed */}
                      {data?.status?.toLowerCase() === 'delivered' && data?.routeInfo?.actualDuration && (
                        <View style={[styles.routeMetrics, { backgroundColor: '#d1fae5', marginTop: 8 }]}>
                          <View style={styles.routeMetricRow}>
                            <MaterialIcons name="check-circle" size={16} color="#065f46" />
                            <Text style={[styles.routeMetricText, { color: '#065f46' }]}>
                              Actual Delivery Time: {formatActualDuration(data.routeInfo.actualDuration)}
                            </Text>
                          </View>
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

          {/* Action Buttons */}
          {data?.status?.toLowerCase() === 'delivered' && (
            <View style={styles.bottomButtonContainer}>
              <TouchableOpacity 
                style={[styles.deliveredButton, { backgroundColor: '#10b981' }]}
                onPress={handleCompleteDelivery}
                activeOpacity={0.8}
                disabled={isCompleting}
              >
                {isCompleting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="check-circle" size={22} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.deliveredButtonText}>Complete Delivery</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Vehicle Delivered Button - Clear from list after complete */}
          {data?.status?.toLowerCase() === 'completed' && (
            <View style={styles.bottomButtonContainer}>
              <TouchableOpacity 
                style={styles.deliveredButton}
                onPress={clearDelivery}
                activeOpacity={0.8}
              >
                <MaterialIcons name="check-circle" size={22} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.deliveredButtonText}>Vehicle Delivered - Clear from List</Text>
              </TouchableOpacity>
            </View>
          )}
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
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
    backgroundColor: '#dc2626',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#ffffff',
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
  },
  infoGrid: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
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
  trackingStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trackingStatusBar: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  trackingStatusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
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
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#e5e7eb',
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
  locationStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  locationStatusTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
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
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  routeContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  routePoint: {
    backgroundColor: '#f9fafb',
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
  routeMetricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
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
  
  // Pending Status Styles
  pendingContainer: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 32,
    margin: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f59e0b',
    minHeight: 300,
    justifyContent: 'center',
  },
  pendingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#92400e',
    marginBottom: 12,
    textAlign: 'center',
  },
  pendingMessage: {
    fontSize: 16,
    color: '#78350f',
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '600',
  },
  pendingSubtext: {
    fontSize: 14,
    color: '#a16207',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  
  // Map Fallback Styles
  mapFallback: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 20,
    margin: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
  },
  fallbackTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  fallbackTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  fallbackText: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#374151',
    marginBottom: 4,
  },
  fallbackAccuracy: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    fontStyle: 'italic',
  },
  bottomButtonContainer: {
    padding: 16,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  deliveredButton: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  deliveredButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default ViewShipment;