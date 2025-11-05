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
import Colors from '../constants/Colors';

const { width } = Dimensions.get('window');

export default function ServiceRequestScreen() {
  const [serviceRequests, setServiceRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  // New service request form state
  const [newRequest, setNewRequest] = useState({
    unitId: '',
    unitName: '',
    requestedServices: [],
    priority: 'Normal',
    notes: '',
    targetCompletionDate: ''
  });

  // Available services matching web version
  const availableServices = [
    'delivery_to_isuzu_pasig',
    'tinting',
    'carwash',
    'ceramic_coating',
    'accessories',
    'rust_proof',
    'stock_integration',
    'documentation_check'
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
  }, [fetchServiceRequests]);

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
    if (!newRequest.unitId || !newRequest.unitName || newRequest.requestedServices.length === 0) {
      Alert.alert('Error', 'Please fill in required fields (Unit ID, Unit Name, and at least one service)');
      return;
    }

    try {
      const response = await fetch(buildApiUrl('/createServiceRequest'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newRequest,
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
      unitId: '',
      unitName: '',
      requestedServices: [],
      priority: 'Normal',
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
  const renderRequestItem = ({ item }) => (
    <TouchableOpacity
      style={styles.requestCard}
      onPress={() => {
        setSelectedRequest(item);
        setShowDetailsModal(true);
      }}
    >
      <View style={styles.requestHeader}>
        <View style={styles.requestInfo}>
          <Text style={styles.requestTitle}>{item.unitName}</Text>
          <Text style={styles.requestId}>ID: {item.unitId}</Text>
        </View>
        <View style={styles.badgeContainer}>
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
            <Text style={styles.badgeText}>{item.priority}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.badgeText}>{item.status}</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.servicesContainer}>
        <Text style={styles.servicesLabel}>Requested Services:</Text>
        <View style={styles.servicesWrap}>
          {(item.requestedServices || []).map((service, index) => (
            <View key={index} style={styles.serviceTag}>
              <Text style={styles.serviceTagText}>{formatServiceName(service)}</Text>
            </View>
          ))}
        </View>
      </View>

      {item.createdAt && (
        <View style={styles.dateContainer}>
          <MaterialIcons name="schedule" size={14} color="#666" />
          <Text style={styles.dateText}>
            Created: {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
      )}

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.updateBtn]}
          onPress={() => {
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
          <MaterialIcons name="edit" size={16} color="#007AFF" />
          <Text style={styles.actionBtnText}>Update</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

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

      {/* Search and Filters */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search service requests..."
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
        <FilterButton title="All" value="all" active={filterStatus === 'all'} />
        <FilterButton title="Pending" value="pending" active={filterStatus === 'pending'} />
        <FilterButton title="In Progress" value="in progress" active={filterStatus === 'in progress'} />
        <FilterButton title="Completed" value="completed" active={filterStatus === 'completed'} />
        <FilterButton title="Cancelled" value="cancelled" active={filterStatus === 'cancelled'} />
      </ScrollView>

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
      <Modal visible={showAddModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Service Request</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Unit ID *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., DMAX001"
                  value={newRequest.unitId}
                  onChangeText={(text) => setNewRequest({...newRequest, unitId: text})}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Unit Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Isuzu D-MAX"
                  value={newRequest.unitName}
                  onChangeText={(text) => setNewRequest({...newRequest, unitName: text})}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Priority</Text>
                <View style={styles.priorityContainer}>
                  {['Low', 'Normal', 'High'].map(priority => (
                    <TouchableOpacity
                      key={priority}
                      style={[
                        styles.priorityBtn,
                        newRequest.priority === priority && styles.priorityBtnActive
                      ]}
                      onPress={() => setNewRequest({...newRequest, priority})}
                    >
                      <Text style={[
                        styles.priorityBtnText,
                        newRequest.priority === priority && styles.priorityBtnTextActive
                      ]}>
                        {priority}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Requested Services *</Text>
                <View style={styles.servicesGrid}>
                  {availableServices.map(service => (
                    <TouchableOpacity
                      key={service}
                      style={[
                        styles.serviceOption,
                        newRequest.requestedServices.includes(service) && styles.serviceOptionActive
                      ]}
                      onPress={() => toggleService(service)}
                    >
                      <Text style={[
                        styles.serviceOptionText,
                        newRequest.requestedServices.includes(service) && styles.serviceOptionTextActive
                      ]}>
                        {formatServiceName(service)}
                      </Text>
                      {newRequest.requestedServices.includes(service) && (
                        <MaterialIcons name="check" size={16} color="#fff" />
                      )}
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
                  <Text style={styles.detailLabel}>Status & Priority</Text>
                  <View style={styles.badgeRow}>
                    <View style={[styles.detailBadge, { backgroundColor: getStatusColor(selectedRequest.status) }]}>
                      <Text style={styles.badgeText}>{selectedRequest.status}</Text>
                    </View>
                    <View style={[styles.detailBadge, { backgroundColor: getPriorityColor(selectedRequest.priority) }]}>
                      <Text style={styles.badgeText}>{selectedRequest.priority} Priority</Text>
                    </View>
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
    backgroundcolor: Colors.textLight,
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
    backgroundcolor: Colors.textLight,
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
    backgroundcolor: Colors.textLight,
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
    borderColor: '#e50914',
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
  requestCard: {
    backgroundcolor: Colors.textLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  requestInfo: {
    flex: 1,
  },
  requestTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  requestId: {
    fontSize: 14,
    color: '#666',
  },
  badgeContainer: {
    alignItems: 'flex-end',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: Colors.textLight,
    fontSize: 12,
    fontWeight: '600',
  },
  servicesContainer: {
    marginBottom: 12,
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
  },
  serviceTag: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  serviceTagText: {
    fontSize: 12,
    color: '#666',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundcolor: Colors.textLight,
    borderRadius: 12,
    width: width * 0.9,
    maxHeight: '90%',
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
    maxHeight: 400,
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
  priorityContainer: {
    flexDirection: 'row',
  },
  priorityBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    marginRight: 8,
  },
  priorityBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: '#e50914',
  },
  priorityBtnText: {
    color: '#666',
    fontWeight: '500',
  },
  priorityBtnTextActive: {
    color: Colors.textLight,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  serviceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  serviceOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: '#e50914',
  },
  serviceOptionText: {
    color: '#666',
    fontSize: 14,
    marginRight: 4,
  },
  serviceOptionTextActive: {
    color: Colors.textLight,
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
    backgroundColor: Colors.primary,
  },
  saveBtnText: {
    color: Colors.textLight,
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
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  detailServiceTagText: {
    color: Colors.textLight,
    fontSize: 14,
    fontWeight: '500',
  },
});
