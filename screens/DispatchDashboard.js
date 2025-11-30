// DispatchDashboard.js - Simple Process Updater for Dispatch
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, RefreshControl, Modal, Dimensions
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildApiUrl } from '../constants/api';
import UniformLoading from '../components/UniformLoading';

const { width } = Dimensions.get('window');

// Available services that can be tracked
const AVAILABLE_SERVICES = [
  { id: 'tinting', label: 'Tinting', icon: 'window' },
  { id: 'carwash', label: 'Car Wash', icon: 'car-wash' },
  { id: 'ceramic_coating', label: 'Ceramic Coating', icon: 'auto-fix-high' },
  { id: 'accessories', label: 'Accessories', icon: 'build' },
  { id: 'rust_proof', label: 'Rust Proof', icon: 'shield-check' }
];

export default function DispatchDashboard() {
  const [serviceRequests, setServiceRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  useEffect(() => {
    fetchServiceRequests();
  }, []);

  const fetchServiceRequests = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(buildApiUrl('/getRequest'));
      const data = await response.json();
      
      if (data.success) {
        // Show only requests that dispatch can work on
        // Exclude: Completed, Cancelled, Ready for Release, Released to Customer
        const activeRequests = (data.data || []).filter(req => 
          req.status !== 'Completed' && 
          req.status !== 'Cancelled' &&
          req.status !== 'Ready for Release' &&
          req.status !== 'Released to Customer' &&
          !req.readyForRelease &&
          !req.releasedToCustomer
        );
        setServiceRequests(activeRequests);
        
        console.log('Dispatch Dashboard - Active requests:', activeRequests.length);
      }
    } catch (error) {
      console.error('Error fetching service requests:', error);
      Alert.alert('Error', 'Failed to load service requests');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchServiceRequests();
  };

  const markAsReadyForRelease = async (requestId) => {
    try {
      const accountName = await AsyncStorage.getItem('accountName') || 'Dispatch';
      const request = serviceRequests.find(r => r._id === requestId);
      
      if (!request) {
        Alert.alert('Error', 'Service request not found');
        return;
      }

      Alert.alert(
        'Confirm Ready for Release',
        `Mark ${request.unitName} as ready for release to admin?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Confirm',
            onPress: async () => {
              try {
                const response = await fetch(buildApiUrl(`/markReadyForRelease/${requestId}`), {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ markedBy: accountName })
                });

                if (!response.ok) {
                  throw new Error(`HTTP ${response.status}: Failed to mark as ready`);
                }

                const data = await response.json();
                
                if (data.success) {
                  Alert.alert('Success', `${request.unitName} is now ready for release!`);
                  setShowUpdateModal(false);
                  fetchServiceRequests(); // Refresh list
                } else {
                  Alert.alert('Error', data.message || 'Failed to mark as ready');
                }
              } catch (error) {
                console.error('Error marking ready for release:', error);
                Alert.alert('Error', 'Failed to mark as ready for release');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Something went wrong');
    }
  };

  const updateServiceStatus = async (requestId, serviceId, completed) => {
    try {
      const accountName = await AsyncStorage.getItem('accountName') || 'Dispatch';
      
      // Get current request
      const request = serviceRequests.find(r => r._id === requestId);
      if (!request) {
        Alert.alert('Error', 'Service request not found');
        return;
      }

      console.log('Updating service status:', {
        requestId,
        serviceId,
        completed,
        currentCompleted: request.completedServices,
        currentPending: request.pendingServices
      });

      // Validate service exists in the request
      if (!request.service?.includes(serviceId)) {
        Alert.alert('Error', 'This service is not part of this request');
        return;
      }

      let updatedCompletedServices = [...(request.completedServices || [])];
      let updatedPendingServices = [...(request.pendingServices || request.service || [])];

      if (completed) {
        // Mark as completed
        if (!updatedCompletedServices.includes(serviceId)) {
          updatedCompletedServices.push(serviceId);
        }
        updatedPendingServices = updatedPendingServices.filter(s => s !== serviceId);
      } else {
        // Mark as pending
        updatedCompletedServices = updatedCompletedServices.filter(s => s !== serviceId);
        if (!updatedPendingServices.includes(serviceId)) {
          updatedPendingServices.push(serviceId);
        }
      }

      console.log('New service arrays:', {
        updatedCompleted: updatedCompletedServices,
        updatedPending: updatedPendingServices
      });

      // Check if all services are completed
      const allCompleted = request.service?.length > 0 && 
                          updatedCompletedServices.length === request.service.length;

      const updateData = {
        completedServices: updatedCompletedServices,
        pendingServices: updatedPendingServices,
        status: allCompleted ? 'Completed' : 'In Progress',
        completedBy: allCompleted ? accountName : request.completedBy,
        completedAt: allCompleted ? new Date().toISOString() : request.completedAt
      };

      console.log('Sending update to backend:', updateData);

      const response = await fetch(buildApiUrl(`/updateServiceRequest/${requestId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to update`);
      }

      const data = await response.json();
      
      console.log('Backend response:', data);
      
      if (data.success) {
        console.log('Update successful, refreshing local state');
        
        // Update local state with backend response
        setServiceRequests(prev => 
          prev.map(req => req._id === requestId ? data.data : req)
        );
        
        if (selectedRequest?._id === requestId) {
          setSelectedRequest(data.data);
        }

        // Show success feedback
        const serviceName = getServiceLabel(serviceId);
        const statusText = completed ? 'completed' : 'pending';
        Alert.alert('Success', `${serviceName} marked as ${statusText}`);
      } else {
        console.error('Update failed:', data.message);
        Alert.alert('Error', data.message || 'Failed to update service');
      }
    } catch (error) {
      console.error('Error updating service:', error);
      Alert.alert('Error', 'Failed to update service status');
    }
  };

  const getServiceIcon = (serviceId) => {
    const service = AVAILABLE_SERVICES.find(s => s.id === serviceId);
    return service?.icon || 'build';
  };

  const getServiceLabel = (serviceId) => {
    const service = AVAILABLE_SERVICES.find(s => s.id === serviceId);
    return service?.label || serviceId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return '#FFA726';
      case 'in progress': return '#2196F3';
      case 'completed': return '#4CAF50';
      default: return '#9E9E9E';
    }
  };

  const renderRequestCard = (request) => {
    const completedCount = request.completedServices?.length || 0;
    const totalCount = request.service?.length || 0;
    const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    return (
      <TouchableOpacity
        key={request._id}
        style={styles.requestCard}
        onPress={() => {
          setSelectedRequest(request);
          setShowUpdateModal(true);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.vehicleInfo}>
            <Text style={styles.unitName}>{request.unitName}</Text>
            <Text style={styles.unitId}>ID: {request.unitId}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) }]}>
            <Text style={styles.statusText}>{request.status || 'Pending'}</Text>
          </View>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Progress</Text>
            <Text style={styles.progressText}>{completedCount}/{totalCount} Services</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>

        <View style={styles.servicesPreview}>
          {(request.service || []).slice(0, 3).map((serviceId, index) => {
            const isCompleted = request.completedServices?.includes(serviceId);
            return (
              <View
                key={index}
                style={[
                  styles.serviceChip,
                  isCompleted ? styles.serviceChipCompleted : styles.serviceChipPending
                ]}
              >
                <MaterialIcons
                  name={getServiceIcon(serviceId)}
                  size={14}
                  color={isCompleted ? '#fff' : '#666'}
                />
                <Text style={[
                  styles.serviceChipText,
                  isCompleted ? styles.serviceChipTextCompleted : {}
                ]}>
                  {getServiceLabel(serviceId)}
                </Text>
              </View>
            );
          })}
          {totalCount > 3 && (
            <Text style={styles.moreServices}>+{totalCount - 3} more</Text>
          )}
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.dispatchedFrom}>
            <Ionicons name="location" size={12} color="#666" /> {request.dispatchedFrom || 'System'}
          </Text>
          <Text style={styles.tapHint}>Tap to update →</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderUpdateModal = () => {
    if (!selectedRequest) return null;

    return (
      <Modal
        visible={showUpdateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowUpdateModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>{selectedRequest.unitName}</Text>
              <Text style={styles.modalSubtitle}>Update Service Status</Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowUpdateModal(false)}
              style={styles.closeButton}
            >
              <MaterialIcons name="close" size={28} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Unit ID</Text>
              <Text style={styles.infoValue}>{selectedRequest.unitId}</Text>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Prepared By</Text>
              <Text style={styles.infoValue}>{selectedRequest.preparedBy || 'System'}</Text>
            </View>

            <Text style={styles.sectionTitle}>Service Checklist</Text>
            
            {(selectedRequest.service || []).map((serviceId, index) => {
              const isCompleted = selectedRequest.completedServices?.includes(serviceId);
              
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.serviceItem,
                    isCompleted ? styles.serviceItemCompleted : styles.serviceItemPending
                  ]}
                  onPress={() => updateServiceStatus(selectedRequest._id, serviceId, !isCompleted)}
                  activeOpacity={0.7}
                >
                  <View style={styles.serviceItemLeft}>
                    <View style={[
                      styles.checkbox,
                      isCompleted ? styles.checkboxChecked : styles.checkboxUnchecked
                    ]}>
                      {isCompleted && <MaterialIcons name="check" size={18} color="#fff" />}
                    </View>
                    <MaterialIcons
                      name={getServiceIcon(serviceId)}
                      size={22}
                      color={isCompleted ? '#4CAF50' : '#666'}
                      style={styles.serviceIcon}
                    />
                    <Text style={[
                      styles.serviceItemText,
                      isCompleted ? styles.serviceItemTextCompleted : {}
                    ]}>
                      {getServiceLabel(serviceId)}
                    </Text>
                  </View>
                  {isCompleted && (
                    <View style={styles.completedBadge}>
                      <Text style={styles.completedBadgeText}>✓ Done</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.modalFooter}>
            {(() => {
              const allCompleted = selectedRequest.service?.length > 0 && 
                                  selectedRequest.completedServices?.length === selectedRequest.service.length;
              const alreadyReady = selectedRequest.readyForRelease || selectedRequest.status === 'Ready for Release';
              
              return (
                <TouchableOpacity
                  style={[
                    styles.readyButton,
                    (!allCompleted || alreadyReady) && styles.readyButtonDisabled
                  ]}
                  onPress={() => markAsReadyForRelease(selectedRequest._id)}
                  disabled={!allCompleted || alreadyReady}
                  activeOpacity={0.7}
                >
                  <MaterialIcons 
                    name="check-circle" 
                    size={20} 
                    color="#fff" 
                    style={{ marginRight: 8 }} 
                  />
                  <Text style={styles.readyButtonText}>
                    {alreadyReady ? 'Already Marked as Ready' : 'Mark as Ready for Release'}
                  </Text>
                </TouchableOpacity>
              );
            })()}
            
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setShowUpdateModal(false)}
            >
              <Text style={styles.closeModalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading && !refreshing) {
    return <UniformLoading message="Loading service requests..." />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Service Requests</Text>
          <Text style={styles.headerSubtitle}>Update process status</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#DC2626']} />
        }
      >
        {serviceRequests.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="inbox" size={80} color="#ccc" />
            <Text style={styles.emptyStateText}>No Active Service Requests</Text>
            <Text style={styles.emptyStateSubtext}>Service requests will appear here</Text>
          </View>
        ) : (
          serviceRequests.map(renderRequestCard)
        )}
      </ScrollView>

      {renderUpdateModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  vehicleInfo: {
    flex: 1,
  },
  unitName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  unitId: {
    fontSize: 13,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  progressText: {
    fontSize: 13,
    color: '#1a1a1a',
    fontWeight: '700',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#DC2626',
    borderRadius: 4,
  },
  servicesPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  serviceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  serviceChipPending: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  serviceChipCompleted: {
    backgroundColor: '#4CAF50',
  },
  serviceChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  serviceChipTextCompleted: {
    color: '#fff',
  },
  moreServices: {
    fontSize: 12,
    color: '#999',
    paddingVertical: 6,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  dispatchedFrom: {
    fontSize: 12,
    color: '#666',
  },
  tapHint: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
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
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    flex: 1,
    padding: 20,
  },
  infoCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginTop: 24,
    marginBottom: 16,
  },
  serviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
  },
  serviceItemPending: {
    backgroundColor: '#fff',
    borderColor: '#e0e0e0',
  },
  serviceItemCompleted: {
    backgroundColor: '#f1f8f4',
    borderColor: '#4CAF50',
  },
  serviceItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxUnchecked: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#ccc',
  },
  checkboxChecked: {
    backgroundColor: '#4CAF50',
  },
  serviceIcon: {
    marginRight: 12,
  },
  serviceItemText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
    flex: 1,
  },
  serviceItemTextCompleted: {
    color: '#4CAF50',
  },
  completedBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  completedBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  modalFooter: {
    padding: 20,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
    gap: 12,
  },
  readyButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  readyButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  readyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  closeModalButton: {
    backgroundColor: '#666',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
