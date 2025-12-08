import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, RefreshControl, Modal, TextInput
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { buildApiUrl } from '../constants/api';
import UniformLoading from '../components/UniformLoading';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function VehiclePreparationAdmin({ navigation }) {
  const [requests, setRequests] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('recent'); // 'recent' or 'alphabetical'
  
  const [newRequest, setNewRequest] = useState({
    dateCreated: new Date().toISOString().split('T')[0],
    unitId: '',
    unitName: '',
    service: [],
    status: 'Pending'
  });

  const availableServices = ['Carwash', 'Tinting', 'Ceramic Coating', 'Accessories', 'Rust Proof'];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!refreshing) setLoading(true);
    try {
      await Promise.all([loadRequests(), loadInventory()]);
    } catch (error) {
      console.error('Load error:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadRequests = async () => {
    try {
      const response = await fetch(buildApiUrl('/getRequest'));
      const data = await response.json();
      
      if (data.success) {
        setRequests(data.data || []);
        console.log('Loaded', data.data.length, 'service requests');
      }
    } catch (error) {
      console.error('Load requests error:', error);
    }
  };

  const loadInventory = async () => {
    try {
      const response = await fetch(buildApiUrl('/getStock'));
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setInventory(data);
        console.log('Loaded', data.length, 'inventory items');
      }
    } catch (error) {
      console.error('Load inventory error:', error);
    }
  };

  const handleCreateRequest = async () => {
    const { dateCreated, unitId, unitName, service } = newRequest;

    // Validation
    if (!dateCreated || !unitId || !unitName || service.length === 0) {
      Alert.alert('Validation Error', 'All fields are required.');
      return;
    }

    // Validate conduction number (6-8 alphanumeric characters)
    const regex = /^[A-Za-z0-9]{6,8}$/;
    if (!regex.test(unitId)) {
      Alert.alert('Validation Error', 'Conduction Number must be 6-8 alphanumeric characters.');
      return;
    }

    try {
      const accountName = await AsyncStorage.getItem('accountName') || 'Admin';
      
      const requestData = {
        ...newRequest,
        preparedBy: accountName,
        createdAt: new Date().toISOString()
      };

      const response = await fetch(buildApiUrl('/createRequest'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });

      const result = await response.json();

      if (result.success || response.ok) {
        // Update inventory status to "In Dispatch"
        await updateInventoryStatus(unitId, 'In Dispatch');
        
        Alert.alert('Success', 'Service request created successfully!');
        setModalVisible(false);
        setNewRequest({
          dateCreated: new Date().toISOString().split('T')[0],
          unitId: '',
          unitName: '',
          service: [],
          status: 'Pending'
        });
        loadData();
      } else {
        Alert.alert('Error', result.message || 'Failed to create request');
      }
    } catch (error) {
      console.error('Create request error:', error);
      Alert.alert('Error', 'Failed to create service request');
    }
  };

  const handleDeleteRequest = (request) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete the request for "${request.unitName}" (${request.unitId})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(buildApiUrl(`/deleteRequest/${request._id}`), {
                method: 'DELETE'
              });

              if (response.ok) {
                // Update inventory status back to "Available"
                await updateInventoryStatus(request.unitId, 'Available');
                
                Alert.alert('Success', 'Request deleted successfully!');
                loadData();
              } else {
                Alert.alert('Error', 'Failed to delete request');
              }
            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert('Error', 'Failed to delete request');
            }
          }
        }
      ]
    );
  };

  const updateInventoryStatus = async (unitId, newStatus) => {
    try {
      // Find the inventory item
      const inventoryItem = inventory.find(item => item.unitId === unitId);
      if (!inventoryItem) {
        console.log('Inventory item not found for unitId:', unitId);
        return;
      }

      const response = await fetch(buildApiUrl(`/updateStock/${inventoryItem._id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        console.log(`Updated inventory status to ${newStatus} for ${unitId}`);
        // Reload inventory to reflect changes
        loadInventory();
      }
    } catch (error) {
      console.error('Update inventory status error:', error);
    }
  };

  const toggleService = (service) => {
    setNewRequest(prev => ({
      ...prev,
      service: prev.service.includes(service)
        ? prev.service.filter(s => s !== service)
        : [...prev.service, service]
    }));
  };

  const selectInventoryUnit = (unit) => {
    setNewRequest(prev => ({
      ...prev,
      unitId: unit.unitId,
      unitName: unit.unitName
    }));
  };

  // Get available inventory (only "Available" status)
  const availableInventory = inventory.filter(item => item.status === 'Available');

  // Filter and sort requests
  const getFilteredRequests = () => {
    let filtered = requests;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(req => 
        req.unitId?.toLowerCase().includes(query) ||
        req.unitName?.toLowerCase().includes(query) ||
        req.service?.some(s => s.toLowerCase().includes(query)) ||
        req.status?.toLowerCase().includes(query)
      );
    }

    // Apply sort
    if (filterType === 'alphabetical') {
      filtered = [...filtered].sort((a, b) => 
        (a.unitName || '').localeCompare(b.unitName || '')
      );
    } else {
      // Most recent first (default)
      filtered = [...filtered].sort((a, b) => 
        new Date(b.dateCreated || b.createdAt) - new Date(a.dateCreated || a.createdAt)
      );
    }

    return filtered;
  };

  const filteredRequests = getFilteredRequests();

  const renderRequestCard = (request) => {
    const getStatusColor = () => {
      switch (request.status) {
        case 'Completed': return '#4CAF50';
        case 'In Progress': return '#2196F3';
        case 'Ready for Release': return '#9C27B0';
        case 'Released to Customer': return '#FF9800';
        default: return '#757575';
      }
    };

    return (
      <View key={request._id} style={styles.requestCard}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitle}>
            <Text style={styles.unitName}>{request.unitName}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
              <Text style={styles.statusText}>{request.status}</Text>
            </View>
          </View>
        </View>

        <View style={styles.cardInfo}>
          <View style={styles.infoRow}>
            <MaterialIcons name="confirmation-number" size={16} color="#666" />
            <Text style={styles.infoLabel}>Unit ID: </Text>
            <Text style={styles.infoValue}>{request.unitId}</Text>
          </View>

          <View style={styles.infoRow}>
            <MaterialIcons name="date-range" size={16} color="#666" />
            <Text style={styles.infoLabel}>Date: </Text>
            <Text style={styles.infoValue}>
              {new Date(request.dateCreated || request.createdAt).toLocaleDateString('en-CA')}
            </Text>
          </View>
        </View>

        <View style={styles.servicesSection}>
          <Text style={styles.servicesLabel}>Requested Services:</Text>
          <View style={styles.servicesContainer}>
            {Array.isArray(request.service) && request.service.length > 0 ? (
              request.service.map((service, index) => (
                <View key={index} style={styles.serviceChip}>
                  <Text style={styles.serviceChipText}>{service}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noServices}>No services</Text>
            )}
          </View>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteRequest(request)}
          >
            <MaterialIcons name="delete" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderCreateModal = () => (
    <Modal
      visible={modalVisible}
      animationType="slide"
      transparent={false}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Create Vehicle Preparation</Text>
          <TouchableOpacity onPress={() => setModalVisible(false)}>
            <MaterialIcons name="close" size={28} color="#333" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalBody}>
          {/* Date Created */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>
              Date Created <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.formInput}
              value={newRequest.dateCreated}
              editable={false}
            />
          </View>

          {/* Select from Available Inventory */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>
              Select Existing Unit <Text style={styles.required}>*</Text>
            </Text>
            <Text style={styles.formHint}>Only vehicles with "Available" status</Text>
            
            <ScrollView style={styles.inventoryList}>
              {availableInventory.length > 0 ? (
                availableInventory.map((unit) => (
                  <TouchableOpacity
                    key={unit._id}
                    style={[
                      styles.inventoryItem,
                      newRequest.unitId === unit.unitId && styles.inventoryItemSelected
                    ]}
                    onPress={() => selectInventoryUnit(unit)}
                  >
                    <View style={styles.inventoryItemContent}>
                      <Text style={styles.inventoryUnitName}>{unit.unitName}</Text>
                      <Text style={styles.inventoryUnitId}>ID: {unit.unitId}</Text>
                    </View>
                    {newRequest.unitId === unit.unitId && (
                      <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
                    )}
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.noInventory}>No available units in inventory</Text>
              )}
            </ScrollView>
          </View>

          {/* Services */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>
              Services <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.servicesGrid}>
              {availableServices.map((service) => (
                <TouchableOpacity
                  key={service}
                  style={[
                    styles.serviceOption,
                    newRequest.service.includes(service) && styles.serviceOptionSelected
                  ]}
                  onPress={() => toggleService(service)}
                >
                  <Text
                    style={[
                      styles.serviceOptionText,
                      newRequest.service.includes(service) && styles.serviceOptionTextSelected
                    ]}
                  >
                    {service}
                  </Text>
                  {newRequest.service.includes(service) && (
                    <MaterialIcons name="check" size={18} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={styles.modalFooter}>
          <TouchableOpacity
            style={[styles.modalButton, styles.submitButton]}
            onPress={handleCreateRequest}
          >
            <Text style={styles.modalButtonText}>Submit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalButton, styles.cancelButton]}
            onPress={() => setModalVisible(false)}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderFilterModal = () => (
    <Modal
      visible={filterModalVisible}
      animationType="fade"
      transparent={true}
    >
      <TouchableOpacity
        style={styles.filterOverlay}
        activeOpacity={1}
        onPress={() => setFilterModalVisible(false)}
      >
        <View style={styles.filterModal}>
          <Text style={styles.filterTitle}>Sort By</Text>
          
          <TouchableOpacity
            style={[
              styles.filterOption,
              filterType === 'recent' && styles.filterOptionSelected
            ]}
            onPress={() => {
              setFilterType('recent');
              setFilterModalVisible(false);
            }}
          >
            <MaterialIcons name="schedule" size={20} color="#333" />
            <Text style={styles.filterOptionText}>Most Recent</Text>
            {filterType === 'recent' && (
              <MaterialIcons name="check" size={20} color="#4CAF50" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterOption,
              filterType === 'alphabetical' && styles.filterOptionSelected
            ]}
            onPress={() => {
              setFilterType('alphabetical');
              setFilterModalVisible(false);
            }}
          >
            <MaterialIcons name="sort-by-alpha" size={20} color="#333" />
            <Text style={styles.filterOptionText}>Alphabetically</Text>
            {filterType === 'alphabetical' && (
              <MaterialIcons name="check" size={20} color="#4CAF50" />
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  if (loading) {
    return <UniformLoading message="Loading vehicle preparation..." />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Vehicle Preparation</Text>
        </View>
      </View>

      <View style={styles.toolbar}>
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcons name="close" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setFilterModalVisible(true)}
        >
          <MaterialIcons name="filter-list" size={20} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setModalVisible(true)}
        >
          <MaterialIcons name="add" size={20} color="#fff" />
          <Text style={styles.createButtonText}>New</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
            colors={['#DC2626']}
          />
        }
      >
        {filteredRequests.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="assignment" size={80} color="#ccc" />
            <Text style={styles.emptyText}>No Service Requests</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'No results found' : 'Create a new request to get started'}
            </Text>
          </View>
        ) : (
          filteredRequests.map(renderRequestCard)
        )}
      </ScrollView>

      {renderCreateModal()}
      {renderFilterModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#DC2626',
    padding: 16,
    paddingTop: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  toolbar: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 14,
  },
  filterButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButton: {
    flexDirection: 'row',
    backgroundColor: '#DC2626',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    gap: 4,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 12,
  },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardTitle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  unitName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  cardInfo: {
    marginBottom: 12,
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  servicesSection: {
    marginBottom: 12,
  },
  servicesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  servicesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  serviceChip: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  serviceChipText: {
    fontSize: 12,
    color: '#333',
  },
  noServices: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 4,
  },
  deleteButton: {
    backgroundColor: '#DC2626',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
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
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  modalBody: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#DC2626',
  },
  formHint: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#f9f9f9',
  },
  inventoryList: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
  },
  inventoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
  },
  inventoryItemSelected: {
    backgroundColor: '#e8f5e9',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  inventoryItemContent: {
    flex: 1,
  },
  inventoryUnitName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  inventoryUnitId: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  noInventory: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  serviceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    gap: 6,
  },
  serviceOptionSelected: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  serviceOptionText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  serviceOptionTextSelected: {
    color: '#fff',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  filterOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  filterOptionSelected: {
    backgroundColor: '#f0f9ff',
  },
  filterOptionText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
});
