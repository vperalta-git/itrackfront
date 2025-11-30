import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildApiUrl } from '../constants/api';
import UniformLoading from '../components/UniformLoading';

export default function ReleaseScreen() {
  const [pendingReleases, setPendingReleases] = useState([]);
  const [releaseHistory, setReleaseHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    await Promise.all([
      fetchPendingReleases(),
      fetchReleaseHistory()
    ]);
    setLoading(false);
  };

  const fetchPendingReleases = async () => {
    try {
      const response = await fetch(buildApiUrl('/getRequest'));
      const data = await response.json();

      if (data.success) {
        // Filter for service requests marked as ready for release
        const readyForRelease = (data.data || []).filter(request => {
          return request.readyForRelease === true && request.releasedToCustomer !== true;
        });
        setPendingReleases(readyForRelease);
      }
    } catch (error) {
      console.error('Error fetching pending releases:', error);
    }
  };

  const fetchReleaseHistory = async () => {
    try {
      const response = await fetch(buildApiUrl('/getRequest'));
      const data = await response.json();

      if (data.success) {
        // Filter for today's releases
        const today = new Date().toDateString();
        const todayReleases = (data.data || []).filter(request => {
          if (!request.releasedToCustomer || !request.releasedAt) return false;
          const releaseDate = new Date(request.releasedAt).toDateString();
          return releaseDate === today;
        });
        setReleaseHistory(todayReleases);
      }
    } catch (error) {
      console.error('Error fetching release history:', error);
    }
  };

  const handleConfirmRelease = (request) => {
    Alert.alert(
      'Confirm Vehicle Release',
      `Release ${request.unitName} (${request.unitId}) to customer?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Release Vehicle',
          style: 'destructive',
          onPress: async () => {
            try {
              const userName = await AsyncStorage.getItem('accountName') || 'Admin';
              
              const response = await fetch(buildApiUrl(`/releaseToCustomer/${request._id}`), {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ releasedBy: userName }),
              });

              const result = await response.json();

              if (!response.ok || !result.success) {
                throw new Error(result.message || 'Failed to confirm release');
              }

              Alert.alert(
                'Success', 
                `Vehicle ${request.unitName} has been released to customer!`
              );
              
              fetchData(); // Refresh data
              
            } catch (error) {
              console.error('Error confirming release:', error);
              Alert.alert('Error', error.message || 'Failed to confirm release');
            }
          }
        }
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  if (loading) {
    return <UniformLoading message="Loading release data..." />;
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Vehicle Release Management</Text>
        <Text style={styles.subtitle}>
          Confirm release for vehicles ready from dispatch
        </Text>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: '#DC2626' }]}>
          <Text style={styles.statNumber}>{pendingReleases.length}</Text>
          <Text style={styles.statLabel}>Pending Release</Text>
        </View>
        
        <View style={[styles.statCard, { backgroundColor: '#DC2626' }]}>
          <Text style={styles.statNumber}>{releaseHistory.length}</Text>
          <Text style={styles.statLabel}>Released Today</Text>
        </View>
      </View>

      {/* Pending Releases List */}
      <Text style={styles.sectionTitle}>Vehicles Ready for Release</Text>
      
      {pendingReleases.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No vehicles ready for release</Text>
          <Text style={styles.emptySubtext}>
            Vehicles will appear here when all processes are completed in dispatch
          </Text>
        </View>
      ) : (
        pendingReleases.map((vehicle, index) => (
          <View key={index} style={styles.vehicleCard}>
            {/* Vehicle Info */}
            <View style={styles.vehicleHeader}>
              <View style={styles.vehicleInfo}>
                <Text style={styles.vehicleTitle}>
                  {vehicle.unitName || 'Unknown Model'}
                </Text>
                <Text style={styles.vehicleSubtitle}>
                  Unit ID: {vehicle.unitId}
                </Text>
                {vehicle.completedBy && (
                  <Text style={styles.vehicleSubtitle}>
                    Completed by: {vehicle.completedBy}
                  </Text>
                )}
              </View>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>Ready</Text>
              </View>
            </View>

            {/* Process Status */}
            <View style={styles.processSection}>
              <Text style={styles.processTitle}>Completed Services:</Text>
              <View style={styles.processList}>
                {(vehicle.completedServices || []).map((serviceId, idx) => {
                  const serviceName = serviceId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                  return (
                    <View key={idx} style={styles.processChip}>
                      <Text style={styles.processChipText}>{serviceName}</Text>
                      <Text style={styles.processCheckMark}>✓</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Prepared By */}
            {vehicle.preparedBy && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Prepared by: </Text>
                <Text style={styles.infoValue}>{vehicle.preparedBy}</Text>
              </View>
            )}

            {/* Release Action */}
            <TouchableOpacity
              style={styles.releaseButton}
              onPress={() => handleConfirmRelease(vehicle)}
            >
              <Text style={styles.releaseButtonText}>
                🚗 Confirm Release to Customer
              </Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#DC2626',
    padding: 20,
    paddingTop: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 16,
  },
  statCard: {
    flex: 1,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#fff',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  vehicleCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  vehicleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  vehicleSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  statusBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  processSection: {
    marginBottom: 16,
  },
  processTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  processList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  processChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  processChipText: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '500',
  },
  processCheckMark: {
    fontSize: 12,
    color: '#2E7D32',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  releaseButton: {
    backgroundColor: '#DC2626',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  releaseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
