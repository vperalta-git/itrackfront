import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { buildApiUrl } from '../constants/api';
import UniformLoading from '../components/UniformLoading';

export default function VehicleProgressScreen() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchVehicles = async () => {
    try {
      console.log('🔄 Fetching dispatch assignments...');
      const res = await fetch(buildApiUrl('/api/dispatch/assignments'));
      
      if (!res.ok) {
        console.error('❌ Failed to fetch assignments:', res.status);
        setVehicles([]);
        return;
      }
      
      const responseData = await res.json();
      console.log('✅ Received assignments:', responseData);
      
      // Handle different response formats
      const data = Array.isArray(responseData) ? responseData : 
                  (responseData.success && Array.isArray(responseData.data) ? responseData.data : []);
      
      setVehicles(data);
    } catch (err) {
      console.error('❌ Failed to fetch vehicles:', err);
      setVehicles([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchVehicles();
  };

  const renderProcesses = (item) => {
    // Handle processStatus object from backend
    const processStatus = item.processStatus || {};
    const requestedProcesses = item.requestedProcesses || [];
    
    // If no processStatus and no requestedProcesses, show nothing
    if (Object.keys(processStatus).length === 0 && requestedProcesses.length === 0) {
      return <Text style={styles.noProcessText}>No processes assigned</Text>;
    }
    
    // Process names mapping
    const processNames = {
      tinting: 'Window Tinting',
      carwash: 'Car Wash',
      ceramic_coating: 'Ceramic Coating',
      accessories: 'Accessories Installation',
      rust_proof: 'Rust Proofing'
    };
    
    // Render processes from processStatus object
    if (Object.keys(processStatus).length > 0) {
      return Object.entries(processStatus).map(([key, completed], index) => (
        <View key={index} style={[styles.processItem, completed ? styles.done : styles.pending]}>
          <Text style={styles.processText}>
            {processNames[key] || key} - {completed ? '✅ Done' : '⏳ Pending'}
          </Text>
        </View>
      ));
    }
    
    // Fallback: render from requestedProcesses array (if processStatus not available)
    return requestedProcesses.map((process, index) => {
      const isCompleted = process.completed || false;
      return (
        <View key={index} style={[styles.processItem, isCompleted ? styles.done : styles.pending]}>
          <Text style={styles.processText}>
            {process.name || process.processId || process} - {isCompleted ? '✅ Done' : '⏳ Pending'}
          </Text>
        </View>
      );
    });
  };

  const renderVehicle = ({ item }) => {
    // Calculate completion from processStatus object
    const processStatus = item.processStatus || {};
    const requestedProcesses = item.requestedProcesses || [];
    
    let totalProcesses = 0;
    let completedProcesses = 0;
    
    // Use processStatus if available (backend standard)
    if (Object.keys(processStatus).length > 0) {
      totalProcesses = Object.keys(processStatus).length;
      completedProcesses = Object.values(processStatus).filter(status => status === true).length;
    } else if (requestedProcesses.length > 0) {
      // Fallback to requestedProcesses array
      totalProcesses = requestedProcesses.length;
      completedProcesses = requestedProcesses.filter(p => p.completed).length;
    }
    
    const completionPercentage = totalProcesses > 0 ? Math.round((completedProcesses / totalProcesses) * 100) : 0;
    
    return (
      <View style={styles.card}>
        <Text style={styles.vehicleTitle}>
          {item.unitName || item.model || 'Unknown Vehicle'}
        </Text>
        <Text style={styles.subtitle}>
          Unit ID: {item.unitId || 'N/A'}
        </Text>
        <Text style={styles.subtitle}>
          Driver: {item.assignedDriver || 'Not Assigned'}
        </Text>
        <Text style={styles.subtitle}>
          Agent: {item.assignedAgent || 'Not Assigned'}
        </Text>
        
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            Progress: {completedProcesses}/{totalProcesses} ({completionPercentage}%)
          </Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${completionPercentage}%` }]} />
          </View>
        </View>
        
        {/* Processes */}
        <Text style={styles.processesTitle}>Preparation Processes:</Text>
        {renderProcesses(item)}
      </View>
    );
  };

  if (loading) {
    return <UniformLoading message="Loading vehicle preparations..." />;
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#DC2626']} />
      }
    >
      <Text style={styles.header}>Vehicle Preparation Tracker</Text>
      <Text style={styles.subheader}>Track vehicle preparation and dispatch assignments</Text>
      
      {vehicles.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No vehicles in preparation</Text>
          <Text style={styles.emptySubtext}>Vehicles assigned for preparation will appear here</Text>
        </View>
      ) : (
        <FlatList
          data={vehicles}
          keyExtractor={(item, index) => item._id || item.unitId || `vehicle-${index}`}
          renderItem={renderVehicle}
          scrollEnabled={false}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 16, 
    backgroundColor: '#f5f7fa' 
  },
  header: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginBottom: 8,
    color: '#1e293b'
  },
  subheader: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16
  },
  card: { 
    marginBottom: 16, 
    padding: 16, 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  vehicleTitle: { 
    fontSize: 18, 
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8
  },
  subtitle: { 
    fontSize: 14, 
    color: '#64748b', 
    marginBottom: 4 
  },
  progressContainer: {
    marginTop: 12,
    marginBottom: 12
  },
  progressText: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 6,
    fontWeight: '600'
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#DC2626',
    borderRadius: 4
  },
  processesTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 8,
    marginBottom: 8
  },
  processItem: { 
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginVertical: 4,
    borderRadius: 6,
    borderLeftWidth: 3
  },
  done: { 
    backgroundColor: '#dcfce7',
    borderLeftColor: '#16a34a'
  },
  pending: { 
    backgroundColor: '#fef3c7',
    borderLeftColor: '#eab308'
  },
  processText: { 
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '500'
  },
  processDate: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2
  },
  noProcessText: {
    fontSize: 14,
    color: '#94a3b8',
    fontStyle: 'italic',
    padding: 12
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center'
  }
});
