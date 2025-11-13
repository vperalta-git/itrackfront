// DriverDashboard.js - Fixed for I-Track
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  RefreshControl,
  ScrollView,
  Dimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { buildApiUrl } from '../constants/api';
import DriverMapsView from '../components/DriverMapsView';
import UniformLoading from '../components/UniformLoading';

const { width, height } = Dimensions.get('window');

export default function DriverDashboard() {
  const navigation = useNavigation();
  const [driverAllocations, setDriverAllocations] = useState([]);
  const [selectedAllocation, setSelectedAllocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [showShipments, setShowShipments] = useState(true);
  const [driverName, setDriverName] = useState('');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState(false);
  const [trackingActive, setTrackingActive] = useState(false);
  const [locationSubscription, setLocationSubscription] = useState(null);

  // Get driver name and setup location tracking
  useEffect(() => {
    const getDriverName = async () => {
      try {
        console.log('🔍 Loading driver information...');
        const userName = await AsyncStorage.getItem('userName');
        const accountName = await AsyncStorage.getItem('accountName');
        const userId = await AsyncStorage.getItem('userId');
        
        console.log('📋 AsyncStorage values:');
        console.log('  - userName:', userName);
        console.log('  - accountName:', accountName);
        console.log('  - userId:', userId);
        
        // Priority: accountName > userName > 'Unknown Driver'
        const name = accountName || userName || 'Unknown Driver';
        setDriverName(name);
        console.log('✅ Driver name set to:', name);
      } catch (error) {
        console.error('❌ Error getting driver name:', error);
        setDriverName('Unknown Driver');
      }
    };
    getDriverName();
    setupLocationTracking();
    
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  // Setup location permissions and tracking
  const setupLocationTracking = async () => {
    try {
      console.log('📍 Setting up location tracking...');
      
      // Request permissions
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'This app needs location permission to track your vehicle in real-time.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => Location.requestForegroundPermissionsAsync() }
          ]
        );
        return;
      }

      // Request background location permission for continuous tracking
      const backgroundPermission = await Location.requestBackgroundPermissionsAsync();
      if (backgroundPermission.status === 'granted') {
        console.log('✅ Background location permission granted');
      }

      setLocationPermission(true);
      
      // Get initial location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      const initialLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: location.timestamp,
      };
      
      setCurrentLocation(initialLocation);
      console.log('📍 Initial location obtained:', initialLocation);
      
    } catch (error) {
      console.error('❌ Location setup error:', error);
      Alert.alert('Location Error', 'Could not setup location tracking');
    }
  };

  // Start real-time location tracking
  const startLocationTracking = async () => {
    try {
      console.log('🚀 Starting real-time location tracking...');
      
      if (!locationPermission) {
        await setupLocationTracking();
        return;
      }

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // Update every 5 seconds
          distanceInterval: 10, // Update every 10 meters
        },
        (location) => {
          const newLocation = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            timestamp: location.timestamp,
            speed: location.coords.speed,
            heading: location.coords.heading,
          };
          
          setCurrentLocation(newLocation);
          updateDriverLocation(newLocation);
          
          console.log('📍 Location updated:', {
            lat: newLocation.latitude.toFixed(6),
            lng: newLocation.longitude.toFixed(6),
            speed: newLocation.speed
          });
        }
      );
      
      setLocationSubscription(subscription);
      setTrackingActive(true);
      Alert.alert('Tracking Started', 'Your location is now being tracked in real-time');
      
    } catch (error) {
      console.error('❌ Error starting location tracking:', error);
      Alert.alert('Tracking Error', 'Could not start location tracking');
    }
  };

  // Stop location tracking
  const stopLocationTracking = () => {
    console.log('⏹️ Stopping location tracking...');
    
    if (locationSubscription) {
      locationSubscription.remove();
      setLocationSubscription(null);
    }
    
    setTrackingActive(false);
    Alert.alert('Tracking Stopped', 'Location tracking has been stopped');
  };

  // Update driver location on server
  const updateDriverLocation = async (location) => {
    try {
      const driverId = await AsyncStorage.getItem('userId');
      const driverEmail = await AsyncStorage.getItem('userEmail');
      
      if (!driverId && !driverEmail) {
        console.warn('⚠️ No driver ID or email found');
        return;
      }

      const response = await fetch(buildApiUrl('/updateDriverLocation'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          driverId: driverId,
          driverEmail: driverEmail,
          driverName: driverName,
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
            timestamp: location.timestamp,
            speed: location.speed,
            heading: location.heading,
          },
        }),
      });

      if (!response.ok) {
        console.warn('⚠️ Failed to update driver location on server');
      }
      
    } catch (error) {
      console.error('❌ Error updating driver location:', error);
    }
  };

  // Fetch Driver Allocations
  const fetchDriverAllocations = useCallback(async () => {
    if (!driverName || driverName === 'Unknown Driver') {
      console.log('⚠️  Cannot fetch allocations: driverName is', driverName);
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      console.log('📡 Fetching allocations from /getAllocation...');
      const res = await fetch(buildApiUrl('/getAllocation'));
      const data = await res.json();
      
      console.log('📋 Raw API response:', JSON.stringify(data, null, 2));
      console.log('📊 Response type:', typeof data);
      console.log('📊 Is array?', Array.isArray(data));
      
      // Filter allocations for current driver
      const allocationsArray = data.data || data.allocation || data || [];
      console.log(`📦 Total allocations in database: ${allocationsArray.length}`);
      console.log(`🔍 Filtering for driver: "${driverName}"`);
      
      // Log first 3 allocations to see assignedDriver values
      if (allocationsArray.length > 0) {
        console.log('📝 Sample allocations:');
        allocationsArray.slice(0, 3).forEach((allocation, index) => {
          console.log(`  ${index + 1}. ${allocation.unitName} - assignedDriver: "${allocation.assignedDriver}"`);
        });
      }
      
      const driverAllocations = allocationsArray.filter(allocation => {
        const matches = allocation.assignedDriver === driverName;
        if (!matches && allocation.assignedDriver) {
          console.log(`  ❌ Skipping: "${allocation.assignedDriver}" !== "${driverName}"`);
        } else if (matches) {
          console.log(`  ✅ Match found: "${allocation.assignedDriver}" === "${driverName}"`);
        }
        return matches;
      });
      
      console.log(`🚛 Found ${driverAllocations.length} allocations for driver: ${driverName}`);
      
      setDriverAllocations(driverAllocations);
      
      if (!selectedAllocation && driverAllocations.length > 0) {
        setSelectedAllocation(driverAllocations[0]);
      }
    } catch (err) {
      console.error('❌ Error fetching allocations:', err);
      console.error('📋 Driver name was:', driverName);
      setError(err.message || "Failed to load allocations");
      setDriverAllocations([]); // Set empty array on error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [driverName, selectedAllocation]);

  useEffect(() => {
    if (driverName && driverName !== 'Unknown Driver') {
      fetchDriverAllocations();
    }
  }, [driverName, fetchDriverAllocations]);

  // Update allocation status
  const updateAllocationStatus = async (id, newStatus) => {
    try {
      const res = await fetch(buildApiUrl(`/updateAllocation/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || "Failed to update status");
      }

      // Update local state
      setDriverAllocations(prev =>
        prev.map(item => item._id === id ? { ...item, status: newStatus } : item)
      );
      
      if (selectedAllocation?._id === id) {
        setSelectedAllocation(prev => ({ ...prev, status: newStatus }));
      }

      Alert.alert("Success", `Status updated to ${newStatus}`);
    } catch (err) {
      console.error('Update status error:', err);
      Alert.alert("Error", err.message || "Failed to update status");
    }
  };

  const confirmStatusChange = (id, newStatus) => {
    Alert.alert(
      `Confirm ${newStatus}?`,
      `Are you sure you want to mark this as "${newStatus}"?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Yes", onPress: () => updateAllocationStatus(id, newStatus) },
      ]
    );
  };

  // Handle accepting allocation
  const acceptAllocation = (id) => {
    Alert.alert(
      "Accept Allocation",
      "Do you want to accept this allocation?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Accept", 
          onPress: () => updateAllocationStatus(id, "Accepted")
        },
      ]
    );
  };

  // Handle rejecting allocation
  const rejectAllocation = (id) => {
    Alert.alert(
      "Reject Allocation",
      "Are you sure you want to reject this allocation?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Reject", 
          style: "destructive",
          onPress: () => updateAllocationStatus(id, "Rejected")
        },
      ]
    );
  };

  const startDelivery = (id) => confirmStatusChange(id, "Out for Delivery");
  const markDelivered = (id) => confirmStatusChange(id, "Delivered");

  const onRefresh = () => {
    setRefreshing(true);
    fetchDriverAllocations();
  };

  // Render Each Allocation Item
  const renderAllocationItem = ({ item }) => {
    const status = item.status?.toLowerCase() || 'assigned';
    const isSelected = item._id === selectedAllocation?._id;
    
    return (
      <TouchableOpacity
        style={[styles.shipmentItem, isSelected && styles.selectedShipment]}
        onPress={() => {
          setSelectedAllocation(item);
          if (width < 768) {
            setShowShipments(false);
          }
        }}
      >
        <View style={styles.shipmentDetails}>
          <View
            style={[
              styles.colorIndicator,
              { backgroundColor: item.bodyColor || "#888" },
            ]}
          />
          <View style={styles.shipmentInfo}>
            <Text style={styles.shipmentName}>
              {item.unitName} ({item.unitId})
            </Text>
            <Text style={styles.statusText}>Status: {item.status}</Text>
            <Text style={styles.colorText}>Color: {item.bodyColor}</Text>
            {item.assignedAgent && (
              <Text style={styles.agentText}>Agent: {item.assignedAgent}</Text>
            )}
          </View>
        </View>
        
        <View style={styles.actionContainer}>
          {status === "assigned" && (
            <View style={styles.actionButtonRow}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.acceptButton]}
                onPress={() => acceptAllocation(item._id)}
              >
                <Ionicons name="checkmark-circle" size={16} color="#fff" />
                <Text style={styles.actionButtonText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => rejectAllocation(item._id)}
              >
                <Ionicons name="close-circle" size={16} color="#fff" />
                <Text style={styles.actionButtonText}>Reject</Text>
              </TouchableOpacity>
            </View>
          )}
          {status === "accepted" && (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => startDelivery(item._id)}
            >
              <Text style={styles.actionButtonText}>Start Delivery</Text>
            </TouchableOpacity>
          )}
          {status === "out for delivery" && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.deliverButton]}
              onPress={() => markDelivered(item._id)}
            >
              <Text style={styles.actionButtonText}>Mark Delivered</Text>
            </TouchableOpacity>
          )}
          {status === "delivered" && (
            <View style={styles.completedBadge}>
              <Text style={styles.completedText}>✓ Completed</Text>
            </View>
          )}
          {status === "rejected" && (
            <View style={[styles.completedBadge, styles.rejectedBadge]}>
              <Text style={styles.rejectedText}>✗ Rejected</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.heading}>Driver Dashboard</Text>
          <Text style={styles.driverNameText}>Welcome, {driverName}</Text>
          
          {/* GPS Tracking Controls */}
          <View style={styles.gpsContainer}>
            <View style={styles.gpsStatus}>
              <Ionicons 
                name={trackingActive ? "location" : "location-outline"} 
                size={16} 
                color={trackingActive ? "#28a745" : "#dc3545"} 
              />
              <Text style={[styles.gpsStatusText, { color: trackingActive ? "#28a745" : "#dc3545" }]}>
                {trackingActive ? "GPS Active" : "GPS Inactive"}
              </Text>
              {currentLocation && (
                <Text style={styles.locationText}>
                  {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={[styles.gpsButton, trackingActive ? styles.gpsButtonStop : styles.gpsButtonStart]}
              onPress={trackingActive ? stopLocationTracking : startLocationTracking}
            >
              <Ionicons 
                name={trackingActive ? "stop" : "play"} 
                size={16} 
                color="#fff" 
              />
              <Text style={styles.gpsButtonText}>
                {trackingActive ? "Stop" : "Start"}
              </Text>
            </TouchableOpacity>
          </View>
          
          {!showShipments && selectedAllocation && (
            <TouchableOpacity 
              style={styles.showShipmentsButton}
              onPress={() => setShowShipments(true)}
            >
              <Text style={styles.showShipmentsText}>← Show Assignments</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading && (
        <UniformLoading 
          message="Loading assignments..." 
          size="large"
          style={{ position: 'relative' }}
        />
      )}
      
      {error && <Text style={styles.errorText}>{error}</Text>}

      <View style={styles.contentContainer}>
        {/* Left: Assignments List */}
        {showShipments && (
          <View style={styles.shipmentList}>
            <View style={styles.shipmentHeader}>
              <Text style={styles.subHeading}>My Assignments ({driverAllocations.length})</Text>
              {width >= 768 && (
                <TouchableOpacity 
                  style={styles.hideButton}
                  onPress={() => setShowShipments(false)}
                >
                  <Text style={styles.hideButtonText}>Hide</Text>
                </TouchableOpacity>
              )}
            </View>
            <FlatList
              data={driverAllocations}
              keyExtractor={(item) => item._id}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              renderItem={renderAllocationItem}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No assignments found</Text>
                  <Text style={styles.emptySubtext}>You don't have any vehicle assignments yet.</Text>
                </View>
              }
            />
          </View>
        )}

        {/* Right: Map + Details */}
        <View style={[styles.mapAndStatus, !showShipments && styles.mapExpanded]}>
          {/* Integrated Driver Maps */}
          <DriverMapsView style={styles.mapContainer} />

          {/* Assignment Details */}
          <View style={styles.statusTimeline}>
            <ScrollView>
              {selectedAllocation ? (
                <View style={styles.selectedShipmentInfo}>
                  <Text style={styles.selectedShipmentTitle}>
                    🚛 {selectedAllocation.unitName}
                  </Text>
                  <View style={styles.shipmentInfoRow}>
                    <Text style={styles.infoLabel}>Unit ID:</Text>
                    <Text style={styles.infoValue}>{selectedAllocation.unitId}</Text>
                  </View>
                  <View style={styles.shipmentInfoRow}>
                    <Text style={styles.infoLabel}>Status:</Text>
                    <Text style={[styles.infoValue, { color: getStatusColor(selectedAllocation.status) }]}>
                      {selectedAllocation.status}
                    </Text>
                  </View>
                  <View style={styles.shipmentInfoRow}>
                    <Text style={styles.infoLabel}>Color:</Text>
                    <View style={styles.colorInfo}>
                      <View style={[styles.colorSample, { backgroundColor: selectedAllocation.bodyColor || "#888" }]} />
                      <Text style={styles.infoValue}>{selectedAllocation.bodyColor}</Text>
                    </View>
                  </View>
                  {selectedAllocation.assignedAgent && (
                    <View style={styles.shipmentInfoRow}>
                      <Text style={styles.infoLabel}>Agent:</Text>
                      <Text style={styles.infoValue}>{selectedAllocation.assignedAgent}</Text>
                    </View>
                  )}
                  {currentLocation && (
                    <View style={styles.locationInfo}>
                      <Text style={styles.infoLabel}>Current Location:</Text>
                      <Text style={styles.coordText}>
                        {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                      </Text>
                    </View>
                  )}
                  
                  {/* Process Status if available */}
                  {selectedAllocation.requestedProcesses && selectedAllocation.requestedProcesses.length > 0 && (
                    <View style={styles.processContainer}>
                      <Text style={styles.processTitle}>Vehicle Processes:</Text>
                      {selectedAllocation.requestedProcesses.map(process => (
                        <View key={process} style={styles.processItem}>
                          <Text style={styles.processText}>
                            {selectedAllocation.processStatus?.[process] ? '✅' : '⏳'} {process.replace('_', ' ')}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.noSelectionContainer}>
                  <Text style={styles.noSelectionText}>📋 Select an assignment to view details</Text>
                  <TouchableOpacity 
                    style={styles.showShipmentsButton}
                    onPress={() => setShowShipments(true)}
                  >
                    <Text style={styles.showShipmentsButtonText}>View Assignments</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </View>
    </View>
  );
}

// Helper function for status colors
const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'assigned': return '#FF8C00';
    case 'out for delivery': return '#007AFF';
    case 'delivered': return '#34C759';
    default: return '#666';
  }
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 15, 
    backgroundColor: '#F3F4F6' 
  },
  headerRow: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center",
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerLeft: {
    flex: 1,
    flexDirection: "column",
  },
  heading: { 
    fontSize: 24, 
    fontWeight: "bold", 
    color: '#DC2626',
    marginBottom: 4,
  },
  driverNameText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 8,
  },
  showShipmentsButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  showShipmentsText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  gpsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8f9fa",
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  gpsStatus: {
    flex: 1,
    flexDirection: "column",
  },
  gpsStatusText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  locationText: {
    fontSize: 10,
    color: "#666",
    marginTop: 2,
  },
  gpsButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 70,
    justifyContent: "center",
  },
  gpsButtonStart: {
    backgroundColor: '#10B981',
  },
  gpsButtonStop: {
    backgroundColor: '#DC2626',
  },
  gpsButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#6B7280',
    fontSize: 16,
  },
  errorText: { 
    color: '#DC2626', 
    textAlign: "center", 
    marginVertical: 10,
    backgroundColor: '#F3F4F6',
    padding: 10,
    borderRadius: 8,
  },
  contentContainer: { 
    flex: 1, 
    flexDirection: width >= 768 ? "row" : "column",
    gap: 10,
  },
  shipmentList: { 
    width: width >= 768 ? "40%" : "100%",
    backgroundColor: "#fff", 
    padding: 15, 
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shipmentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  subHeading: { 
    fontSize: 18, 
    fontWeight: "bold", 
    color: "#333",
  },
  hideButton: {
    backgroundColor: "#6c757d",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  hideButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
  },
  shipmentItem: { 
    backgroundColor: "#f8f9fa", 
    padding: 15, 
    marginBottom: 12, 
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  selectedShipment: { 
    backgroundColor: "#e8f4fd",
    borderColor: "#007AFF",
    borderWidth: 2,
  },
  shipmentDetails: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginBottom: 10,
  },
  colorIndicator: { 
    width: 20, 
    height: 20, 
    borderRadius: 10, 
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  shipmentInfo: { 
    flex: 1 
  },
  shipmentName: { 
    fontWeight: "bold", 
    marginBottom: 4, 
    fontSize: 16,
    color: "#333",
  },
  statusText: {
    fontSize: 14,
    marginBottom: 2,
    color: "#666",
  },
  colorText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  agentText: {
    fontSize: 14,
    color: "#666",
  },
  actionContainer: { 
    flexDirection: "row", 
    justifyContent: "flex-end", 
    alignItems: "center",
  },
  actionButtonRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    backgroundColor: "#28a745",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  acceptButton: {
    backgroundColor: "#28a745",
    marginLeft: 0,
  },
  rejectButton: {
    backgroundColor: "#dc3545",
    marginLeft: 0,
  },
  deliverButton: {
    backgroundColor: "#007AFF",
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  completedBadge: {
    backgroundColor: "#d4edda",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#c3e6cb",
  },
  completedText: {
    color: "#155724",
    fontWeight: "600",
    fontSize: 14,
  },
  rejectedBadge: {
    backgroundColor: "#f8d7da",
    borderColor: "#f5c6cb",
  },
  rejectedText: {
    color: "#721c24",
    fontWeight: "600",
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: { 
    textAlign: "center", 
    color: "#333",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  emptySubtext: {
    textAlign: "center",
    color: "#666",
    fontSize: 14,
  },
  mapAndStatus: { 
    flex: 1,
    flexDirection: "column",
    minHeight: 400,
  },
  mapExpanded: {
    width: "100%",
  },
  mapContainer: {
    flex: 2,
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#e9ecef",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  map: { 
    flex: 1,
    minHeight: 300,
    width: '100%',
    backgroundColor: '#f0f0f0',
  },
  mapLocationOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  mapLocationText: {
    fontSize: 12,
    color: '#333',
    marginBottom: 2,
  },
  statusTimeline: { 
    flex: 1, 
    backgroundColor: "#fff", 
    padding: 15, 
    borderRadius: 12,
    marginTop: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 150,
  },
  selectedShipmentInfo: {
    flex: 1,
  },
  selectedShipmentTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
    textAlign: "center",
  },
  shipmentInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingVertical: 5,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
    flex: 2,
    textAlign: "right",
  },
  colorInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 2,
    justifyContent: "flex-end",
  },
  colorSample: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  locationInfo: {
    marginTop: 15,
    padding: 10,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
  },
  coordText: {
    fontSize: 12,
    color: "#666",
    fontFamily: "monospace",
    marginTop: 5,
  },
  processContainer: {
    marginTop: 15,
    padding: 10,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
  },
  processTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
  },
  processItem: {
    marginBottom: 5,
  },
  processText: {
    fontSize: 14,
    color: "#666",
  },
  noSelectionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  noSelectionText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  showShipmentsButtonText: {
    color: "#007AFF",
    fontWeight: "600",
    fontSize: 16,
  },
});
