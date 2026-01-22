// AgentVehicleTracking.js - Read-only vehicle tracking for Sales Agents
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildApiUrl } from '../constants/api';

const STATUS_COLORS = {
  'Pending': '#FFA726',
  'In Transit': '#1976D2',
  'Delivered': '#e50914',
  'Under Preparation': '#FDD835',
  'Ready for Release': '#e50914',
  'Released': '#e50914',
};

export default function AgentVehicleTracking() {
  const navigation = useNavigation();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [agentName, setAgentName] = useState('');

  useEffect(() => {
    loadAgentInfo();
  }, []);

  const loadAgentInfo = async () => {
    try {
      const username = await AsyncStorage.getItem('accountName') || 
                      await AsyncStorage.getItem('userName') ||
                      await AsyncStorage.getItem('username');
      console.log('Agent username for filtering:', username);
      setAgentName(username || '');
      fetchVehicles(username);
    } catch (error) {
      console.error('Error loading agent info:', error);
      fetchVehicles('');
    }
  };

  const fetchVehicles = async (username) => {
    try {
      // Fetch vehicle stock (where agents are assigned to vehicles)
      const res = await fetch(buildApiUrl('/getStock'));
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const text = await res.text();
      
      if (!text) {
        console.log('Empty response from server');
        setVehicles([]);
        return;
      }
      
      const data = JSON.parse(text);
      
      // Get all vehicles from stock
      let allVehicles = [];
      if (Array.isArray(data)) {
        allVehicles = data;
      } else if (data.data && Array.isArray(data.data)) {
        allVehicles = data.data;
      }
      
      // Filter vehicles assigned to this agent
      const agentVehicles = allVehicles.filter(
        v => v.assignedAgent === username
      );
      
      console.log(`Found ${agentVehicles.length} vehicles for agent ${username}`);
      setVehicles(agentVehicles);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      setVehicles([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAgentInfo();
  };

  const getStatusColor = (status) => {
    return STATUS_COLORS[status] || '#9E9E9E';
  };

  const renderVehicleCard = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('AgentVehicleDetail', { 
        vehicle: item,
        stockId: item._id 
      })}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.vehicleInfo}>
          <Text style={styles.vehicleTitle}>{item.unitName || item.model || 'Vehicle'}</Text>
          <Text style={styles.vehicleId}>{item.conductionNumber || item.unitId || 'N/A'}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status || 'In Stock'}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <MaterialIcons name="palette" size={16} color="#666" />
          <Text style={styles.infoLabel}>Color:</Text>
          <Text style={styles.infoValue}>{item.bodyColor || 'N/A'}</Text>
        </View>

        <View style={styles.infoRow}>
          <MaterialIcons name="build" size={16} color="#666" />
          <Text style={styles.infoLabel}>Variation:</Text>
          <Text style={styles.infoValue} numberOfLines={1}>
            {item.variation || 'N/A'}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <MaterialIcons name="event" size={16} color="#666" />
          <Text style={styles.infoLabel}>Arrival Date:</Text>
          <Text style={styles.infoValue}>
            {item.arrivalDate ? new Date(item.arrivalDate).toLocaleDateString() : 'N/A'}
          </Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.viewDetailsText}>Tap to view details →</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e50914" />
        <Text style={styles.loadingText}>Loading your vehicles...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Assigned Vehicles</Text>
        <Text style={styles.headerSubtitle}>{vehicles.length} vehicle(s)</Text>
      </View>

      <FlatList
        data={vehicles}
        renderItem={renderVehicleCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#e50914']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="inbox" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No vehicles assigned yet</Text>
            <Text style={styles.emptySubtext}>
              Vehicles assigned to you will appear here
            </Text>
          </View>
        }
      />
    </View>
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
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  vehicleId: {
    fontSize: 14,
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
  cardBody: {
    padding: 16,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  cardFooter: {
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  viewDetailsText: {
    fontSize: 14,
    color: '#e50914',
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});
