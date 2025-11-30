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
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildApiUrl } from '../constants/api';
import UniformLoading from '../components/UniformLoading';

const { width } = Dimensions.get('window');

export default function ServiceRequestScreen() {
  const [serviceRequests, setServiceRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  // New service request form state
  const [newRequest, setNewRequest] = useState({
    selectedVehicle: null,
    requestedServices: [],
    notes: '',
    targetCompletionDate: ''
  });

  // Inventory vehicles state
  const [inventoryVehicles, setInventoryVehicles] = useState([]);
  const [showVehicleSelector, setShowVehicleSelector] = useState(false);

  // Available services (removed delivery_to_isuzu_pasig, stock_integration, documentation_check)
  const availableServices = [
    'tinting',
    'carwash', 
    'ceramic_coating',
    'accessories',
    'rust_proof'
  ];

  // Fetch service requests
  const fetchServiceRequests = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(buildApiUrl('/getServiceRequests'));
      const data = await response.json();
      
      if (data.success) {
        setServiceRequests(data.data || []);
      } else {
        console.warn('Failed to fetch service requests:', data.message);
        setServiceRequests([]);
      }
    } catch (error) {
      console.error('Error fetching service requests:', error);
      Alert.alert('Error', 'Failed to load service requests');
      setServiceRequests([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchServiceRequests();
    fetchInventoryVehicles();
  }, [fetchServiceRequests]);

  // Fetch inventory vehicles for selection
  const fetchInventoryVehicles = async () => {
    try {
      const response = await fetch(buildApiUrl('/getInventory'));
      const data = await response.json();
      
      if (data.success) {
        // Filter only available vehicles
        const availableVehicles = data.data.filter(vehicle => 
          vehicle.status === 'Available' || vehicle.status === 'In Stock'
        );
        setInventoryVehicles(availableVehicles);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
    }
  };

  // Filter and search service requests
  const getFilteredRequests = () => {
    let filtered = serviceRequests;

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(request => 
        request.status?.toLowerCase() === filterStatus.toLowerCase()
      );
    }

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(request => 
        request.unitName?.toLowerCase().includes(searchLower) ||
        request.unitId?.toLowerCase().includes(searchLower) ||
        request.requestedServices?.some(service => 
          service.toLowerCase().includes(searchLower)
        )
      );
    }

    return filtered;
  };

  // Add new service request
  const handleAddServiceRequest = async () => {
    if (!newRequest.selectedVehicle || newRequest.requestedServices.length === 0) {
      Alert.alert('Error', 'Please select a vehicle and at least one service');
      return;
    }

    try {
      const response = await fetch(buildApiUrl('/createServiceRequest'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          unitId: newRequest.selectedVehicle.unitId || newRequest.selectedVehicle._id,
          unitName: newRequest.selectedVehicle.unitName,
          vehicleRegNo: newRequest.selectedVehicle.vin || newRequest.selectedVehicle.unitId,
          service: newRequest.requestedServices,
          requestedServices: newRequest.requestedServices,
          notes: newRequest.notes,
          createdBy: await AsyncStorage.getItem('accountName') || 'System',
          status: 'Pending'
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        Alert.alert('Success', 'Service request created successfully');
        setShowAddModal(false);
        resetNewRequestForm();
        fetchServiceRequests();
      } else {
        Alert.alert('Error', data.message || 'Failed to create service request');
      }
    } catch (error) {
      console.error('Error creating service request:', error);
      Alert.alert('Error', 'Failed to create service request');
    }
  };

  // Reset form
  const resetNewRequestForm = () => {
    setNewRequest({
      selectedVehicle: null,
      requestedServices: [],
      notes: '',
      targetCompletionDate: ''
    });
  };

  // Update service request status
  const updateRequestStatus = async (requestId, newStatus) => {
    try {
      const response = await fetch(buildApiUrl(`/updateServiceRequest/${requestId}`), {
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
        Alert.alert('Success', `Request status updated to ${newStatus}`);
        fetchServiceRequests();
      } else {
        Alert.alert('Error', data.message || 'Failed to update request');
      }
    } catch (error) {
      console.error('Error updating request:', error);
      Alert.alert('Error', 'Failed to update request status');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchServiceRequests();
  };

  // Toggle service selection
  const toggleService = (service) => {
    const isSelected = newRequest.requestedServices.includes(service);
    if (isSelected) {
      setNewRequest({
        ...newRequest,
        requestedServices: newRequest.requestedServices.filter(s => s !== service)
      });
    } else {
      setNewRequest({
        ...newRequest,
        requestedServices: [...newRequest.requestedServices, service]
      });
    }
  };

  // Select vehicle from inventory
  const selectVehicle = (vehicle) => {
    setNewRequest({
      ...newRequest,
      selectedVehicle: vehicle
    });
    setShowVehicleSelector(false);
  };

  // Format service name for display
  const formatServiceName = (service) => {
    return service.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Get priority color
  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high': return '#dc3545';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return '#ffc107';
      case 'in progress': return '#007bff';
      case 'completed': return '#28a745';
      case 'cancelled': return '#dc3545';
      default: return '#6c757d';
    }
  };

  // Render service request item
  const renderRequestItem = ({ item }) => {
    const statusStyle = getStatusStyle(item.status);
    
    return (
      <TouchableOpacity
        style={styles.requestCard}
        onPress={() => {
          setSelectedRequest(item);
          setShowDetailsModal(true);
        }}
        activeOpacity={0.7}
      >
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.cardTitle}>{item.unitName || 'Unknown Vehicle'}</Text>
            <Text style={styles.cardSubtitle}>
              {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              }) : 'Date not set'}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.backgroundColor }]}>
            <Text style={[styles.statusText, { color: statusStyle.color }]}>
              {item.status || 'Pending'}
            </Text>
          </View>
        </View>

        {/* Card Body */}
        <View style={styles.cardBody}>
          <View style={styles.cardRow}>
            <View style={styles.cardField}>
              <Text style={styles.fieldLabel}>🏷️ Unit ID</Text>
              <Text style={styles.fieldValue}>{item.unitId || 'N/A'}</Text>
            </View>
            <View style={styles.cardField}>
              <Text style={styles.fieldLabel}>🔧 Total Services</Text>
              <Text style={styles.fieldValue}>{(item.requestedServices || []).length}</Text>
            </View>
          </View>

          {/* Requested Services */}
          <View style={styles.servicesSection}>
            <Text style={styles.servicesLabel}>📋 Requested Services:</Text>
            <View style={styles.servicesWrap}>
              {(item.requestedServices || []).map((service, index) => (
                <View key={index} style={styles.serviceTag}>
                  <Text style={styles.serviceTagText}>{formatServiceName(service)}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Notes if available */}
          {item.notes && (
            <View style={styles.notesSection}>
              <Text style={styles.notesLabel}>📝 Notes</Text>
              <Text style={styles.notesText} numberOfLines={2}>{item.notes}</Text>
            </View>
          )}
        </View>

        {/* Card Actions */}
        <View style={styles.cardActions}>
          <TouchableOpacity 
            style={styles.cardActionBtn} 
            onPress={(e) => {
              e.stopPropagation();
              setSelectedRequest(item);
              setShowDetailsModal(true);
            }}
          >
            <Text style={styles.cardActionText}>📋 View Details</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.cardActionBtn, styles.editActionBtn]} 
            onPress={(e) => {
              e.stopPropagation();
              Alert.alert(
                'Update Status',
                'Choose new status:',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Pending', onPress: () => updateRequestStatus(item._id, 'Pending') },
                  { text: 'In Progress', onPress: () => updateRequestStatus(item._id, 'In Progress') },
                  { text: 'Completed', onPress: () => updateRequestStatus(item._id, 'Completed') },
                  { text: 'Cancelled', onPress: () => updateRequestStatus(item._id, 'Cancelled') },
                ]
              );
            }}
          >
            <Text style={[styles.cardActionText, styles.editActionText]}>✏️ Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.cardActionBtn, styles.deleteActionBtn]} 
            onPress={(e) => {
              e.stopPropagation();
              Alert.alert(
                'Delete Request',
                'Are you sure you want to delete this service request?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Delete', 
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        const response = await fetch(buildApiUrl(`/deleteServiceRequest/${item._id}`), {
                          method: 'DELETE',
                        });
                        const data = await response.json();
                        if (data.success) {
                          Alert.alert('Success', 'Request deleted successfully');
                          fetchServiceRequests();
                        } else {
                          Alert.alert('Error', data.message || 'Failed to delete request');
                        }
                      } catch (error) {
                        console.error('Error deleting request:', error);
                        Alert.alert('Error', 'Failed to delete request');
                      }
                    }
                  },
                ]
              );
            }}
          >
            <Text style={[styles.cardActionText, styles.deleteActionText]}>🗑️ Delete</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // Get status style helper
  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return { backgroundColor: '#fef3c7', color: '#92400e' };
      case 'in progress':
        return { backgroundColor: '#dbeafe', color: '#1e40af' };
      case 'completed':
        return { backgroundColor: '#d1fae5', color: '#065f46' };
      case 'cancelled':
        return { backgroundColor: '#fee2e2', color: '#991b1b' };
      default:
        return { backgroundColor: '#f3f4f6', color: '#6b7280' };
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
        <Text style={styles.title}>Vehicle Preperation</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <MaterialIcons name="add" size={24} color="#fff" />
          <Text style={styles.addButtonText}>New Request</Text>
        </TouchableOpacity>
      </View>

      {/* Search and Filter */}
      <View style={styles.searchFilterContainer}>
        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search service requests..."
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
        >
          <Ionicons name="filter" size={20} color="#DC2626" />
          <Text style={styles.filterButtonText}>Filter</Text>
        </TouchableOpacity>
      </View>

      {/* Service Requests List */}
      {loading ? (
        <UniformLoading message="Loading service requests..." />
      ) : (
        <FlatList
          data={getFilteredRequests()}
          keyExtractor={(item) => item._id}
          renderItem={renderRequestItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="build" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No service requests found</Text>
              <Text style={styles.emptySubtext}>
                {searchTerm || filterStatus !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Create a new service request to get started'
                }
              </Text>
            </View>
          }
        />
      )}

      {/* Add Service Request Modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Service Request</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Select Vehicle *</Text>
              <TouchableOpacity 
                style={[styles.vehicleSelector, newRequest.selectedVehicle && styles.vehicleSelectorSelected]}
                onPress={() => setShowVehicleSelector(true)}
              >
                <View style={styles.vehicleSelectorContent}>
                  {newRequest.selectedVehicle ? (
                    <>
                      <View style={styles.vehicleInfo}>
                        <Text style={styles.vehicleName}>{newRequest.selectedVehicle.unitName}</Text>
                        <Text style={styles.vehicleDetails}>
                          {newRequest.selectedVehicle.variation} • {newRequest.selectedVehicle.bodyColor}
                        </Text>
                        <Text style={styles.vehicleId}>ID: {newRequest.selectedVehicle.unitId || newRequest.selectedVehicle._id}</Text>
                      </View>
                      <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
                    </>
                  ) : (
                    <>
                      <Text style={styles.placeholderText}>Choose vehicle from inventory</Text>
                      <MaterialIcons name="arrow-forward-ios" size={20} color="#666" />
                    </>
                  )}
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Requested Services *</Text>
              <View style={styles.servicesContainer}>
                {availableServices.map(service => (
                  <TouchableOpacity
                    key={service}
                    style={[
                      styles.serviceOption,
                      newRequest.requestedServices.includes(service) && styles.serviceOptionActive
                    ]}
                    onPress={() => toggleService(service)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.serviceOptionText,
                      newRequest.requestedServices.includes(service) && styles.serviceOptionTextActive
                    ]}>
                      {formatServiceName(service)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Additional notes or special instructions..."
                value={newRequest.notes}
                onChangeText={(text) => setNewRequest({...newRequest, notes: text})}
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.modalBtn, styles.cancelBtn]}
              onPress={() => {
                setShowAddModal(false);
                resetNewRequestForm();
              }}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, styles.saveBtn]}
              onPress={handleAddServiceRequest}
            >
              <Text style={styles.saveBtnText}>Create Request</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Vehicle Selector Modal */}
      <Modal visible={showVehicleSelector} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Vehicle</Text>
            <TouchableOpacity onPress={() => setShowVehicleSelector(false)} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {inventoryVehicles.length === 0 ? (
              <View style={styles.emptyVehicles}>
                <MaterialIcons name="inventory" size={48} color="#ccc" />
                <Text style={styles.emptyVehiclesText}>No available vehicles</Text>
                <Text style={styles.emptyVehiclesSubtext}>Check inventory for available vehicles</Text>
              </View>
            ) : (
              inventoryVehicles.map((vehicle) => (
                <TouchableOpacity
                  key={vehicle._id}
                  style={styles.vehicleOption}
                  onPress={() => selectVehicle(vehicle)}
                >
                  <View style={styles.vehicleOptionContent}>
                    <View style={styles.vehicleOptionInfo}>
                      <Text style={styles.vehicleOptionName}>{vehicle.unitName}</Text>
                      <Text style={styles.vehicleOptionDetails}>
                        {vehicle.variation} • {vehicle.bodyColor}
                      </Text>
                      <Text style={styles.vehicleOptionId}>ID: {vehicle.unitId || vehicle._id}</Text>
                      <View style={[styles.vehicleStatusBadge, { backgroundColor: getStatusColor(vehicle.status) }]}>
                        <Text style={styles.vehicleStatusText}>{vehicle.status}</Text>
                      </View>
                    </View>
                    <MaterialIcons name="arrow-forward-ios" size={20} color="#666" />
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Request Details Modal */}
      <Modal visible={showDetailsModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Details</Text>
              <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {selectedRequest && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Unit Information</Text>
                  <Text style={styles.detailValue}>{selectedRequest.unitName}</Text>
                  <Text style={styles.detailSubValue}>ID: {selectedRequest.unitId}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <View style={[styles.detailBadge, { backgroundColor: getStatusColor(selectedRequest.status) }]}>
                    <Text style={styles.badgeText}>{selectedRequest.status}</Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Requested Services</Text>
                  <View style={styles.detailServicesWrap}>
                    {(selectedRequest.requestedServices || []).map((service, index) => (
                      <View key={index} style={styles.detailServiceTag}>
                        <Text style={styles.detailServiceTagText}>{formatServiceName(service)}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {selectedRequest.notes && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Notes</Text>
                    <Text style={styles.detailValue}>{selectedRequest.notes}</Text>
                  </View>
                )}

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Request Information</Text>
                  <Text style={styles.detailSubValue}>
                    Created: {selectedRequest.createdAt ? new Date(selectedRequest.createdAt).toLocaleString() : 'N/A'}
                  </Text>
                  <Text style={styles.detailSubValue}>
                    Created by: {selectedRequest.createdBy || 'System'}
                  </Text>
                  {selectedRequest.lastUpdatedBy && (
                    <Text style={styles.detailSubValue}>
                      Last updated by: {selectedRequest.lastUpdatedBy}
                    </Text>
                  )}
                </View>
              </ScrollView>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={() => setShowDetailsModal(false)}
              >
                <Text style={styles.saveBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <TouchableOpacity 
          style={styles.filterModalOverlay}
          activeOpacity={1}
          onPress={() => setShowFilterModal(false)}
        >
          <View style={styles.filterModalContent}>
            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>Filter by Status</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={[styles.filterOption, filterStatus === 'all' && styles.filterOptionActive]}
              onPress={() => {
                setFilterStatus('all');
                setShowFilterModal(false);
              }}
            >
              <Text style={[styles.filterOptionText, filterStatus === 'all' && styles.filterOptionTextActive]}>
                All Requests
              </Text>
              {filterStatus === 'all' && <Ionicons name="checkmark" size={20} color="#DC2626" />}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.filterOption, filterStatus === 'pending' && styles.filterOptionActive]}
              onPress={() => {
                setFilterStatus('pending');
                setShowFilterModal(false);
              }}
            >
              <Text style={[styles.filterOptionText, filterStatus === 'pending' && styles.filterOptionTextActive]}>
                Pending
              </Text>
              {filterStatus === 'pending' && <Ionicons name="checkmark" size={20} color="#DC2626" />}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.filterOption, filterStatus === 'in progress' && styles.filterOptionActive]}
              onPress={() => {
                setFilterStatus('in progress');
                setShowFilterModal(false);
              }}
            >
              <Text style={[styles.filterOptionText, filterStatus === 'in progress' && styles.filterOptionTextActive]}>
                In Progress
              </Text>
              {filterStatus === 'in progress' && <Ionicons name="checkmark" size={20} color="#DC2626" />}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.filterOption, filterStatus === 'completed' && styles.filterOptionActive]}
              onPress={() => {
                setFilterStatus('completed');
                setShowFilterModal(false);
              }}
            >
              <Text style={[styles.filterOptionText, filterStatus === 'completed' && styles.filterOptionTextActive]}>
                Completed
              </Text>
              {filterStatus === 'completed' && <Ionicons name="checkmark" size={20} color="#DC2626" />}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.filterOption, filterStatus === 'cancelled' && styles.filterOptionActive]}
              onPress={() => {
                setFilterStatus('cancelled');
                setShowFilterModal(false);
              }}
            >
              <Text style={[styles.filterOptionText, filterStatus === 'cancelled' && styles.filterOptionTextActive]}>
                Cancelled
              </Text>
              {filterStatus === 'cancelled' && <Ionicons name="checkmark" size={20} color="#DC2626" />}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundcolor: '#FFFFFF',
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
    backgroundColor: '#DC2626',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 4,
  },
  searchFilterContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  searchBox: {
    flex: 1,
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
    color: '#1F2937',
    fontWeight: '500',
    minHeight: 40,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  filterButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '85%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
  },
  filterOptionActive: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#DC2626',
  },
  filterOptionText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#4B5563',
  },
  filterOptionTextActive: {
    color: '#DC2626',
    fontWeight: '600',
  },
  listContainer: {
    paddingBottom: 20,
  },
  requestCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cardHeaderLeft: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 80,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  cardBody: {
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardField: {
    flex: 1,
    marginRight: 8,
  },
  fieldLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  fieldValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  servicesSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  servicesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  servicesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  serviceTag: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#bbdefb',
  },
  serviceTagText: {
    fontSize: 12,
    color: '#1565c0',
    fontWeight: '600',
  },
  notesSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  cardActionBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  editActionBtn: {
    backgroundColor: '#fff3e0',
    borderColor: '#ffb300',
  },
  deleteActionBtn: {
    backgroundColor: '#ffebee',
    borderColor: '#f44336',
  },
  cardActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  editActionText: {
    color: '#e65100',
  },
  deleteActionText: {
    color: '#c62828',
  },
  // Old styles kept for modals and other components
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  requestInfo: {
    flex: 1,
  },
  requestTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  requestId: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  servicesContainer: {
    marginBottom: 16,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateText: {
    marginLeft: 4,
    fontSize: 12,
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
  },
  updateBtn: {
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
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#ffffff',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  modalBody: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#ffffff',
    color: '#1F2937',
    minHeight: 52,
    fontWeight: '500',
  },
  vehicleSelector: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#ffffff',
  },
  vehicleSelectorSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#f8fff8',
  },
  vehicleSelectorContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  vehicleDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  vehicleId: {
    fontSize: 12,
    color: '#999',
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  // Vehicle selector styles
  vehicleOption: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  vehicleOptionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vehicleOptionInfo: {
    flex: 1,
  },
  vehicleOptionName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  vehicleOptionDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  vehicleOptionId: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  vehicleStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  vehicleStatusText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  emptyVehicles: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyVehiclesText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyVehiclesSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  servicesContainer: {
    gap: 8,
  },
  serviceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  serviceOptionActive: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
    shadowColor: '#DC2626',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  serviceOptionText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  serviceOptionTextActive: {
    color: '#ffffff',
    fontWeight: '600',
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
    backgroundColor: '#DC2626',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // Details Modal Styles
  detailSection: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
  },
  detailSubValue: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: 'row',
  },
  detailBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  detailServicesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  detailServiceTag: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  detailServiceTagText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  // Vehicle selector modal styles
  vehicleSelectorModal: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  vehicleSelectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  vehicleSelectorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
  },
  vehicleList: {
    padding: 16,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
});
