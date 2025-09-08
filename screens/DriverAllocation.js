//DriverAllocation.js

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Modal, StyleSheet, Alert, ActivityIndicator, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import { buildApiUrl } from '../constants/api';

const DriverAllocation = () => {
  const [allocations, setAllocations] = useState([]);
  const [newAllocation, setNewAllocation] = useState({
    unitName: '',
    unitId: '',
    bodyColor: '',
    variation: '',
    assignedDriver: '',
    status: 'Pending',
    date: ''
  });
  const [editAllocation, setEditAllocation] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [drivers, setDrivers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAllocations();
    fetchDrivers();
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

  const handleCreate = () => {
    const { unitName, unitId, bodyColor, variation, assignedDriver } = newAllocation;
    if (!unitName || !unitId || !bodyColor || !variation || !assignedDriver) {
      Alert.alert('All fields are required.');
      return;
    }
    axios.post(buildApiUrl('/createAllocation'), newAllocation)
      .then((res) => {
        console.log('Create allocation response:', res.data);
        if (res.data.success) {
          fetchAllocations();
          setNewAllocation({
            unitName: '', unitId: '', bodyColor: '', variation: '', assignedDriver: '', status: 'Pending', date: ''
          });
          setIsCreateModalOpen(false);
          Alert.alert('Success', 'Allocation created successfully');
        } else {
          Alert.alert('Error', res.data.message || 'Failed to create allocation');
        }
      })
      .catch((err) => {
        console.error('Error creating allocation:', err);
        Alert.alert('Error', 'Failed to create allocation');
      });
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
            <Text style={styles.modalTitle}>Allocate Driver</Text>
            <View style={styles.modalForm}>
              <TextInput
                style={styles.input}
                placeholder="Unit Name"
                value={newAllocation.unitName}
                onChangeText={text => setNewAllocation({ ...newAllocation, unitName: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Conduction Number"
                value={newAllocation.unitId}
                onChangeText={text => setNewAllocation({ ...newAllocation, unitId: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Body Color"
                value={newAllocation.bodyColor}
                onChangeText={text => setNewAllocation({ ...newAllocation, bodyColor: text })}
              />
              <Picker
                selectedValue={newAllocation.variation}
                style={styles.input}
                onValueChange={itemValue => setNewAllocation({ ...newAllocation, variation: itemValue })}
              >
                <Picker.Item label="Select Variation" value="" />
                <Picker.Item label="4x2 LSA" value="4x2 LSA" />
                <Picker.Item label="4x4" value="4x4" />
                <Picker.Item label="LS-E" value="LS-E" />
                <Picker.Item label="LS" value="LS" />
              </Picker>
              <Picker
                selectedValue={newAllocation.assignedDriver}
                style={styles.input}
                onValueChange={itemValue => setNewAllocation({ ...newAllocation, assignedDriver: itemValue })}
              >
                <Picker.Item label="Select Driver" value="" />
                {drivers.map(driver => (
                  <Picker.Item key={driver._id} label={driver.accountName || driver.username} value={driver.accountName || driver.username} />
                ))}
              </Picker>
              <Picker
                selectedValue={newAllocation.status}
                style={styles.input}
                onValueChange={itemValue => setNewAllocation({ ...newAllocation, status: itemValue })}
              >
                <Picker.Item label="Pending" value="Pending" />
                <Picker.Item label="In Transit" value="In Transit" />
                <Picker.Item label="Completed" value="Completed" />
              </Picker>
              <TextInput
                style={styles.input}
                placeholder="Date (YYYY-MM-DD)"
                value={newAllocation.date}
                onChangeText={text => setNewAllocation({ ...newAllocation, date: text })}
              />
            </View>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.createBtn} onPress={handleCreate}>
                <Text style={styles.createBtnText}>Confirm</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsCreateModalOpen(false)}>
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

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8fafc', 
    paddingTop: 20 
  },
  header: { 
    fontSize: 28, 
    fontWeight: '700', 
    color: '#1e293b', 
    marginBottom: 24, 
    textAlign: 'center',
    letterSpacing: 0.5
  },
  
  // Search and Actions Section
  topSection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
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
  
  // Form Styles
  formGroup: {
    marginBottom: 16
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
