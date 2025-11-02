import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { buildApiUrl } from '../constants/api';
import UniformLoading from './UniformLoading';
import AdminMapsView from './AdminMapsView';

const VehicleListView = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showMapModal, setShowMapModal] = useState(false);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      console.log('🚛 Fetching vehicle list...');
      const response = await fetch(buildApiUrl('/getAllocation'));
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Vehicle data received:', data.length, 'records');
        setVehicles(data);
      } else {
        console.error('❌ Failed to fetch vehicles:', response.status);
        Alert.alert('Error', 'Failed to load vehicle data');
      }
    } catch (error) {
      console.error('❌ Error fetching vehicles:', error);
      Alert.alert('Error', 'Network error while loading vehicles');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchVehicles();
  };

  const handleViewMap = (vehicle) => {
    console.log('🗺️ Opening map for vehicle:', vehicle.unitName);
    setSelectedVehicle(vehicle);
    setShowMapModal(true);
  };

  const handleAllocateDriver = (vehicle) => {
    Alert.alert('Allocate Driver', `Allocating driver to ${vehicle.unitName}...`);
    // TODO: Navigate to driver allocation screen
  };

  const handleEditVehicle = (vehicle) => {
    Alert.alert('Edit Vehicle', `Editing ${vehicle.unitName}...`);
    // TODO: Navigate to edit screen
  };

  const handleDeleteVehicle = (vehicle) => {
    Alert.alert(
      'Delete Vehicle',
      `Are you sure you want to delete ${vehicle.unitName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteVehicle(vehicle) }
      ]
    );
  };

  const deleteVehicle = async (vehicle) => {
    try {
      const response = await fetch(buildApiUrl(`/deleteAllocation/${vehicle._id}`), {
        method: 'DELETE',
      });
      
      if (response.ok) {
        Alert.alert('Success', 'Vehicle deleted successfully');
        fetchVehicles();
      } else {
        Alert.alert('Error', 'Failed to delete vehicle');
      }
    } catch (error) {
      console.error('❌ Error deleting vehicle:', error);
      Alert.alert('Error', 'Network error while deleting vehicle');
    }
  };

  const filteredVehicles = vehicles.filter(vehicle =>
    vehicle.unitName?.toLowerCase().includes(searchText.toLowerCase()) ||
    vehicle.conductionNumber?.toLowerCase().includes(searchText.toLowerCase()) ||
    vehicle.assignedDriverName?.toLowerCase().includes(searchText.toLowerCase())
  );

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'assigned':
        return '#28a745';
      case 'available':
        return '#007bff';
      case 'in-transit':
        return '#ffc107';
      case 'maintenance':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <UniformLoading
        message="Loading vehicle fleet..."
        size="large"
        backgroundColor="#f8f9fa"
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Vehicle Fleet Management</Text>
        <TouchableOpacity 
          style={styles.allocateButton}
          onPress={handleAllocateDriver}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.allocateButtonText}>Allocate Driver</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search vehicles, drivers, or conduction numbers..."
          value={searchText}
          onChangeText={setSearchText}
          placeholderTextColor="#666"
        />
      </View>

      {/* Vehicle List */}
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#007bff']}
          />
        }
      >
        {/* Table Header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.headerText, styles.dateColumn]}>DATE</Text>
          <Text style={[styles.headerText, styles.unitColumn]}>UNIT NAME</Text>
          <Text style={[styles.headerText, styles.conductionColumn]}>CONDUCTION NUMBER</Text>
          <Text style={[styles.headerText, styles.colorColumn]}>BODY COLOR</Text>
          <Text style={[styles.headerText, styles.driverColumn]}>ASSIGNED DRIVER</Text>
          <Text style={[styles.headerText, styles.statusColumn]}>STATUS</Text>
          <Text style={[styles.headerText, styles.actionColumn]}>ACTION</Text>
        </View>

        {/* Vehicle Rows */}
        {filteredVehicles.map((vehicle, index) => (
          <View key={vehicle._id || index} style={styles.tableRow}>
            <Text style={[styles.cellText, styles.dateColumn]}>
              {formatDate(vehicle.dateAssigned || vehicle.createdAt)}
            </Text>
            <Text style={[styles.cellText, styles.unitColumn]}>
              {vehicle.unitName || 'N/A'}
            </Text>
            <Text style={[styles.cellText, styles.conductionColumn]}>
              {vehicle.conductionNumber || 'N/A'}
            </Text>
            <Text style={[styles.cellText, styles.colorColumn]}>
              {vehicle.bodyColor || 'N/A'}
            </Text>
            <Text style={[styles.cellText, styles.driverColumn]}>
              {vehicle.assignedDriverName || 'Unassigned'}
            </Text>
            <View style={[styles.statusContainer, styles.statusColumn]}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(vehicle.status) }]}>
                <Text style={styles.statusText}>
                  {vehicle.status || 'Unknown'}
                </Text>
              </View>
            </View>
            <View style={[styles.actionColumn, styles.actionContainer]}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => handleViewMap(vehicle)}
              >
                <Ionicons name="map" size={16} color="#007bff" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => handleEditVehicle(vehicle)}
              >
                <Ionicons name="create" size={16} color="#28a745" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => handleDeleteVehicle(vehicle)}
              >
                <Ionicons name="trash" size={16} color="#dc3545" />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {filteredVehicles.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="car" size={48} color="#ccc" />
            <Text style={styles.emptyText}>
              {searchText ? 'No vehicles match your search' : 'No vehicles found'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Map Modal */}
      <Modal
        visible={showMapModal}
        animationType="slide"
        onRequestClose={() => setShowMapModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Vehicle Tracking - {selectedVehicle?.unitName}
            </Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowMapModal(false)}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          {selectedVehicle && (
            <View style={styles.vehicleInfo}>
              <Text style={styles.vehicleInfoText}>
                Driver: {selectedVehicle.assignedDriverName || 'Unassigned'}
              </Text>
              <Text style={styles.vehicleInfoText}>
                Status: {selectedVehicle.status || 'Unknown'}
              </Text>
            </View>
          )}
          
          <AdminMapsView selectedVehicle={selectedVehicle} />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  allocateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dc3545',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  allocateButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  scrollView: {
    flex: 1,
    marginHorizontal: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderBottomWidth: 2,
  },
  tableRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e9ecef',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  cellText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  dateColumn: { flex: 1.2 },
  unitColumn: { flex: 1.5 },
  conductionColumn: { flex: 1.5 },
  colorColumn: { flex: 1 },
  driverColumn: { flex: 1.5 },
  statusColumn: { flex: 1.2 },
  actionColumn: { flex: 1.5 },
  
  statusContainer: {
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 60,
    alignItems: 'center',
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  actionButton: {
    padding: 6,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: '#fff',
    margin: 8,
    borderRadius: 8,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  vehicleInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 12,
    backgroundColor: '#e3f2fd',
  },
  vehicleInfoText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
});

export default VehicleListView;
