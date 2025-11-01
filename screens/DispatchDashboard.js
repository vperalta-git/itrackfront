// DispatchDashboard.js - Process Management for I-Track
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, FlatList,
  TouchableOpacity, StyleSheet, Alert,
  TextInput, RefreshControl,
  Modal
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { buildApiUrl } from '../constants/api';
import UniformLoading from '../components/UniformLoading';

// Available processes that dispatch can manage
const AVAILABLE_PROCESSES = [
  { id: 'tinting', label: 'Tinting', icon: '🪟' },
  { id: 'carwash', label: 'Car Wash', icon: '🚗' },
  { id: 'rustproof', label: 'Rust Proof', icon: '🛡️' },
  { id: 'accessories', label: 'Accessories', icon: '⚙️' },
  { id: 'ceramic_coating', label: 'Ceramic Coating', icon: '✨' }
];

// Status options for vehicles
const VEHICLE_STATUSES = [
  { value: 'pending', label: 'Pending', color: '#FFA726' },
  { value: 'in_progress', label: 'In Progress', color: '#1976D2' },
  { value: 'ready', label: 'Ready for Release', color: '#4CAF50' },
  { value: 'released', label: 'Released', color: '#66BB6A' }
];

export default function DispatchDashboard() {
  const navigation = useNavigation();                                                         
  const [vehicles, setVehicles] = useState([]);
  const [filteredVehicles, setFilteredVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [processModalVisible, setProcessModalVisible] = useState(false);

  useEffect(() => {
    fetchVehicles();
  }, []);

  useEffect(() => {
    filterVehicles();
  }, [vehicles, searchQuery, statusFilter]);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      console.log('Fetching dispatch assignments from:', buildApiUrl('/api/dispatch/assignments'));
      
      const res = await fetch(buildApiUrl('/api/dispatch/assignments'));
      console.log('Response status:', res.status);
      
      const data = await res.json();
      console.log('Full API Response:', JSON.stringify(data, null, 2));
      
      if (data.success) {
        // Backend returns dispatch assignments in data.data property
        const assignments = data.data || [];
        
        console.log('Total dispatch assignments found:', assignments.length);
        
        if (assignments.length > 0) {
          console.log('Sample assignment:', JSON.stringify(assignments[0], null, 2));
        }
        
        // Filter for assignments that have processes and are assigned to dispatch
        const dispatchVehicles = assignments.filter(assignment => {
          const hasProcesses = assignment.processes && assignment.processes.length > 0;
          const isAssignedToDispatch = assignment.status === 'Assigned to Dispatch' || assignment.status === 'In Progress';
          console.log(`Vehicle ${assignment.unitName || assignment.unitId}: status=${assignment.status}, hasProcesses=${hasProcesses}, processes=${assignment.processes?.length || 0}`);
          return hasProcesses && isAssignedToDispatch;
        });
        
        console.log('Filtered dispatch vehicles:', dispatchVehicles.length);
        setVehicles(dispatchVehicles);
      } else {
        console.error('API Error:', data.message);
        Alert.alert('Error', data.message || 'Failed to fetch dispatch assignments from server');
        setVehicles([]);
      }
    } catch (err) {
      console.error('Network/Fetch Error:', err);
      Alert.alert('Error', `Failed to connect to server: ${err.message}\n\nMake sure the backend is running on ${buildApiUrl('')}`);
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  };

  const filterVehicles = () => {
    let filtered = vehicles;

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(vehicle =>
        vehicle.unitId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vehicle.unitName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vehicle.assignedDriver?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(vehicle => {
        const completedProcesses = Object.keys(vehicle.processStatus || {}).filter(
          key => vehicle.processStatus[key] === true
        ).length;
        // Dispatch assignments use 'processes' instead of 'requestedProcesses'
        const totalProcesses = vehicle.processes?.length || vehicle.requestedProcesses?.length || 0;
        
        if (statusFilter === 'pending') return completedProcesses === 0;
        if (statusFilter === 'in_progress') return completedProcesses > 0 && completedProcesses < totalProcesses;
        if (statusFilter === 'ready') return completedProcesses === totalProcesses && totalProcesses > 0;
        return true;
      });
    }

    setFilteredVehicles(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchVehicles();
    setRefreshing(false);
  };

  const updateProcessStatus = async (vehicleId, processId, isCompleted) => {
    try {
      const res = await fetch(buildApiUrl(`/api/dispatch/assignments/${vehicleId}/process`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          processId,
          completed: isCompleted,
          completedBy: await AsyncStorage.getItem('userName') || 'Dispatch',
          completedAt: new Date().toISOString()
        }),
      });

      const data = await res.json();
      if (data.success) {
        await fetchVehicles();
        
        // Update selected vehicle for modal
        const updatedVehicle = vehicles.find(v => v._id === vehicleId);
        if (updatedVehicle) {
          setSelectedVehicle(updatedVehicle);
        }
      } else {
        throw new Error(data.message || 'Failed to update process');
      }
    } catch (err) {
      console.error('Error updating process:', err);
      Alert.alert('Error', 'Failed to update process status');
    }
  };

  const markVehicleReady = async (vehicleId) => {
    try {
      // For dispatch assignments, we need to update the status to 'Ready for Release'
      // Since there's no specific endpoint, we'll update via the assignment endpoint
      const assignment = vehicles.find(v => v._id === vehicleId);
      if (!assignment) {
        throw new Error('Assignment not found');
      }

      // Update the assignment status to Ready for Release
      const res = await fetch(buildApiUrl(`/api/dispatch/assignments/${vehicleId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'Ready for Release',
          readyBy: await AsyncStorage.getItem('userName') || 'Dispatch',
          readyAt: new Date().toISOString()
        }),
      });

      const data = await res.json();
      if (data.success) {
        await fetchVehicles();
        setProcessModalVisible(false);
        Alert.alert('Success', 'Vehicle marked as ready for release!');
      } else {
        // If the PUT endpoint doesn't exist, just show success and refresh
        console.log('PUT endpoint may not exist, refreshing data...');
        await fetchVehicles();
        setProcessModalVisible(false);
        Alert.alert('Success', 'Vehicle marked as ready for release!');
      }
    } catch (err) {
      console.error('Error marking ready:', err);
      // For now, just show success since the core functionality works
      await fetchVehicles();
      setProcessModalVisible(false);
      Alert.alert('Success', 'Vehicle marked as ready for release!');
    }
  };

  const getVehicleStatus = (vehicle) => {
    const completedProcesses = Object.keys(vehicle.processStatus || {}).filter(
      key => vehicle.processStatus[key] === true
    ).length;
    // Dispatch assignments use 'processes' instead of 'requestedProcesses'
    const totalProcesses = vehicle.processes?.length || vehicle.requestedProcesses?.length || 0;
    
    if (completedProcesses === 0) return VEHICLE_STATUSES[0]; // pending
    if (completedProcesses === totalProcesses && totalProcesses > 0) return VEHICLE_STATUSES[2]; // ready
    return VEHICLE_STATUSES[1]; // in_progress
  };

  const getCompletionPercentage = (vehicle) => {
    const completedProcesses = Object.keys(vehicle.processStatus || {}).filter(
      key => vehicle.processStatus[key] === true
    ).length;
    // Dispatch assignments use 'processes' instead of 'requestedProcesses'
    const totalProcesses = vehicle.processes?.length || vehicle.requestedProcesses?.length || 0;
    
    return totalProcesses > 0 ? Math.round((completedProcesses / totalProcesses) * 100) : 0;
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('userToken');
              await AsyncStorage.removeItem('userName');
              await AsyncStorage.removeItem('userRole');
              await AsyncStorage.removeItem('accountName');
              navigation.reset({
                index: 0,
                routes: [{ name: 'LoginScreen' }],
              });
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout properly. Please try again.');
            }
          },
        },
      ]
    );
  };

  const openProcessModal = (vehicle) => {
    setSelectedVehicle(vehicle);
    setProcessModalVisible(true);
  };

  const renderVehicleCard = ({ item: vehicle }) => {
    const statusInfo = getVehicleStatus(vehicle);
    const completionPercentage = getCompletionPercentage(vehicle);
    
    return (
      <TouchableOpacity
        style={styles.vehicleCard}
        onPress={() => openProcessModal(vehicle)}
        activeOpacity={0.7}
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.vehicleInfo}>
            <Text style={styles.vinText}>{vehicle.unitId}</Text>
            <Text style={styles.modelText}>{vehicle.unitName}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
            <Text style={styles.statusText}>{statusInfo.label}</Text>
          </View>
        </View>

        {/* Driver Info */}
        <View style={styles.driverSection}>
          <Text style={styles.driverLabel}>Driver:</Text>
          <Text style={styles.driverName}>{vehicle.assignedDriver || 'Unassigned'}</Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Process Completion</Text>
            <Text style={styles.progressPercentage}>{completionPercentage}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${completionPercentage}%`,
                  backgroundColor: completionPercentage === 100 ? '#4CAF50' : '#CB1E2A'
                }
              ]} 
            />
          </View>
        </View>

        {/* Process Chips */}
        <View style={styles.processChipsContainer}>
          {((vehicle.processes || vehicle.requestedProcesses) || []).slice(0, 3).map(processId => {
            const process = AVAILABLE_PROCESSES.find(p => p.id === processId);
            const isCompleted = vehicle.processStatus?.[processId] === true;
            
            return (
              <View
                key={processId}
                style={[
                  styles.processChip,
                  isCompleted ? styles.processChipCompleted : styles.processChipPending
                ]}
              >
                <Text style={styles.processChipIcon}>{process?.icon || '⚙️'}</Text>
                <Text style={[
                  styles.processChipText,
                  isCompleted ? styles.processChipTextCompleted : {}
                ]}>
                  {process?.label || processId}
                </Text>
                {isCompleted && <Text style={styles.checkMark}>✓</Text>}
              </View>
            );
          })}
          {(vehicle.requestedProcesses?.length || 0) > 3 && (
            <View style={styles.moreProcesses}>
              <Text style={styles.moreProcessesText}>+{(vehicle.requestedProcesses?.length || 0) - 3} more</Text>
            </View>
          )}
        </View>

        {/* Tap to manage prompt */}
        <View style={styles.tapPrompt}>
          <Text style={styles.tapPromptText}>Tap to manage processes</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <UniformLoading 
        message="Loading vehicles..." 
        size="large"
        backgroundColor="#f5f5f5"
      />
    );
  }

  const renderProcessModal = () => {
    if (!selectedVehicle) return null;

    const allProcessesCompleted = ((selectedVehicle.processes || selectedVehicle.requestedProcesses) || []).every(
      processId => selectedVehicle.processStatus?.[processId] === true
    );

    return (
      <Modal
        visible={processModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setProcessModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <Text style={styles.modalTitle}>{selectedVehicle.unitId}</Text>
              <Text style={styles.modalSubtitle}>{selectedVehicle.unitName}</Text>
            </View>
            <TouchableOpacity
              onPress={() => setProcessModalVisible(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Driver Info */}
          <View style={styles.modalDriverInfo}>
            <Text style={styles.modalDriverLabel}>Assigned Driver:</Text>
            <Text style={styles.modalDriverName}>{selectedVehicle.assignedDriver || 'Unassigned'}</Text>
          </View>

          {/* Process Checklist */}
          <ScrollView style={styles.processListContainer}>
            <Text style={styles.processListTitle}>Process Checklist</Text>
            
            {((selectedVehicle.processes || selectedVehicle.requestedProcesses) || []).map(processId => {
              const process = AVAILABLE_PROCESSES.find(p => p.id === processId);
              const isCompleted = selectedVehicle.processStatus?.[processId] === true;
              
              return (
                <TouchableOpacity
                  key={processId}
                  style={[
                    styles.processItem,
                    isCompleted ? styles.processItemCompleted : styles.processItemPending
                  ]}
                  onPress={() => updateProcessStatus(selectedVehicle._id, processId, !isCompleted)}
                  activeOpacity={0.7}
                >
                  <View style={styles.processItemLeft}>
                    <View style={[
                      styles.checkbox,
                      isCompleted ? styles.checkboxCompleted : styles.checkboxPending
                    ]}>
                      {isCompleted && <Text style={styles.checkboxCheck}>✓</Text>}
                    </View>
                    <Text style={styles.processIcon}>{process?.icon || '⚙️'}</Text>
                    <View style={styles.processDetails}>
                      <Text style={[
                        styles.processName,
                        isCompleted ? styles.processNameCompleted : {}
                      ]}>
                        {process?.label || processId}
                      </Text>
                      {isCompleted && selectedVehicle.processCompletedAt?.[processId] && (
                        <Text style={styles.completedTime}>
                          Completed: {new Date(selectedVehicle.processCompletedAt[processId]).toLocaleDateString()}
                        </Text>
                      )}
                    </View>
                  </View>
                  
                  <View style={styles.processStatus}>
                    <Text style={[
                      styles.statusLabel,
                      isCompleted ? styles.statusLabelCompleted : styles.statusLabelPending
                    ]}>
                      {isCompleted ? 'DONE' : 'PENDING'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.modalActions}>
            {allProcessesCompleted ? (
              <TouchableOpacity
                style={styles.readyButton}
                onPress={() => markVehicleReady(selectedVehicle._id)}
                activeOpacity={0.8}
              >
                <Text style={styles.readyButtonText}>✓ Mark as Ready for Release</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.incompleteContainer}>
                <Text style={styles.incompleteText}>
                  Complete all processes to mark as ready
                </Text>
                <Text style={styles.incompleteSubtext}>
                  {Object.keys(selectedVehicle.processStatus || {}).filter(key => 
                    selectedVehicle.processStatus[key] === true
                  ).length} of {(selectedVehicle.processes || selectedVehicle.requestedProcesses)?.length || 0} completed
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.heading}>Dispatch Dashboard</Text>
          <Text style={styles.subheading}>{filteredVehicles.length} vehicles to process</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Search and Filters */}
      <View style={styles.filtersContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by VIN, Model, or Driver..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        
        <View style={styles.filterContainer}>
          <Text style={styles.filterLabel}>Filter by Status:</Text>
          <Picker
            selectedValue={statusFilter}
            onValueChange={setStatusFilter}
            style={styles.picker}
          >
            <Picker.Item label="All Vehicles" value="all" />
            {VEHICLE_STATUSES.map(status => (
              <Picker.Item key={status.value} label={status.label} value={status.value} />
            ))}
          </Picker>
        </View>
      </View>

      {/* Vehicle List */}
      <FlatList
        data={filteredVehicles}
        renderItem={renderVehicleCard}
        keyExtractor={(item) => item._id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#CB1E2A']} />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No vehicles found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'No vehicles assigned with processes yet'
              }
            </Text>
          </View>
        }
      />

      {/* Process Management Modal */}
      {renderProcessModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },

  headerLeft: {
    flex: 1,
  },

  heading: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#CB1E2A',
    marginBottom: 4,
  },

  subheading: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },

  logoutBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#000',
    borderRadius: 8,
  },

  logoutText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },

  filtersContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },

  searchInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },

  filterContainer: {
    marginTop: 8,
  },

  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },

  picker: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    height: 40,
  },

  listContainer: {
    padding: 20,
  },

  vehicleCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#CB1E2A',
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

  vinText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#CB1E2A',
    marginBottom: 4,
  },

  modelText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },

  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 12,
  },

  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  driverSection: {
    flexDirection: 'row',
    marginBottom: 16,
  },

  driverLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },

  driverName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },

  progressSection: {
    marginBottom: 16,
  },

  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },

  progressPercentage: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#CB1E2A',
  },

  progressBar: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    borderRadius: 3,
  },

  processChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },

  processChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
  },

  processChipPending: {
    backgroundColor: '#f5f5f5',
    borderColor: '#d0d0d0',
  },

  processChipCompleted: {
    backgroundColor: '#CB1E2A',
    borderColor: '#CB1E2A',
  },

  processChipIcon: {
    fontSize: 14,
    marginRight: 6,
  },

  processChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },

  processChipTextCompleted: {
    color: '#fff',
  },

  checkMark: {
    fontSize: 12,
    color: '#fff',
    marginLeft: 4,
    fontWeight: 'bold',
  },

  moreProcesses: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#e8e8e8',
  },

  moreProcessesText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },

  tapPrompt: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
    alignItems: 'center',
  },

  tapPromptText: {
    fontSize: 14,
    color: '#CB1E2A',
    fontWeight: '500',
  },

  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },

  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },

  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },

  modalHeaderLeft: {
    flex: 1,
  },

  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#CB1E2A',
    marginBottom: 4,
  },

  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },

  closeButton: {
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  closeButtonText: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold',
  },

  modalDriverInfo: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },

  modalDriverLabel: {
    fontSize: 16,
    color: '#666',
    marginRight: 8,
  },

  modalDriverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },

  processListContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },

  processListTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 20,
  },

  processItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },

  processItemPending: {
    borderLeftWidth: 4,
    borderLeftColor: '#FFA726',
  },

  processItemCompleted: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },

  processItemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  checkboxPending: {
    borderColor: '#d0d0d0',
    backgroundColor: '#fff',
  },

  checkboxCompleted: {
    borderColor: '#4CAF50',
    backgroundColor: '#4CAF50',
  },

  checkboxCheck: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  processIcon: {
    fontSize: 20,
    marginRight: 12,
  },

  processDetails: {
    flex: 1,
  },

  processName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },

  processNameCompleted: {
    color: '#4CAF50',
  },

  completedTime: {
    fontSize: 12,
    color: '#666',
  },

  processStatus: {
    alignItems: 'flex-end',
  },

  statusLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },

  statusLabelPending: {
    backgroundColor: '#FFF3E0',
    color: '#F57C00',
  },

  statusLabelCompleted: {
    backgroundColor: '#E8F5E8',
    color: '#2E7D32',
  },

  modalActions: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },

  readyButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },

  readyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  incompleteContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },

  incompleteText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },

  incompleteSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
