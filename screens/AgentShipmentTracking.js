import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildApiUrl } from '../constants/api';
import UniformLoading from '../components/UniformLoading';

export default function AgentShipmentTracking() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [agentName, setAgentName] = useState('');
  const [assignedShipments, setAssignedShipments] = useState([]);
  const [selectedShipment, setSelectedShipment] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const name = await AsyncStorage.getItem('accountName');
      setAgentName(name || '');
      await fetchAssignedShipments(name);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const fetchAssignedShipments = async (name) => {
    setLoading(true);
    try {
      const response = await fetch(buildApiUrl('/getAllocation'));
      const data = await response.json();
      
      if (data.success) {
        // Filter allocations assigned to this agent that are in transit or completed
        const agentShipments = (data.data || []).filter(allocation => 
          allocation.assignedAgent === name && 
          ['In Transit', 'Delivered', 'Pending'].includes(allocation.status)
        );
        
        setAssignedShipments(agentShipments);
      }
    } catch (error) {
      console.error('Error fetching shipments:', error);
      Alert.alert('Error', 'Failed to load shipments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'In Transit': return '#f59e0b';
      case 'Delivered': return '#10b981';
      case 'Pending': return '#6b7280';
      default: return '#374151';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'In Transit': return 'local-shipping';
      case 'Delivered': return 'check-circle';
      case 'Pending': return 'schedule';
      default: return 'info';
    }
  };

  const ShipmentCard = ({ shipment }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => setSelectedShipment(shipment)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <MaterialIcons name="directions-car" size={24} color="#e50914" />
          <Text style={styles.unitId}>{shipment.unitId || 'N/A'}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(shipment.status) }]}>
          <MaterialIcons name={getStatusIcon(shipment.status)} size={14} color="#fff" />
          <Text style={styles.statusText}>{shipment.status}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <MaterialIcons name="person" size={16} color="#6b7280" />
          <Text style={styles.label}>Customer:</Text>
          <Text style={styles.value}>{shipment.customerName || 'N/A'}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <MaterialIcons name="drive-eta" size={16} color="#6b7280" />
          <Text style={styles.label}>Driver:</Text>
          <Text style={styles.value}>{shipment.driver || 'Not Assigned'}</Text>
        </View>

        <View style={styles.routeContainer}>
          <View style={styles.locationRow}>
            <MaterialIcons name="trip-origin" size={16} color="#10b981" />
            <Text style={styles.locationLabel}>Pickup:</Text>
            <Text style={styles.locationText} numberOfLines={1}>
              {shipment.pickupPoint || 'N/A'}
            </Text>
          </View>
          
          <View style={styles.routeLine} />
          
          <View style={styles.locationRow}>
            <MaterialIcons name="place" size={16} color="#e50914" />
            <Text style={styles.locationLabel}>Destination:</Text>
            <Text style={styles.locationText} numberOfLines={1}>
              {shipment.destination || 'N/A'}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return <UniformLoading message="Loading shipments..." />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons name="local-shipping" size={32} color="#e50914" />
        <Text style={styles.headerTitle}>My Assigned Shipments</Text>
        <Text style={styles.headerSubtitle}>View-only tracking</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#e50914']} />
        }
      >
        {assignedShipments.length > 0 ? (
          <View style={styles.cardsContainer}>
            {assignedShipments.map((shipment, index) => (
              <ShipmentCard key={shipment._id || index} shipment={shipment} />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <MaterialIcons name="inbox" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>No shipments assigned to you</Text>
            <Text style={styles.emptySubtext}>
              Your assigned deliveries will appear here
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  cardsContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unitId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  cardBody: {
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  label: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
    flex: 1,
  },
  routeContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
    width: 80,
  },
  locationText: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
  },
  routeLine: {
    width: 2,
    height: 16,
    backgroundColor: '#e5e7eb',
    marginLeft: 7,
    marginVertical: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
  },
});
