import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, RefreshControl, Modal
} from 'react-native';
import { ArrowLeft, CheckCircle2, Circle } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildApiUrl } from '../constants/api';
import UniformLoading from '../components/UniformLoading';
import NotificationService from '../utils/notificationService';

export default function DispatchDashboard({ navigation }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [unitCustomerMap, setUnitCustomerMap] = useState({});

  const parseJsonSafe = useCallback((text, fallback = {}) => {
    if (!text) return fallback;
    try {
      return JSON.parse(text);
    } catch (error) {
      console.warn('⚠️ Failed to parse JSON response:', error?.message || error);
      return fallback;
    }
  }, []);

  useEffect(() => {
    loadRequests();
    loadUnitCustomers();
  }, []);

  const loadUnitCustomers = async () => {
    try {
      const res = await fetch(buildApiUrl('/api/getUnitAllocation'));
      const bodyText = await res.text();
      const data = parseJsonSafe(bodyText, {});
      const allocations = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
      const map = {};
      allocations.forEach(alloc => {
        const key = (alloc.unitId || '').toLowerCase();
        if (!key) return;
        map[key] = {
          customerName: alloc.customerName || 'Customer',
          customerEmail: alloc.customerEmail || '',
          customerPhone: alloc.customerPhone || '',
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
      const endpoints = ['/getRequest', '/api/servicerequests'];
      let parsed = null;

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(buildApiUrl(endpoint));
          const bodyText = await response.text();
          const data = parseJsonSafe(bodyText, {});

          if (!response.ok) {
            console.warn(`⚠️ ${endpoint} returned HTTP ${response.status}`);
            continue;
          }

          parsed = data;
          break;
        } catch (endpointError) {
          console.warn(`⚠️ Failed request to ${endpoint}:`, endpointError?.message || endpointError);
        }
      }

      if (!parsed) {
        throw new Error('Unable to reach service request API');
      }

      const requestList = Array.isArray(parsed)
        ? parsed
        : (Array.isArray(parsed?.data) ? parsed.data : []);

      const activeRequests = requestList.filter(req =>
        !req.readyForRelease &&
        !req.releasedToCustomer &&
        req.status !== 'Completed' &&
        req.status !== 'Cancelled'
      );

      const grouped = activeRequests.reduce((acc, req) => {
        const key = `${req.unitId}-${req.unitName}`;
        if (!acc[key]) {
          acc[key] = {
            unitId: req.unitId,
            unitName: req.unitName,
            service: [],
            completedServices: [],
            requestIds: [],
            status: 'Pending'
          };
        }

        (Array.isArray(req.service) ? req.service : []).forEach(s => {
          if (!acc[key].service.includes(s)) {
            acc[key].service.push(s);
          }
        });

        (req.completedServices || []).forEach(s => {
          if (!acc[key].completedServices.includes(s)) {
            acc[key].completedServices.push(s);
          }
        });

        acc[key].requestIds.push(req._id);

        if (req.status === 'In Progress') acc[key].status = 'In Progress';

        return acc;
      }, {});

      const groupedRequests = Object.values(grouped);

      setRequests(groupedRequests);
      console.log('Loaded', groupedRequests.length, 'grouped vehicles from', activeRequests.length, 'requests');
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
                // Send SMS notification to customer that unit is ready for pickup
                const unitKey = (request.unitId || '').toLowerCase();
                const customerInfo = unitCustomerMap[unitKey];
                
                if (customerInfo && customerInfo.customerPhone) {
                  try {
                    const notifyResult = await NotificationService.sendStatusNotification(
                      customerInfo.customerPhone,
                      customerInfo.customerName,
                      {
                        unitName: request.unitName,
                        unitId: request.unitId,
                      },
                      'Unit Ready for Pickup',
                      `Your ${request.unitName} is now ready for pickup. Please proceed to our service center.`
                    );
                    console.log('SMS notification result:', notifyResult);
                  } catch (error) {
                    console.error('Error sending notification:', error);
                  }
                }
                
                Alert.alert('Success', 'Marked as ready for release and customer notified!');
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
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleSection}>
            <Text style={styles.cardTitle}>{request.unitName}</Text>
            <Text style={styles.cardId}>ID: {request.unitId}</Text>
          </View>
          <View style={[styles.statusBadge, { 
            backgroundColor: request.status === 'Completed' ? '#4CAF50' : '#e50914' 
          }]}>
            <Text style={styles.statusText}>{request.status || 'Pending'}</Text>
          </View>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressText}>{completed}/{total} Services</Text>
            <Text style={styles.progressPercent}>{Math.round(progress)}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.tapToUpdate}>Tap to update</Text>
          <Text style={styles.tapArrow}>→</Text>
        </View>
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
<View style={styles.modalHeaderContainer}>
          <TouchableOpacity 
            style={styles.modalBackButton}
            onPress={() => setModalVisible(false)}
          >
            <ArrowLeft size={24} color="#1a202c" strokeWidth={2.5} />
          </TouchableOpacity>
          <View style={styles.modalHeaderContent}>
            <Text style={styles.modalTitle}>{selectedRequest?.unitName}</Text>
            <Text style={styles.modalSubtitle}>ID: {selectedRequest?.unitId}</Text>
          </View>
          <View style={styles.modalHeaderSpace} />
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Unit ID</Text>
              <Text style={styles.infoValue}>{selectedRequest.unitId}</Text>
            </View>

            <Text style={styles.sectionTitle}>Service Checklist</Text>

            {(selectedRequest.service || []).map((service, index) => {
              const isDone = selectedRequest.completedServices?.includes(service);
              
              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.serviceRow, isDone && styles.serviceRowDone]}
                  onPress={() => toggleService(selectedRequest, service)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.serviceCheckbox, isDone && styles.serviceCheckboxCompleted]}>
                    {isDone ? (
                      <CheckCircle2 size={20} color="#fff" strokeWidth={2.5} />
                    ) : (
                      <Circle size={20} color="#ddd" />
                    )}
                  </View>
                  <Text style={[styles.serviceName, isDone && styles.serviceNameDone]}>
                    {service}
                  </Text>
                  {isDone && (
                    <View style={styles.doneBadge}>
                      <CheckCircle2 size={18} color="#fff" strokeWidth={2} />
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
          <View style={styles.profileButtonContent}>
            <Text style={styles.profileButtonText}>👤</Text>
          </View>
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
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No Active Requests</Text>
            <Text style={styles.emptySubtext}>Requests will appear here when services are assigned</Text>
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
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1a202c',
    letterSpacing: -0.5,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  profileButtonContent: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileButtonText: {
    fontSize: 20,
  },
  content: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8fafc',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderLeftWidth: 5,
    borderLeftColor: '#e50914',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  cardTitleSection: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a202c',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  cardId: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  progressContainer: {
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 0,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  progressText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  progressPercent: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '700',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  tapToUpdate: {
    fontSize: 13,
    color: '#e50914',
    fontWeight: '700',
  },
  tapArrow: {
    fontSize: 13,
    color: '#e50914',
    fontWeight: '700',
    marginLeft: 6,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a202c',
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  emptySubtext: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  modalBackButton: {
    padding: 8,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderRadius: 10,
  },
  modalHeaderContent: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a202c',
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    fontWeight: '500',
  },
  modalHeaderSpace: {
    width: 44,
  },
  modalBody: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8fafc',
  },
  infoBox: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 5,
    borderLeftColor: '#e50914',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  infoLabel: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 6,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  infoValue: {
    fontSize: 15,
    color: '#1a202c',
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a202c',
    marginTop: 20,
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  serviceRowDone: {
    backgroundColor: '#f0f9f0',
    borderColor: '#4CAF50',
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  serviceCheckbox: {
    marginRight: 12,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceCheckboxCompleted: {
    backgroundColor: '#4CAF50',
    borderRadius: 14,
  },
  serviceName: {
    fontSize: 15,
    color: '#1a202c',
    fontWeight: '700',
    flex: 1,
  },
  serviceNameDone: {
    color: '#2e7d32',
    textDecorationLine: 'line-through',
  },
  doneBadge: {
    marginLeft: 10,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
  },
  readyButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  readyButtonDisabled: {
    backgroundColor: '#cbd5e1',
    shadowColor: 'transparent',
  },
  readyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
