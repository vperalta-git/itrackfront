//DriverAllocation.js

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Modal, StyleSheet, Alert, ActivityIndicator, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import { buildApiUrl } from '../constants/api';
import { useTheme } from '../context/ThemeContext';

const DriverAllocation = () => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [allocations, setAllocations] = useState([]);
  const [newAllocation, setNewAllocation] = useState({
    unitName: '',
    unitId: '',
    bodyColor: '',
    variation: '',
    assignedDriver: '',
    status: 'Pending',
    date: '',
    customerName: '',
    customerEmail: '',
    customerPhone: ''
  });
  const [editAllocation, setEditAllocation] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [drivers, setDrivers] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [agents, setAgents] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('stock'); // 'stock' or 'manual'
  const [selectedVin, setSelectedVin] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('');
  const [manualModel, setManualModel] = useState('');
  const [manualVin, setManualVin] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [pickupPoint, setPickupPoint] = useState('');
  const [dropoffPoint, setDropoffPoint] = useState('');

  useEffect(() => {
    fetchAllocations();
    fetchDrivers();
    fetchInventory();
    fetchAgents();
  }, []);

  const fetchAllocations = () => {
    setLoading(true);
    axios.get(buildApiUrl('/getAllocation'))
      .then((res) => {
        console.log('Allocations response:', res.data);
        if (res.data.success && Array.isArray(res.data.data)) {
          setAllocations(res.data.data);
        } else {
          setAllocations([]);
        }
      })
      .catch((err) => {
        console.error('Error fetching allocations:', err);
        setAllocations([]);
      })
      .finally(() => setLoading(false));
  };

  const fetchDrivers = () => {
    axios.get(buildApiUrl('/getUsers'))
      .then((res) => {
        console.log('Users response:', res.data);
        if (res.data.success && Array.isArray(res.data.data)) {
          const driverList = res.data.data.filter(user => user.role === 'Driver');
          setDrivers(driverList);
        } else {
          setDrivers([]);
        }
      })
      .catch((err) => {
        console.error('Error fetching drivers:', err);
        setDrivers([]);
      });
  };

  const fetchInventory = () => {
    axios.get(buildApiUrl('/getStock'))
      .then((res) => {
        console.log('Inventory response:', res.data);
        if (res.data.success && Array.isArray(res.data.data)) {
          setInventory(res.data.data);
        } else {
          setInventory([]);
        }
      })
      .catch((err) => {
        console.error('Error fetching inventory:', err);
        setInventory([]);
      });
  };

  const fetchAgents = () => {
    axios.get(buildApiUrl('/getUsers'))
      .then((res) => {
        console.log('Agents response:', res.data);
        if (res.data.success && Array.isArray(res.data.data)) {
          const agentList = res.data.data.filter(user => user.role === 'Sales Agent');
          setAgents(agentList);
        } else {
          setAgents([]);
        }
      })
      .catch((err) => {
        console.error('Error fetching agents:', err);
        setAgents([]);
      });
  };

  const assignFromStock = async () => {
    if (!selectedVin || !selectedAgent || !selectedDriver) {
      Alert.alert('Missing Info', 'Please select vehicle, agent, and driver.');
      return;
    }

    if (!newAllocation.customerName || !newAllocation.customerEmail) {
      Alert.alert('Missing Customer Info', 'Please provide customer name and email address.');
      return;
    }

    try {
      const selectedVehicle = inventory.find(v => (v.unitId || v._id) === selectedVin);
      if (!selectedVehicle) {
        Alert.alert('Error', 'Selected vehicle not found in inventory.');
        return;
      }

      const allocationPayload = {
        unitName: selectedVehicle.unitName,
        unitId: selectedVehicle.unitId || selectedVehicle._id,
        bodyColor: selectedVehicle.bodyColor,
        variation: selectedVehicle.variation,
        assignedDriver: selectedDriver,
        assignedAgent: selectedAgent,
        status: 'Assigned',
        allocatedBy: 'Admin',
        pickupPoint: pickupPoint,
        dropoffPoint: dropoffPoint,
        date: new Date().toISOString(),
        customerName: newAllocation.customerName,
        customerEmail: newAllocation.customerEmail,
        customerPhone: newAllocation.customerPhone
      };

      const res = await axios.post(buildApiUrl('/createAllocation'), allocationPayload);

      if (res.data.success) {
        // Update inventory status
        await axios.put(buildApiUrl(`/updateStock/${selectedVehicle._id}`), {
          ...selectedVehicle,
          status: 'Allocated'
        });

        Alert.alert('Success', 'Vehicle assigned successfully from stock!');
        setSelectedVin('');
        setSelectedAgent('');
        setSelectedDriver('');
        setPickupPoint('');
        setDropoffPoint('');
        setIsCreateModalOpen(false);
        await Promise.all([fetchAllocations(), fetchInventory()]);
      } else {
        throw new Error(res.data.message || 'Failed to assign vehicle');
      }
    } catch (err) {
      console.error('Assign from stock error:', err);
      Alert.alert('Error', err.message || 'Failed to assign vehicle');
    }
  };

  const assignManualEntry = async () => {
    if (!manualModel || !manualVin || !selectedDriver || !selectedAgent) {
      Alert.alert('Missing Info', 'Please fill in all fields for manual entry.');
      return;
    }

    if (!newAllocation.customerName || !newAllocation.customerEmail) {
      Alert.alert('Missing Customer Info', 'Please provide customer name and email address.');
      return;
    }

    try {
      const allocationPayload = {
        unitName: manualModel,
        unitId: manualVin,
        bodyColor: 'Manual Entry',
        variation: 'Manual Entry',
        assignedDriver: selectedDriver,
        assignedAgent: selectedAgent,
        status: 'Assigned',
        allocatedBy: 'Admin',
        pickupPoint: pickupPoint,
        dropoffPoint: dropoffPoint,
        date: new Date().toISOString(),
        customerName: newAllocation.customerName,
        customerEmail: newAllocation.customerEmail,
        customerPhone: newAllocation.customerPhone
      };

      const res = await axios.post(buildApiUrl('/createAllocation'), allocationPayload);

      if (res.data.success) {
        Alert.alert('Success', 'Vehicle assigned successfully via manual entry!');
        setManualModel('');
        setManualVin('');
        setSelectedDriver('');
        setSelectedAgent('');
        setPickupPoint('');
        setDropoffPoint('');
        setIsCreateModalOpen(false);
        fetchAllocations();
      } else {
        throw new Error(res.data.message || 'Failed to assign');
      }
    } catch (err) {
      console.error('Manual assign error:', err);
      Alert.alert('Error', err.message || 'Failed to assign vehicle');
    }
  };

  const handleCreate = () => {
    if (mode === 'stock') {
      assignFromStock();
    } else {
      assignManualEntry();
    }
  };

  const handleUpdate = (id) => {
    // Update functionality not implemented in backend yet
    Alert.alert('Info', 'Update functionality will be available soon');
    setEditAllocation(null);
  };

  const handleDelete = (id) => {
    Alert.alert('Delete', 'Are you sure you want to delete this allocation?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        // Delete functionality not implemented in backend yet
        Alert.alert('Info', 'Delete functionality will be available soon');
      }}
    ]);
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const filteredAllocations = allocations.filter(item =>
    item.unitName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.unitId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.assignedDriver.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const currentAllocations = filteredAllocations.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAllocations.length / itemsPerPage);

  const renderItem = ({ item }) => {
    const getStatusStyle = (status) => {
      switch (status?.toLowerCase()) {
        case 'pending':
          return { container: styles.statusPending, text: styles.statusTextPending };
        case 'in transit':
          return { container: styles.statusInTransit, text: styles.statusTextInTransit };
        case 'delivered':
        case 'completed':
          return { container: styles.statusDelivered, text: styles.statusTextDelivered };
        default:
          return { container: styles.statusPending, text: styles.statusTextPending };
      }
    };

    const statusStyle = getStatusStyle(item.status);

    return (
      <View style={styles.allocationCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.unitName}>{item.unitName || 'Unknown Unit'}</Text>
          <View style={[styles.statusBadge, statusStyle.container]}>
            <Text style={[styles.statusText, statusStyle.text]}>
              {item.status || 'Pending'}
            </Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date</Text>
            <Text style={styles.infoValue}>
              {item.date ? new Date(item.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              }) : 'Not set'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Unit ID</Text>
            <Text style={styles.infoValue}>{item.unitId || 'N/A'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Body Color</Text>
            <Text style={styles.infoValue}>{item.bodyColor || 'N/A'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Variation</Text>
            <Text style={styles.infoValue}>{item.variation || 'N/A'}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Assigned Driver</Text>
            <Text style={styles.infoValue}>{item.assignedDriver || 'Unassigned'}</Text>
          </View>

          {item.pickupPoint && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Pickup Point</Text>
              <Text style={styles.infoValue}>{item.pickupPoint}</Text>
            </View>
          )}

          {item.dropoffPoint && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Drop-off Point</Text>
              <Text style={styles.infoValue}>{item.dropoffPoint}</Text>
            </View>
          )}
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity 
            style={styles.editBtn} 
            onPress={() => setEditAllocation(item)}
          >
            <Text style={styles.actionBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.deleteBtn} 
            onPress={() => handleDelete(item._id)}
          >
            <Text style={styles.actionBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Driver Allocation</Text>
      
      <View style={styles.topSection}>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by unit name, driver, or ID..."
            value={searchInput}
            onChangeText={setSearchInput}
            placeholderTextColor="#94a3b8"
          />
          <TouchableOpacity 
            style={styles.searchBtn} 
            onPress={() => setSearchTerm(searchInput)}
          >
            <Text style={styles.searchBtnText}>Search</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={styles.createBtn} 
          onPress={() => setIsCreateModalOpen(true)}
        >
          <Text style={styles.createBtnText}>+ Allocate New Driver</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#dc2626" />
          <Text style={styles.emptyText}>Loading allocations...</Text>
        </View>
      ) : filteredAllocations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No driver allocations found</Text>
          <Text style={styles.emptySubtext}>
            {searchTerm ? 'Try adjusting your search terms' : 'Create your first allocation to get started'}
          </Text>
        </View>
      ) : (
        <FlatList
          style={styles.listContainer}
          data={currentAllocations}
          renderItem={renderItem}
          keyExtractor={item => item._id || Math.random().toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}

      {totalPages > 1 && (
        <View style={styles.paginationContainer}>
          <View style={styles.paginationRow}>
            <TouchableOpacity
              style={styles.paginationBtn}
              onPress={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <Text style={[styles.paginationBtnText, currentPage === 1 && { color: '#cbd5e1' }]}>
                ‹
              </Text>
            </TouchableOpacity>
            
            {Array.from({ length: totalPages }, (_, i) => (
              <TouchableOpacity
                key={i + 1}
                style={[
                  styles.paginationBtn, 
                  currentPage === i + 1 && styles.activePage
                ]}
                onPress={() => setCurrentPage(i + 1)}
              >
                <Text style={[
                  styles.paginationBtnText,
                  currentPage === i + 1 && styles.activePageText
                ]}>
                  {i + 1}
                </Text>
              </TouchableOpacity>
            ))}
            
            <TouchableOpacity
              style={styles.paginationBtn}
              onPress={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              <Text style={[styles.paginationBtnText, currentPage === totalPages && { color: '#cbd5e1' }]}>
                ›
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      {/* Create Modal */}
      <Modal visible={isCreateModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Vehicle Assignment</Text>
            
            {/* Mode Selection */}
            <View style={styles.modeSelector}>
              <TouchableOpacity
                style={[styles.modeButton, mode === 'stock' && styles.modeButtonActive]}
                onPress={() => setMode('stock')}
              >
                <Text style={[styles.modeButtonText, mode === 'stock' && styles.modeButtonTextActive]}>
                  From Stock
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeButton, mode === 'manual' && styles.modeButtonActive]}
                onPress={() => setMode('manual')}
              >
                <Text style={[styles.modeButtonText, mode === 'manual' && styles.modeButtonTextActive]}>
                  Manual Entry
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              {mode === 'stock' ? (
                <>
                  {/* Stock Selection Form */}
                  <View style={styles.formGroup}>
                    <Text style={styles.inputLabel}>Select Vehicle from Stock</Text>
                    <Picker
                      selectedValue={selectedVin}
                      style={styles.picker}
                      onValueChange={val => setSelectedVin(val)}
                    >
                      <Picker.Item label="Choose Vehicle..." value="" />
                      {inventory.filter(item => (item.status || 'Available') === 'Available').map(v => (
                        <Picker.Item 
                          key={v._id} 
                          label={`${v.unitName} - ${v.variation} (${v.bodyColor})`} 
                          value={v.unitId || v._id} 
                        />
                      ))}
                    </Picker>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.inputLabel}>Assign to Agent</Text>
                    <Picker
                      selectedValue={selectedAgent}
                      style={styles.picker}
                      onValueChange={val => setSelectedAgent(val)}
                    >
                      <Picker.Item label="Select Agent..." value="" />
                      {agents.map(a => (
                        <Picker.Item key={a._id} label={a.accountName || a.username} value={a.username} />
                      ))}
                    </Picker>
                  </View>
                </>
              ) : (
                <>
                  {/* Manual Entry Form */}
                  <View style={styles.formGroup}>
                    <Text style={styles.inputLabel}>Vehicle Model</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Vehicle Model (e.g., Isuzu D-Max)"
                      value={manualModel}
                      onChangeText={setManualModel}
                      placeholderTextColor="#94a3b8"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.inputLabel}>VIN Number</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="VIN Number"
                      value={manualVin}
                      onChangeText={setManualVin}
                      placeholderTextColor="#94a3b8"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.inputLabel}>Assign to Agent</Text>
                    <Picker
                      selectedValue={selectedAgent}
                      style={styles.picker}
                      onValueChange={val => setSelectedAgent(val)}
                    >
                      <Picker.Item label="Select Agent..." value="" />
                      {agents.map(a => (
                        <Picker.Item key={a._id} label={a.accountName || a.username} value={a.username} />
                      ))}
                    </Picker>
                  </View>
                </>
              )}

              {/* Driver Selection (Common for both modes) */}
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Assign Driver</Text>
                <Picker
                  selectedValue={selectedDriver}
                  style={styles.picker}
                  onValueChange={val => setSelectedDriver(val)}
                >
                  <Picker.Item label="Select Driver..." value="" />
                  {drivers.map(d => (
                    <Picker.Item key={d._id} label={d.accountName || d.username} value={d.username} />
                  ))}
                </Picker>
              </View>

              {/* Customer Information Section */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Customer Information</Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Customer Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Customer Full Name"
                  value={newAllocation.customerName}
                  onChangeText={text => setNewAllocation({ ...newAllocation, customerName: text })}
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Customer Email *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="customer@email.com"
                  value={newAllocation.customerEmail}
                  onChangeText={text => setNewAllocation({ ...newAllocation, customerEmail: text })}
                  placeholderTextColor="#94a3b8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Customer Phone</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+63 900 000 0000"
                  value={newAllocation.customerPhone}
                  onChangeText={text => setNewAllocation({ ...newAllocation, customerPhone: text })}
                  placeholderTextColor="#94a3b8"
                  keyboardType="phone-pad"
                />
              </View>

              {/* Pickup Point Selection */}
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Pickup Point</Text>
                <View style={styles.locationButtonsContainer}>
                  <TouchableOpacity 
                    style={[styles.quickLocationBtn, pickupPoint === 'Isuzu Stockyard' && styles.selectedLocationBtn]}
                    onPress={() => setPickupPoint('Isuzu Stockyard')}
                  >
                    <Text style={[styles.quickLocationText, pickupPoint === 'Isuzu Stockyard' && styles.selectedLocationText]}>
                      Isuzu Stockyard
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.quickLocationBtn, pickupPoint === 'Isuzu Pasig' && styles.selectedLocationBtn]}
                    onPress={() => setPickupPoint('Isuzu Pasig')}
                  >
                    <Text style={[styles.quickLocationText, pickupPoint === 'Isuzu Pasig' && styles.selectedLocationText]}>
                      Isuzu Pasig
                    </Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Or enter custom pickup location"
                  value={pickupPoint}
                  onChangeText={setPickupPoint}
                />
              </View>

              {/* Dropoff Point Selection */}
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Drop-off Destination</Text>
                <View style={styles.locationButtonsContainer}>
                  <TouchableOpacity 
                    style={[styles.quickLocationBtn, dropoffPoint === 'Isuzu Stockyard' && styles.selectedLocationBtn]}
                    onPress={() => setDropoffPoint('Isuzu Stockyard')}
                  >
                    <Text style={[styles.quickLocationText, dropoffPoint === 'Isuzu Stockyard' && styles.selectedLocationText]}>
                      Isuzu Stockyard
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.quickLocationBtn, dropoffPoint === 'Isuzu Pasig' && styles.selectedLocationBtn]}
                    onPress={() => setDropoffPoint('Isuzu Pasig')}
                  >
                    <Text style={[styles.quickLocationText, dropoffPoint === 'Isuzu Pasig' && styles.selectedLocationText]}>
                      Isuzu Pasig
                    </Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Or enter custom drop-off location"
                  value={dropoffPoint}
                  onChangeText={setDropoffPoint}
                />
              </View>
            </View>
            
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.submitBtn} onPress={handleCreate}>
                <Text style={styles.submitBtnText}>Create Assignment</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => {
                setIsCreateModalOpen(false);
                setMode('stock');
                setSelectedVin('');
                setSelectedAgent('');
                setSelectedDriver('');
                setManualModel('');
                setManualVin('');
                setPickupPoint('');
                setDropoffPoint('');
              }}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Edit Modal */}
      <Modal visible={!!editAllocation} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Edit Allocation</Text>
            {editAllocation && (
              <View style={styles.modalForm}>
                <TextInput
                  style={styles.input}
                  placeholder="Unit Name"
                  value={editAllocation.unitName}
                  onChangeText={text => setEditAllocation({ ...editAllocation, unitName: text })}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Conduction Number"
                  value={editAllocation.unitId}
                  onChangeText={text => setEditAllocation({ ...editAllocation, unitId: text })}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Body Color"
                  value={editAllocation.bodyColor}
                  onChangeText={text => setEditAllocation({ ...editAllocation, bodyColor: text })}
                />
                <Picker
                  selectedValue={editAllocation.variation}
                  style={styles.input}
                  onValueChange={itemValue => setEditAllocation({ ...editAllocation, variation: itemValue })}
                >
                  <Picker.Item label="Select Variation" value="" />
                  <Picker.Item label="4x2 LSA" value="4x2 LSA" />
                  <Picker.Item label="4x4" value="4x4" />
                  <Picker.Item label="LS-E" value="LS-E" />
                  <Picker.Item label="LS" value="LS" />
                </Picker>
                <Picker
                  selectedValue={editAllocation.assignedDriver}
                  style={styles.input}
                  onValueChange={itemValue => setEditAllocation({ ...editAllocation, assignedDriver: itemValue })}
                >
                  <Picker.Item label="Select Driver" value="" />
                  {drivers.map(driver => (
                    <Picker.Item key={driver._id} label={driver.accountName || driver.username} value={driver.accountName || driver.username} />
                  ))}
                </Picker>
                <Picker
                  selectedValue={editAllocation.status}
                  style={styles.input}
                  onValueChange={itemValue => setEditAllocation({ ...editAllocation, status: itemValue })}
                >
                  <Picker.Item label="Pending" value="Pending" />
                  <Picker.Item label="In Transit" value="In Transit" />
                  <Picker.Item label="Completed" value="Completed" />
                </Picker>
              </View>
            )}
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.createBtn} onPress={() => handleUpdate(editAllocation._id)}>
                <Text style={styles.createBtnText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditAllocation(null)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (theme) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: theme.surface, 
    paddingTop: 20 
  },
  header: { 
    fontSize: 28, 
    fontWeight: '700', 
    color: theme.text, 
    marginBottom: 24, 
    textAlign: 'center',
    letterSpacing: 0.5
  },
  
  // Search and Actions Section
  topSection: {
    backgroundColor: theme.card,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3
  },
  searchRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 16 
  },
  searchInput: { 
    flex: 1, 
    backgroundColor: '#f1f5f9',
    borderWidth: 1, 
    borderColor: '#e2e8f0', 
    borderRadius: 10, 
    padding: 14, 
    marginRight: 12,
    fontSize: 16,
    color: '#334155'
  },
  searchBtn: { 
    backgroundColor: '#dc2626', 
    paddingHorizontal: 20,
    paddingVertical: 14, 
    borderRadius: 10,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2
  },
  searchBtnText: { 
    color: '#fff', 
    fontWeight: '600',
    fontSize: 16
  },
  createBtn: { 
    backgroundColor: '#059669', 
    paddingHorizontal: 20,
    paddingVertical: 14, 
    borderRadius: 10,
    marginTop: 8,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2
  },
  createBtnText: { 
    color: '#fff', 
    fontWeight: '600',
    fontSize: 16,
    textAlign: 'center'
  },

  // Card-based List Design
  listContainer: {
    paddingHorizontal: 16
  },
  allocationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626'
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  unitName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center'
  },
  statusPending: {
    backgroundColor: '#fef3c7'
  },
  statusInTransit: {
    backgroundColor: '#dbeafe'
  },
  statusDelivered: {
    backgroundColor: '#d1fae5'
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  statusTextPending: {
    color: '#92400e'
  },
  statusTextInTransit: {
    color: '#1e40af'
  },
  statusTextDelivered: {
    color: '#065f46'
  },
  
  cardContent: {
    gap: 8
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4
  },
  infoLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    flex: 1
  },
  infoValue: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '600',
    flex: 2,
    textAlign: 'right'
  },
  
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 8
  },
  
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 8
  },
  editBtn: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  deleteBtn: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14
  },

  // Pagination
  paginationContainer: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 20,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2
  },
  paginationRow: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center',
    gap: 8
  },
  paginationBtn: { 
    paddingHorizontal: 12,
    paddingVertical: 8, 
    borderRadius: 8, 
    backgroundColor: '#f1f5f9',
    minWidth: 40,
    alignItems: 'center'
  },
  paginationBtnText: { 
    color: '#64748b', 
    fontWeight: '600'
  },
  activePage: { 
    backgroundColor: '#dc2626' 
  },
  activePageText: {
    color: '#fff'
  },

  // Modal Styles
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center', 
    alignItems: 'center',
    padding: 20
  },
  modal: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 24, 
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8
  },
  modalTitle: { 
    fontSize: 24, 
    fontWeight: '700', 
    color: '#1e293b', 
    marginBottom: 20, 
    textAlign: 'center'
  },
  
  // Mode Selector
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#dc2626',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  modeButtonTextActive: {
    color: '#ffffff',
  },

  // Form Styles
  formGroup: {
    marginBottom: 16
  },
  sectionHeader: {
    marginTop: 20,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6
  },
  input: { 
    backgroundColor: '#f9fafb',
    borderWidth: 1, 
    borderColor: '#d1d5db', 
    borderRadius: 10, 
    padding: 14,
    fontSize: 16,
    color: '#374151'
  },
  picker: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10
  },

  // Location Selection Styles
  locationButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  quickLocationBtn: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectedLocationBtn: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626',
  },
  quickLocationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  selectedLocationText: {
    color: '#ffffff',
  },
  
  modalBtnRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 24 
  },
  cancelBtn: { 
    backgroundColor: '#f3f4f6', 
    paddingVertical: 14,
    paddingHorizontal: 24, 
    borderRadius: 10,
    flex: 1
  },
  cancelBtnText: { 
    color: '#6b7280', 
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 16
  },
  submitBtn: {
    backgroundColor: '#dc2626',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    flex: 1
  },
  submitBtnText: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 16
  },

  // Loading and Empty States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40
  },
  emptyText: {
    fontSize: 18,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 16
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 8
  }
});

export default DriverAllocation;
