import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, RefreshControl, Modal
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildApiUrl } from '../constants/api';
import UniformLoading from '../components/UniformLoading';

export default function DispatchDashboard({ navigation }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [unitCustomerMap, setUnitCustomerMap] = useState({});

  useEffect(() => {
    loadRequests();
    loadUnitCustomers();
  }, []);

  const loadUnitCustomers = async () => {
    try {
      const res = await fetch(buildApiUrl('/api/getUnitAllocation'));
      const data = await res.json();
      const allocations = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
      const map = {};
      allocations.forEach(alloc => {
        const key = (alloc.unitId || '').toLowerCase();
        if (!key) return;
        map[key] = {
          customerName: alloc.customerName || 'Customer',
          customerEmail: alloc.customerEmail || '',
        };
      });
      setUnitCustomerMap(map);
    } catch (error) {
      console.error('❌ Failed to load unit customer map:', error);
    }
  };

  const loadRequests = async () => {
    if (!refreshing) setLoading(true);
    try {
      const response = await fetch(buildApiUrl('/getRequest'));
      const data = await response.json();
      
      if (data.success) {
        // Filter: show only active requests (not completed, cancelled, or released)
        const activeRequests = data.data.filter(req => 
          !req.readyForRelease && 
          !req.releasedToCustomer &&
          req.status !== 'Completed' &&
          req.status !== 'Cancelled'
        );
        
        // Group requests by unitId + unitName
        const grouped = activeRequests.reduce((acc, req) => {
          const key = `${req.unitId}-${req.unitName}`;
          if (!acc[key]) {
            acc[key] = {
              unitId: req.unitId,
              unitName: req.unitName,
              service: [],
              completedServices: [],
              requestIds: [], // Track individual request IDs
              status: 'Pending'
            };
          }
          
          // Merge services from all requests with same vehicle
          req.service.forEach(s => {
            if (!acc[key].service.includes(s)) {
              acc[key].service.push(s);
            }
          });
          
          // Merge completed services
          (req.completedServices || []).forEach(s => {
            if (!acc[key].completedServices.includes(s)) {
              acc[key].completedServices.push(s);
            }
          });
          
          // Track individual request IDs for updates
          acc[key].requestIds.push(req._id);
          
          // Update status to most progressed
          if (req.status === 'In Progress') acc[key].status = 'In Progress';
          
          return acc;
        }, {});
        
        // Convert to array
        const groupedRequests = Object.values(grouped);
        
        setRequests(groupedRequests);
        console.log('Loaded', groupedRequests.length, 'grouped vehicles from', activeRequests.length, 'requests');
      }
    } catch (error) {
      console.error('Load error:', error);
      Alert.alert('Error', 'Failed to load requests');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const toggleService = async (groupedRequest, serviceName) => {
    try {
      const accountName = await AsyncStorage.getItem('accountName') || 'Dispatch';
      
      // Check if service is currently completed
      const isCompleted = groupedRequest.completedServices?.includes(serviceName);
      
      // Toggle: add if not completed, remove if completed
      let newCompleted = [...(groupedRequest.completedServices || [])];
      let newPending = groupedRequest.service.filter(s => !newCompleted.includes(s));
      
      if (isCompleted) {
        // Remove from completed, add to pending
        newCompleted = newCompleted.filter(s => s !== serviceName);
        if (!newPending.includes(serviceName)) {
          newPending.push(serviceName);
        }
      } else {
        // Add to completed, remove from pending
        if (!newCompleted.includes(serviceName)) {
          newCompleted.push(serviceName);
        }
        newPending = newPending.filter(s => s !== serviceName);
      }

      // Check if all services completed
      const allDone = groupedRequest.service.length > 0 && 
                      newCompleted.length === groupedRequest.service.length;

      const updateData = {
        completedServices: newCompleted,
        pendingServices: newPending,
        status: allDone ? 'Completed' : 'In Progress',
        completedBy: allDone ? accountName : undefined,
        completedAt: allDone ? new Date().toISOString() : undefined
      };

      console.log('Updating', groupedRequest.requestIds.length, 'requests for', groupedRequest.unitName);

      // Update ALL individual requests for this vehicle
      const updatePromises = groupedRequest.requestIds.map(requestId =>
        fetch(buildApiUrl(`/updateServiceRequest/${requestId}`), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        })
      );

      const responses = await Promise.all(updatePromises);
      const allSuccess = responses.every(r => r.ok);
      
      if (allSuccess) {
        // Update local state immediately
        setRequests(prev => prev.map(r => 
          r.unitId === groupedRequest.unitId && r.unitName === groupedRequest.unitName
            ? { ...r, ...updateData }
            : r
        ));
        
        if (selectedRequest?.unitId === groupedRequest.unitId && 
            selectedRequest?.unitName === groupedRequest.unitName) {
          setSelectedRequest({ ...selectedRequest, ...updateData });
        }
        
        console.log('✓ Updated successfully');
      } else {
        Alert.alert('Error', 'Failed to update some requests');
      }
    } catch (error) {
      console.error('Update error:', error);
      Alert.alert('Error', 'Failed to update service');
    }
  };

  const markReady = async (request) => {
    const allDone = request.service.length > 0 &&
                    request.completedServices?.length === request.service.length;
    
    if (!allDone) {
      Alert.alert('Notice', 'Please complete all services first');
      return;
    }

    Alert.alert(
      'Confirm',
      `Mark ${request.unitName} as ready for release?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              const accountName = await AsyncStorage.getItem('accountName') || 'Dispatch';
              
              // Mark ALL individual requests as ready
              const markPromises = request.requestIds.map(requestId =>
                fetch(buildApiUrl(`/markReadyForRelease/${requestId}`), {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ markedBy: accountName })
                })
              );

              const responses = await Promise.all(markPromises);
              const allSuccess = responses.every(r => r.ok);
              
              if (allSuccess) {
                Alert.alert('Success', 'Marked as ready for release!');
                setModalVisible(false);
                loadRequests();
              } else {
                Alert.alert('Error', 'Failed to mark some requests as ready');
              }
            } catch (error) {
              console.error('Mark ready error:', error);
              Alert.alert('Error', 'Failed to mark as ready');
            }
          }
        }
      ]
    );
  };

  const renderCard = (request, index) => {
    const completed = request.completedServices?.length || 0;
    const total = request.service?.length || 0;
    const progress = total > 0 ? (completed / total) * 100 : 0;

    return (
      <TouchableOpacity
        key={`${request.unitId}-${request.unitName}-${index}`}
        style={styles.card}
        onPress={() => {
          setSelectedRequest(request);
          setModalVisible(true);
        }}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{request.unitName}</Text>
          <View style={[styles.statusBadge, { 
            backgroundColor: request.status === 'Completed' ? '#4CAF50' : '#2196F3' 
          }]}>
            <Text style={styles.statusText}>{request.status || 'Pending'}</Text>
          </View>
        </View>

        <Text style={styles.cardSubtitle}>ID: {request.unitId}</Text>

        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>{completed}/{total} Services</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>

        <Text style={styles.cardFooter}>Tap to update →</Text>
      </TouchableOpacity>
    );
  };

  const renderModal = () => {
    if (!selectedRequest) return null;

    const allDone = selectedRequest.service.length > 0 &&
                    selectedRequest.completedServices?.length === selectedRequest.service.length;

    return (
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{selectedRequest.unitName}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <MaterialIcons name="close" size={28} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Unit ID</Text>
              <Text style={styles.infoValue}>{selectedRequest.unitId}</Text>
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Prepared By</Text>
              <Text style={styles.infoValue}>{selectedRequest.preparedBy || 'System'}</Text>
            </View>

            <Text style={styles.sectionTitle}>Service Checklist</Text>

            {(selectedRequest.service || []).map((service, index) => {
              const isDone = selectedRequest.completedServices?.includes(service);
              
              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.serviceRow, isDone && styles.serviceRowDone]}
                  onPress={() => toggleService(selectedRequest, service)}
                >
                  <View style={[styles.checkbox, isDone && styles.checkboxChecked]}>
                    {isDone && <MaterialIcons name="check" size={18} color="#fff" />}
                  </View>
                  <Text style={[styles.serviceName, isDone && styles.serviceNameDone]}>
                    {service}
                  </Text>
                  {isDone && (
                    <View style={styles.doneBadge}>
                      <Text style={styles.doneBadgeText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.readyButton, !allDone && styles.readyButtonDisabled]}
              onPress={() => markReady(selectedRequest)}
              disabled={!allDone}
            >
              <Text style={styles.readyButtonText}>
                {allDone ? 'Mark as Ready for Release' : 'Complete all services first'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return <UniformLoading message="Loading requests..." />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Service Requests</Text>
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
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => {
              setRefreshing(true);
              loadRequests();
            }}
            colors={['#DC2626']}
          />
        }
      >
        {requests.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="inbox" size={80} color="#ccc" />
            <Text style={styles.emptyText}>No Active Requests</Text>
          </View>
        ) : (
          requests.map(renderCard)
        )}
      </ScrollView>

      {renderModal()}
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
    color: '#333',
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
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
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
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
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
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  cardFooter: {
    fontSize: 12,
    color: '#DC2626',
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
  infoBox: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginTop: 20,
    marginBottom: 12,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  serviceRowDone: {
    backgroundColor: '#f0f9f4',
    borderColor: '#4CAF50',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ccc',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  serviceName: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  serviceNameDone: {
    color: '#2E7D32',
    fontWeight: '600',
  },
  doneBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  doneBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  readyButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  readyButtonDisabled: {
    backgroundColor: '#ccc',
  },
  readyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
