import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildApiUrl } from '../constants/api';
import UniformLoading from '../components/UniformLoading';
import { Picker } from '@react-native-picker/picker';

const { width } = Dimensions.get('window');

export default function UnitAllocationScreen() {
  const [allocations, setAllocations] = useState([]);
  const [availableUnits, setAvailableUnits] = useState([]);
  const [salesAgents, setSalesAgents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAgent, setFilterAgent] = useState('');
  const [filterManager, setFilterManager] = useState('');
  const [sortOrder, setSortOrder] = useState('latest');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const [newAllocation, setNewAllocation] = useState({
    unitId: '',
    unitName: '',
    bodyColor: '',
    variation: '',
    assignedAgent: '',
    allocatedBy: '',
  });

  // Fetch current user
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const userName = await AsyncStorage.getItem('accountName') || await AsyncStorage.getItem('userName');
        const userEmail = await AsyncStorage.getItem('userEmail');
        setCurrentUser({ name: userName, email: userEmail });
        setNewAllocation(prev => ({ ...prev, allocatedBy: userName || '' }));
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
    fetchCurrentUser();
  }, []);

  // Fetch allocations
  const fetchAllocations = useCallback(async () => {
    try {
      const response = await fetch(buildApiUrl('/api/getUnitAllocations'));
      const data = await response.json();
      setAllocations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching allocations:', error);
      Alert.alert('Error', 'Failed to load unit allocations');
    }
  }, []);

  // Fetch available units (not allocated)
  const fetchAvailableUnits = useCallback(async () => {
    try {
      const response = await fetch(buildApiUrl('/getInventory'));
      const data = await response.json();
      
      if (data.success) {
        const available = (data.data || []).filter(unit => !unit.assignedAgent);
        setAvailableUnits(available);
      }
    } catch (error) {
      console.error('Error fetching units:', error);
    }
  }, []);

  // Fetch sales agents
  const fetchSalesAgents = useCallback(async () => {
    try {
      const response = await fetch(buildApiUrl('/api/getUsers'));
      const data = await response.json();
      
      if (data.success) {
        const agents = (data.data || []).filter(user => 
          user.role === 'Sales Agent' || user.role === 'Manager'
        );
        setSalesAgents(agents);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      fetchAllocations(),
      fetchAvailableUnits(),
      fetchSalesAgents(),
    ]);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Handle unit selection
  const handleUnitSelect = (unitId) => {
    const unit = availableUnits.find(u => u.unitId === unitId);
    if (unit) {
      setNewAllocation({
        ...newAllocation,
        unitId: unit.unitId,
        unitName: unit.unitName,
        bodyColor: unit.bodyColor,
        variation: unit.variation,
      });
    }
  };

  // Create allocation
  const handleCreateAllocation = async () => {
    if (!newAllocation.unitId || !newAllocation.assignedAgent) {
      Alert.alert('Error', 'Please select both a unit and a sales agent');
      return;
    }

    try {
      const response = await fetch(buildApiUrl('/api/createUnitAllocation'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAllocation),
      });

      const data = await response.json();

      if (data.success) {
        Alert.alert('Success', 'Unit allocated successfully');
        setShowAddModal(false);
        setNewAllocation({
          unitId: '',
          unitName: '',
          bodyColor: '',
          variation: '',
          assignedAgent: '',
          allocatedBy: currentUser?.name || '',
        });
        await loadData();
      } else {
        Alert.alert('Error', data.message || 'Failed to allocate unit');
      }
    } catch (error) {
      console.error('Error creating allocation:', error);
      Alert.alert('Error', 'Failed to create allocation');
    }
  };

  // Delete allocation
  const handleDeleteAllocation = (id) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this allocation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(buildApiUrl(`/api/deleteUnitAllocation/${id}`), {
                method: 'DELETE',
              });

              const data = await response.json();

              if (data.success) {
                Alert.alert('Success', 'Allocation deleted successfully');
                await loadData();
              } else {
                Alert.alert('Error', data.message || 'Failed to delete allocation');
              }
            } catch (error) {
              console.error('Error deleting allocation:', error);
              Alert.alert('Error', 'Failed to delete allocation');
            }
          },
        },
      ]
    );
  };

  // Filter and search
  const getFilteredAllocations = () => {
    let filtered = allocations;

    // Search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(alloc =>
        alloc.unitName?.toLowerCase().includes(searchLower) ||
        alloc.unitId?.toLowerCase().includes(searchLower) ||
        alloc.assignedAgent?.toLowerCase().includes(searchLower)
      );
    }

    // Agent filter
    if (filterAgent) {
      filtered = filtered.filter(alloc => alloc.assignedAgent === filterAgent);
    }

    // Manager filter
    if (filterManager) {
      filtered = filtered.filter(alloc => alloc.allocatedBy === filterManager);
    }

    // Sort
    filtered.sort((a, b) => {
      const dateA = new Date(a.allocationDate || a.createdAt);
      const dateB = new Date(b.allocationDate || b.createdAt);
      return sortOrder === 'latest' ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return '1 day ago';
    if (days < 30) return `${days} days ago`;
    
    const months = Math.floor(days / 30);
    if (months === 1) return '1 month ago';
    return `${months} months ago`;
  };

  const renderAllocationCard = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.unitName}</Text>
        <TouchableOpacity onPress={() => handleDeleteAllocation(item._id)}>
          <MaterialIcons name="delete" size={24} color="#DC2626" />
        </TouchableOpacity>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Ionicons name="car-outline" size={16} color="#666" />
          <Text style={styles.infoLabel}>Conduction #:</Text>
          <Text style={styles.infoValue}>{item.unitId}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="color-palette-outline" size={16} color="#666" />
          <Text style={styles.infoLabel}>Color:</Text>
          <Text style={styles.infoValue}>{item.bodyColor}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="options-outline" size={16} color="#666" />
          <Text style={styles.infoLabel}>Variation:</Text>
          <Text style={styles.infoValue}>{item.variation}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={16} color="#666" />
          <Text style={styles.infoLabel}>Assigned To:</Text>
          <Text style={styles.infoValue}>{item.assignedAgent}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="checkmark-circle-outline" size={16} color="#666" />
          <Text style={styles.infoLabel}>Allocated By:</Text>
          <Text style={styles.infoValue}>{item.allocatedBy}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={16} color="#666" />
          <Text style={styles.infoLabel}>Date:</Text>
          <Text style={styles.infoValue}>{formatDate(item.allocationDate || item.createdAt)}</Text>
        </View>
      </View>
    </View>
  );

  const filteredAllocations = getFilteredAllocations();

  if (loading && allocations.length === 0) {
    return <UniformLoading />;
  }

  return (
    <View style={styles.container}>
      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={[styles.summaryCard, { backgroundColor: '#DC2626' }]}>
          <Text style={styles.summaryNumber}>{allocations.length}</Text>
          <Text style={styles.summaryLabel}>Total Allocations</Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: '#059669' }]}>
          <Text style={styles.summaryNumber}>{availableUnits.length}</Text>
          <Text style={styles.summaryLabel}>Available Units</Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: '#2563EB' }]}>
          <Text style={styles.summaryNumber}>{salesAgents.length}</Text>
          <Text style={styles.summaryLabel}>Active Agents</Text>
        </View>
      </View>

      {/* Search and Filter Bar */}
      <View style={styles.actionBar}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search allocations..."
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>

        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
        >
          <Ionicons name="filter" size={20} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <MaterialIcons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Allocations List */}
      <FlatList
        data={filteredAllocations}
        renderItem={renderAllocationCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#DC2626']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-open-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No allocations found</Text>
            <Text style={styles.emptySubtext}>
              Start by allocating units to sales agents
            </Text>
          </View>
        }
      />

      {/* Add Allocation Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Allocate Unit</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Select Unit *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={newAllocation.unitId}
                  onValueChange={handleUnitSelect}
                  style={styles.picker}
                >
                  <Picker.Item label="Select Unit" value="" />
                  {availableUnits.map((unit) => (
                    <Picker.Item
                      key={unit._id}
                      label={`${unit.unitName} - ${unit.unitId} (${unit.bodyColor}, ${unit.variation})`}
                      value={unit.unitId}
                    />
                  ))}
                </Picker>
              </View>

              <Text style={styles.inputLabel}>Assign To *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={newAllocation.assignedAgent}
                  onValueChange={(value) => setNewAllocation({ ...newAllocation, assignedAgent: value })}
                  style={styles.picker}
                >
                  <Picker.Item label="Select Sales Agent" value="" />
                  {salesAgents.map((agent) => (
                    <Picker.Item
                      key={agent._id}
                      label={`${agent.name} - ${agent.role}`}
                      value={agent.name}
                    />
                  ))}
                </Picker>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.allocateButton]}
                onPress={handleCreateAllocation}
              >
                <Text style={styles.allocateButtonText}>Allocate</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Allocations</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Sort By Date</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={sortOrder}
                  onValueChange={setSortOrder}
                  style={styles.picker}
                >
                  <Picker.Item label="Latest First" value="latest" />
                  <Picker.Item label="Oldest First" value="oldest" />
                </Picker>
              </View>

              <Text style={styles.inputLabel}>Sales Agent</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={filterAgent}
                  onValueChange={setFilterAgent}
                  style={styles.picker}
                >
                  <Picker.Item label="All Agents" value="" />
                  {[...new Set(allocations.map(a => a.assignedAgent))].map((agent, idx) => (
                    <Picker.Item key={idx} label={agent} value={agent} />
                  ))}
                </Picker>
              </View>

              <Text style={styles.inputLabel}>Allocated By</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={filterManager}
                  onValueChange={setFilterManager}
                  style={styles.picker}
                >
                  <Picker.Item label="All Managers" value="" />
                  {[...new Set(allocations.map(a => a.allocatedBy))].map((manager, idx) => (
                    <Picker.Item key={idx} label={manager} value={manager} />
                  ))}
                </Picker>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setFilterAgent('');
                  setFilterManager('');
                  setSortOrder('latest');
                }}
              >
                <Text style={styles.cancelButtonText}>Clear Filters</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.allocateButton]}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={styles.allocateButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
    textAlign: 'center',
  },
  actionBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 14,
  },
  filterButton: {
    backgroundColor: '#666',
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addButton: {
    backgroundColor: '#DC2626',
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  listContainer: {
    padding: 16,
    paddingTop: 0,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  cardBody: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  modalButton: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  allocateButton: {
    backgroundColor: '#DC2626',
  },
  allocateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
