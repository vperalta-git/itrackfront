// NewDriverDashboard.js - Completely Rebuilt Driver Dashboard with Modern UI
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
  SafeAreaView,
  StatusBar,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { buildApiUrl } from '../constants/api';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import RealTimeTrackingMapsView from './RealTimeTrackingMapsView';

const { width, height } = Dimensions.get('window');

export default function NewDriverDashboard() {
  const navigation = useNavigation();
  const [driverAllocations, setDriverAllocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [driverName, setDriverName] = useState('Unknown Driver');
  const [currentLocation, setCurrentLocation] = useState(null);
  const [activeTab, setActiveTab] = useState('assignments'); // 'assignments', 'route', 'map'

  // Get driver name from storage
  useEffect(() => {
    const getDriverName = async () => {
      try {
        const username = await AsyncStorage.getItem('currentUsername');
        if (username) {
          setDriverName(username);
          console.log('🚗 Driver Dashboard: Loaded driver -', username);
        }
      } catch (error) {
        console.error('Error getting driver name:', error);
      }
    };
    getDriverName();
  }, []);

  // Get location permission and track location
  useEffect(() => {
    const requestLocationPermission = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          setCurrentLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
          console.log('📍 Driver location obtained:', location.coords);
        }
      } catch (error) {
        console.error('Location error:', error);
      }
    };
    requestLocationPermission();
  }, []);

  // Fetch driver assignments
  const fetchDriverAssignments = useCallback(async () => {
    if (!driverName || driverName === 'Unknown Driver') return;
    
    setLoading(true);
    try {
      console.log('🔄 Fetching assignments for driver:', driverName);
      
      const response = await fetch(buildApiUrl('/getAllocation'));
      if (response.ok) {
        const data = await response.json();
        const allAllocations = data.data || data.allocations || data || [];
        
        // Filter allocations for this driver
        const driverAllocations = allAllocations.filter(allocation => 
          allocation.assignedDriver === driverName
        );
        
        setDriverAllocations(driverAllocations);
        console.log(`✅ Found ${driverAllocations.length} assignments for ${driverName}`);
        
        if (driverAllocations.length === 0) {
          console.log('ℹ️  No assignments found for this driver');
        }
      } else {
        console.error('❌ Failed to fetch assignments:', response.status);
      }
    } catch (error) {
      console.error('❌ Error fetching assignments:', error);
      Alert.alert('Error', 'Unable to load assignments. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [driverName]);

  // Initial load and refresh handler
  useEffect(() => {
    fetchDriverAssignments();
  }, [fetchDriverAssignments]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDriverAssignments();
  }, [fetchDriverAssignments]);

  // Profile handler
  const handleProfile = () => {
    navigation.navigate('Profile');
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
          onPress: async () => {
            await AsyncStorage.removeItem('currentUsername');
            await AsyncStorage.removeItem('currentRole');
            navigation.navigate('LoginScreen');
          },
        },
      ]
    );
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'assigned': return '#4CAF50';
      case 'in-progress': return '#FF9800';
      case 'completed': return '#2196F3';
      case 'pending': return '#FFC107';
      default: return '#757575';
    }
  };

  // Render assignment card
  const renderAssignmentCard = ({ item, index }) => (
    <View style={styles.assignmentCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.unitId}>{item.unitId}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status || 'Assigned'}</Text>
        </View>
      </View>
      
      <View style={styles.cardBody}>
        <Text style={styles.vehicleInfo}>{item.unitName}</Text>
        <Text style={styles.vehicleDetails}>{item.bodyColor} • {item.variation}</Text>
        
        {item.location && (
          <View style={styles.locationInfo}>
            <Text style={styles.locationText}>📍 {item.location.address}</Text>
            <Text style={styles.coordsText}>
              {item.location.latitude?.toFixed(4)}, {item.location.longitude?.toFixed(4)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.cardFooter}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => setActiveTab('route')}
        >
          <Text style={styles.actionButtonText}>🗺️ View Route</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.primaryButton]}
          onPress={() => {
            Alert.alert('Assignment Details', `Vehicle: ${item.unitName}\nStatus: ${item.status}\nLocation: ${item.location?.address || 'Unknown'}`);
          }}
        >
          <Text style={[styles.actionButtonText, styles.primaryButtonText]}>📋 Details</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render assignments tab
  const renderAssignmentsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>My Assignments</Text>
        <Text style={styles.summaryCount}>{driverAllocations.length}</Text>
        <Text style={styles.summarySubtext}>
          {driverAllocations.length === 0 ? 'No assignments yet' : 'Active assignments'}
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ff1e1e" />
          <Text style={styles.loadingText}>Loading assignments...</Text>
        </View>
      ) : driverAllocations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No assignments found</Text>
          <Text style={styles.emptyText}>You don't have any vehicle assignments yet.</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
            <Text style={styles.refreshButtonText}>🔄 Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={driverAllocations}
          keyExtractor={(item, index) => `${item._id || item.unitId || index}`}
          renderItem={renderAssignmentCard}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );

  // Render route tab
  const renderRouteTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.routeHeader}>
        <Text style={styles.routeTitle}>My Route</Text>
        <Text style={styles.routeSubtext}>Driver: {driverName} • {driverAllocations.length} Assignments</Text>
      </View>

      {currentLocation && (
        <View style={styles.locationCard}>
          <Text style={styles.locationTitle}>📍 Your Current Location</Text>
          <Text style={styles.locationDetails}>
            {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
          </Text>
        </View>
      )}

      <ScrollView style={styles.destinationList}>
        {driverAllocations.map((allocation, index) => (
          <TouchableOpacity key={index} style={styles.destinationCard}>
            <View style={styles.destinationNumber}>
              <Text style={styles.destinationNumberText}>{index + 1}</Text>
            </View>
            <View style={styles.destinationInfo}>
              <Text style={styles.destinationTitle}>{allocation.unitId}</Text>
              <Text style={styles.destinationAddress}>
                🎯 {allocation.deliveryDestination?.address || 'Isuzu Pasig Dealership, Metro Manila'}
              </Text>
            </View>
            <Text style={styles.destinationArrow}>→</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  // Render map tab
  const renderMapTab = () => (
    <View style={styles.tabContent}>
      <RealTimeTrackingMapsView 
        userRole="Driver"
        userName={driverName}
        style={styles.fullMap}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#ff1e1e" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Driver Dashboard</Text>
          <Text style={styles.headerSubtitle}>Welcome, {driverName}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.profileButton} onPress={handleProfile}>
            <Text style={styles.profileText}>👤 Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'assignments' && styles.activeTab]}
          onPress={() => setActiveTab('assignments')}
        >
          <Text style={[styles.tabText, activeTab === 'assignments' && styles.activeTabText]}>
            📋 Assignments
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'route' && styles.activeTab]}
          onPress={() => setActiveTab('route')}
        >
          <Text style={[styles.tabText, activeTab === 'route' && styles.activeTabText]}>
            🗺️ My Route
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'map' && styles.activeTab]}
          onPress={() => setActiveTab('map')}
        >
          <Text style={[styles.tabText, activeTab === 'map' && styles.activeTabText]}>
            📍 Maps
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'assignments' && renderAssignmentsTab()}
      {activeTab === 'route' && renderRouteTab()}
      {activeTab === 'map' && renderMapTab()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    backgroundColor: '#ff1e1e',
    paddingHorizontal: 20,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#FFE5E5',
    fontSize: 14,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  profileButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  profileText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#ff1e1e',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#ff1e1e',
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  summaryCount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ff1e1e',
    marginBottom: 5,
  },
  summarySubtext: {
    fontSize: 14,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  refreshButton: {
    backgroundColor: '#ff1e1e',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 25,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  listContainer: {
    padding: 20,
  },
  assignmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  unitId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  cardBody: {
    marginBottom: 15,
  },
  vehicleInfo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  vehicleDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  locationInfo: {
    backgroundColor: '#F8F9FA',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    marginBottom: 2,
  },
  coordsText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#ff1e1e',
  },
  actionButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
  routeHeader: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E8EB',
  },
  routeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  routeSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  locationCard: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#ff1e1e',
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  locationDetails: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'monospace',
  },
  destinationList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  destinationCard: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  destinationNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ff1e1e',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  destinationNumberText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  destinationInfo: {
    flex: 1,
  },
  destinationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  destinationAddress: {
    fontSize: 14,
    color: '#666',
  },
  destinationArrow: {
    fontSize: 18,
    color: '#ff1e1e',
    fontWeight: 'bold',
  },
  fullMap: {
    flex: 1,
  },
});
