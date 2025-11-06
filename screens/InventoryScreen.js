import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  ScrollView,
  Dimensions,
  Image,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildApiUrl } from '../constants/api';
import UniformLoading from '../components/UniformLoading';
import Colors from '../constants/Colors';
import EnhancedVehicleForm from '../components/EnhancedVehicleForm';
import { getUnitNames, getVariationsForUnit, VEHICLE_STATUS_OPTIONS } from '../constants/VehicleModels';
import { useVehicleModels } from '../hooks/useVehicleModels';

const { width } = Dimensions.get('window');

export default function InventoryScreen() {
  // Vehicle Models Hook
  const {
    unitNames,
    getVariationsForUnit: getVariationsFromHook,
    validateUnitVariationPair,
    loading: vehicleModelsLoading,
    error: vehicleModelsError,
    refreshData: refreshVehicleModels
  } = useVehicleModels();

  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [editingVehicle, setEditingVehicle] = useState(null);

  // Fetch vehicles from inventory
  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(buildApiUrl('/getInventory'));
      const data = await response.json();
      
      if (data.success) {
        setVehicles(data.data || []);
      } else {
        console.warn('Failed to fetch inventory:', data.message);
        setVehicles([]);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
      Alert.alert('Error', 'Failed to load inventory data');
      setVehicles([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  // Filter and search vehicles
  const getFilteredVehicles = () => {
    let filtered = vehicles;

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(vehicle => 
        vehicle.status?.toLowerCase() === filterStatus.toLowerCase()
      );
    }

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(vehicle => 
        vehicle.unitName?.toLowerCase().includes(searchLower) ||
        vehicle.unitId?.toLowerCase().includes(searchLower) ||
        vehicle.bodyColor?.toLowerCase().includes(searchLower) ||
        vehicle.variation?.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  };

  // Add new vehicle to inventory
  const handleAddVehicle = async (vehicleData) => {
    if (!vehicleData.unitName || !vehicleData.variation || !vehicleData.conductionNumber) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    // Validate unit-variation pair
    try {
      const isValid = await validateUnitVariationPair(vehicleData.unitName, vehicleData.variation);
      if (!isValid) {
        Alert.alert(
          'Invalid Combination', 
          `The variation "${vehicleData.variation}" is not available for "${vehicleData.unitName}". Please select a valid combination.`
        );
        return;
      }
    } catch (error) {
      console.error('Validation error:', error);
      Alert.alert('Error', 'Failed to validate unit-variation combination');
      return;
    }

    try {
      const response = await fetch(buildApiUrl('/addToInventory'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...vehicleData,
          addedBy: await AsyncStorage.getItem('accountName') || 'System',
          dateAdded: new Date().toISOString()
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        Alert.alert('Success', 'Vehicle added to inventory successfully');
        fetchVehicles(); // Refresh the list
        setShowAddModal(false);
      } else {
        Alert.alert('Error', data.message || 'Failed to add vehicle');
      }
    } catch (error) {
      console.error('Error adding vehicle:', error);
      Alert.alert('Error', 'Failed to add vehicle to inventory');
    }
  };

  // Update existing vehicle
  const handleUpdateVehicle = async (vehicleData) => {
    if (!selectedVehicle) return;

    // Validate unit-variation pair if either has changed
    if (vehicleData.unitName && vehicleData.variation) {
      try {
        const isValid = await validateUnitVariationPair(vehicleData.unitName, vehicleData.variation);
        if (!isValid) {
          Alert.alert(
            'Invalid Combination', 
            `The variation "${vehicleData.variation}" is not available for "${vehicleData.unitName}". Please select a valid combination.`
          );
          return;
        }
      } catch (error) {
        console.error('Validation error:', error);
        Alert.alert('Error', 'Failed to validate unit-variation combination');
        return;
      }
    }

    try {
      const response = await fetch(buildApiUrl(`/updateInventoryItem/${selectedVehicle._id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...vehicleData,
          lastUpdatedBy: await AsyncStorage.getItem('accountName') || 'System',
          dateUpdated: new Date().toISOString()
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        Alert.alert('Success', 'Vehicle updated successfully');
        fetchVehicles(); // Refresh the list
        setShowEditModal(false);
        setSelectedVehicle(null);
      } else {
        Alert.alert('Error', data.message || 'Failed to update vehicle');
      }
    } catch (error) {
      console.error('Error updating vehicle:', error);
      Alert.alert('Error', 'Failed to update vehicle');
    }
  };

  // Update vehicle status
  const updateVehicleStatus = async (vehicleId, newStatus) => {
    try {
      const response = await fetch(buildApiUrl(`/updateInventoryItem/${vehicleId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          lastUpdatedBy: await AsyncStorage.getItem('accountName') || 'System'
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        Alert.alert('Success', `Vehicle status updated to ${newStatus}`);
        fetchVehicles();
      } else {
        Alert.alert('Error', data.message || 'Failed to update vehicle');
      }
    } catch (error) {
      console.error('Error updating vehicle:', error);
      Alert.alert('Error', 'Failed to update vehicle status');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchVehicles(),
      refreshVehicleModels()
    ]);
  };

  // Render vehicle item
  const renderVehicleItem = ({ item }) => (
    <TouchableOpacity
      style={styles.vehicleCard}
      onPress={() => setSelectedVehicle(item)}
    >
      <View style={styles.vehicleHeader}>
        <View style={styles.vehicleInfo}>
          <Text style={styles.vehicleName}>{item.unitName}</Text>
          <Text style={styles.vehicleId}>ID: {item.unitId}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      
      <View style={styles.vehicleDetails}>
        <View style={styles.detailRow}>
          <MaterialIcons name="build" size={16} color="#666" />
          <Text style={styles.detailText}>Variation: {item.variation || 'Standard'}</Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialIcons name="palette" size={16} color="#666" />
          <Text style={styles.detailText}>Color: {item.bodyColor || 'N/A'}</Text>
        </View>
        {item.conductionNumber && (
          <View style={styles.detailRow}>
            <MaterialIcons name="confirmation-number" size={16} color="#666" />
            <Text style={styles.detailText}>Conduction: {item.conductionNumber}</Text>
          </View>
        )}
        {item.engineNumber && (
          <View style={styles.detailRow}>
            <MaterialIcons name="settings" size={16} color="#666" />
            <Text style={styles.detailText}>Engine: {item.engineNumber}</Text>
          </View>
        )}
        {item.addedDate && (
          <View style={styles.detailRow}>
            <MaterialIcons name="schedule" size={16} color="#666" />
            <Text style={styles.detailText}>
              Added: {new Date(item.addedDate).toLocaleDateString()}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.editBtn]}
          onPress={() => {
            setEditingVehicle(item);
            setShowEditModal(true);
          }}
        >
          <MaterialIcons name="edit" size={16} color="#007AFF" />
          <Text style={styles.actionBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.editBtn]}
          onPress={() => {
            Alert.alert(
              'Update Status',
              'Choose new status:',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'In Stock', onPress: () => updateVehicleStatus(item._id, 'In Stock') },
                { text: 'Allocated', onPress: () => updateVehicleStatus(item._id, 'Allocated') },
                { text: 'In Process', onPress: () => updateVehicleStatus(item._id, 'In Process') },
                { text: 'Released', onPress: () => updateVehicleStatus(item._id, 'Released') },
              ]
            );
          }}
        >
          <MaterialIcons name="update" size={16} color="#007AFF" />
          <Text style={styles.actionBtnText}>Status</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'in stock': return '#28a745';
      case 'allocated': return '#ffc107';
      case 'in process': return '#007bff';
      case 'released': return '#6c757d';
      default: return '#666';
    }
  };

  // Filter buttons
  const FilterButton = ({ title, value, active }) => (
    <TouchableOpacity
      style={[styles.filterBtn, active && styles.filterBtnActive]}
      onPress={() => setFilterStatus(value)}
    >
      <Text style={[styles.filterBtnText, active && styles.filterBtnTextActive]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Vehicle Stocks</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <MaterialIcons name="add" size={24} color="#fff" />
          <Text style={styles.addButtonText}>Add Vehicle</Text>
        </TouchableOpacity>
      </View>

      {/* Search and Filters */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search vehicles..."
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
        <FilterButton title="All" value="all" active={filterStatus === 'all'} />
        <FilterButton title="In Stock" value="in stock" active={filterStatus === 'in stock'} />
        <FilterButton title="Allocated" value="allocated" active={filterStatus === 'allocated'} />
        <FilterButton title="In Process" value="in process" active={filterStatus === 'in process'} />
        <FilterButton title="Released" value="released" active={filterStatus === 'released'} />
      </ScrollView>

      {/* Vehicle List */}
      {loading ? (
        <UniformLoading message="Loading inventory..." />
      ) : (
        <FlatList
          data={getFilteredVehicles()}
          keyExtractor={(item) => item._id || item.unitId}
          renderItem={renderVehicleItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="inventory" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No vehicles found</Text>
              <Text style={styles.emptySubtext}>
                {searchTerm || filterStatus !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Add vehicles to start managing your inventory'
                }
              </Text>
            </View>
          }
        />
      )}

      {/* Enhanced Vehicle Form Modal */}
      {showAddModal && (
        <EnhancedVehicleForm
          visible={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddVehicle}
          mode="add"
          unitNames={unitNames}
          getVariationsForUnit={getVariationsFromHook}
          validateUnitVariationPair={validateUnitVariationPair}
          vehicleModelsLoading={vehicleModelsLoading}
          vehicleModelsError={vehicleModelsError}
        />
      )}

      {/* Enhanced Edit Vehicle Form Modal */}
      {showEditModal && editingVehicle && (
        <EnhancedVehicleForm
          visible={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingVehicle(null);
          }}
          onSubmit={handleUpdateVehicle}
          mode="edit"
          initialData={editingVehicle}
          unitNames={unitNames}
          getVariationsForUnit={getVariationsFromHook}
          validateUnitVariationPair={validateUnitVariationPair}
          vehicleModelsLoading={vehicleModelsLoading}
          vehicleModelsError={vehicleModelsError}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundLight,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: Colors.textLight,
    fontWeight: '600',
    marginLeft: 4,
  },
  searchContainer: {
    padding: 20,
    backgroundColor: Colors.background,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
  },
  filterContainer: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: '#fff',
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterBtnText: {
    color: '#666',
    fontWeight: '500',
  },
  filterBtnTextActive: {
    color: Colors.textLight,
  },
  listContainer: {
    padding: 20,
  },
  vehicleCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  vehicleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  vehicleId: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
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
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
  editBtn: {
    backgroundColor: '#f0f8ff',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  actionBtnText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    maxWidth: 250,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: width * 0.9,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelBtn: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cancelBtnText: {
    color: '#666',
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: '#e50914',
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
});