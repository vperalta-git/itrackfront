//

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Alert,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Modal
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://localhost:5000';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa'
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontWeight: '500'
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#CB1E2A'
  },
  header: {
    fontSize: 28,
    fontWeight: '800',
    color: '#CB1E2A',
    flex: 1
  },
  logoutButton: {
    backgroundColor: '#d32f2f',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  logoutButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#CB1E2A',
    marginBottom: 4
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    textTransform: 'uppercase'
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    paddingBottom: 8
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#495057'
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#f8f9fa',
    overflow: 'hidden'
  },
  picker: {
    fontSize: 16,
    color: '#495057',
    backgroundColor: 'transparent'
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 12,
    marginBottom: 16,
    fontSize: 16,
    padding: 16,
    backgroundColor: '#f8f9fa',
    color: '#495057'
  },
  primaryButton: {
    backgroundColor: '#CB1E2A',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    shadowColor: '#CB1E2A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5
  },
  secondaryButton: {
    backgroundColor: '#1976D2',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#1976D2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5
  },
  disabledButton: {
    backgroundColor: '#6c757d',
    shadowOpacity: 0.1
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 16
  },
  allocationItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#CB1E2A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  allocationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  itemTitle: {
    fontWeight: '700',
    fontSize: 16,
    color: '#2c3e50',
    flex: 1
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
    overflow: 'hidden'
  },
  itemText: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 4
  },
  itemDate: {
    fontSize: 12,
    color: '#adb5bd',
    fontStyle: 'italic',
    marginTop: 4
  },
  userItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#1976D2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  userName: {
    fontWeight: '700',
    fontSize: 16,
    color: '#2c3e50',
    flex: 1
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
    overflow: 'hidden'
  },
  userDetail: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 2
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center'
  },
  emptyText: {
    fontSize: 16,
    color: '#adb5bd',
    fontStyle: 'italic',
    textAlign: 'center'
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    backgroundColor: '#f8f9fa'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2c3e50'
  },
  modalClose: {
    fontSize: 30,
    color: '#6c757d',
    fontWeight: '300'
  },
  modalContent: {
    flex: 1,
    padding: 20
  }
});
  const navigation = useNavigation();

  // State Management
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Data States
  const [allocations, setAllocations] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [agents, setAgents] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [managers, setManagers] = useState([]);
  const [users, setUsers] = useState([]);

  // Form States
  const [mode, setMode] = useState('stock');
  const [selectedVin, setSelectedVin] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('');
  const [manualModel, setManualModel] = useState('');
  const [manualVin, setManualVin] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');

  // Modal States
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    role: 'Sales Agent',
    accountName: '',
    email: '',
    phone: ''
  });

  // Initialize data on component mount
  useEffect(() => {
    initializeData();
  }, []);

  const initializeData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchAllocations(),
        fetchVehicles(),
        fetchUsers(),
        fetchManagers()
      ]);
    } catch (error) {
      console.error('Error initializing data:', error);
      showError('Failed to load data. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await initializeData();
    setRefreshing(false);
  }, []);

  // API Functions
  const fetchAllocations = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/driver-allocations`);
      const data = await response.json();
      
      if (data.success) {
        setAllocations(data.data || []);
        console.log(`✅ Loaded ${data.data?.length || 0} allocations`);
      } else {
        throw new Error(data.message || 'Failed to fetch allocations');
      }
    } catch (error) {
      console.error('Fetch allocations error:', error);
      showError('Failed to fetch allocations');
    }
  };

  const fetchVehicles = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/vehicles`);
      const data = await response.json();
      
      if (data.success) {
        setVehicles(data.vehicles || []);
        console.log(`✅ Loaded ${data.vehicles?.length || 0} vehicles`);
      } else {
        throw new Error(data.message || 'Failed to fetch vehicles');
      }
    } catch (error) {
      console.error('Fetch vehicles error:', error);
      showError('Failed to fetch vehicles');
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/users`);
      const data = await response.json();
      
      if (data.success) {
        const allUsers = data.users || [];
        setUsers(allUsers);
        
        // Filter by roles
        const agentList = allUsers.filter(u => u.role && u.role.toLowerCase() === 'sales agent');
        const driverList = allUsers.filter(u => u.role && u.role.toLowerCase() === 'driver');
        
        setAgents(agentList);
        setDrivers(driverList);
        
        console.log(`✅ Loaded ${allUsers.length} users (${agentList.length} agents, ${driverList.length} drivers)`);
      } else {
        throw new Error(data.message || 'Failed to fetch users');
      }
    } catch (error) {
      console.error('Fetch users error:', error);
      showError('Failed to fetch users');
    }
  };

  const fetchManagers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/managers`);
      const data = await response.json();
      
      if (data.success) {
        setManagers(data.managers || []);
        console.log(`✅ Loaded ${data.managers?.length || 0} managers`);
      } else {
        throw new Error(data.message || 'Failed to fetch managers');
      }
    } catch (error) {
      console.error('Fetch managers error:', error);
      setManagers([]);
    }
  };

  // Assignment Functions
  const assignToAgent = async () => {
    if (!selectedVin || !selectedAgent) {
      showError('Please select both VIN and Agent.');
      return;
    }

    setSubmitting(true);
    try {
      const selectedVehicle = vehicles.find(v => v.vin === selectedVin);
      if (!selectedVehicle) {
        throw new Error('Selected vehicle not found.');
      }

      const updatedVehicle = {
        ...selectedVehicle,
        driver: '',
        customer_name: '',
        customer_number: '',
        requested_processes: [],
        assignedAgent: selectedAgent,
        current_status: 'Assigned',
        updatedAt: new Date().toISOString()
      };

      const response = await fetch(`${API_BASE_URL}/vehicles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedVehicle),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to assign vehicle');
      }

      showSuccess('Vehicle assigned to sales agent successfully!');
      setSelectedVin('');
      setSelectedAgent('');
      await fetchAllocations();
      await fetchVehicles();
    } catch (error) {
      console.error('Assign to agent error:', error);
      showError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const assignToDriver = async () => {
    if (!manualModel || !manualVin || !selectedDriver) {
      showError('Please fill in all fields for driver assignment.');
      return;
    }

    setSubmitting(true);
    try {
      const allocationPayload = {
        unitName: manualModel,
        unitId: manualVin,
        vin: manualVin,
        bodyColor: 'Standard',
        variation: 'Standard',
        assignedDriver: selectedDriver,
        status: 'Pending',
        createdAt: new Date().toISOString()
      };

      const response = await fetch(`${API_BASE_URL}/driver-allocations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(allocationPayload),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to assign to driver');
      }

      showSuccess('Vehicle assigned to driver successfully!');
      setManualModel('');
      setManualVin('');
      setSelectedDriver('');
      await fetchAllocations();
    } catch (error) {
      console.error('Assign to driver error:', error);
      showError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const createUser = async () => {
    if (!newUser.username || !newUser.password || !newUser.accountName) {
      showError('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to create user');
      }

      showSuccess('User created successfully!');
      setShowCreateUser(false);
      setNewUser({
        username: '',
        password: '',
        role: 'Sales Agent',
        accountName: '',
        email: '',
        phone: ''
      });
      await fetchUsers();
    } catch (error) {
      console.error('Create user error:', error);
      showError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Utility Functions
  const showSuccess = (message) => {
    Alert.alert('Success', message, [{ text: 'OK' }]);
  };

  const showError = (message) => {
    Alert.alert('Error', message, [{ text: 'OK' }]);
  };

  const handleLogout = () => {
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
              await AsyncStorage.multiRemove(['userRole', 'userName', 'userToken']);
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.error('Logout error:', error);
            }
          },
        },
      ]
    );
  };

  // Render Functions
  const renderAllocationItem = ({ item }) => (
    <View style={styles.allocationItem}>
      <View style={styles.allocationHeader}>
        <Text style={styles.itemTitle}>{item.unitName}</Text>
        <Text style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          {item.status}
        </Text>
      </View>
      <Text style={styles.itemText}>VIN/Unit ID: {item.unitId}</Text>
      <Text style={styles.itemText}>Driver: {item.assignedDriver}</Text>
      <Text style={styles.itemText}>Color: {item.bodyColor}</Text>
      <Text style={styles.itemText}>Variation: {item.variation}</Text>
      <Text style={styles.itemDate}>
        Created: {new Date(item.createdAt).toLocaleDateString()}
      </Text>
    </View>
  );

  const renderUserItem = ({ item }) => (
    <View style={styles.userItem}>
      <View style={styles.userHeader}>
        <Text style={styles.userName}>{item.accountName}</Text>
        <Text style={[styles.roleBadge, { backgroundColor: getRoleColor(item.role) }]}>
          {item.role}
        </Text>
      </View>
      <Text style={styles.userDetail}>Username: {item.username}</Text>
      <Text style={styles.userDetail}>Email: {item.email || 'Not provided'}</Text>
      <Text style={styles.userDetail}>Phone: {item.phone || 'Not provided'}</Text>
    </View>
  );

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return '#ff9800';
      case 'in progress': return '#2196f3';
      case 'completed': return '#4caf50';
      case 'cancelled': return '#f44336';
      default: return '#757575';
    }
  };

  const getRoleColor = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin': return '#d32f2f';
      case 'manager': return '#1976d2';
      case 'sales agent': return '#388e3c';
      case 'driver': return '#f57c00';
      case 'dispatch': return '#7b1fa2';
      default: return '#616161';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#CB1E2A" />
        <Text style={styles.loadingText}>Loading Admin Dashboard...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.header}>Admin Dashboard</Text>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{vehicles.length}</Text>
            <Text style={styles.statLabel}>Vehicles</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{users.length}</Text>
            <Text style={styles.statLabel}>Users</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{allocations.length}</Text>
            <Text style={styles.statLabel}>Allocations</Text>
          </View>
        </View>

        {/* Vehicle Assignment Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehicle Assignment</Text>
          
          <Text style={styles.label}>Assignment Mode</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={mode}
              onValueChange={setMode}
              style={styles.picker}
            >
              <Picker.Item label="Assign from Vehicle Stock" value="stock" />
              <Picker.Item label="Manual Entry for Driver" value="manual" />
            </Picker>
          </View>

          {mode === 'stock' ? (
            <View>
              <Text style={styles.label}>Select Vehicle</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedVin}
                  onValueChange={setSelectedVin}
                  style={styles.picker}
                >
                  <Picker.Item label="Select Vehicle" value="" />
                  {vehicles.map(v => (
                    <Picker.Item 
                      key={v.vin} 
                      label={`${v.model} (${v.vin}) - ${v.current_status}`} 
                      value={v.vin} 
                    />
                  ))}
                </Picker>
              </View>

              <Text style={styles.label}>Select Sales Agent</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedAgent}
                  onValueChange={setSelectedAgent}
                  style={styles.picker}
                >
                  <Picker.Item label="Select Agent" value="" />
                  {agents.map(a => (
                    <Picker.Item 
                      key={a._id} 
                      label={a.accountName} 
                      value={a.accountName} 
                    />
                  ))}
                </Picker>
              </View>

              <TouchableOpacity 
                style={[styles.primaryButton, submitting && styles.disabledButton]} 
                onPress={assignToAgent}
                disabled={submitting}
              >
                <Text style={styles.buttonText}>
                  {submitting ? 'Assigning...' : 'Assign to Agent'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <TextInput
                style={styles.textInput}
                placeholder="Vehicle Model (e.g., D-Max LS-A 4x2)"
                value={manualModel}
                onChangeText={setManualModel}
                placeholderTextColor="#999"
              />
              
              <TextInput
                style={styles.textInput}
                placeholder="VIN/Unit ID"
                value={manualVin}
                onChangeText={setManualVin}
                placeholderTextColor="#999"
              />

              <Text style={styles.label}>Select Driver</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedDriver}
                  onValueChange={setSelectedDriver}
                  style={styles.picker}
                >
                  <Picker.Item label="Select Driver" value="" />
                  {drivers.map(d => (
                    <Picker.Item 
                      key={d._id} 
                      label={d.accountName} 
                      value={d.accountName} 
                    />
                  ))}
                </Picker>
              </View>

              <TouchableOpacity 
                style={[styles.primaryButton, submitting && styles.disabledButton]} 
                onPress={assignToDriver}
                disabled={submitting}
              >
                <Text style={styles.buttonText}>
                  {submitting ? 'Assigning...' : 'Assign to Driver'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setShowCreateUser(true)}
          >
            <Text style={styles.buttonText}>Create New User</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('AdminVehicleTracking')}
          >
            <Text style={styles.buttonText}>Vehicle Tracking</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('UserManagement')}
          >
            <Text style={styles.buttonText}>User Management</Text>
          </TouchableOpacity>
        </View>

        {/* Current Allocations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Allocations</Text>
          <FlatList
            data={allocations.slice(0, 5)}
            keyExtractor={(item) => item._id}
            renderItem={renderAllocationItem}
            scrollEnabled={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No allocations found.</Text>
              </View>
            }
          />
        </View>

        {/* System Users */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Users</Text>
          <FlatList
            data={users.slice(0, 5)}
            keyExtractor={(item) => item._id}
            renderItem={renderUserItem}
            scrollEnabled={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No users found.</Text>
              </View>
            }
          />
        </View>
      </ScrollView>

      {/* Create User Modal */}
      <Modal
        visible={showCreateUser}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create New User</Text>
            <TouchableOpacity onPress={() => setShowCreateUser(false)}>
              <Text style={styles.modalClose}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <TextInput
              style={styles.textInput}
              placeholder="Username"
              value={newUser.username}
              onChangeText={(text) => setNewUser({...newUser, username: text})}
              placeholderTextColor="#999"
            />

            <TextInput
              style={styles.textInput}
              placeholder="Password"
              value={newUser.password}
              onChangeText={(text) => setNewUser({...newUser, password: text})}
              secureTextEntry
              placeholderTextColor="#999"
            />

            <TextInput
              style={styles.textInput}
              placeholder="Full Name"
              value={newUser.accountName}
              onChangeText={(text) => setNewUser({...newUser, accountName: text})}
              placeholderTextColor="#999"
            />

            <Text style={styles.label}>Role</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={newUser.role}
                onValueChange={(value) => setNewUser({...newUser, role: value})}
                style={styles.picker}
              >
                <Picker.Item label="Sales Agent" value="Sales Agent" />
                <Picker.Item label="Driver" value="Driver" />
                <Picker.Item label="Manager" value="Manager" />
                <Picker.Item label="Dispatch" value="Dispatch" />
                <Picker.Item label="Supervisor" value="Supervisor" />
              </Picker>
            </View>

            <TextInput
              style={styles.textInput}
              placeholder="Email (optional)"
              value={newUser.email}
              onChangeText={(text) => setNewUser({...newUser, email: text})}
              keyboardType="email-address"
              placeholderTextColor="#999"
            />

            <TextInput
              style={styles.textInput}
              placeholder="Phone (optional)"
              value={newUser.phone}
              onChangeText={(text) => setNewUser({...newUser, phone: text})}
              keyboardType="phone-pad"
              placeholderTextColor="#999"
            />

            <TouchableOpacity 
              style={[styles.primaryButton, submitting && styles.disabledButton]} 
              onPress={createUser}
              disabled={submitting}
            >
              <Text style={styles.buttonText}>
                {submitting ? 'Creating...' : 'Create User'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
