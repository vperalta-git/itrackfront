import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Dimensions
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { buildApiUrl } from '../constants/api';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

const TestDriveManagementScreen = ({ navigation }) => {
  const { isDarkMode, theme } = useTheme();
  
  // Vehicle Management States
  const [testDriveVehicles, setTestDriveVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [newVehicle, setNewVehicle] = useState({
    unitName: '',
    unitId: '',
    vehicleType: 'Light Commercial Vehicle',
    model: '',
    status: 'Available',
    notes: ''
  });

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [filteredVehicles, setFilteredVehicles] = useState([]);

  const statusOptions = [
    'All',
    'Available',
    'In Use',
    'Maintenance',
    'Reserved'
  ];

  const vehicleTypeOptions = [
    'Light Commercial Vehicle',
    'Heavy Commercial Vehicle',
    'Passenger Vehicle',
    'Special Purpose Vehicle'
  ];

  useEffect(() => {
    fetchTestDriveVehicles();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [testDriveVehicles, searchQuery, statusFilter]);

  const applyFilters = () => {
    let filtered = [...testDriveVehicles];
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(vehicle =>
        vehicle.unitName.toLowerCase().includes(query) ||
        vehicle.unitId.toLowerCase().includes(query) ||
        vehicle.model.toLowerCase().includes(query) ||
        vehicle.vehicleType.toLowerCase().includes(query)
      );
    }
    
    // Status filter
    if (statusFilter && statusFilter !== 'All') {
      filtered = filtered.filter(vehicle => vehicle.status === statusFilter);
    }
    
    setFilteredVehicles(filtered);
  };

  // ========== VEHICLE MANAGEMENT FUNCTIONS ==========

  const fetchTestDriveVehicles = async () => {
    setLoading(true);
    try {
      const response = await fetch(buildApiUrl('/api/testdrive-vehicles'));
      const result = await response.json();
      
      if (result.success) {
        setTestDriveVehicles(result.data);
        Toast.show({
          type: 'success',
          text1: 'Vehicles Loaded',
          text2: `Found ${result.data.length} test drive vehicles`
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error fetching test drive vehicles:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load test drive vehicles'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const saveTestDriveVehicle = async () => {
    try {
      if (!newVehicle.unitName || !newVehicle.unitId || !newVehicle.vehicleType || !newVehicle.model) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }

      const adminName = await AsyncStorage.getItem('accountName');
      const isEdit = newVehicle._id;
      
      const url = isEdit 
        ? buildApiUrl(`/api/testdrive-vehicles/${newVehicle._id}`)
        : buildApiUrl('/api/testdrive-vehicles');
      
      const method = isEdit ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newVehicle,
          addedBy: adminName || 'Admin',
          updatedBy: isEdit ? (adminName || 'Admin') : undefined
        })
      });

      const result = await response.json();
      
      if (result.success) {
        Toast.show({
          type: 'success',
          text1: isEdit ? 'Vehicle Updated' : 'Vehicle Added',
          text2: `Test drive vehicle ${isEdit ? 'updated' : 'added'} successfully`
        });
        
        resetVehicleForm();
        setShowAddVehicleModal(false);
        fetchTestDriveVehicles();
      } else {
        Alert.alert('Error', result.error || `Failed to ${isEdit ? 'update' : 'add'} vehicle`);
      }
    } catch (error) {
      console.error('Error saving test drive vehicle:', error);
      Alert.alert('Error', `Failed to ${newVehicle._id ? 'update' : 'add'} vehicle`);
    }
  };

  const resetVehicleForm = () => {
    setNewVehicle({
      unitName: '',
      unitId: '',
      vehicleType: 'Light Commercial Vehicle',
      model: '',
      status: 'Available',
      notes: ''
    });
  };

  const updateVehicleStatus = async (vehicleId, newStatus) => {
    try {
      const adminName = await AsyncStorage.getItem('accountName');
      
      const response = await fetch(buildApiUrl(`/api/testdrive-vehicles/${vehicleId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: newStatus,
          updatedBy: adminName || 'Admin'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        Toast.show({
          type: 'success',
          text1: 'Status Updated',
          text2: `Vehicle status updated to ${newStatus}`
        });
        fetchTestDriveVehicles();
      } else {
        Alert.alert('Error', result.error || 'Failed to update vehicle status');
      }
    } catch (error) {
      console.error('Error updating vehicle status:', error);
      Alert.alert('Error', 'Failed to update vehicle status');
    }
  };

  const deleteVehicle = async (vehicleId) => {
    try {
      Alert.alert(
        'Delete Vehicle',
        'Are you sure you want to delete this test drive vehicle?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              const response = await fetch(buildApiUrl(`/api/testdrive-vehicles/${vehicleId}`), {
                method: 'DELETE'
              });

              const result = await response.json();
              
              if (result.success) {
                Toast.show({
                  type: 'success',
                  text1: 'Vehicle Deleted',
                  text2: 'Test drive vehicle deleted successfully'
                });
                fetchTestDriveVehicles();
              } else {
                Alert.alert('Error', result.error || 'Failed to delete vehicle');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      Alert.alert('Error', 'Failed to delete vehicle');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'Available': '#4CAF50',
      'In Use': '#FF9800',
      'Maintenance': '#f44336',
      'Reserved': '#2196F3'
    };
    return colors[status] || '#9E9E9E';
  };

  const showStatusActionSheet = (vehicle) => {
    const options = statusOptions.filter(status => status !== 'All');
    
    Alert.alert(
      'Update Vehicle Status',
      `Current status: ${vehicle.status}`,
      options.map(status => ({
        text: status,
        onPress: () => {
          if (status !== vehicle.status) {
            updateVehicleStatus(vehicle._id, status);
          }
        }
      })).concat([{ text: 'Cancel', style: 'cancel' }])
    );
  };

  const renderVehicleCard = ({ item }) => {
    const styles = createStyles(theme);
    
    return (
      <View style={styles.vehicleCard}>
        <View style={styles.vehicleInfo}>
          <Text style={styles.vehicleName}>{item.unitName}</Text>
          <Text style={styles.vehicleId}>Unit ID: {item.unitId}</Text>
          <Text style={styles.vehicleType}>Type: {item.vehicleType}</Text>
          <Text style={styles.vehicleModel}>Model: {item.model}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
          {item.notes && (
            <Text style={styles.vehicleNotes}>Notes: {item.notes}</Text>
          )}
        </View>
        <View style={styles.vehicleActions}>
          <TouchableOpacity
            style={styles.editVehicleButton}
            onPress={() => {
              setNewVehicle(item);
              setShowAddVehicleModal(true);
            }}
          >
            <Text style={styles.editVehicleButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.statusButton}
            onPress={() => showStatusActionSheet(item)}
          >
            <Text style={styles.statusButtonText}>Status</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => deleteVehicle(item._id)}
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const getVehicleStats = () => {
    const total = testDriveVehicles.length;
    const available = testDriveVehicles.filter(v => v.status === 'Available').length;
    const inUse = testDriveVehicles.filter(v => v.status === 'In Use').length;
    const maintenance = testDriveVehicles.filter(v => v.status === 'Maintenance').length;
    const reserved = testDriveVehicles.filter(v => v.status === 'Reserved').length;
    
    return { total, available, inUse, maintenance, reserved };
  };

  const styles = createStyles(theme);
  const vehicleStats = getVehicleStats();

  return (
    <View style={styles.container}>
      {/* Header with Title and Add Button */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Test Drive Vehicle Management</Text>
        <TouchableOpacity
          style={styles.addVehicleButton}
          onPress={() => {
            resetVehicleForm();
            setShowAddVehicleModal(true);
          }}
        >
          <Text style={styles.addVehicleButtonText}>+ Add Vehicle</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Header */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{vehicleStats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{vehicleStats.available}</Text>
          <Text style={styles.statLabel}>Available</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{vehicleStats.inUse}</Text>
          <Text style={styles.statLabel}>In Use</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{vehicleStats.maintenance}</Text>
          <Text style={styles.statLabel}>Maintenance</Text>
        </View>
      </View>
      
      {/* Search and Filter */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, ID, model, or type..."
          placeholderTextColor={theme.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <Picker
          selectedValue={statusFilter}
          onValueChange={setStatusFilter}
          style={styles.filterPicker}
        >
          {statusOptions.map((status) => (
            <Picker.Item key={status} label={status} value={status} />
          ))}
        </Picker>
      </View>
      
      {/* Vehicles List */}
      <FlatList
        data={filteredVehicles}
        keyExtractor={(item) => item._id || item.unitId}
        renderItem={renderVehicleCard}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={fetchTestDriveVehicles}
            tintColor={theme.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {loading ? 'Loading vehicles...' : 'No test drive vehicles found'}
            </Text>
            {!loading && (
              <TouchableOpacity
                style={styles.addFirstVehicleButton}
                onPress={() => {
                  resetVehicleForm();
                  setShowAddVehicleModal(true);
                }}
              >
                <Text style={styles.addFirstVehicleButtonText}>Add First Vehicle</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        contentContainerStyle={styles.listContainer}
      />
      
      {/* Add Vehicle Modal */}
      <Modal
        visible={showAddVehicleModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddVehicleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.addVehicleModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {newVehicle.unitId ? 'Edit Vehicle' : 'Add Test Drive Vehicle'}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setShowAddVehicleModal(false);
                  resetVehicleForm();
                }}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Vehicle Name</Text>
                <TextInput
                  style={styles.input}
                  value={newVehicle.unitName}
                  onChangeText={(text) => setNewVehicle({...newVehicle, unitName: text})}
                  placeholder="Enter vehicle name"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Unit ID</Text>
                <TextInput
                  style={styles.input}
                  value={newVehicle.unitId}
                  onChangeText={(text) => setNewVehicle({...newVehicle, unitId: text})}
                  placeholder="Enter unit ID"
                  editable={!newVehicle._id} // Disable editing for existing vehicles
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Vehicle Type</Text>
                <Picker
                  selectedValue={newVehicle.vehicleType}
                  onValueChange={(value) => setNewVehicle({...newVehicle, vehicleType: value})}
                  style={styles.picker}
                >
                  <Picker.Item label="Light Commercial Vehicle" value="Light Commercial Vehicle" />
                  <Picker.Item label="Heavy Commercial Vehicle" value="Heavy Commercial Vehicle" />
                  <Picker.Item label="Passenger Vehicle" value="Passenger Vehicle" />
                  <Picker.Item label="Special Purpose Vehicle" value="Special Purpose Vehicle" />
                </Picker>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Model</Text>
                <TextInput
                  style={styles.input}
                  value={newVehicle.model}
                  onChangeText={(text) => setNewVehicle({...newVehicle, model: text})}
                  placeholder="Enter vehicle model"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Status</Text>
                <Picker
                  selectedValue={newVehicle.status}
                  onValueChange={(value) => setNewVehicle({...newVehicle, status: value})}
                  style={styles.picker}
                >
                  <Picker.Item label="Available" value="Available" />
                  <Picker.Item label="In Use" value="In Use" />
                  <Picker.Item label="Maintenance" value="Maintenance" />
                </Picker>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={newVehicle.notes}
                  onChangeText={(text) => setNewVehicle({...newVehicle, notes: text})}
                  placeholder="Enter any additional notes"
                  multiline={true}
                  numberOfLines={3}
                />
              </View>
            </ScrollView>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowAddVehicleModal(false);
                  resetVehicleForm();
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.saveButton}
                onPress={saveTestDriveVehicle}
              >
                <Text style={styles.saveButtonText}>
                  {newVehicle._id ? 'Update' : 'Add'} Vehicle
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.textPrimary,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: theme.surface,
    padding: 15,
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  
  statCard: {
    alignItems: 'center',
  },
  
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.primary,
  },
  
  statLabel: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 2,
  },
  
  searchContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: theme.surface,
    alignItems: 'center',
    gap: 10,
  },
  
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: theme.background,
    color: theme.textPrimary,
  },
  
  filterPicker: {
    width: 120,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    backgroundColor: theme.background,
  },
  listContainer: {
    paddingBottom: 20,
  },
  vehicleCard: {
    backgroundColor: theme.surface,
    margin: 10,
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  
  vehicleInfo: {
    flex: 1,
    marginRight: 10,
  },
  
  vehicleName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.textPrimary,
    marginBottom: 5,
  },
  
  vehicleId: {
    fontSize: 14,
    color: theme.textSecondary,
    marginBottom: 3,
  },
  
  vehicleType: {
    fontSize: 14,
    color: theme.textSecondary,
    marginBottom: 3,
  },
  
  vehicleModel: {
    fontSize: 14,
    color: theme.textSecondary,
    marginBottom: 8,
  },
  
  vehicleNotes: {
    fontSize: 12,
    color: theme.textSecondary,
    fontStyle: 'italic',
    marginTop: 5,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 15,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  vehicleActions: {
    alignItems: 'center',
    gap: 8,
  },
  
  editVehicleButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 5,
  },
  
  editVehicleButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  statusButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 5,
  },
  
  statusButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  deleteButton: {
    backgroundColor: '#f44336',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 5,
  },
  
  deleteButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  addVehicleButton: {
    backgroundColor: theme.primary,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  
  addVehicleButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  
  emptyText: {
    fontSize: 16,
    color: theme.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  
  addFirstVehicleButton: {
    backgroundColor: theme.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  
  addFirstVehicleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Add Vehicle Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  addVehicleModal: {
    backgroundColor: theme.surface,
    margin: 20,
    marginTop: 50,
    borderRadius: 10,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: theme.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: theme.primary,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  closeButtonText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  
  modalContent: {
    padding: 20,
    maxHeight: 400,
  },
  
  inputGroup: {
    marginBottom: 15,
  },
  
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.textPrimary,
    marginBottom: 5,
  },
  
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: theme.background,
    color: theme.textPrimary,
  },
  
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  
  picker: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    backgroundColor: theme.background,
    color: theme.textPrimary,
  },
  
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  
  cancelButton: {
    flex: 1,
    backgroundColor: theme.textSecondary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 10,
  },
  
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  saveButton: {
    flex: 1,
    backgroundColor: theme.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 10,
  },
  
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default TestDriveManagementScreen;
