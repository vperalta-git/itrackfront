// DispatchDashboard.js - Rebuilt for Dispatch Role
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, RefreshControl, Modal, Dimensions
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
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

export default function DispatchDashboard({ navigation }) {
  const [serviceRequests, setServiceRequests] = useState([]);
  const [originalRequests, setOriginalRequests] = useState([]); // Store original backend requests
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  useEffect(() => {
    fetchServiceRequests();
  }, []);

  const fetchServiceRequests = useCallback(async () => {
    const isRefresh = loading || refreshing;
    if (!isRefresh) setLoading(true);
    
    try {
      const response = await fetch(buildApiUrl('/getRequest'));
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch requests`);
      }
      
      const text = await response.text();
      if (!text) {
        throw new Error('Empty response from server');
      }
      
      const data = JSON.parse(text);
      
      if (data.success) {
        // Show only requests that dispatch can work on
        // Exclude: Completed, Cancelled, Ready for Release, Released to Customer
        let activeRequests = (data.data || []).filter(req => 
          req.status !== 'Completed' && 
          req.status !== 'Cancelled' &&
          req.status !== 'Ready for Release' &&
          req.status !== 'Released to Customer' &&
          !req.readyForRelease &&
          !req.releasedToCustomer
        );

        // Store original requests for individual updates
        setOriginalRequests(activeRequests);

        // Group by unitId to combine duplicate vehicles for DISPLAY only
        const groupedRequests = {};
        activeRequests.forEach(req => {
          const key = `${req.unitId}-${req.unitName}`;
          if (!groupedRequests[key]) {
            groupedRequests[key] = {
              ...req,
              groupKey: key,
              allServices: [...(req.service || [])],
              allCompletedServices: [...(req.completedServices || [])],
              allPendingServices: [...(req.pendingServices || [])],
              requestIds: [req._id]
            };
          } else {
            // Merge services from duplicate entries
            groupedRequests[key].allServices = [
              ...new Set([...groupedRequests[key].allServices, ...(req.service || [])])
            ];
            groupedRequests[key].allCompletedServices = [
              ...new Set([...groupedRequests[key].allCompletedServices, ...(req.completedServices || [])])
            ];
            groupedRequests[key].allPendingServices = [
              ...new Set([...groupedRequests[key].allPendingServices, ...(req.pendingServices || [])])
            ];
            groupedRequests[key].requestIds.push(req._id);
          }
        });

        // Convert back to array
        const consolidatedRequests = Object.values(groupedRequests).map(req => ({
          ...req,
          service: req.allServices,
          completedServices: req.allCompletedServices,
          pendingServices: req.allPendingServices
        }));
        
        setServiceRequests(consolidatedRequests);
        console.log('Dispatch Dashboard - Consolidated requests:', consolidatedRequests.length);
        
        // Return the consolidated requests for immediate use
        return consolidatedRequests;
      }
    } catch (error) {
      console.error('Error fetching service requests:', error);
      Alert.alert('Error', 'Failed to load service requests');
      return null;
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loading, refreshing]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchServiceRequests();
  };

  const markAsReadyForRelease = async (request) => {
    try {
      const accountName = await AsyncStorage.getItem('accountName') || 'Dispatch';

      Alert.alert(
        'Confirm Ready for Release',
        `Mark ${request.unitName} as ready for release to admin?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Confirm',
            onPress: async () => {
              try {
                // Update all related request IDs
                const updatePromises = request.requestIds.map(id =>
                  fetch(buildApiUrl(`/markReadyForRelease/${id}`), {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ markedBy: accountName })
                  })
                );

                await Promise.all(updatePromises);
                
                Alert.alert('Success', `${request.unitName} is now ready for release!`);
                setShowUpdateModal(false);
                fetchServiceRequests(); // Refresh list
              } catch (error) {
                console.error('Error marking ready for release:', error);
                Alert.alert('Error', error.message || 'Failed to mark as ready for release');
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

  const updateServiceStatus = async (request, serviceId, completed) => {
    try {
      const accountName = await AsyncStorage.getItem('accountName') || 'Dispatch';

      console.log('Updating service status:', {
        requestIds: request.requestIds,
        serviceId,
        completed
      });

      console.log('🔍 Update request details:', {
        groupedRequest: {
          service: request.service,
          completedServices: request.completedServices,
          requestIds: request.requestIds
        },
        serviceToUpdate: serviceId,
        markAsCompleted: completed
      });

      // Validate service exists in the request (case-insensitive)
      const serviceExistsInRequest = request.service?.some(s => 
        s.toLowerCase() === serviceId.toLowerCase()
      );
      
      if (!serviceExistsInRequest) {
        console.error('❌ Service not found in request:', {
          lookingFor: serviceId,
          availableServices: request.service
        });
        Alert.alert('Error', 'This service is not part of this request');
        return;
      }

      // Find which original request(s) contain this specific service (case-insensitive)
      const affectedOriginalRequests = originalRequests.filter(origReq => 
        request.requestIds.includes(origReq._id) && 
        origReq.service?.some(s => s.toLowerCase() === serviceId.toLowerCase())
      );

      if (affectedOriginalRequests.length === 0) {
        console.error('❌ No original requests found for service:', serviceId);
        console.error('Available original requests:', originalRequests.map(r => ({
          id: r._id,
          services: r.service
        })));
        Alert.alert('Error', 'Could not find the service request to update');
        return;
      }

      console.log('✅ Affected original requests:', affectedOriginalRequests.map(r => ({ 
        id: r._id, 
        services: r.service,
        completed: r.completedServices,
        pending: r.pendingServices
      })));

      // Update each affected request individually
      const updatePromises = affectedOriginalRequests.map(async (origReq) => {
        // Find the actual service name from the backend (might be capitalized differently)
        const actualServiceName = origReq.service.find(s => 
          s.toLowerCase() === serviceId.toLowerCase()
        );
        
        if (!actualServiceName) {
          console.error('❌ Could not find actual service name in original request');
          return null;
        }
        
        console.log(`📝 Using actual service name: "${actualServiceName}" (input was: "${serviceId}")`);
        
        let updatedCompletedServices = [...(origReq.completedServices || [])];
        let updatedPendingServices = [...(origReq.pendingServices || origReq.service || [])];

        if (completed) {
          // Mark as completed - use actual service name from backend
          if (!updatedCompletedServices.includes(actualServiceName)) {
            updatedCompletedServices.push(actualServiceName);
          }
          updatedPendingServices = updatedPendingServices.filter(s => 
            s.toLowerCase() !== actualServiceName.toLowerCase()
          );
        } else {
          // Mark as pending
          updatedCompletedServices = updatedCompletedServices.filter(s => 
            s.toLowerCase() !== actualServiceName.toLowerCase()
          );
          if (!updatedPendingServices.includes(actualServiceName)) {
            updatedPendingServices.push(actualServiceName);
          }
        }

        // Check if all services are completed for THIS specific request
        const allCompleted = origReq.service?.length > 0 && 
                            updatedCompletedServices.length === origReq.service.length;

        const updateData = {
          completedServices: updatedCompletedServices,
          pendingServices: updatedPendingServices,
          status: allCompleted ? 'Completed' : 'In Progress',
          completedBy: allCompleted ? accountName : origReq.completedBy,
          completedAt: allCompleted ? new Date().toISOString() : origReq.completedAt
        };

        console.log(`📤 Sending update for request ${origReq._id}:`, JSON.stringify(updateData, null, 2));

        const response = await fetch(buildApiUrl(`/updateServiceRequest/${origReq._id}`), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        });

        if (!response.ok) {
          const text = await response.text();
          console.error(`❌ Backend error for ${origReq._id}:`, text);
          let errorMessage = `HTTP ${response.status}: Failed to update`;
          try {
            const errorData = JSON.parse(text);
            errorMessage = errorData.message || errorMessage;
          } catch (e) {
            // Text is not JSON, use default message
          }
          throw new Error(errorMessage);
        }

        const text = await response.text();
        if (!text) {
          throw new Error('Empty response from server');
        }
        
        const result = JSON.parse(text);
        console.log(`📥 Backend response for ${origReq._id}:`, {
          success: result.success,
          completedServices: result.data?.completedServices,
          pendingServices: result.data?.pendingServices
        });
        
        return result;
      });

      await Promise.all(updatePromises);
      
      console.log('✅ Update successful, refreshing data from backend');
      
      // Refresh from backend to get latest state
      const updatedRequests = await fetchServiceRequests();
      
      if (updatedRequests && selectedRequest?.groupKey === request.groupKey) {
        // Find the updated grouped request
        const updatedGrouped = updatedRequests.find(r => r.groupKey === request.groupKey);
        
        if (updatedGrouped) {
          console.log('📝 Updating modal with fresh data:', {
            services: updatedGrouped.service,
            completed: updatedGrouped.completedServices,
            pending: updatedGrouped.pendingServices
          });
          setSelectedRequest(updatedGrouped);
        }
      }

      // Show success feedback
      const serviceName = getServiceLabel(serviceId);
      const statusText = completed ? 'completed' : 'pending';
      console.log(`✓ ${serviceName} marked as ${statusText}`);
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
          <Text style={styles.dispatchedFrom}>From: {request.dispatchedFrom || 'System'}</Text>
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
            
            {(selectedRequest.service || []).map((serviceName, index) => {
              // Check if completed (case-insensitive)
              const isCompleted = selectedRequest.completedServices?.some(s => 
                s.toLowerCase() === serviceName.toLowerCase()
              );
              
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.serviceItem,
                    isCompleted ? styles.serviceItemCompleted : styles.serviceItemPending
                  ]}
                  onPress={() => updateServiceStatus(selectedRequest, serviceName, !isCompleted)}
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
                      name={getServiceIcon(serviceName)}
                      size={22}
                      color={isCompleted ? '#4CAF50' : '#666'}
                      style={styles.serviceIcon}
                    />
                    <Text style={[
                      styles.serviceItemText,
                      isCompleted ? styles.serviceItemTextCompleted : {}
                    ]}>
                      {getServiceLabel(serviceName)}
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
                  onPress={() => markAsReadyForRelease(selectedRequest)}
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
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => navigation.navigate('DispatchProfile')}
        >
          <MaterialIcons name="person" size={24} color="#DC2626" />
        </TouchableOpacity>
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
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
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
