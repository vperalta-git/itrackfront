import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { buildApiUrl } from '../constants/api';
import UniformLoading from '../components/UniformLoading';

const { width } = Dimensions.get('window');

export default function DriverHistory({ navigation }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [driverName, setDriverName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [selectedDelivery, setSelectedDelivery] = useState(null);

  useEffect(() => {
    loadDriverInfo();
  }, []);

  useEffect(() => {
    if (driverName || userEmail) {
      fetchHistory();
    }
  }, [driverName, userEmail]);

  const loadDriverInfo = async () => {
    try {
      const accountName = await AsyncStorage.getItem('accountName');
      const email = await AsyncStorage.getItem('userEmail');
      setDriverName(accountName || 'Unknown Driver');
      setUserEmail(email || '');
    } catch (error) {
      console.error('Error loading driver info:', error);
    }
  };

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(buildApiUrl('/getAllocation'));
      const data = await res.json();
      
      const allocationsArray = data.data || data.allocation || data || [];
      
      // Filter for completed deliveries by this driver
      const completedDeliveries = allocationsArray.filter(allocation => {
        const assignedDriver = allocation.assignedDriver || '';
        const normalizedAssigned = assignedDriver.toLowerCase().trim();
        const normalizedDriverName = (driverName || '').toLowerCase().trim();
        
        // Match by email or name
        const emailMatch = allocation.assignedDriverEmail && userEmail && 
                          allocation.assignedDriverEmail.toLowerCase() === userEmail.toLowerCase();
        const exactMatch = normalizedAssigned === normalizedDriverName;
        const containsMatch = normalizedDriverName.length > 3 && (
          normalizedAssigned.includes(normalizedDriverName) || 
          normalizedDriverName.includes(normalizedAssigned)
        );
        
        const isMatch = emailMatch || exactMatch || containsMatch;
        const isCompleted = allocation.status?.toLowerCase() === 'completed';
        
        return isMatch && isCompleted;
      });
      
      // Sort by completion time (most recent first)
      completedDeliveries.sort((a, b) => {
        const dateA = new Date(a.completedAt || a.completionTime || a.updatedAt);
        const dateB = new Date(b.completedAt || b.completionTime || b.updatedAt);
        return dateB - dateA;
      });
      
      setHistory(completedDeliveries);
      console.log(`✅ Found ${completedDeliveries.length} completed deliveries`);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [driverName, userEmail]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateDuration = (pickupTime, completionTime) => {
    if (!pickupTime || !completionTime) return 'N/A';
    const start = new Date(pickupTime);
    const end = new Date(completionTime);
    const diffMs = end - start;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMins}m`;
    }
    return `${diffMins}m`;
  };

  const renderHistoryItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.historyCard, selectedDelivery?._id === item._id && styles.selectedCard]}
      onPress={() => setSelectedDelivery(item)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.vehicleInfoRow}>
          <View style={[styles.colorIndicator, { backgroundColor: item.bodyColor || '#888' }]} />
          <View style={styles.vehicleDetails}>
            <Text style={styles.vehicleName}>{item.unitName}</Text>
            <Text style={styles.vehicleId}>ID: {item.unitId}</Text>
          </View>
        </View>
        <View style={styles.completedBadge}>
          <Ionicons name="checkmark-done-circle" size={20} color="#10B981" />
        </View>
      </View>

      <View style={styles.routeInfo}>
        <View style={styles.routeRow}>
          <Ionicons name="location" size={16} color="#10B981" />
          <Text style={styles.routeLabel}>From:</Text>
          <Text style={styles.routeText} numberOfLines={1}>{item.pickupPoint || 'N/A'}</Text>
        </View>
        <View style={styles.routeRow}>
          <Ionicons name="flag" size={16} color="#DC2626" />
          <Text style={styles.routeLabel}>To:</Text>
          <Text style={styles.routeText} numberOfLines={1}>{item.dropoffPoint || 'N/A'}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.timeInfo}>
          <Ionicons name="time-outline" size={14} color="#666" />
          <Text style={styles.timeText}>
            {formatDate(item.completedAt || item.completionTime || item.updatedAt)}
          </Text>
        </View>
        {item.pickupTime && item.completionTime && (
          <View style={styles.durationBadge}>
            <Ionicons name="timer-outline" size={14} color="#666" />
            <Text style={styles.durationText}>
              {calculateDuration(item.pickupTime, item.completionTime)}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderDetails = () => {
    if (!selectedDelivery) {
      return (
        <View style={styles.emptyDetails}>
          <Ionicons name="document-text-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>Select a delivery to view details</Text>
        </View>
      );
    }

    return (
      <ScrollView style={styles.detailsContainer}>
        <Text style={styles.detailsTitle}>Delivery Details</Text>
        
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Vehicle Information</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Model:</Text>
            <Text style={styles.detailValue}>{selectedDelivery.unitName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Unit ID:</Text>
            <Text style={styles.detailValue}>{selectedDelivery.unitId}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Color:</Text>
            <View style={styles.colorInfo}>
              <View style={[styles.colorDot, { backgroundColor: selectedDelivery.bodyColor || '#888' }]} />
              <Text style={styles.detailValue}>{selectedDelivery.bodyColor}</Text>
            </View>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Variation:</Text>
            <Text style={styles.detailValue}>{selectedDelivery.variation || 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Route Information</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Pickup:</Text>
            <Text style={styles.detailValue}>{selectedDelivery.pickupPoint || 'N/A'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Dropoff:</Text>
            <Text style={styles.detailValue}>{selectedDelivery.dropoffPoint || 'N/A'}</Text>
          </View>
          {selectedDelivery.routeDistance && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Distance:</Text>
              <Text style={styles.detailValue}>{selectedDelivery.routeDistance} km</Text>
            </View>
          )}
        </View>

        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          {selectedDelivery.pickupTime && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Picked Up:</Text>
              <Text style={styles.detailValue}>{formatDate(selectedDelivery.pickupTime)}</Text>
            </View>
          )}
          {selectedDelivery.completionTime && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Delivered:</Text>
              <Text style={styles.detailValue}>{formatDate(selectedDelivery.completionTime)}</Text>
            </View>
          )}
          {selectedDelivery.completedAt && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Completed:</Text>
              <Text style={styles.detailValue}>{formatDate(selectedDelivery.completedAt)}</Text>
            </View>
          )}
          {selectedDelivery.pickupTime && selectedDelivery.completionTime && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Duration:</Text>
              <Text style={styles.detailValue}>
                {calculateDuration(selectedDelivery.pickupTime, selectedDelivery.completionTime)}
              </Text>
            </View>
          )}
        </View>

        {selectedDelivery.assignedAgent && (
          <View style={styles.detailsCard}>
            <Text style={styles.sectionTitle}>Additional Info</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Agent:</Text>
              <Text style={styles.detailValue}>{selectedDelivery.assignedAgent}</Text>
            </View>
          </View>
        )}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#DC2626" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delivery History</Text>
        <View style={styles.placeholder} />
      </View>

      {loading && !refreshing ? (
        <UniformLoading message="Loading history..." size="large" />
      ) : (
        <View style={styles.content}>
          <View style={styles.listContainer}>
            <Text style={styles.subtitle}>
              {history.length} Completed {history.length === 1 ? 'Delivery' : 'Deliveries'}
            </Text>
            <FlatList
              data={history}
              renderItem={renderHistoryItem}
              keyExtractor={(item) => item._id}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="car-outline" size={64} color="#ccc" />
                  <Text style={styles.emptyText}>No delivery history yet</Text>
                  <Text style={styles.emptySubtext}>
                    Completed deliveries will appear here
                  </Text>
                </View>
              }
            />
          </View>

          {width >= 768 && (
            <View style={styles.detailsPanel}>
              {renderDetails()}
            </View>
          )}
        </View>
      )}

      {/* Mobile Details Modal */}
      {width < 768 && selectedDelivery && (
        <View style={styles.mobileDetailsOverlay}>
          <View style={styles.mobileDetailsContent}>
            <View style={styles.mobileDetailsHeader}>
              <Text style={styles.detailsTitle}>Delivery Details</Text>
              <TouchableOpacity onPress={() => setSelectedDelivery(null)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>
            {renderDetails()}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 40,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    flexDirection: width >= 768 ? 'row' : 'column',
  },
  listContainer: {
    flex: width >= 768 ? 1 : undefined,
    width: width >= 768 ? '50%' : '100%',
    padding: 16,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 16,
  },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedCard: {
    borderColor: '#007AFF',
    borderWidth: 2,
    shadowOpacity: 0.1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  vehicleInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  colorIndicator: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  vehicleDetails: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  vehicleId: {
    fontSize: 13,
    color: '#666',
  },
  completedBadge: {
    padding: 4,
  },
  routeInfo: {
    marginBottom: 12,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  routeLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
    minWidth: 40,
  },
  routeText: {
    fontSize: 13,
    color: '#333',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    color: '#666',
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  durationText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  detailsPanel: {
    flex: 1,
    width: '50%',
    backgroundColor: '#fff',
    borderLeftWidth: 1,
    borderLeftColor: '#e0e0e0',
  },
  detailsContainer: {
    flex: 1,
    padding: 20,
  },
  detailsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  detailsCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '600',
    flex: 2,
    textAlign: 'right',
  },
  colorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    flex: 2,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyDetails: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  mobileDetailsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  mobileDetailsContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  mobileDetailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
});
