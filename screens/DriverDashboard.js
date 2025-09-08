// DriverDashboard.js - Fixed for I-Track
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Dimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from "react-native-maps";
import * as Location from "expo-location";
import { buildApiUrl } from '../constants/api';

const DESTINATION_COORDS = { latitude: 14.5791, longitude: 121.0655 }; // Isuzu Pasig
const { width, height } = Dimensions.get('window');

export default function DriverDashboard() {
  const navigation = useNavigation();
  const [driverAllocations, setDriverAllocations] = useState([]);
  const [selectedAllocation, setSelectedAllocation] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [showShipments, setShowShipments] = useState(true);
  const [driverName, setDriverName] = useState('');

  // Get driver name from AsyncStorage
  useEffect(() => {
    const getDriverName = async () => {
      try {
        const name = await AsyncStorage.getItem('userName') || await AsyncStorage.getItem('accountName');
        setDriverName(name || 'Unknown Driver');
      } catch (error) {
        console.error('Error getting driver name:', error);
        setDriverName('Unknown Driver');
      }
    };
    getDriverName();
  }, []);

  // Fetch Driver Allocations
  const fetchDriverAllocations = useCallback(async () => {
    if (!driverName || driverName === 'Unknown Driver') return;
    
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(buildApiUrl('/getAllocation'));
      const data = await res.json();
      
      // Filter allocations for current driver
      const driverAllocations = (data.allocation || data || []).filter(allocation => 
        allocation.assignedDriver === driverName
      );
      
      setDriverAllocations(driverAllocations);
      
      if (!selectedAllocation && driverAllocations.length > 0) {
        setSelectedAllocation(driverAllocations[0]);
      }
    } catch (err) {
      console.error('Error fetching allocations:', err);
      setError(err.message || "Failed to load allocations");
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

  // Location tracking
  useEffect(() => {
    let locationSubscription;
    
    const startLocationTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Denied", "Location permission is required for tracking.");
          return;
        }

        locationSubscription = await Location.watchPositionAsync(
          { 
            accuracy: Location.Accuracy.High, 
            timeInterval: 10000, // Update every 10 seconds
            distanceInterval: 50 // Update every 50 meters
          },
          (location) => {
            const coords = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            };
            setCurrentLocation(coords);
          }
        );
      } catch (error) {
        console.error("Location setup error:", error);
        Alert.alert("Location Error", "Failed to set up location tracking.");
      }
    };

    startLocationTracking();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

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

  const startDelivery = (id) => confirmStatusChange(id, "Out for Delivery");
  const markDelivered = (id) => confirmStatusChange(id, "Delivered");

  const onRefresh = () => {
    setRefreshing(true);
    fetchDriverAllocations();
  };

  // Logout
  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('userToken');
              await AsyncStorage.removeItem('userName');
              await AsyncStorage.removeItem('userRole');
              await AsyncStorage.removeItem('accountName');
              navigation.reset({
                index: 0,
                routes: [{ name: 'LoginScreen' }],
              });
            } catch (error) {
              console.error('Logout error:', error);
            }
          },
        },
      ]
    );
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
          {!showShipments && selectedAllocation && (
            <TouchableOpacity 
              style={styles.showShipmentsButton}
              onPress={() => setShowShipments(true)}
            >
              <Text style={styles.showShipmentsText}>← Show Assignments</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#CB1E2A" />
          <Text style={styles.loadingText}>Loading assignments...</Text>
        </View>
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
          {/* Map Container */}
          <View style={styles.mapContainer}>
            <MapView
              provider="osm"
              style={styles.map}
              initialRegion={{
                latitude: DESTINATION_COORDS.latitude,
                longitude: DESTINATION_COORDS.longitude,
                latitudeDelta: 0.1,
                longitudeDelta: 0.1,
              }}
              region={currentLocation ? {
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              } : undefined}
              showsUserLocation={true}
              showsMyLocationButton={true}
              showsCompass={true}
              mapType="standard"
            >
              {/* Destination Marker */}
              <Marker 
                coordinate={DESTINATION_COORDS} 
                title="Isuzu Pasig Dealership"
                description="Final delivery destination"
                pinColor="red"
              />
              
              {/* Current Location Marker */}
              {currentLocation && (
                <Marker 
                  coordinate={currentLocation} 
                  title="Your Location"
                  description="Current driver position"
                  pinColor="blue"
                />
              )}
              
              {/* Route Line */}
              {currentLocation && (
                <Polyline 
                  coordinates={[currentLocation, DESTINATION_COORDS]} 
                  strokeColor="#CB1E2A"
                  strokeWidth={3}
                  lineDashPattern={[5, 5]}
                />
              )}
            </MapView>
            
            {/* Location Info Overlay */}
            {currentLocation && (
              <View style={styles.mapLocationOverlay}>
                <Text style={styles.mapLocationText}>
                  📍 Your Location: {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                </Text>
                <Text style={styles.mapLocationText}>
                  🏭 Destination: Isuzu Pasig Dealership
                </Text>
              </View>
            )}
          </View>

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
    backgroundColor: "#f8f9fa" 
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
    color: "#CB1E2A",
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
  logoutBtn: { 
    backgroundColor: "#CB1E2A", 
    paddingHorizontal: 16,
    paddingVertical: 8, 
    borderRadius: 8,
  },
  logoutText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  errorText: { 
    color: "red", 
    textAlign: "center", 
    marginVertical: 10,
    backgroundColor: "#ffe6e6",
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
  actionButton: {
    backgroundColor: "#28a745",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 8,
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
