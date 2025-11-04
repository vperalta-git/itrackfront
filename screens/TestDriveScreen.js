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
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildApiUrl } from '../constants/api';
import UniformLoading from '../components/UniformLoading';

const { width } = Dimensions.get('window');

export default function TestDriveScreen() {
  const [testDrives, setTestDrives] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  
  const [newTestDrive, setNewTestDrive] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    unitId: '',
    unitName: '',
    scheduledDate: '',
    scheduledTime: '',
    notes: ''
  });

  // Fetch test drives
  const fetchTestDrives = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(buildApiUrl('/getTestDrives'));
      const data = await response.json();
      
      if (data.success) {
        setTestDrives(data.data || []);
      } else {
        console.warn('Failed to fetch test drives:', data.message);
        setTestDrives([]);
      }
    } catch (error) {
      console.error('Error fetching test drives:', error);
      Alert.alert('Error', 'Failed to load test drives');
      setTestDrives([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTestDrives();
  }, [fetchTestDrives]);

  // Get filtered test drives
  const getFilteredTestDrives = () => {
    let filtered = testDrives;

    if (filterStatus !== 'all') {
      filtered = filtered.filter(td => 
        td.status?.toLowerCase() === filterStatus.toLowerCase()
      );
    }

    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(td => 
        td.customerName?.toLowerCase().includes(searchLower) ||
        td.unitName?.toLowerCase().includes(searchLower) ||
        td.unitId?.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  };

  // Add new test drive
  const handleAddTestDrive = async () => {
    if (!newTestDrive.customerName || !newTestDrive.customerPhone || !newTestDrive.unitId) {
      Alert.alert('Error', 'Please fill in required fields');
      return;
    }

    try {
      const response = await fetch(buildApiUrl('/createTestDrive'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newTestDrive,
          createdBy: await AsyncStorage.getItem('accountName') || 'System',
          status: 'Scheduled'
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        Alert.alert('Success', 'Test drive scheduled successfully');
        setShowAddModal(false);
        setNewTestDrive({
          customerName: '',
          customerPhone: '',
          customerEmail: '',
          unitId: '',
          unitName: '',
          scheduledDate: '',
          scheduledTime: '',
          notes: ''
        });
        fetchTestDrives();
      } else {
        Alert.alert('Error', data.message || 'Failed to schedule test drive');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to schedule test drive');
    }
  };

  // Update test drive status
  const updateTestDriveStatus = async (id, newStatus) => {
    try {
      const response = await fetch(buildApiUrl(`/updateTestDrive/${id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        Alert.alert('Success', `Status updated to ${newStatus}`);
        fetchTestDrives();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'scheduled': return '#007bff';
      case 'in progress': return '#ffc107';
      case 'completed': return '#28a745';
      case 'cancelled': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const renderTestDriveItem = ({ item }) => (
    <View style={styles.testDriveCard}>
      <View style={styles.cardHeader}>
        <View style={styles.customerInfo}>
          <Text style={styles.customerName}>{item.customerName}</Text>
          <Text style={styles.customerPhone}>{item.customerPhone}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      
      <View style={styles.vehicleInfo}>
        <Text style={styles.vehicleName}>{item.unitName}</Text>
        <Text style={styles.vehicleId}>ID: {item.unitId}</Text>
      </View>

      {item.scheduledDate && (
        <View style={styles.scheduleInfo}>
          <MaterialIcons name="schedule" size={16} color="#666" />
          <Text style={styles.scheduleText}>
            {new Date(item.scheduledDate).toLocaleDateString()} 
            {item.scheduledTime && ` at ${item.scheduledTime}`}
          </Text>
        </View>
      )}

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => {
            Alert.alert(
              'Update Status',
              'Choose new status:',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Scheduled', onPress: () => updateTestDriveStatus(item._id, 'Scheduled') },
                { text: 'In Progress', onPress: () => updateTestDriveStatus(item._id, 'In Progress') },
                { text: 'Completed', onPress: () => updateTestDriveStatus(item._id, 'Completed') },
                { text: 'Cancelled', onPress: () => updateTestDriveStatus(item._id, 'Cancelled') },
              ]
            );
          }}
        >
          <MaterialIcons name="edit" size={16} color="#007AFF" />
          <Text style={styles.actionBtnText}>Update</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Test Drive</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <MaterialIcons name="add" size={24} color="#fff" />
          <Text style={styles.addButtonText}>Schedule</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search test drives..."
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>
      </View>

      {loading ? (
        <UniformLoading message="Loading test drives..." />
      ) : (
        <FlatList
          data={getFilteredTestDrives()}
          keyExtractor={(item) => item._id}
          renderItem={renderTestDriveItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTestDrives(); }} />}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="directions-car" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No test drives scheduled</Text>
            </View>
          }
        />
      )}

      {/* Add Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Schedule Test Drive</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Customer Name *</Text>
                <TextInput
                  style={styles.input}
                  value={newTestDrive.customerName}
                  onChangeText={(text) => setNewTestDrive({...newTestDrive, customerName: text})}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Customer Phone *</Text>
                <TextInput
                  style={styles.input}
                  value={newTestDrive.customerPhone}
                  onChangeText={(text) => setNewTestDrive({...newTestDrive, customerPhone: text})}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Customer Email</Text>
                <TextInput
                  style={styles.input}
                  value={newTestDrive.customerEmail}
                  onChangeText={(text) => setNewTestDrive({...newTestDrive, customerEmail: text})}
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Unit ID *</Text>
                <TextInput
                  style={styles.input}
                  value={newTestDrive.unitId}
                  onChangeText={(text) => setNewTestDrive({...newTestDrive, unitId: text})}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Unit Name</Text>
                <TextInput
                  style={styles.input}
                  value={newTestDrive.unitName}
                  onChangeText={(text) => setNewTestDrive({...newTestDrive, unitName: text})}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={newTestDrive.notes}
                  onChangeText={(text) => setNewTestDrive({...newTestDrive, notes: text})}
                  multiline
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={handleAddTestDrive}
              >
                <Text style={styles.saveBtnText}>Schedule</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e50914',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: { color: '#fff', fontWeight: '600', marginLeft: 4 },
  searchContainer: { padding: 20, backgroundColor: '#fff' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 16, color: '#333' },
  listContainer: { padding: 20 },
  testDriveCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  customerInfo: { flex: 1 },
  customerName: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  customerPhone: { fontSize: 14, color: '#666' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  statusText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  vehicleInfo: { marginBottom: 12 },
  vehicleName: { fontSize: 16, fontWeight: '600', color: '#333' },
  vehicleId: { fontSize: 14, color: '#666' },
  scheduleInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  scheduleText: { marginLeft: 8, fontSize: 14, color: '#666' },
  actionButtons: { flexDirection: 'row', justifyContent: 'flex-end' },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#f0f8ff',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  actionBtnText: { marginLeft: 4, fontSize: 14, fontWeight: '500', color: '#007AFF' },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#333', marginTop: 16 },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: width * 0.9,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  modalBody: { padding: 20, maxHeight: 400 },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelBtn: { backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#e0e0e0' },
  cancelBtnText: { color: '#666', fontWeight: '600' },
  saveBtn: { backgroundColor: '#e50914' },
  saveBtnText: { color: '#fff', fontWeight: '600' },
});