import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  Alert, 
  TouchableOpacity, 
  ScrollView,
  RefreshControl,
  Dimensions,
  Image
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { buildApiUrl } from '../constants/api';
import LocationService from '../utils/LocationService';

const TRUCK_ICON = require('../assets/icons/truck1.png');

const { width, height } = Dimensions.get('window');

const AdminMapsView = ({ selectedVehicle = null }) => {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [vehicleLocation, setVehicleLocation] = useState(null);
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const [selectedAllocation, setSelectedAllocation] = useState(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: 14.5995, // Manila coordinates  
    longitude: 120.9842,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  const mapRef = useRef(null);
  const locationTrackingId = useRef(null);

  // Initialize admin tracking system
  useEffect(() => {
    initializeAdminTracking();

    // Set up refresh interval for live updates
    const refreshInterval = setInterval(() => {
      if (!refreshing) {
        fetchMapData();
      }
    }, 15000); // 15 seconds for more frequent updates

    // Cleanup function
    return () => {
      clearInterval(refreshInterval);
      if (locationTrackingId.current) {
        LocationService.stopLocationTracking(locationTrackingId.current);
      }
    };
  }, []);

  const initializeAdminTracking = async () => {
    setLoading(true);
    try {
      // Initialize location services
      await requestLocationPermissions();
      
      // Fetch initial data
      await fetchMapData();
      
      // Get admin's current location
      await getCurrentLocation();
      
    } catch (error) {
      console.error('Error initializing admin tracking:', error);
      setError('Failed to initialize tracking system');
    } finally {
      setLoading(false);
    }
  };

  const requestLocationPermissions = async () => {
    try {
      const hasPermission = await LocationService.requestLocationPermission();
      if (hasPermission) {
        setTrackingEnabled(true);
        await startAdminLocationTracking();
      } else {
        console.log('Location permission denied for admin tracking');
      }
    } catch (error) {
      console.error('Error requesting location permissions:', error);
    }
  };

  const startAdminLocationTracking = async () => {
    try {
      locationTrackingId.current = await LocationService.startLocationTracking(
        (location) => {
          setCurrentLocation({
            latitude: location.latitude,
            longitude: location.longitude,
          });
          console.log('📍 Admin location updated:', location);
        },
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 30000, // Update every 30 seconds
          distanceInterval: 50, // Update when moved 50 meters
        }
      );
    } catch (error) {
      console.error('Error starting admin location tracking:', error);
    }
  };

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

  const fetchMapData = async (showLoader = false) => {
    if (showLoader) setLoading(true);
    setError('');
    
    try {
      console.log('🔄 Admin Maps: Fetching live vehicle data...');

      // Fetch allocations with enhanced error handling
      const allocationResponse = await fetch(buildApiUrl('/getAllocation'));
      if (allocationResponse.ok) {
        const allocationResult = await allocationResponse.json();
        if (allocationResult.success && Array.isArray(allocationResult.data)) {
          // Filter for active allocations with location data
          const activeAllocations = allocationResult.data.filter(allocation => 
            allocation.status !== 'Completed' && 
            allocation.location?.latitude && 
            allocation.location?.longitude
          );
          
          setAllocations(activeAllocations);
          console.log(`✅ Admin Maps: Loaded ${activeAllocations.length} active allocations with locations`);
          
          // Auto-fit map to show all vehicles if there are allocations
          if (activeAllocations.length > 0 && mapRef.current) {
            fitMapToVehicles(activeAllocations);
          }
        } else {
          console.warn('⚠️ Admin Maps: Invalid allocation data structure');
          setAllocations([]);
        }
      }

      // Fetch vehicle stock data
      const stockResponse = await fetch(buildApiUrl('/getStock'));
      if (stockResponse.ok) {
        const stockResult = await stockResponse.json();
        if (stockResult.success && Array.isArray(stockResult.data)) {
          setVehicles(stockResult.data);
          console.log(`✅ Admin Maps: Loaded ${stockResult.data.length} vehicles`);
        } else {
          setVehicles([]);
        }
      }

    } catch (error) {
      console.error('❌ Admin Maps: Network error:', error);
      setError('Failed to load vehicle data. Please check your connection.');
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  const fitMapToVehicles = (vehicleAllocations) => {
    if (!mapRef.current || vehicleAllocations.length === 0) return;

    const coordinates = vehicleAllocations.map(allocation => ({
      latitude: allocation.location.latitude,
      longitude: allocation.location.longitude,
    }));

    mapRef.current.fitToCoordinates(coordinates, {
      edgePadding: {
        top: 100,
        right: 50,
        bottom: 100,
        left: 50,
      },
      animated: true,
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchMapData();
      Alert.alert('Success', 'Vehicle data refreshed');
    } catch (error) {
      Alert.alert('Error', 'Failed to refresh data');
    } finally {
      setRefreshing(false);
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

  const getVehicleStatus = (allocation) => {
    if (!allocation) return 'unknown';
    return allocation.status || 'pending';
  };

  const getMarkerColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'in transit': return '#059669'; // Green
      case 'pending': return '#f59e0b'; // Yellow
      case 'assigned': return '#3b82f6'; // Blue
      case 'completed': return '#8b5cf6'; // Purple
      case 'delayed': return '#ef4444'; // Red
      default: return '#6b7280'; // Gray
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'in transit': return '🚛';
      case 'pending': return '⏳';
      case 'assigned': return '📋';
      case 'completed': return '✅';
      case 'delayed': return '⚠️';
      default: return '📍';
    }
  };

  const handleAllocationSelect = (allocation) => {
    setSelectedAllocation(allocation);
    
    if (mapRef.current && allocation.location) {
      mapRef.current.animateToRegion({
        latitude: allocation.location.latitude,
        longitude: allocation.location.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      });
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
      {/* Enhanced Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Live Fleet Tracking</Text>
          <Text style={styles.headerSubtitle}>
            {allocations.length} Active Vehicle{allocations.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={() => fetchMapData(true)}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.refreshButtonText}>🔄</Text>
            )}
          </TouchableOpacity>
          <View style={[styles.statusIndicator, { 
            backgroundColor: trackingEnabled ? '#059669' : '#6b7280' 
          }]}>
            <Text style={styles.statusIndicatorText}>
              {trackingEnabled ? '🟢' : '⚪'}
            </Text>
          </View>
        </View>
      </View>

      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={selectedVehicle && vehicleLocation ? {
          ...vehicleLocation,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        } : mapRegion}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={true}
        showsScale={true}
        showsTraffic={true}
        loadingEnabled={true}
        loadingIndicatorColor="#dc2626"
      >
        {/* Admin Current Location Marker */}
        {currentLocation && (
          <Marker
            coordinate={currentLocation}
            title="Admin Location"
            description="Your current position"
            pinColor="#dc2626"
          />
        )}

        {/* Selected Vehicle Marker (if any) */}
        {selectedVehicle && vehicleLocation && (
          <Marker
            coordinate={vehicleLocation}
            title={`🎯 ${selectedVehicle.unitName}`}
            description={`Driver: ${selectedVehicle.assignedDriver || 'Unassigned'} | Status: ${selectedVehicle.status || 'Unknown'}`}
            pinColor="#dc2626"
          />
        )}

        {/* Active Allocation Markers with Truck Icons */}
        {allocations.map((allocation, index) => {
          if (!allocation.location?.latitude || !allocation.location?.longitude) return null;

          const status = getVehicleStatus(allocation);
          
          return (
            <Marker
              key={`allocation-${allocation._id || index}`}
              coordinate={{
                latitude: allocation.location.latitude,
                longitude: allocation.location.longitude,
              }}
              anchor={{ x: 0.5, y: 0.5 }}
              onPress={() => handleAllocationSelect(allocation)}
            >
              <Image
                source={TRUCK_ICON}
                style={styles.truckIcon}
                resizeMode="contain"
              />
              <Callout tooltip={false}>
                <View style={styles.calloutContainer}>
                  <Text style={styles.calloutTitle}>
                    {getStatusIcon(status)} {allocation.unitName}
                  </Text>
                  <Text style={styles.calloutDescription}>
                    ID: {allocation.unitId}
                  </Text>
                  <Text style={styles.calloutDescription}>
                    Driver: {allocation.assignedDriver || 'Unassigned'}
                  </Text>
                  <Text style={[styles.calloutStatus, { color: getMarkerColor(status) }]}>
                    Status: {status}
                  </Text>
                  {allocation.customerName && (
                    <Text style={styles.calloutDescription}>
                      Customer: {allocation.customerName}
                    </Text>
                  )}
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      {/* Enhanced Status Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Vehicle Status</Text>
        {[
          { status: 'in transit', color: '#059669', label: 'In Transit' },
          { status: 'pending', color: '#f59e0b', label: 'Pending' },
          { status: 'assigned', color: '#3b82f6', label: 'Assigned' },
          { status: 'delayed', color: '#ef4444', label: 'Delayed' },
        ].map(({ status, color, label }) => (
          <View key={status} style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: color }]} />
            <Text style={styles.legendText}>{getStatusIcon(status)} {label}</Text>
          </View>
        ))}
      </View>

      {/* Vehicle List Overlay */}
      {allocations.length > 0 && (
        <View style={styles.vehicleListContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {allocations.map((allocation, index) => (
              <TouchableOpacity
                key={allocation._id || index}
                style={[
                  styles.vehicleCard,
                  selectedAllocation?._id === allocation._id && styles.selectedVehicleCard
                ]}
                onPress={() => handleAllocationSelect(allocation)}
              >
                <View style={[styles.statusDot, { 
                  backgroundColor: getMarkerColor(getVehicleStatus(allocation)) 
                }]} />
                <Text style={styles.vehicleName} numberOfLines={1}>
                  {allocation.unitName}
                </Text>
                <Text style={styles.vehicleDriver} numberOfLines={1}>
                  {allocation.assignedDriver || 'Unassigned'}
                </Text>
                <Text style={[styles.vehicleStatus, { 
                  color: getMarkerColor(getVehicleStatus(allocation)) 
                }]}>
                  {getStatusIcon(getVehicleStatus(allocation))} {getVehicleStatus(allocation)}
                </Text>
                {allocation.location && (
                  <Text style={styles.locationText} numberOfLines={1}>
                    📍 {allocation.location.latitude.toFixed(4)}, {allocation.location.longitude.toFixed(4)}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Control Buttons */}
      <View style={styles.controlButtons}>
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={() => fitMapToVehicles(allocations)}
          disabled={allocations.length === 0}
        >
          <Text style={styles.controlButtonText}>📍 Fit All</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.controlButton}
          onPress={onRefresh}
          disabled={refreshing}
        >
          <Text style={styles.controlButtonText}>
            {refreshing ? '⏳' : '🔄'} Refresh
          </Text>
        </TouchableOpacity>
      </View>

      {/* Error Display */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => fetchMapData(true)}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  
  // Enhanced Header
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  refreshButton: {
    backgroundColor: '#dc2626',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  statusIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusIndicatorText: {
    fontSize: 16,
  },
  
  // Map
  map: {
    flex: 1,
  },
  
  // Enhanced Legend
  legend: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 16,
    borderRadius: 12,
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
    color: '#1f2937',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  
  // Callout Styles
  calloutContainer: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    minWidth: 160,
    maxWidth: 200,
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 6,
  },
  calloutDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  calloutStatus: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  
  // Vehicle List
  vehicleListContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 20,
    paddingVertical: 16,
    maxHeight: 120,
  },
  vehicleCard: {
    width: 140,
    backgroundColor: '#ffffff',
    padding: 12,
    marginRight: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedVehicleCard: {
    borderColor: '#dc2626',
    borderWidth: 2,
    backgroundColor: '#fef2f2',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    top: 8,
    right: 8,
  },
  vehicleName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  vehicleDriver: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  vehicleStatus: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  locationText: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#9ca3af',
  },
  
  // Control Buttons
  controlButtons: {
    position: 'absolute',
    bottom: 140,
    right: 20,
    gap: 8,
  },
  controlButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  controlButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  truckIcon: {
    width: 40,
    height: 40,
  },
  
  // Error Handling
  errorContainer: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: '#fef2f2',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  retryButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default AdminMapsView;
