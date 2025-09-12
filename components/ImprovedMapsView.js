import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildApiUrl } from '../constants/api';

const ImprovedMapsView = ({ style, userRole = 'agent', agentFilter = null }) => {
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [userInfo, setUserInfo] = useState({ name: '', role: '' });
  const [mapRegion, setMapRegion] = useState({
    latitude: 14.5995,
    longitude: 120.9842,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  // Load user info
  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const name = await AsyncStorage.getItem('accountName') || await AsyncStorage.getItem('userName') || 'Unknown User';
        const role = await AsyncStorage.getItem('role') || userRole;
        setUserInfo({ name, role });
      } catch (error) {
        console.error('Error loading user info:', error);
        setUserInfo({ name: 'Unknown User', role: userRole });
      }
    };
    loadUserInfo();
  }, [userRole]);

  // Fetch allocations with better error handling
  const fetchAllocations = async () => {
    try {
      setLoading(true);
      console.log('🗺️ Fetching allocations for:', userInfo.name, userInfo.role);

      const response = await fetch(buildApiUrl('/getAllocation'));
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseText = await response.text();
      
      if (!responseText || !responseText.trim()) {
        console.log('📍 Maps: Empty response, using mock data for demonstration');
        setAllocations(getMockAllocations());
        return;
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON Parse error:', parseError);
        setAllocations(getMockAllocations());
        return;
      }

      const allocationsArray = data.data || data.allocation || data || [];
      
      // Filter based on user role and agent filter
      let filteredAllocations = allocationsArray;
      
      if (userRole === 'agent' || agentFilter) {
        const targetAgent = agentFilter || userInfo.name;
        filteredAllocations = allocationsArray.filter(allocation => 
          allocation.assignedAgent === targetAgent || 
          allocation.agent === targetAgent ||
          allocation.userName === targetAgent
        );
      }

      // Add coordinates if missing and ensure valid data
      const processedAllocations = filteredAllocations.map((allocation, index) => ({
        ...allocation,
        id: allocation._id || allocation.id || `allocation-${index}`,
        coordinates: allocation.coordinates || generateRandomCoordinates(),
        title: allocation.vin || allocation.vehicleId || `Vehicle ${index + 1}`,
        description: `${allocation.model || 'Unknown Model'} - ${allocation.status || 'Unknown Status'}`,
        agent: allocation.assignedAgent || allocation.agent || allocation.userName || 'Unassigned',
        status: allocation.status || 'Unknown',
      }));

      setAllocations(processedAllocations);
      console.log(`✅ Maps: Loaded ${processedAllocations.length} allocations`);

      // Center map on first allocation if available
      if (processedAllocations.length > 0 && processedAllocations[0].coordinates) {
        const firstLocation = processedAllocations[0].coordinates;
        setMapRegion({
          latitude: firstLocation.latitude,
          longitude: firstLocation.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        });
      }

    } catch (error) {
      console.error('❌ Maps: Fetch error:', error);
      Alert.alert('Map Error', 'Using demo locations. Check your internet connection.');
      setAllocations(getMockAllocations());
    } finally {
      setLoading(false);
    }
  };

  // Generate mock allocations for demo/fallback
  const getMockAllocations = () => {
    const mockData = [
      {
        id: 'demo-1',
        title: 'ISUZU-001',
        description: 'Isuzu D-Max - In Transit',
        agent: userInfo.name,
        status: 'In Transit',
        coordinates: { latitude: 14.6042, longitude: 121.0711 },
      },
      {
        id: 'demo-2', 
        title: 'ISUZU-002',
        description: 'Isuzu MU-X - Available',
        agent: userInfo.name,
        status: 'Available',
        coordinates: { latitude: 14.5995, longitude: 120.9842 },
      },
      {
        id: 'demo-3',
        title: 'ISUZU-003', 
        description: 'Isuzu NPR - Delivered',
        agent: userInfo.name,
        status: 'Delivered',
        coordinates: { latitude: 14.5764, longitude: 121.0851 },
      },
    ];
    
    return userRole === 'agent' || agentFilter ? mockData : mockData.concat([
      {
        id: 'demo-4',
        title: 'ISUZU-004',
        description: 'Isuzu FTR - Maintenance',
        agent: 'Agent Demo',
        status: 'Maintenance',
        coordinates: { latitude: 14.6129, longitude: 121.0437 },
      }
    ]);
  };

  // Generate random coordinates around Manila area
  const generateRandomCoordinates = () => ({
    latitude: 14.5995 + (Math.random() - 0.5) * 0.1,
    longitude: 120.9842 + (Math.random() - 0.5) * 0.1,
  });

  // Get marker color based on status
  const getMarkerColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'in transit': 
      case 'active':
        return '#4CAF50'; // Green
      case 'available':
      case 'ready':
        return '#2196F3'; // Blue
      case 'delivered':
      case 'completed':
        return '#9C27B0'; // Purple
      case 'maintenance':
      case 'service':
        return '#FF9800'; // Orange
      case 'out of service':
      case 'inactive':
        return '#F44336'; // Red
      default:
        return '#607D8B'; // Blue Grey
    }
  };

  // Fetch data on component mount and user info change
  useEffect(() => {
    if (userInfo.name && userInfo.name !== 'Unknown User') {
      fetchAllocations();
    }
  }, [userInfo, agentFilter]);

  const renderMarkers = () => {
    return allocations.map((allocation) => {
      if (!allocation.coordinates) return null;
      
      return (
        <Marker
          key={allocation.id}
          coordinate={allocation.coordinates}
          title={allocation.title}
          description={allocation.description}
          pinColor={getMarkerColor(allocation.status)}
          onPress={() => setSelectedMarker(allocation)}
        >
          <View style={[styles.customMarker, { backgroundColor: getMarkerColor(allocation.status) }]}>
            <Text style={styles.markerText}>🚛</Text>
          </View>
        </Marker>
      );
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#CB1E2A" />
        <Text style={styles.loadingText}>Loading Map...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Map Header */}
      <View style={styles.mapHeader}>
        <Text style={styles.mapTitle}>Vehicle Locations</Text>
        <Text style={styles.mapSubtitle}>
          {allocations.length} vehicle{allocations.length !== 1 ? 's' : ''} tracked
        </Text>
        <TouchableOpacity onPress={fetchAllocations} style={styles.refreshButton}>
          <Text style={styles.refreshText}>🔄 Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Map View */}
      <MapView
        style={styles.map}
        provider={PROVIDER_DEFAULT} // Use default provider (works on both iOS and Android)
        region={mapRegion}
        onRegionChangeComplete={setMapRegion}
        onMapReady={() => setMapReady(true)}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        showsScale={true}
      >
        {mapReady && renderMarkers()}
      </MapView>

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Status Legend:</Text>
        <View style={styles.legendItems}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.legendText}>In Transit</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#2196F3' }]} />
            <Text style={styles.legendText}>Available</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#9C27B0' }]} />
            <Text style={styles.legendText}>Delivered</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FF9800' }]} />
            <Text style={styles.legendText}>Maintenance</Text>
          </View>
        </View>
      </View>

      {/* Marker Details Modal */}
      {selectedMarker && (
        <Modal
          visible={!!selectedMarker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setSelectedMarker(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{selectedMarker.title}</Text>
              <Text style={styles.modalDescription}>{selectedMarker.description}</Text>
              <Text style={styles.modalAgent}>Agent: {selectedMarker.agent}</Text>
              <Text style={styles.modalStatus}>Status: {selectedMarker.status}</Text>
              <TouchableOpacity
                onPress={() => setSelectedMarker(null)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
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
  mapHeader: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D2D2D',
  },
  mapSubtitle: {
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
  map: {
    flex: 1,
  },
  customMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  markerText: {
    fontSize: 16,
  },
  legend: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#2D2D2D',
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 5,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#2D2D2D',
  },
  modalDescription: {
    fontSize: 14,
    marginBottom: 8,
    color: '#666',
  },
  modalAgent: {
    fontSize: 14,
    marginBottom: 8,
    color: '#666',
  },
  modalStatus: {
    fontSize: 14,
    marginBottom: 15,
    fontWeight: '600',
    color: '#CB1E2A',
  },
  modalCloseButton: {
    backgroundColor: '#CB1E2A',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ImprovedMapsView;
