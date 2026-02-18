// AgentVehicleDetail.js - Read-only vehicle details for Sales Agents
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import {
  ArrowLeft, Car, Info, Truck, Wrench, Check, User, InfoIcon
} from 'lucide-react-native';
import { buildApiUrl } from '../constants/api';

const STATUS_COLORS = {
  'awaiting_dispatch': '#FFA726',
  'in_transit': '#1976D2',
  'arrived_dealership': '#7B1FA2',
  'under_preparation': '#FDD835',
  'ready_for_release': '#e50914',
  'released_to_customer': '#e50914',
};

export default function AgentVehicleDetail() {
  const { params } = useRoute();
  const navigation = useNavigation();
  const { allocationId } = params;
  const [vehicle, setVehicle] = useState(null);
  const [serviceRequest, setServiceRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchVehicleDetails();
  }, []);

  const fetchVehicleDetails = async () => {
    try {
      const res = await fetch(buildApiUrl('/getAllocation'));
      const data = await res.json();
      
      const foundVehicle = (data.allocation || data || []).find(v => v._id === allocationId);
      
      if (foundVehicle) {
        setVehicle(foundVehicle);
        await fetchServiceRequest(foundVehicle.unitId);
      }
    } catch (error) {
      console.error('Error fetching vehicle:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchServiceRequest = async (unitId) => {
    try {
      const res = await fetch(buildApiUrl('/api/service-requests'));
      const data = await res.json();
      
      const request = (data.requests || []).find(r => r.unitId === unitId);
      if (request) {
        setServiceRequest(request);
      }
    } catch (error) {
      console.error('Failed to fetch service request:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchVehicleDetails();
  };

  const getStatusLabel = (status) => {
    const statusMap = {
      'awaiting_dispatch': 'Awaiting Dispatch',
      'in_transit': 'In Transit',
      'arrived_dealership': 'Arrived at Dealership',
      'under_preparation': 'Under Preparation',
      'ready_for_release': 'Ready for Release',
      'released_to_customer': 'Released to Customer',
    };
    return statusMap[status] || status;
  };

  const getServiceProgress = () => {
    if (!serviceRequest || !serviceRequest.service) return { completed: 0, total: 0 };
    const completed = (serviceRequest.completedServices || []).length;
    const total = serviceRequest.service.length;
    return { completed, total };
  };

  if (loading || !vehicle) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e50914" />
        <Text style={styles.loadingText}>Loading vehicle details...</Text>
      </View>
    );
  }

  const progress = getServiceProgress();
  const statusColor = STATUS_COLORS[vehicle.dispatchStatus] || '#9E9E9E';

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#e50914']} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vehicle Details</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Vehicle Info Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Car size={24} color="#e50914" />
          <Text style={styles.cardTitle}>Vehicle Information</Text>
        </View>
        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Unit Name:</Text>
            <Text style={styles.value}>{vehicle.unitName || vehicle.model}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.label}>Unit ID:</Text>
            <Text style={styles.value}>{vehicle.unitId}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.label}>Body Color:</Text>
            <Text style={styles.value}>{vehicle.bodyColor || 'N/A'}</Text>
          </View>
          {vehicle.variation && (
            <>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.label}>Variation:</Text>
                <Text style={styles.value}>{vehicle.variation}</Text>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Status Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Info size={24} color="#2196F3" />
          <Text style={styles.cardTitle}>Current Status</Text>
        </View>
        <View style={styles.cardBody}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>
              {getStatusLabel(vehicle.dispatchStatus || vehicle.status)}
            </Text>
          </View>
        </View>
      </View>

      {/* Delivery Info */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Truck size={24} color="#FF9800" />
          <Text style={styles.cardTitle}>Delivery Information</Text>
        </View>
        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Driver:</Text>
            <Text style={styles.value}>{vehicle.assignedDriver || 'Not assigned'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.label}>Destination:</Text>
            <Text style={styles.value}>
              {vehicle.deliveryDestination?.address || 'Not specified'}
            </Text>
          </View>
          {vehicle.routeInfo?.routeCompleted && (
            <>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <Text style={styles.label}>Delivered:</Text>
                <Text style={styles.value}>
                  {new Date(vehicle.routeInfo.routeCompleted).toLocaleString()}
                </Text>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Service Preparation Status */}
      {serviceRequest && serviceRequest.service && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Wrench size={24} color="#9C27B0" />
            <Text style={styles.cardTitle}>
              Service Preparation ({progress.completed}/{progress.total})
            </Text>
          </View>
          <View style={styles.cardBody}>
            <View style={styles.servicesContainer}>
              {serviceRequest.service.map((service, index) => {
                const isCompleted = (serviceRequest.completedServices || []).includes(service);
                
                return (
                  <View key={index} style={styles.serviceItem}>
                    <View style={[
                      styles.serviceCheckbox,
                      isCompleted && styles.checkboxCompleted
                    ]}>
                      {isCompleted && (
                        <Check size={18} color="#fff" />
                      )}
                    </View>
                    <Text style={[
                      styles.serviceText,
                      isCompleted && styles.serviceTextCompleted
                    ]}>
                      {service}
                    </Text>
                    {!isCompleted && (
                      <View style={styles.pendingBadge}>
                        <Text style={styles.pendingText}>Pending</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      )}

      {/* Customer Info */}
      {vehicle.customerName && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <User size={24} color="#4CAF50" />
            <Text style={styles.cardTitle}>Customer Information</Text>
          </View>
          <View style={styles.cardBody}>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Name:</Text>
              <Text style={styles.value}>{vehicle.customerName}</Text>
            </View>
            {vehicle.customerPhone && (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Phone:</Text>
                  <Text style={styles.value}>{vehicle.customerPhone}</Text>
                </View>
              </>
            )}
            {vehicle.customerEmail && (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Email:</Text>
                  <Text style={styles.value}>{vehicle.customerEmail}</Text>
                </View>
              </>
            )}
          </View>
        </View>
      )}

      {/* Read-Only Notice */}
      <View style={styles.noticeCard}>
        <InfoIcon size={20} color="#2196F3" />
        <Text style={styles.noticeText}>
          This is a read-only view. Only dispatch can update vehicle status and service completion.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#e50914',
    padding: 16,
    paddingTop: 40,
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  card: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  cardBody: {
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  value: {
    fontSize: 14,
    color: '#1f2937',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 12,
  },
  statusBadge: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: 'center',
  },
  statusText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  servicesContainer: {
    gap: 12,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    gap: 12,
  },
  serviceCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxCompleted: {
    backgroundColor: '#e50914',
    borderColor: '#e50914',
  },
  serviceText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  serviceTextCompleted: {
    color: '#6b7280',
    textDecorationLine: 'line-through',
  },
  pendingBadge: {
    backgroundColor: '#fff3cd',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  pendingText: {
    fontSize: 11,
    color: '#856404',
    fontWeight: '700',
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    gap: 12,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    color: '#1976D2',
    lineHeight: 18,
  },
});
