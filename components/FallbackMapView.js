import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildApiUrl } from '../constants/api';

const FallbackMapView = ({ style, userRole = 'agent', agentFilter = null }) => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userInfo, setUserInfo] = useState({ name: '', role: '' });

  useEffect(() => {
    loadUserInfo();
  }, []);

  const loadUserInfo = async () => {
    try {
      const name = await AsyncStorage.getItem('accountName') || await AsyncStorage.getItem('userName') || 'Unknown User';
      const role = await AsyncStorage.getItem('role') || userRole;
      setUserInfo({ name, role });
      fetchVehicleData(name, role);
    } catch (error) {
      console.error('Error loading user info:', error);
      setUserInfo({ name: 'Unknown User', role: userRole });
      setMockData();
    }
  };

  const fetchVehicleData = async (name, role) => {
    try {
      setLoading(true);
      
      // Try to fetch real data
      const response = await fetch(buildApiUrl('/getAllocation'));
      
      if (response.ok) {
        const data = await response.json();
        const allocationsArray = data.data || data.allocation || data || [];
        
        // Filter based on user role
        let filteredVehicles = allocationsArray;
        if (role === 'agent' || agentFilter) {
          const targetAgent = agentFilter || name;
          filteredVehicles = allocationsArray.filter(allocation => 
            allocation.assignedAgent === targetAgent || 
            allocation.agent === targetAgent ||
            allocation.userName === targetAgent
          );
        }
        
        setVehicles(filteredVehicles);
      } else {
        throw new Error('Failed to fetch data');
      }
      
    } catch (error) {
      console.error('Fetch error:', error);
      setMockData();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const setMockData = () => {
    const mockVehicles = [
      {
        id: 'demo-1',
        vin: 'ISUZU-001',
        model: 'Isuzu D-Max',
        status: 'In Transit',
        agent: userInfo.name,
        location: 'Manila Bay Area',
        lastUpdate: new Date().toLocaleString(),
      },
      {
        id: 'demo-2',
        vin: 'ISUZU-002', 
        model: 'Isuzu MU-X',
        status: 'Available',
        agent: userInfo.name,
        location: 'Quezon City',
        lastUpdate: new Date().toLocaleString(),
      },
      {
        id: 'demo-3',
        vin: 'ISUZU-003',
        model: 'Isuzu NPR',
        status: 'Delivered',
        agent: userInfo.name,
        location: 'Makati CBD',
        lastUpdate: new Date().toLocaleString(),
      },
    ];
    
    setVehicles(userRole === 'agent' || agentFilter ? mockVehicles : mockVehicles.concat([
      {
        id: 'demo-4',
        vin: 'ISUZU-004',
        model: 'Isuzu FTR',
        status: 'Maintenance',
        agent: 'Agent Demo',
        location: 'Service Center',
        lastUpdate: new Date().toLocaleString(),
      }
    ]));
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchVehicleData(userInfo.name, userInfo.role);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'in transit':
      case 'active':
        return '#4CAF50';
      case 'available':
      case 'ready':
        return '#2196F3';
      case 'delivered':
      case 'completed':
        return '#9C27B0';
      case 'maintenance':
      case 'service':
        return '#FF9800';
      case 'out of service':
      case 'inactive':
        return '#F44336';
      default:
        return '#607D8B';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'in transit':
      case 'active':
        return '🚛';
      case 'available':
      case 'ready':
        return '✅';
      case 'delivered':
      case 'completed':
        return '📦';
      case 'maintenance':
      case 'service':
        return '🔧';
      case 'out of service':
      case 'inactive':
        return '❌';
      default:
        return '📍';
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#CB1E2A" />
        <Text style={styles.loadingText}>Loading Vehicle Data...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Vehicle Tracking</Text>
        <Text style={styles.headerSubtitle}>
          {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''} tracked
        </Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Text style={styles.refreshText}>🔄 Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Map Placeholder */}
      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapPlaceholderTitle}>🗺️ Interactive Map View</Text>
        <Text style={styles.mapPlaceholderSubtitle}>
          Map integration temporarily unavailable
        </Text>
        <Text style={styles.mapPlaceholderDesc}>
          Showing vehicle list below with location details
        </Text>
      </View>

      {/* Vehicle List */}
      <ScrollView 
        style={styles.vehicleList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.listTitle}>Vehicle Locations:</Text>
        
        {vehicles.map((vehicle, index) => (
          <TouchableOpacity
            key={vehicle.id || index}
            style={styles.vehicleCard}
            onPress={() => {
              Alert.alert(
                vehicle.vin || `Vehicle ${index + 1}`,
                `Model: ${vehicle.model || 'Unknown'}\nStatus: ${vehicle.status || 'Unknown'}\nAgent: ${vehicle.agent || 'Unassigned'}\nLocation: ${vehicle.location || 'Location not available'}\nLast Update: ${vehicle.lastUpdate || 'Unknown'}`
              );
            }}
          >
            <View style={styles.vehicleCardLeft}>
              <Text style={styles.vehicleIcon}>
                {getStatusIcon(vehicle.status)}
              </Text>
              <View style={styles.vehicleInfo}>
                <Text style={styles.vehicleVin}>
                  {vehicle.vin || `Vehicle ${index + 1}`}
                </Text>
                <Text style={styles.vehicleModel}>
                  {vehicle.model || 'Unknown Model'}
                </Text>
                <Text style={styles.vehicleAgent}>
                  Agent: {vehicle.agent || 'Unassigned'}
                </Text>
                <Text style={styles.vehicleLocation}>
                  📍 {vehicle.location || 'Location not available'}
                </Text>
              </View>
            </View>
            
            <View style={styles.vehicleCardRight}>
              <View style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(vehicle.status) }
              ]}>
                <Text style={styles.statusText}>
                  {vehicle.status || 'Unknown'}
                </Text>
              </View>
              <Text style={styles.lastUpdate}>
                {vehicle.lastUpdate || 'No data'}
              </Text>
            </View>
          </TouchableOpacity>
        ))}

        {vehicles.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No Vehicles Found</Text>
            <Text style={styles.emptyStateDesc}>
              No vehicle allocations found for your account.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D2D2D',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    marginLeft: 10,
  },
  refreshButton: {
    backgroundColor: '#CB1E2A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  refreshText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  mapPlaceholder: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    margin: 15,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  mapPlaceholderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D2D2D',
    marginBottom: 5,
  },
  mapPlaceholderSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  mapPlaceholderDesc: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  vehicleList: {
    flex: 1,
    paddingHorizontal: 15,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#2D2D2D',
  },
  vehicleCard: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    marginBottom: 10,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  vehicleCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  vehicleIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleVin: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D2D2D',
    marginBottom: 2,
  },
  vehicleModel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  vehicleAgent: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  vehicleLocation: {
    fontSize: 12,
    color: '#999',
  },
  vehicleCardRight: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 5,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  lastUpdate: {
    fontSize: 10,
    color: '#999',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  emptyStateDesc: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});

export default FallbackMapView;
