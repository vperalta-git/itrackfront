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
  Modal,
  Animated,
  Pressable,
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
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-300));
  const [acceptModalVisible, setAcceptModalVisible] = useState(false);
  const [selectedForAccept, setSelectedForAccept] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);

  // Sidebar animation
  const openSidebar = () => {
    setSidebarVisible(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeSidebar = () => {
    Animated.timing(slideAnim, {
      toValue: -300,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setSidebarVisible(false));
  };

  // Show accept modal with route information
  const showAcceptModal = async (allocation) => {
    setSelectedForAccept(allocation);
    setAcceptModalVisible(true);
    setLoadingRoute(true);
    
    try {
      // Get route information using Google Routes API
      const pickup = allocation.pickupLocation?.address || 'Isuzu Laguna Stockyard';
      const destination = allocation.destination?.address || 'Isuzu Pasig';
      
      const response = await fetch(buildApiUrl('/api/maps/route'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin: pickup, destination })
      });
      
      const data = await response.json();
      if (data.success && data.route) {
        setRouteInfo({
          distance: data.route.distance,
          duration: data.route.duration,
          pickup,
          destination,
          polyline: data.route.polyline
        });
      }
    } catch (error) {
      console.error('Error fetching route:', error);
    } finally {
      setLoadingRoute(false);
    }
  };
  
  // Accept allocation
  const acceptAllocation = async () => {
    if (!selectedForAccept) return;
    
    try {
      await updateAllocationStatus(selectedForAccept._id, "In Transit");
      setAcceptModalVisible(false);
      setSelectedForAccept(null);
      setRouteInfo(null);
    } catch (error) {
      console.error('Error accepting allocation:', error);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove(['userId', 'userName', 'accountName', 'userEmail', 'userRole']);
              navigation.reset({
                index: 0,
                routes: [{ name: 'LoginScreen' }],
              });
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout');
            }
          },
        },
      ]
    );
  };

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

  // Fetch Driver Allocations (exclude Completed status)
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
        // Exclude completed deliveries from active list
        if (allocation.status?.toLowerCase() === 'completed') {
          return false;
        }
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
  const updateAllocationStatus = async (id, newStatus, additionalData = {}) => {
    try {
      console.log(`📝 Updating allocation ${id} to status: ${newStatus}`);
      
      const res = await fetch(buildApiUrl(`/driver-allocations/${id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          status: newStatus,
          updatedBy: driverName || 'Driver',
          ...additionalData
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
              onPress={() => showAcceptModal(item)}
            >
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={styles.actionButtonText}>View Details</Text>
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
          <TouchableOpacity onPress={openSidebar} style={styles.menuButton}>
            <Ionicons name="menu" size={28} color="#DC2626" />
          </TouchableOpacity>
          <View>
            <Text style={styles.heading}>Driver Dashboard</Text>
            <Text style={styles.driverNameText}>Welcome, {driverName}</Text>
          </View>
        </View>
        
        {/* GPS Status Indicator */}
        {trackingActive && (
          <View style={styles.gpsStatusIndicator}>
            <Ionicons name="location" size={16} color="#10B981" />
            <Text style={styles.gpsStatusText}>GPS Active</Text>
          </View>
        )}
      </View>
          
      {!showShipments && selectedAllocation && (
        <TouchableOpacity 
          style={styles.showShipmentsButton}
          onPress={() => setShowShipments(true)}
        >
          <Text style={styles.showShipmentsText}>← Show Assignments</Text>
        </TouchableOpacity>
      )}

      {loading && (
        <UniformLoading 
          message="Loading assignments..." 
          size="large"
          style={{ position: 'relative' }}
        />
      )}
      
      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Full Screen Map */}
      <View style={styles.mapFullScreen}>
        <DriverAllocationRouteView 
          style={styles.mapContainer} 
          allocation={selectedAllocation}
          currentLocation={currentLocation}
        />
      </View>

      {/* Bottom Info Card & Action Buttons */}
      {selectedAllocation && (
        <View style={styles.bottomCard}>
            {/* Vehicle Info Header */}
            <View style={styles.bottomCardHeader}>
              <View style={styles.bottomVehicleInfo}>
                <Text style={styles.bottomVehicleName}>{selectedAllocation.unitName}</Text>
                <Text style={styles.bottomVehicleId}>ID: {selectedAllocation.unitId} • Color: {selectedAllocation.bodyColor}</Text>
              </View>
            </View>

            {/* Route Info */}
            <View style={styles.bottomRouteInfo}>
              <View style={styles.routeInfoRow}>
                <Ionicons name="location" size={16} color="#4CAF50" />
                <Text style={styles.routeInfoLabel}>From:</Text>
                <Text style={styles.routeInfoText} numberOfLines={1}>{selectedAllocation.pickupPoint}</Text>
              </View>
              <View style={styles.routeInfoRow}>
                <Ionicons name="flag" size={16} color="#F44336" />
                <Text style={styles.routeInfoLabel}>To:</Text>
                <Text style={styles.routeInfoText} numberOfLines={1}>{selectedAllocation.dropoffPoint}</Text>
              </View>
              {selectedAllocation.pickupTime && (
                <View style={styles.routeInfoRow}>
                  <Ionicons name="time-outline" size={16} color="#2196F3" />
                  <Text style={styles.routeInfoLabel}>Picked up:</Text>
                  <Text style={styles.routeInfoText}>{new Date(selectedAllocation.pickupTime).toLocaleString()}</Text>
                </View>
              )}
              {selectedAllocation.completionTime && (
                <View style={styles.routeInfoRow}>
                  <Ionicons name="checkmark-done-outline" size={16} color="#4CAF50" />
                  <Text style={styles.routeInfoLabel}>Completed:</Text>
                  <Text style={styles.routeInfoText}>{new Date(selectedAllocation.completionTime).toLocaleString()}</Text>
                </View>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtonsContainer}>
            {selectedAllocation.status?.toLowerCase() === 'pending' && (
              <TouchableOpacity 
                style={styles.startTransitButton}
                onPress={() => {
                  Alert.alert(
                    'Start Transit',
                    'Begin delivery and start GPS tracking?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Start',
                        onPress: async () => {
                          const pickupTime = new Date().toISOString();
                          await updateAllocationStatus(selectedAllocation._id, 'In Transit', { pickupTime });
                          if (!trackingActive) {
                            await startLocationTracking();
                          }
                        }
                      }
                    ]
                  );
                }}
              >
                <Ionicons name="play-circle" size={24} color="#fff" />
                <Text style={styles.startTransitButtonText}>Start Transit</Text>
              </TouchableOpacity>
            )}
            
            {selectedAllocation.status?.toLowerCase() === 'in transit' && (
              <TouchableOpacity 
                style={styles.completeTransitButton}
                onPress={() => {
                  Alert.alert(
                    'Complete Transit',
                    'Mark vehicle as delivered to destination?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Complete',
                        onPress: async () => {
                          if (!currentLocation) {
                            Alert.alert('Location Required', 'Cannot complete transit without location data.');
                            return;
                          }
                          
                          try {
                            // Update allocation status with completion time
                            const completionTime = new Date().toISOString();
                            await updateAllocationStatus(selectedAllocation._id, 'Delivered', { completionTime });
                            
                            // Update vehicle status to Available
                            const vehicleUpdateRes = await fetch(buildApiUrl(`/updateStock/${selectedAllocation.unitId}`), {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ 
                                status: 'Available',
                                lastUpdatedBy: driverName || 'Driver',
                                dateUpdated: new Date()
                              })
                            });
                            
                            if (vehicleUpdateRes.ok) {
                              console.log('✅ Vehicle status updated to Available');
                            }
                            
                            // Stop GPS tracking
                            if (trackingActive) {
                              await stopLocationTracking();
                            }
                            
                            Alert.alert('Success', 'Transit completed successfully! Vehicle is now available.');
                          } catch (error) {
                            console.error('Complete transit error:', error);
                            Alert.alert('Error', 'Failed to complete transit');
                          }
                        }
                      }
                    ]
                  );
                }}
              >
                <Ionicons name="checkmark-circle" size={24} color="#fff" />
                <Text style={styles.completeTransitButtonText}>Complete Transit</Text>
              </TouchableOpacity>
            )}

            {selectedAllocation.status?.toLowerCase() === 'delivered' && (
              <TouchableOpacity 
                style={styles.readyForNextButton}
                onPress={() => {
                  Alert.alert(
                    'Ready for Next Delivery',
                    'Mark this delivery as complete and ready for next assignment?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Confirm',
                        onPress: async () => {
                          try {
                            // Update allocation to Completed status
                            await updateAllocationStatus(selectedAllocation._id, 'Completed', {
                              completedAt: new Date().toISOString(),
                              completedBy: driverName
                            });
                            
                            // Refresh allocations to remove completed ones from active list
                            await fetchDriverAllocations();
                            
                            // Clear selection
                            setSelectedAllocation(null);
                            
                            Alert.alert(
                              'Great Job!',
                              'Delivery marked as complete. Ready for your next assignment!',
                              [{ text: 'OK' }]
                            );
                          } catch (error) {
                            console.error('Ready for next error:', error);
                            Alert.alert('Error', 'Failed to complete delivery');
                          }
                        }
                      }
                    ]
                  );
                }}
              >
                <Ionicons name="refresh-circle" size={24} color="#fff" />
                <Text style={styles.readyForNextButtonText}>Ready for Next Delivery</Text>
              </TouchableOpacity>
            )}
            </View>
        </View>
      )}

      {/* Accept Modal with Map */}
      <Modal
        visible={acceptModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAcceptModalVisible(false)}
      >
        <View style={styles.acceptModalContainer}>
          <View style={styles.acceptModalContent}>
            {/* Header */}
            <View style={styles.acceptModalHeader}>
              <Text style={styles.acceptModalTitle}>Ride Request</Text>
              <TouchableOpacity onPress={() => setAcceptModalVisible(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            {/* Map View */}
            {loadingRoute ? (
              <View style={styles.mapPlaceholder}>
                <UniformLoading message="Loading route..." size="large" />
              </View>
            ) : (
              <View style={styles.mapContainer}>
                {routeInfo && (
                  <View style={styles.mapOverlay}>
                    <View style={styles.routeBadge}>
                      <Ionicons name="car-outline" size={20} color="#fff" />
                      <Text style={styles.routeDuration}>{routeInfo.duration}</Text>
                      <Text style={styles.routeDistance}>{routeInfo.distance}</Text>
                    </View>
                  </View>
                )}
                <DriverAllocationRouteView 
                  allocation={selectedForAccept}
                  currentLocation={currentLocation}
                  style={styles.modalMap}
                />
              </View>
            )}

            {/* Route Details */}
            {selectedForAccept && (
              <View style={styles.acceptDetailsContainer}>
                <View style={styles.distanceBadge}>
                  <Ionicons name="car-outline" size={16} color="#666" />
                  <Text style={styles.distanceText}>~{routeInfo?.distance || '2.8 km'}</Text>
                </View>

                {/* Vehicle Info */}
                <View style={styles.acceptVehicleInfo}>
                  <View style={[styles.colorIndicatorLarge, { backgroundColor: selectedForAccept.bodyColor || '#888' }]} />
                  <View style={styles.acceptVehicleDetails}>
                    <Text style={styles.acceptVehicleName}>{selectedForAccept.unitName}</Text>
                    <Text style={styles.acceptVehicleId}>ID: {selectedForAccept.unitId}</Text>
                    <Text style={styles.acceptVehicleColor}>
                      {selectedForAccept.bodyColor} • {selectedForAccept.variation}
                    </Text>
                  </View>
                </View>

                {/* Pickup Location */}
                <View style={styles.locationDetail}>
                  <View style={styles.locationIconContainer}>
                    <View style={styles.pickupDot} />
                  </View>
                  <View style={styles.locationTextContainer}>
                    <Text style={styles.locationLabel}>Pickup</Text>
                    <Text style={styles.locationAddress}>
                      {selectedForAccept.pickupLocation?.address || 'Isuzu Laguna Stockyard'}
                    </Text>
                  </View>
                </View>

                {/* Destination */}
                <View style={styles.locationDetail}>
                  <View style={styles.locationIconContainer}>
                    <View style={styles.destinationDot} />
                  </View>
                  <View style={styles.locationTextContainer}>
                    <Text style={styles.locationLabel}>Destination</Text>
                    <Text style={styles.locationAddress}>
                      {selectedForAccept.destination?.address || 'Isuzu Pasig'}
                    </Text>
                  </View>
                </View>

                {/* Accept Button */}
                <TouchableOpacity 
                  style={styles.acceptForButton}
                  onPress={acceptAllocation}
                >
                  <Text style={styles.acceptForButtonText}>
                    Accept Assignment
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Sidebar Modal */}
      <Modal
        visible={sidebarVisible}
        transparent
        animationType="none"
        onRequestClose={closeSidebar}
      >
        <Pressable style={styles.modalOverlay} onPress={closeSidebar}>
          <Animated.View 
            style={[
              styles.sidebar,
              { transform: [{ translateX: slideAnim }] }
            ]}
          >
            <View style={styles.sidebarHeader}>
              <Ionicons name="person-circle" size={60} color="#DC2626" />
              <Text style={styles.sidebarName}>{driverName}</Text>
              <Text style={styles.sidebarEmail}>{userEmail}</Text>
            </View>

            <View style={styles.sidebarContent}>
              <TouchableOpacity style={styles.sidebarItem} onPress={() => {
                closeSidebar();
                navigation.navigate('Profile');
              }}>
                <Ionicons name="person-outline" size={24} color="#333" />
                <Text style={styles.sidebarItemText}>Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.sidebarItem} onPress={() => {
                closeSidebar();
                navigation.navigate('DriverHistory');
              }}>
                <Ionicons name="time-outline" size={24} color="#333" />
                <Text style={styles.sidebarItemText}>Delivery History</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.sidebarItem} onPress={() => {
                closeSidebar();
              }}>
                <Ionicons name="settings-outline" size={24} color="#333" />
                <Text style={styles.sidebarItemText}>Settings</Text>
              </TouchableOpacity>

              <View style={styles.sidebarDivider} />

              <TouchableOpacity 
                style={[styles.sidebarItem, styles.logoutItem]} 
                onPress={() => {
                  closeSidebar();
                  setTimeout(handleLogout, 300);
                }}
              >
                <Ionicons name="log-out-outline" size={24} color="#DC2626" />
                <Text style={[styles.sidebarItemText, styles.logoutText]}>Logout</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Pressable>
      </Modal>
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
    padding: 10, 
    backgroundColor: '#F3F4F6' 
  },
  headerRow: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center",
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerLeft: {
    flex: 1,
    flexDirection: "column",
  },
  heading: { 
    fontSize: 20, 
    fontWeight: "bold", 
    color: '#DC2626',
    marginBottom: 2,
  },
  driverNameText: {
    fontSize: 14,
    color: "#666",
  },
  driverEmailText: {
    fontSize: 12,
    color: "#888",
  },
  gpsContainerCompact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
    padding: 6,
    borderRadius: 8,
    marginTop: 4,
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
    padding: 12, 
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 8,
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
    padding: 12, 
    marginBottom: 10, 
    borderRadius: 10,
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
    marginBottom: 8,
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
  // Sidebar styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
  },
  sidebar: {
    width: 280,
    height: '100%',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 10,
  },
  sidebarHeader: {
    backgroundColor: '#DC2626',
    padding: 24,
    paddingTop: 50,
    alignItems: 'center',
  },
  sidebarName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
  },
  sidebarEmail: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
    marginTop: 4,
  },
  sidebarContent: {
    flex: 1,
    paddingTop: 20,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 16,
  },
  sidebarItemText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  sidebarDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
    marginHorizontal: 24,
  },
  logoutItem: {
    marginTop: 'auto',
    marginBottom: 40,
  },
  logoutText: {
    color: '#DC2626',
    fontWeight: '600',
  },
  menuButton: {
    padding: 4,
    marginRight: 12,
  },
  // Full Screen Map Layout
  mapFullScreen: {
    flex: 1,
    width: '100%',
  },
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
    paddingTop: 16,
    paddingBottom: 20,
  },
  bottomCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 12,
  },
  bottomVehicleInfo: {
    flex: 1,
  },
  bottomVehicleName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  bottomVehicleId: {
    fontSize: 13,
    color: '#666',
  },
  statusBadgeCompact: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  statusBadgeTextCompact: {
    fontSize: 12,
    fontWeight: '700',
  },
  bottomRouteInfo: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 8,
  },
  routeInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routeInfoLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
    minWidth: 40,
  },
  routeInfoText: {
    fontSize: 13,
    color: '#333',
    flex: 1,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  startTransitButton: {
    flex: 1,
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  startTransitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  completeTransitButton: {
    flex: 1,
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  completeTransitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  readyForNextButton: {
    flex: 1,
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  readyForNextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  gpsStatusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  gpsStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  // Accept Modal Styles
  acceptModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  acceptModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  acceptModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  acceptModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  mapContainer: {
    height: 300,
    backgroundColor: '#f5f5f5',
    position: 'relative',
  },
  mapPlaceholder: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  modalMap: {
    flex: 1,
  },
  mapOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  routeBadge: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
  },
  routeDuration: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  routeDistance: {
    color: '#fff',
    fontSize: 14,
  },
  acceptDetailsContainer: {
    padding: 20,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  distanceText: {
    fontSize: 14,
    color: '#666',
  },
  acceptVehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  colorIndicatorLarge: {
    width: 50,
    height: 50,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  acceptVehicleDetails: {
    flex: 1,
  },
  acceptVehicleName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  acceptVehicleId: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  acceptVehicleColor: {
    fontSize: 12,
    color: '#888',
  },
  locationDetail: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  locationIconContainer: {
    width: 24,
    alignItems: 'center',
    paddingTop: 2,
  },
  pickupDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#10B981',
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  destinationDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#DC2626',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#DC2626',
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  locationTextContainer: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 15,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  acceptForButton: {
    backgroundColor: '#C8E900',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  acceptForButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
});
