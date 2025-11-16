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
import DriverAllocationRouteView from '../components/DriverAllocationRouteView';
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
  const [userEmail, setUserEmail] = useState(''); // For email-based allocation matching
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
        const email = await AsyncStorage.getItem('userEmail');
        const role = await AsyncStorage.getItem('userRole');
        
        console.log('📋 AsyncStorage values:');
        console.log('  - userName:', userName);
        console.log('  - accountName:', accountName);
        console.log('  - userId:', userId);
        console.log('  - userEmail:', email);
        console.log('  - userRole:', role);
        
        // ALWAYS fetch from database to get latest user info
        if (email) {
          try {
            console.log('🌐 Fetching user details from database...');
            const response = await fetch(buildApiUrl('/getUsers'));
            if (response.ok) {
              const result = await response.json();
              console.log('✅ Got users from database');
              const users = result.data || [];
              const currentUser = users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
              
              if (currentUser) {
                console.log('✅ Found current user in database:', currentUser.accountName || currentUser.name);
                
                // Update stored values
                const userDisplayName = currentUser.accountName || currentUser.name || currentUser.username;
                await AsyncStorage.multiSet([
                  ['userId', currentUser._id],
                  ['accountName', userDisplayName],
                  ['userName', userDisplayName],
                  ['userEmail', currentUser.email]
                ]);
                
                setDriverName(userDisplayName);
                setUserEmail(currentUser.email);
                console.log('✅ Driver name set to:', userDisplayName);
                console.log('✅ Driver email set to:', currentUser.email);
              } else {
                console.warn('⚠️ User not found in database with email:', email);
                // Fallback to stored data
                const name = accountName || userName || 'Unknown Driver';
                setDriverName(name);
                setUserEmail(email);
              }
            } else {
              console.warn('⚠️ Failed to fetch users from database, using stored data');
              const name = accountName || userName || 'Unknown Driver';
              setDriverName(name);
              setUserEmail(email || '');
            }
          } catch (fetchError) {
            console.error('❌ Error fetching user details:', fetchError.message);
            // Fallback to stored data
            const name = accountName || userName || 'Unknown Driver';
            setDriverName(name);
            setUserEmail(email || '');
          }
        } else {
          console.error('❌ No email in AsyncStorage!');
          const name = accountName || userName || 'Unknown Driver';
          setDriverName(name);
          setUserEmail('');
        }
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
          distanceInterval: 10, // Update only when moved 10 meters
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
      console.log('⚠️  Skipping allocation fetch: driverName is', driverName);
      console.log('⚠️  userEmail is:', userEmail);
      if (!userEmail) {
        console.log('⚠️  Cannot fetch allocations without driver name OR email');
        return;
      }
      console.log('📧 Will try to fetch using email only:', userEmail);
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
        const assignedDriver = allocation.assignedDriver || '';
        const normalizedAssigned = assignedDriver.toLowerCase().trim();
        const normalizedDriverName = (driverName || '').toLowerCase().trim();
        
        // PRIORITY 1: Email matching (most reliable)
        const emailMatch = allocation.assignedDriverEmail && userEmail && 
                          allocation.assignedDriverEmail.toLowerCase() === userEmail.toLowerCase();
        
        // PRIORITY 2: Exact name matching
        const exactMatch = normalizedAssigned === normalizedDriverName;
        
        // PRIORITY 3: Partial name matching (only if name is long enough)
        const containsMatch = normalizedDriverName.length > 3 && (
          normalizedAssigned.includes(normalizedDriverName) || 
          normalizedDriverName.includes(normalizedAssigned)
        );
        
        // Email match has highest priority
        const matches = emailMatch || exactMatch || containsMatch;
        
        if (matches) {
          const matchType = emailMatch ? 'EMAIL' : exactMatch ? 'EXACT NAME' : 'PARTIAL NAME';
          console.log(`  ✅ [${matchType}] Match: "${allocation.assignedDriver}" ${allocation.assignedDriverEmail || ''} ↔️ "${driverName}" ${userEmail}`);
        } else if (allocation.assignedDriver) {
          console.log(`  ❌ No match: "${allocation.assignedDriver}" ${allocation.assignedDriverEmail || ''} != "${driverName}" ${userEmail}`);
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
    } else if (userEmail) {
      // Try to fetch even without name if we have email
      fetchDriverAllocations();
    }
  }, [driverName, userEmail, fetchDriverAllocations]);
  
  // Refresh when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('🔄 Driver Dashboard focused, refreshing data...');
      fetchDriverAllocations();
    });
    
    return unsubscribe;
  }, [navigation, fetchDriverAllocations]);

  // Update allocation status
  const updateAllocationStatus = async (id, newStatus) => {
    try {
      console.log(`📝 Updating allocation ${id} to status: ${newStatus}`);
      
      const res = await fetch(buildApiUrl(`/driver-allocations/${id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          status: newStatus,
          updatedBy: driverName || 'Driver'
        }),
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

      // Start GPS tracking when accepting delivery
      if (newStatus === "In Transit" && !trackingActive) {
        startLocationTracking();
      }

      Alert.alert("Success", `Status updated to ${newStatus}`);
      console.log(`✅ Status updated successfully to: ${newStatus}`);
    } catch (err) {
      console.error('❌ Update status error:', err);
      Alert.alert("Error", err.message || "Failed to update status");
    }
  };

  const markDelivered = (id) => {
    Alert.alert(
      "Mark as Delivered",
      "Confirm that you have delivered this vehicle?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Confirm", 
          onPress: () => {
            updateAllocationStatus(id, "Delivered");
            if (trackingActive) {
              stopLocationTracking();
            }
          }
        },
      ]
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDriverAllocations();
  };

  // Render Each Allocation Item
  const renderAllocationItem = ({ item }) => {
    const status = item.status?.toLowerCase() || 'pending';
    const isSelected = item._id === selectedAllocation?._id;
    
    // Get status display info
    const getStatusDisplay = (status) => {
      switch(status) {
        case 'pending': return { text: 'Pending', color: '#FFA500', icon: 'time-outline' };
        case 'in transit': return { text: 'In Transit', color: '#007AFF', icon: 'car-outline' };
        case 'delivered': return { text: 'Delivered', color: '#34C759', icon: 'checkmark-circle' };
        case 'completed': return { text: 'Completed', color: '#34C759', icon: 'checkmark-done' };
        default: return { text: status, color: '#666', icon: 'help-circle-outline' };
      }
    };
    
    const statusDisplay = getStatusDisplay(status);
    
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
        <View style={styles.shipmentHeader}>
          <View style={styles.shipmentTitleRow}>
            <View
              style={[
                styles.colorIndicator,
                { backgroundColor: item.bodyColor || "#888" },
              ]}
            />
            <View style={styles.shipmentInfo}>
              <Text style={styles.shipmentName}>
                {item.unitName}
              </Text>
              <Text style={styles.shipmentId}>ID: {item.unitId}</Text>
            </View>
          </View>
          
          <View style={[styles.statusBadge, { backgroundColor: statusDisplay.color + '20', borderColor: statusDisplay.color }]}>
            <Ionicons name={statusDisplay.icon} size={14} color={statusDisplay.color} />
            <Text style={[styles.statusBadgeText, { color: statusDisplay.color }]}>{statusDisplay.text}</Text>
          </View>
        </View>
        
        <View style={styles.shipmentMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="color-palette-outline" size={14} color="#666" />
            <Text style={styles.metaText}>{item.bodyColor}</Text>
          </View>
          {item.assignedAgent && (
            <View style={styles.metaItem}>
              <Ionicons name="person-outline" size={14} color="#666" />
              <Text style={styles.metaText}>{item.assignedAgent}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.actionContainer}>
          {status === "pending" && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.acceptButton]}
              onPress={() => updateAllocationStatus(item._id, "In Transit")}
            >
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={styles.actionButtonText}>Accept & Start</Text>
            </TouchableOpacity>
          )}
          {status === "in transit" && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.deliverButton]}
              onPress={() => markDelivered(item._id)}
            >
              <Ionicons name="checkmark-done" size={18} color="#fff" />
              <Text style={styles.actionButtonText}>Mark Delivered</Text>
            </TouchableOpacity>
          )}
          {(status === "delivered" || status === "completed") && (
            <View style={styles.completedBadge}>
              <Ionicons name="checkmark-done-circle" size={16} color="#155724" />
              <Text style={styles.completedText}>Completed</Text>
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
          {userEmail && (
            <Text style={styles.driverEmailText}>📧 {userEmail}</Text>
          )}
          
          {/* DEBUG: Show allocation count */}
          <TouchableOpacity 
            style={styles.debugButton}
            onPress={async () => {
              const keys = await AsyncStorage.getAllKeys();
              const stores = await AsyncStorage.multiGet(keys);
              console.log('🔍 ALL AsyncStorage:');
              stores.forEach(([key, value]) => {
                console.log(`  ${key}: ${value}`);
              });
              Alert.alert('Check Console', 'AsyncStorage data logged to console');
            }}
          >
            <Text style={styles.debugButtonText}>🐛 Debug Storage</Text>
          </TouchableOpacity>
          
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
          {/* Enhanced Route View with pickup and destination */}
          <DriverAllocationRouteView 
            style={styles.mapContainer} 
            allocation={selectedAllocation}
            currentLocation={currentLocation}
          />

          {/* Assignment Details */}
          <View style={styles.statusTimeline}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedAllocation ? (
                <View style={styles.selectedShipmentInfo}>
                  <View style={styles.detailsHeader}>
                    <Text style={styles.selectedShipmentTitle}>
                      {selectedAllocation.unitName}
                    </Text>
                    <View style={[styles.statusBadgeLarge, { backgroundColor: getStatusColor(selectedAllocation.status) + '20', borderColor: getStatusColor(selectedAllocation.status) }]}>
                      <Text style={[styles.statusBadgeTextLarge, { color: getStatusColor(selectedAllocation.status) }]}>
                        {selectedAllocation.status}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.detailsCard}>
                    <View style={styles.detailRow}>
                      <Ionicons name="car-outline" size={18} color="#666" />
                      <Text style={styles.detailLabel}>Unit ID</Text>
                      <Text style={styles.detailValue}>{selectedAllocation.unitId}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="color-palette-outline" size={18} color="#666" />
                      <Text style={styles.detailLabel}>Color</Text>
                      <View style={styles.colorInfoDetail}>
                        <View style={[styles.colorSample, { backgroundColor: selectedAllocation.bodyColor || "#888" }]} />
                        <Text style={styles.detailValue}>{selectedAllocation.bodyColor}</Text>
                      </View>
                    </View>
                    {selectedAllocation.assignedAgent && (
                      <View style={styles.detailRow}>
                        <Ionicons name="person-outline" size={18} color="#666" />
                        <Text style={styles.detailLabel}>Agent</Text>
                        <Text style={styles.detailValue}>{selectedAllocation.assignedAgent}</Text>
                      </View>
                    )}
                    {selectedAllocation.pickupPoint && (
                      <View style={styles.detailRow}>
                        <Ionicons name="location-outline" size={18} color="#4CAF50" />
                        <Text style={styles.detailLabel}>Pickup</Text>
                        <Text style={styles.detailValue} numberOfLines={2}>{selectedAllocation.pickupPoint}</Text>
                      </View>
                    )}
                    {selectedAllocation.dropoffPoint && (
                      <View style={styles.detailRow}>
                        <Ionicons name="flag-outline" size={18} color="#F44336" />
                        <Text style={styles.detailLabel}>Destination</Text>
                        <Text style={styles.detailValue} numberOfLines={2}>{selectedAllocation.dropoffPoint}</Text>
                      </View>
                    )}
                  </View>
                  
                  {currentLocation && (
                    <View style={styles.locationCard}>
                      <View style={styles.cardHeader}>
                        <Ionicons name="navigate" size={18} color="#007AFF" />
                        <Text style={styles.cardTitle}>Current Location</Text>
                      </View>
                      <Text style={styles.coordText}>
                        📍 {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                      </Text>
                      {currentLocation.speed !== undefined && (
                        <Text style={styles.speedText}>
                          🚗 Speed: {Math.round(currentLocation.speed * 3.6)} km/h
                        </Text>
                      )}
                    </View>
                  )}
                  
                  {/* Process Status if available */}
                  {selectedAllocation.requestedProcesses && selectedAllocation.requestedProcesses.length > 0 && (
                    <View style={styles.processCard}>
                      <View style={styles.cardHeader}>
                        <Ionicons name="list" size={18} color="#007AFF" />
                        <Text style={styles.cardTitle}>Vehicle Processes</Text>
                      </View>
                      {selectedAllocation.requestedProcesses.map(process => (
                        <View key={process} style={styles.processItemRow}>
                          <Ionicons 
                            name={selectedAllocation.processStatus?.[process] ? "checkmark-circle" : "time-outline"} 
                            size={18} 
                            color={selectedAllocation.processStatus?.[process] ? "#34C759" : "#FFA500"} 
                          />
                          <Text style={styles.processTextNew}>
                            {process.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.noSelectionContainer}>
                  <Ionicons name="document-text-outline" size={64} color="#ccc" />
                  <Text style={styles.noSelectionText}>Select an assignment to view details</Text>
                  <TouchableOpacity 
                    style={styles.viewAssignmentsBtn}
                    onPress={() => setShowShipments(true)}
                  >
                    <Text style={styles.viewAssignmentsBtnText}>View Assignments</Text>
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
    marginBottom: 4,
  },
  driverEmailText: {
    fontSize: 12,
    color: "#888",
    marginBottom: 8,
  },
  debugButton: {
    backgroundColor: "#6c757d",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  debugButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
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
    backgroundColor: "#fff", 
    padding: 16, 
    marginBottom: 12, 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedShipment: { 
    backgroundColor: "#e8f4fd",
    borderColor: "#007AFF",
    borderWidth: 2,
    shadowOpacity: 0.1,
    elevation: 4,
  },
  shipmentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  shipmentTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  colorIndicator: { 
    width: 24, 
    height: 24, 
    borderRadius: 12, 
    marginRight: 12,
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  shipmentInfo: { 
    flex: 1 
  },
  shipmentName: { 
    fontWeight: "700", 
    marginBottom: 4, 
    fontSize: 16,
    color: "#1a1a1a",
  },
  shipmentId: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  shipmentMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: "#666",
  },
  actionContainer: { 
    flexDirection: "row", 
    justifyContent: "flex-end", 
    alignItems: "center",
  },
  actionButton: {
    backgroundColor: "#28a745",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  acceptButton: {
    backgroundColor: "#28a745",
  },
  deliverButton: {
    backgroundColor: "#007AFF",
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  completedBadge: {
    backgroundColor: "#d4edda",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#c3e6cb",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  completedText: {
    color: "#155724",
    fontWeight: "600",
    fontSize: 13,
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
  detailsHeader: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  selectedShipmentTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  statusBadgeLarge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusBadgeTextLarge: {
    fontSize: 14,
    fontWeight: "600",
  },
  detailsCard: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1a1a1a",
    flex: 2,
    textAlign: "right",
  },
  colorInfoDetail: {
    flexDirection: "row",
    alignItems: "center",
    flex: 2,
    justifyContent: "flex-end",
    gap: 8,
  },
  colorSample: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  locationCard: {
    backgroundColor: "#e8f4fd",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#007AFF30",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  coordText: {
    fontSize: 13,
    color: "#333",
    fontFamily: "monospace",
    marginBottom: 4,
  },
  speedText: {
    fontSize: 13,
    color: "#333",
    fontWeight: "500",
  },
  processCard: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  processItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  processTextNew: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  noSelectionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  noSelectionText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 24,
  },
  viewAssignmentsBtn: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  viewAssignmentsBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});
