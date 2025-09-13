import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Alert,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Button,
  Image
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildApiUrl } from '../constants/api';
import AdminMapsView from '../components/AdminMapsView';
import ImprovedMapsView from '../components/ImprovedMapsView';

function SupervisorDashboard() {
  const navigation = useNavigation();

  // State management - Same as AdminDashboard
  const [allocations, setAllocations] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [agents, setAgents] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [supervisorName, setSupervisorName] = useState('');

  // Inventory management state
  const [inventory, setInventory] = useState([]);
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [showEditStockModal, setShowEditStockModal] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [newStock, setNewStock] = useState({
    unitName: "",
    conductionNumber: "",
    bodyColor: "",
    variation: "",
  });
  const [editStock, setEditStock] = useState({
    unitName: "",
    unitId: "",
    bodyColor: "",
    variation: "",
    quantity: "",
    status: ""
  });
  const [inventorySearch, setInventorySearch] = useState("");

  // Vehicle assignment state
  const [mode, setMode] = useState('stock');
  const [selectedVin, setSelectedVin] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('');
  const [manualModel, setManualModel] = useState('');
  const [manualVin, setManualVin] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedProcesses, setSelectedProcesses] = useState([]);
  
  // User management state
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    role: 'Sales Agent',
    assignedTo: '',
    accountName: '',
  });

  // Available processes
  const availableProcesses = [
    { id: 'delivery_to_isuzu_pasig', label: 'Delivery to Isuzu Pasig', icon: '🚛' },
    { id: 'stock_integration', label: 'Stock Integration', icon: '📦' },
    { id: 'documentation_check', label: 'Documentation Check', icon: '📋' },
    { id: 'tinting', label: 'Tinting', icon: '🪟' },
    { id: 'carwash', label: 'Car Wash', icon: '🚿' },
    { id: 'ceramic_coating', label: 'Ceramic Coating', icon: '✨' },
    { id: 'accessories', label: 'Accessories', icon: '🔧' },
    { id: 'rust_proof', label: 'Rust Proof', icon: '🛡️' }
  ];

  useEffect(() => {
    initializeData();
    loadSupervisorName();
  }, []);

  const loadSupervisorName = async () => {
    try {
      const storedName = await AsyncStorage.getItem('accountName');
      setSupervisorName(storedName || 'Supervisor');
    } catch (error) {
      console.error('Error loading supervisor name:', error);
    }
  };

  const initializeData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchAllocations(),
        fetchVehicles(),
        fetchInventory(),
        fetchAgents(),
        fetchDrivers(),
        fetchManagers(),
        fetchUsers(),
      ]);
    } catch (error) {
      console.error('Error initializing data:', error);
      Alert.alert('Error', 'Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await initializeData();
    setRefreshing(false);
  };

  // Data fetching functions
  const fetchAllocations = async () => {
    try {
      const res = await fetch(buildApiUrl('/getAllocation'));
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        setAllocations(result.data);
      }
    } catch (error) {
      console.error('Fetch allocations error:', error);
    }
  };

  const fetchVehicles = async () => {
    try {
      const res = await fetch(buildApiUrl('/api/dispatch/assignments'));
      if (res.ok) {
        const result = await res.json();
        if (result.success && Array.isArray(result.data)) {
          setVehicles(result.data);
        }
      }
    } catch (error) {
      console.error('Fetch vehicles error:', error);
    }
  };

  const fetchInventory = async () => {
    try {
      const res = await fetch(buildApiUrl('/getStock'));
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        setInventory(result.data);
      }
    } catch (error) {
      console.error('Fetch inventory error:', error);
    }
  };

  const fetchAgents = async () => {
    try {
      const res = await fetch(buildApiUrl('/getUsers'));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      const agentList = (result.data || []).filter(u => 
        u.role && (u.role.toLowerCase() === 'sales agent' || u.role.toLowerCase() === 'agent')
      );
      setAgents(agentList || []);
    } catch (error) {
      console.error('Fetch agents error:', error);
      setAgents([]);
    }
  };

  const fetchDrivers = async () => {
    try {
      const res = await fetch(buildApiUrl('/getUsers'));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      const driverList = (result.data || []).filter(u => u.role && u.role.toLowerCase() === 'driver');
      setDrivers(driverList || []);
    } catch (error) {
      console.error('Fetch drivers error:', error);
      setDrivers([]);
    }
  };

  const fetchManagers = async () => {
    try {
      const res = await fetch(buildApiUrl('/getUsers'));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      const managerList = (result.data || []).filter(u => u.role && u.role.toLowerCase() === 'manager');
      setManagers(managerList || []);
    } catch (error) {
      console.error('Fetch managers error:', error);
      setManagers([]);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(buildApiUrl('/getUsers'));
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        setUsers(result.data);
      }
    } catch (error) {
      console.error('Fetch users error:', error);
    }
  };

  // Create a map of manager IDs to names for easier grouping
  const managerMap = {};
  managers.forEach(m => {
    managerMap[m._id] = m.accountName;
  });

  // Group sales agents by manager name (or "Unassigned")
  const groupByManager = (users) => {
    const grouped = {};
    users.forEach(user => {
      if (
        user.role.toLowerCase() === 'sales agent' ||
        user.role.toLowerCase() === 'agent'
      ) {
        const managerName = managerMap[user.assignedTo] || 'Unassigned';
        if (!grouped[managerName]) {
          grouped[managerName] = [];
        }
        grouped[managerName].push(user);
      }
    });
    return grouped;
  };

  const groupedAgents = groupByManager(users);

  // Handle new user creation
  const handleCreateUser = async () => {
    if (!newUser.username || !newUser.password || !newUser.accountName) {
      Alert.alert('Validation Error', 'Please fill in all required fields.');
      return;
    }

    try {
      const res = await fetch(buildApiUrl('/createUser'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        console.error('❌ Error creating user:', data.message || 'Unknown error');
        Alert.alert('Error', data.message || 'Failed to create user');
        return;
      }

      Alert.alert('Success', 'User created successfully!');
      setNewUser({
        username: '',
        password: '',
        role: 'Sales Agent',
        assignedTo: '',
        accountName: '',
      });
      
      // Refresh data
      await fetchUsers();
      await fetchManagers();

    } catch (error) {
      console.error('❌ Network error creating user:', error);
      Alert.alert('Network Error', 'Unable to connect to server. Please check your connection.');
    }
  };

  // Handle user deletion
  const handleDeleteUser = async (userId) => {
    Alert.alert(
      'Delete User',
      'Are you sure you want to delete this user?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(buildApiUrl(`/deleteUser/${userId}`), {
                method: 'DELETE',
              });
              const data = await res.json();
              if (data.success) {
                Alert.alert('Success', 'User deleted successfully');
                fetchUsers();
              } else {
                Alert.alert('Error', data.message || 'Failed to delete user');
              }
            } catch (error) {
              console.error('Delete user error:', error);
              Alert.alert('Error', 'Server error while deleting user');
            }
          },
        },
      ]
    );
  };

  // Logout handler
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

  const renderTabButton = (tabName, label, icon) => (
    <TouchableOpacity
      style={[
        styles.tabButton,
        currentTab === tabName && styles.tabButtonActive
      ]}
      onPress={() => setCurrentTab(tabName)}
    >
      <Text style={styles.tabIcon}>{icon}</Text>
      <Text style={[
        styles.tabLabel,
        currentTab === tabName && styles.tabLabelActive
      ]}>{label}</Text>
    </TouchableOpacity>
  );

  const renderDashboardTab = () => {
    const totalVehicles = vehicles.length;
    const totalAgents = agents.length;
    const totalInventory = inventory.length;
    const activeAllocations = allocations.filter(a => a.status === 'active').length;

    return (
      <ScrollView style={styles.tabContent} refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{totalVehicles}</Text>
            <Text style={styles.statLabel}>Vehicles</Text>
            <Text style={styles.statIcon}>🚗</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{totalAgents}</Text>
            <Text style={styles.statLabel}>Sales Agents</Text>
            <Text style={styles.statIcon}>👥</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{totalInventory}</Text>
            <Text style={styles.statLabel}>Inventory</Text>
            <Text style={styles.statIcon}>📦</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{activeAllocations}</Text>
            <Text style={styles.statLabel}>Active Tasks</Text>
            <Text style={styles.statIcon}>⚡</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.activityCard}>
          <Text style={styles.activityTitle}>System Status</Text>
          <Text style={styles.activityText}>All systems operational</Text>
          <Text style={styles.activityTime}>Last updated: {new Date().toLocaleTimeString()}</Text>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity 
            style={styles.quickActionCard}
            onPress={() => setCurrentTab('user_management')}
          >
            <Text style={styles.quickActionIcon}>👤</Text>
            <Text style={styles.quickActionText}>Manage Users</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.quickActionCard}
            onPress={() => setCurrentTab('inventory')}
          >
            <Text style={styles.quickActionIcon}>📦</Text>
            <Text style={styles.quickActionText}>View Inventory</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.quickActionCard}
            onPress={() => setCurrentTab('vehicle_tracking')}
          >
            <Text style={styles.quickActionIcon}>🚗</Text>
            <Text style={styles.quickActionText}>Track Vehicles</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.quickActionCard}
            onPress={() => navigation.navigate('HistoryScreen')}
          >
            <Text style={styles.quickActionIcon}>📚</Text>
            <Text style={styles.quickActionText}>View History</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  const renderUserManagementTab = () => (
    <ScrollView style={styles.tabContent}>
      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Create New User</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Username"
          value={newUser.username}
          onChangeText={(text) => setNewUser({ ...newUser, username: text })}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          value={newUser.password}
          onChangeText={(text) => setNewUser({ ...newUser, password: text })}
        />
        <TextInput
          style={styles.input}
          placeholder="Account Name"
          value={newUser.accountName}
          onChangeText={(text) => setNewUser({ ...newUser, accountName: text })}
        />

        <Text style={styles.label}>Role</Text>
        <Picker
          selectedValue={newUser.role}
          onValueChange={(itemValue) => setNewUser({ ...newUser, role: itemValue })}
          style={styles.picker}
        >
          <Picker.Item label="Sales Agent" value="Sales Agent" />
          <Picker.Item label="Manager" value="Manager" />
          <Picker.Item label="Supervisor" value="Supervisor" />
          <Picker.Item label="Admin" value="Admin" />
          <Picker.Item label="Driver" value="Driver" />
          <Picker.Item label="Dispatch" value="Dispatch" />
        </Picker>

        {newUser.role === 'Sales Agent' && (
          <>
            <Text style={styles.label}>Assign to Manager</Text>
            <Picker
              selectedValue={newUser.assignedTo}
              onValueChange={(itemValue) => setNewUser({ ...newUser, assignedTo: itemValue })}
              style={styles.picker}
            >
              <Picker.Item label="None" value="" />
              {managers.map((manager) => (
                <Picker.Item key={manager._id} label={manager.accountName} value={manager._id} />
              ))}
            </Picker>
          </>
        )}

        <TouchableOpacity style={styles.createButton} onPress={handleCreateUser}>
          <Text style={styles.createButtonText}>Create User</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Existing Users</Text>
      <FlatList
        data={Object.keys(groupedAgents)}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <View style={styles.userGroupCard}>
            <Text style={styles.managerTitle}>👨‍💼 {item}</Text>
            {groupedAgents[item].map((user) => (
              <View key={user._id} style={styles.userItem}>
                <View style={styles.userItemContent}>
                  <View style={styles.userAvatar}>
                    {user.profilePicture ? (
                      <Image 
                        source={{ uri: user.profilePicture }} 
                        style={styles.userAvatarImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.userAvatarPlaceholder}>
                        <Text style={styles.userAvatarText}>
                          {(user.accountName || user.username || 'U').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{user.username} ({user.role})</Text>
                    <Text style={styles.userAccount}>{user.accountName}</Text>
                    {user.email && <Text style={styles.userEmail}>{user.email}</Text>}
                  </View>
                </View>
                <TouchableOpacity 
                  style={styles.deleteButton} 
                  onPress={() => handleDeleteUser(user._id)}
                >
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      />
    </ScrollView>
  );

  const renderInventoryTab = () => (
    <ScrollView style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Inventory Overview</Text>
      <View style={styles.inventoryGrid}>
        <View style={styles.inventoryCard}>
          <Text style={styles.inventoryNumber}>{inventory.length}</Text>
          <Text style={styles.inventoryLabel}>Total Units</Text>
        </View>
        <View style={styles.inventoryCard}>
          <Text style={styles.inventoryNumber}>{inventory.filter(i => i.status === 'available').length}</Text>
          <Text style={styles.inventoryLabel}>Available</Text>
        </View>
        <View style={styles.inventoryCard}>
          <Text style={styles.inventoryNumber}>{inventory.filter(i => i.status === 'assigned').length}</Text>
          <Text style={styles.inventoryLabel}>Assigned</Text>
        </View>
      </View>

      <FlatList
        data={inventory.slice(0, 10)}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View style={styles.inventoryItem}>
            <View style={styles.inventoryInfo}>
              <Text style={styles.inventoryTitle}>{item.unitName}</Text>
              <Text style={styles.inventoryDetails}>VIN: {item.conductionNumber}</Text>
              <Text style={styles.inventoryDetails}>Color: {item.bodyColor}</Text>
            </View>
            <View style={[styles.statusBadge, 
              item.status === 'available' ? styles.statusAvailable : styles.statusAssigned
            ]}>
              <Text style={styles.statusText}>{item.status}</Text>
            </View>
          </View>
        )}
      />
    </ScrollView>
  );

  const renderVehicleTrackingTab = () => (
    <ScrollView style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Vehicle Tracking</Text>
      <View style={styles.mapContainer}>
        <ImprovedMapsView />
      </View>
      
      <Text style={styles.sectionTitle}>Vehicle Status</Text>
      <FlatList
        data={vehicles.slice(0, 5)}
        keyExtractor={(item) => item._id || item.id}
        renderItem={({ item }) => (
          <View style={styles.vehicleTrackingItem}>
            <View style={styles.vehicleInfo}>
              <Text style={styles.vehicleModel}>{item.model || 'Unknown Model'}</Text>
              <Text style={styles.vehicleVin}>VIN: {item.vin || 'N/A'}</Text>
              <Text style={styles.vehicleAgent}>Agent: {item.agentName || 'Unassigned'}</Text>
            </View>
            <View style={styles.vehicleStatus}>
              <Text style={styles.vehicleStatusText}>{item.status || 'Unknown'}</Text>
            </View>
          </View>
        )}
      />
    </ScrollView>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#CB1E2A" />
        <Text style={styles.loadingText}>Loading Supervisor Dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Supervisor Dashboard</Text>
          <Text style={styles.headerSubtitle}>Welcome, {supervisorName}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate('UserProfile')}
          >
            <Text style={styles.profileButtonText}>👤 Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Navigation Tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.tabContainer}
        contentContainerStyle={styles.tabContentContainer}
      >
        {renderTabButton('dashboard', 'Dashboard', '📊')}
        {renderTabButton('user_management', 'Users', '👥')}
        {renderTabButton('inventory', 'Inventory', '📦')}
        {renderTabButton('vehicle_tracking', 'Vehicles', '🚗')}
      </ScrollView>

      {/* Tab Content */}
      {currentTab === 'dashboard' && renderDashboardTab()}
      {currentTab === 'user_management' && renderUserManagementTab()}
      {currentTab === 'inventory' && renderInventoryTab()}
      {currentTab === 'vehicle_tracking' && renderVehicleTrackingTab()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff' 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#CB1E2A',
    paddingTop: 50,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  profileButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  tabContainer: {
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  tabContentContainer: {
    paddingHorizontal: 10,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 25,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  tabButtonActive: {
    backgroundColor: '#CB1E2A',
    borderColor: '#CB1E2A',
  },
  tabIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  tabLabelActive: {
    color: '#fff',
  },
  tabContent: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#CB1E2A',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  statIcon: {
    fontSize: 24,
  },
  formSection: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  picker: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  createButton: {
    backgroundColor: '#CB1E2A',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  userGroupCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  managerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  userItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    marginRight: 12,
  },
  userAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  userAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#CB1E2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  userAccount: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  userEmail: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default SupervisorDashboard;
