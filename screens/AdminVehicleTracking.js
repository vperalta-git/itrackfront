import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import UniformLoading from '../components/UniformLoading';
import { buildApiUrl } from '../constants/api';
import { useTheme } from '../context/ThemeContext';

export default function AdminVehicleTracking() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const fetchAllocations = async () => {
    setLoading(true);
    try {
      console.log('🔄 Fetching allocations from:', buildApiUrl('/getAllocation'));
      const res = await fetch(buildApiUrl('/getAllocation'));
      
      const responseText = await res.text();
      console.log('📋 Allocations response status:', res.status);
      
      if (!res.ok) {
        console.error('❌ Allocations fetch failed:', responseText);
        throw new Error(`HTTP ${res.status}: ${responseText}`);
      }
      
      let data;
      try {
        data = JSON.parse(responseText);
        console.log('✅ Allocations parsed successfully:', data.data?.length || 0, 'items');
      } catch (jsonError) {
        console.error('❌ JSON parse error for allocations:', jsonError);
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}`);
      }
      
      const withLocation = (data.data || []).filter((item) => item.unitId);
      setAllocations(withLocation);
      if (withLocation.length > 0 && !selectedVehicle) {
        setSelectedVehicle(withLocation[0]);
      }
    } catch (err) {
      console.error('Error fetching driver allocations:', err);
      Alert.alert('Error', 'Failed to fetch driver allocations: ' + err.message);
    }
    setLoading(false);
  };

  const fetchVehicleLocation = async (allocationId) => {
    try {
      console.log('📍 Fetching location for allocation:', allocationId);
      const res = await fetch(buildApiUrl(`/getAllocation/${allocationId}`));
      
      if (!res.ok) {
        console.warn('⚠️ Allocation location not found for:', allocationId);
        return null;
      }
      
      const allocation = await res.json();
      
      if (allocation.data?.location && allocation.data.location.latitude && allocation.data.location.longitude) {
        return {
          ...allocation.data,
          lat: allocation.data.location.latitude,
          lng: allocation.data.location.longitude,
        };
      } else {
        console.warn('⚠️ Invalid location data for allocation:', allocationId);
        return null;
      }
    } catch (error) {
      console.error('❌ Error fetching allocation location:', error);
      return null;
    }
  };

  const loadAllLocations = async () => {
    if (allocations.length === 0) {
      console.log('📍 No allocations to load locations for');
      return;
    }
    
    console.log('📍 Loading locations for', allocations.length, 'vehicles');
    
    try {
      const results = await Promise.all(
        allocations.map(async (a) => {
          if (!a._id) {
            console.warn('⚠️ Allocation missing _id:', a.unitName);
            return a; // Return allocation without location update
          }
          
          const loc = await fetchVehicleLocation(a._id);
          if (loc && loc.lat && loc.lng) {
            return {
              ...a,
              location: { latitude: loc.lat, longitude: loc.lng },
            };
          } else {
            console.warn('⚠️ No valid location for allocation:', a.unitName);
            return a; // Return allocation without location update
          }
        })
      );
      
      const validResults = results.filter(Boolean);
      console.log('📍 Successfully processed', validResults.length, 'allocations');
      setAllocations(validResults);
      
      if (validResults.length > 0 && !selectedVehicle) {
        setSelectedVehicle(validResults[0]);
      }
    } catch (error) {
      console.error('❌ Error loading vehicle locations:', error);
    }
  };

  useEffect(() => {
    fetchAllocations();
  }, []);

  useEffect(() => {
    if (allocations.length > 0) loadAllLocations();
  }, [allocations.length]); // Changed dependency to avoid infinite loop

  const handleRefresh = () => {
    setLoading(true);
    fetchAllocations();
  };

  const filteredAllocations = allocations.filter(item =>
    item.unitName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.assignedDriver?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.unitId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'in transit':
        return '#3B82F6'; // Blue
      case 'completed':
        return '#10B981'; // Green  
      case 'assigned':
        return '#F59E0B'; // Orange
      case 'pending':
        return '#EF4444'; // Red
      default:
        return '#6B7280'; // Gray
    }
  };

  const handleViewVehicle = (vehicle) => {
    setSelectedVehicle(vehicle);
    setIsViewModalOpen(true);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Vehicle Tracking</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh}>
          <Text style={styles.refreshText}>🔄 Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search vehicles, drivers, or unit IDs..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholderTextColor="#94a3b8"
        />
        {searchTerm ? (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setSearchTerm('')}
          >
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {loading ? (
        <UniformLoading 
          message="Loading vehicle tracking..." 
          size="large"
          style={{ flex: 1 }}
        />
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Statistics Cards */}
          <View style={styles.statsContainer}>
            <View style={[styles.statCard, { backgroundColor: '#e50914' }]}>
              <Text style={styles.statNumber}>{allocations.length}</Text>
              <Text style={styles.statLabel}>Total Vehicles</Text>
            </View>
            
            <View style={[styles.statCard, { backgroundColor: '#3B82F6' }]}>
              <Text style={styles.statNumber}>
                {allocations.filter(v => v.status === 'In Transit').length}
              </Text>
              <Text style={styles.statLabel}>In Transit</Text>
            </View>
            
            <View style={[styles.statCard, { backgroundColor: '#10B981' }]}>
              <Text style={styles.statNumber}>
                {allocations.filter(v => v.status === 'Completed').length}
              </Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            
            <View style={[styles.statCard, { backgroundColor: '#F59E0B' }]}>
              <Text style={styles.statNumber}>
                {allocations.filter(v => v.status === 'Assigned').length}
              </Text>
              <Text style={styles.statLabel}>Assigned</Text>
            </View>
          </View>

          {/* Vehicle Cards */}
          <Text style={styles.sectionTitle}>Driver Allocations ({filteredAllocations.length})</Text>
          
          {filteredAllocations.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchTerm ? 'No vehicles found matching your search' : 'No vehicles currently tracked'}
              </Text>
              <Text style={styles.emptySubtext}>
                {searchTerm ? 'Try adjusting your search terms' : 'Vehicles assigned to drivers will appear here'}
              </Text>
            </View>
          ) : (
            <View style={styles.vehicleCardsContainer}>
              {filteredAllocations.map((item) => (
                <TouchableOpacity
                  key={item._id}
                  style={styles.vehicleCard}
                  onPress={() => handleViewVehicle(item)}
                >
                  <View style={styles.vehicleCardHeader}>
                    <View style={styles.vehicleInfo}>
                      <Text style={styles.vehicleUnitName}>{item.unitName}</Text>
                      <Text style={styles.vehicleUnitId}>ID: {item.unitId}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                      <Text style={styles.statusText}>{item.status || 'Pending'}</Text>
                    </View>
                  </View>

                  <View style={styles.vehicleDetails}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Driver:</Text>
                      <Text style={styles.detailValue}>{item.assignedDriver}</Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Body Color:</Text>
                      <Text style={styles.detailValue}>{item.bodyColor}</Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Variation:</Text>
                      <Text style={styles.detailValue}>{item.variation}</Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Date:</Text>
                      <Text style={styles.detailValue}>
                        {new Date(item.date || item.createdAt || Date.now()).toLocaleDateString('en-CA')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.vehicleCardActions}>
                    <TouchableOpacity 
                      style={styles.viewButton}
                      onPress={() => handleViewVehicle(item)}
                    >
                      <Text style={styles.viewButtonText}>� View on Map</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* View Vehicle Modal */}
      <Modal visible={isViewModalOpen} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Vehicle Location</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setIsViewModalOpen(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedVehicle ? (
              <View style={styles.modalBody}>
                {/* Vehicle Info */}
                <View style={styles.vehicleInfoSection}>
                  <Text style={styles.modalVehicleName}>{selectedVehicle.unitName}</Text>
                  <Text style={styles.modalVehicleDriver}>Driver: {selectedVehicle.assignedDriver}</Text>
                  <Text style={styles.modalVehicleStatus}>Status: {selectedVehicle.status}</Text>
                </View>

                {/* Map */}
                <View style={styles.mapContainer}>
                  <MapView
                    provider={PROVIDER_DEFAULT}
                    style={styles.modalMap}
                    region={{
                      latitude: selectedVehicle.location?.latitude || 14.5791,
                      longitude: selectedVehicle.location?.longitude || 121.0655,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    }}
                    onMapReady={() => console.log('✅ Modal map loaded successfully')}
                    onError={(error) => console.error('❌ Modal map error:', error)}
                  >
                    {selectedVehicle.location && selectedVehicle.location.latitude && selectedVehicle.location.longitude && (
                      <Marker
                        coordinate={{
                          latitude: selectedVehicle.location.latitude,
                          longitude: selectedVehicle.location.longitude
                        }}
                        title={`${selectedVehicle.unitName} (${selectedVehicle.variation})`}
                        description={`Driver: ${selectedVehicle.assignedDriver}`}
                        pinColor="#e50914"
                      />
                    )}
                  </MapView>
                  
                  {!selectedVehicle.location && (
                    <View style={styles.noLocationContainer}>
                      <Text style={styles.noLocationText}>📍 Location not available</Text>
                      <Text style={styles.noLocationSubtext}>Waiting for GPS data...</Text>
                    </View>
                  )}
                </View>
              </View>
            ) : (
              <View style={styles.noDataContainer}>
                <Text style={styles.noDataText}>No vehicle data available</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (theme) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: theme.surface,
    paddingHorizontal: 16,
    paddingTop: 16
  },
  
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: theme.primary
  },
  
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.primary,
    flex: 1,
  },
  
  refreshBtn: {
    backgroundColor: theme.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  
  refreshText: {
    color: theme.buttonText,
    fontWeight: '600',
    fontSize: 14,
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 12,
    elevation: 2,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },

  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.text,
  },

  clearButton: {
    padding: 8,
  },

  clearButtonText: {
    fontSize: 16,
    color: theme.textTertiary,
    fontWeight: 'bold',
  },

  content: {
    flex: 1,
  },

  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },

  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },

  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.buttonText,
    marginBottom: 4,
  },

  statLabel: {
    fontSize: 12,
    color: theme.buttonText,
    textAlign: 'center',
    opacity: 0.9,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 16,
  },

  vehicleCardsContainer: {
    paddingBottom: 20,
  },

  vehicleCard: {
    backgroundColor: theme.card,
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    elevation: 3,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },

  vehicleCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },

  vehicleInfo: {
    flex: 1,
  },

  vehicleUnitName: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 4,
  },

  vehicleUnitId: {
    fontSize: 14,
    color: theme.textSecondary,
  },

  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },

  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  vehicleDetails: {
    marginBottom: 16,
  },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },

  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },

  detailValue: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '600',
  },

  vehicleCardActions: {
    flexDirection: 'row',
    justifyContent: 'center',
  },

  viewButton: {
    backgroundColor: '#e50914',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
  },

  viewButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.card,
    borderRadius: 12,
    marginTop: 20,
  },

  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 8,
    textAlign: 'center',
  },

  emptySubtext: {
    fontSize: 14,
    color: theme.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.modalOverlay,
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContent: {
    backgroundColor: theme.background,
    borderRadius: 16,
    margin: 20,
    maxHeight: '80%',
    minWidth: '90%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
  },

  closeButton: {
    padding: 8,
  },

  closeButtonText: {
    fontSize: 20,
    color: '#6B7280',
    fontWeight: 'bold',
  },

  modalBody: {
    padding: 20,
  },

  vehicleInfoSection: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },

  modalVehicleName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },

  modalVehicleDriver: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 4,
  },

  modalVehicleStatus: {
    fontSize: 16,
    color: '#6B7280',
  },

  mapContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    height: 300,
    position: 'relative',
  },

  modalMap: {
    flex: 1,
  },

  noLocationContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  noLocationText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },

  noLocationSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },

  noDataContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  noDataText: {
    fontSize: 16,
    color: '#6B7280',
  },
});
