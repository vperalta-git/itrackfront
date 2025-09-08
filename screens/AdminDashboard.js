import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Button,
  FlatList,
  StyleSheet,
  Alert,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildApiUrl } from '../constants/api';

export default function AdminDashboard() {
  const navigation = useNavigation();

  // State management
  const [allocations, setAllocations] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [agents, setAgents] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState('dashboard'); // Add tab state

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

  const [mode, setMode] = useState('stock'); // 'stock' or 'manual'

  const [selectedVin, setSelectedVin] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('');

  const [manualModel, setManualModel] = useState('');
  const [manualVin, setManualVin] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');

  // Process selection state
  const [selectedProcesses, setSelectedProcesses] = useState([]);
  
  // Dispatch assignment state
  const [selectedVehiclesForDispatch, setSelectedVehiclesForDispatch] = useState([]);
  const [selectedDispatchProcesses, setSelectedDispatchProcesses] = useState([]);
  const [showDispatchAssignmentModal, setShowDispatchAssignmentModal] = useState(false);
  
  // Release management state
  const [pendingReleases, setPendingReleases] = useState([]);
  const [releaseHistory, setReleaseHistory] = useState([]);
  const [showReleaseConfirmModal, setShowReleaseConfirmModal] = useState(false);
  const [selectedReleaseVehicle, setSelectedReleaseVehicle] = useState(null);
  
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
  }, []);

  const initializeData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchAllocations(),
        fetchVehicles(),
        fetchAgents(),
        fetchDrivers(),
        fetchManagers(),
        fetchInventory(),
        fetchPendingReleases()
      ]);
    } catch (error) {
      console.error('Error initializing data:', error);
      Alert.alert('Error', 'Failed to load initial data. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllocations = async () => {
    try {
      console.log('🔄 Fetching allocations from:', buildApiUrl('/getAllocation'));
      const res = await fetch(buildApiUrl('/getAllocation'));
      
      // Get response text first, then try to parse as JSON
      const responseText = await res.text();
      console.log('📋 Allocations response status:', res.status);
      console.log('📋 Allocations raw response:', responseText.substring(0, 200) + '...');
      
      if (!res.ok) {
        console.error('❌ Allocations fetch failed:', responseText);
        throw new Error(`HTTP ${res.status}: ${responseText}`);
      }
      
      let data;
      try {
        data = JSON.parse(responseText);
        console.log('✅ Allocations parsed successfully:', data.data?.length || 0, 'items');
      } catch (jsonError) {
        console.error('❌ JSON parse error for allocations:', jsonError);
        console.error('❌ Response was:', responseText);
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}`);
      }
      
      setAllocations(data.data || []);
    } catch (err) {
      console.error('Fetch allocations error:', err);
      Alert.alert('Error', 'Failed to fetch driver allocations: ' + err.message);
      setAllocations([]);
    }
  };

  const fetchVehicles = async () => {
    try {
      console.log('🔄 Fetching vehicles from:', buildApiUrl('/getStock'));
      const res = await fetch(buildApiUrl('/getStock'));
      
      const responseText = await res.text();
      console.log('📋 Vehicles response status:', res.status);
      
      if (!res.ok) {
        console.error('❌ Vehicles fetch failed:', responseText);
        throw new Error(`HTTP ${res.status}: ${responseText}`);
      }
      
      let data;
      try {
        data = JSON.parse(responseText);
        console.log('✅ Vehicles parsed successfully:', data.data?.length || 0, 'items');
      } catch (jsonError) {
        console.error('❌ JSON parse error for vehicles:', jsonError);
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}`);
      }
      
      setVehicles(data.data || []);
    } catch (err) {
      console.error('Fetch vehicles error:', err);
      Alert.alert('Error', 'Failed to fetch vehicles: ' + err.message);
      setVehicles([]);
    }
  };

  const fetchAgents = async () => {
    try {
      const res = await fetch(buildApiUrl('/getUsers'));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const agentList = (data.data || []).filter(u => u.role && u.role.toLowerCase() === 'sales agent');
      setAgents(agentList);
    } catch (err) {
      console.error('Fetch agents error:', err);
      Alert.alert('Error', 'Failed to fetch agents');
    }
  };

  const fetchDrivers = async () => {
    try {
      const res = await fetch(buildApiUrl('/getUsers'));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const driverList = (data.data || []).filter(u => u.role && u.role.toLowerCase() === 'driver');
      setDrivers(driverList);
    } catch (err) {
      console.error('Fetch drivers error:', err);
      Alert.alert('Error', 'Failed to fetch drivers');
    }
  };

  const fetchManagers = async () => {
    try {
      const res = await fetch(buildApiUrl('/getUsers'));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      // Filter to get only managers from the users
      const managerList = (result.data || []).filter(u => u.role && u.role.toLowerCase() === 'manager');
      setManagers(managerList || []);
    } catch (error) {
      console.error('Fetch managers error:', error);
      setManagers([]);
    }
  };

  // Inventory management functions
  const fetchInventory = async () => {
    try {
      const res = await fetch(buildApiUrl('/getStock'));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setInventory(data.data || []);
    } catch (err) {
      console.error('Fetch inventory error:', err);
      Alert.alert('Error', 'Failed to fetch inventory');
    }
  };

  const fetchPendingReleases = async () => {
    try {
      const res = await fetch(buildApiUrl('/api/dispatch/assignments'));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      
      if (data.success) {
        // Filter for vehicles that are "Ready for Release"
        const readyForRelease = (data.data || []).filter(assignment => {
          const completedProcesses = Object.keys(assignment.processStatus || {}).filter(
            key => assignment.processStatus[key] === true
          ).length;
          const totalProcesses = assignment.processes?.length || 0;
          return completedProcesses === totalProcesses && totalProcesses > 0;
        });
        
        setPendingReleases(readyForRelease);
        console.log(`Found ${readyForRelease.length} vehicles ready for release`);
      }
    } catch (err) {
      console.error('Fetch pending releases error:', err);
      // Don't show alert for this as it's not critical
    }
  };

  const handleAddStock = async () => {
    const { unitName, conductionNumber, bodyColor, variation } = newStock;
    if (!unitName || !conductionNumber || !bodyColor || !variation) {
      Alert.alert("Error", "Please fill in all fields for adding stock.");
      return;
    }
    try {
      const response = await fetch(buildApiUrl('/createStock'), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitName,
          unitId: conductionNumber, // Backend expects unitId
          bodyColor,
          variation
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to add stock.");
      }
      
      Alert.alert("Success", "Stock added successfully!");
      setNewStock({ unitName: "", conductionNumber: "", bodyColor: "", variation: "" });
      setShowAddStockModal(false);
      await fetchInventory(); // Refresh inventory data
    } catch (error) {
      console.error("Add stock error:", error);
      Alert.alert("Error", error.message);
    }
  };

  const handleDeleteStock = async (stockId) => {
    Alert.alert(
      'Delete Stock',
      'Are you sure you want to delete this stock item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(buildApiUrl(`/deleteStock/${stockId}`), {
                method: 'DELETE',
              });
              
              const result = await response.json();
              
              if (!response.ok || !result.success) {
                throw new Error(result.error || 'Failed to delete stock.');
              }
              
              Alert.alert('Success', 'Stock deleted successfully!');
              await fetchInventory(); // Refresh inventory data
            } catch (error) {
              console.error('Delete stock error:', error);
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const handleEditStock = (item) => {
    setSelectedStock(item);
    setEditStock({
      unitName: item.unitName || "",
      unitId: item.unitId || "",
      bodyColor: item.bodyColor || "",
      variation: item.variation || "",
      quantity: item.quantity?.toString() || "1",
      status: item.status || "Available"
    });
    setShowEditStockModal(true);
  };

  const handleUpdateStock = async () => {
    if (!editStock.unitName || !editStock.unitId || !editStock.bodyColor || !editStock.variation) {
      Alert.alert("Missing Info", "Please fill in all required fields.");
      return;
    }

    try {
      const response = await fetch(buildApiUrl(`/updateStock/${selectedStock._id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          unitName: editStock.unitName,
          unitId: editStock.unitId,
          bodyColor: editStock.bodyColor,
          variation: editStock.variation,
          quantity: parseInt(editStock.quantity) || 1,
          status: editStock.status
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update stock.');
      }
      
      Alert.alert("Success", "Stock updated successfully!");
      setEditStock({ unitName: "", unitId: "", bodyColor: "", variation: "", quantity: "", status: "" });
      setShowEditStockModal(false);
      setSelectedStock(null);
      await fetchInventory(); // Refresh inventory data
    } catch (error) {
      console.error("Update stock error:", error);
      Alert.alert("Error", error.message);
    }
  };

  const assignToAgent = async () => {
    if (!selectedVin || !selectedAgent || !selectedDriver) {
      Alert.alert('Missing Info', 'Please select vehicle, agent, and driver.');
      return;
    }

    // Auto-assign default delivery processes if none selected
    let processesToAssign = selectedProcesses;
    if (processesToAssign.length === 0) {
      processesToAssign = [
        'delivery_to_isuzu_pasig',
        'stock_integration',
        'documentation_check'
      ];
      console.log('No processes selected for stock assignment, using default delivery processes:', processesToAssign);
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
        requestedProcesses: processesToAssign,
        date: new Date()
      };

      const res = await fetch(buildApiUrl('/createAllocation'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(allocationPayload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to assign vehicle');

      // Update the inventory item status to "Allocated"
      await fetch(buildApiUrl(`/updateStock/${selectedVehicle._id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...selectedVehicle,
          status: 'Allocated'
        }),
      });

      Alert.alert('Success', `Vehicle assigned successfully with ${processesToAssign.length} process(es)\n\nProcesses: ${processesToAssign.join(', ')}`);
      setSelectedVin('');
      setSelectedAgent('');
      setSelectedDriver('');
      setSelectedProcesses([]);
      await Promise.all([fetchAllocations(), fetchInventory()]);
    } catch (err) {
      console.error('Assign to agent error:', err);
      Alert.alert('Error', err.message);
    }
  };

  const assignToDriver = async () => {
    if (!manualModel || !manualVin || !selectedDriver || !selectedAgent) {
      Alert.alert('Missing Info', 'Please fill in all fields for manual entry.');
      return;
    }

    // Auto-assign default delivery processes if none selected
    let processesToAssign = selectedProcesses;
    if (processesToAssign.length === 0) {
      processesToAssign = [
        'delivery_to_isuzu_pasig',
        'stock_integration',
        'documentation_check'
      ];
      console.log('No processes selected, using default delivery processes:', processesToAssign);
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
        requestedProcesses: processesToAssign,
        date: new Date()
      };

      const res = await fetch(buildApiUrl('/createAllocation'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(allocationPayload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to assign');

      Alert.alert('Success', `Vehicle assigned to driver with ${processesToAssign.length} process(es)\n\nProcesses: ${processesToAssign.join(', ')}`);
      setManualModel('');
      setManualVin('');
      setSelectedDriver('');
      setSelectedAgent('');
      setSelectedProcesses([]);
      fetchAllocations();
    } catch (err) {
      console.error('Assign to driver error:', err);
      Alert.alert('Error', err.message);
    }
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
              // Clear all session-related AsyncStorage keys
              await AsyncStorage.removeItem('userToken');
              await AsyncStorage.removeItem('userName');
              await AsyncStorage.removeItem('userRole');
              await AsyncStorage.removeItem('accountName');
              navigation.reset({
                index: 0,
                routes: [{ name: 'LoginScreen' }], // Changed from 'Login' to 'LoginScreen'
              });
            } catch (error) {
              console.error('Logout error:', error);
            }
          },
        },
      ]
    );
  };

  // Handle release confirmation function
  const handleConfirmRelease = async () => {
    if (!selectedReleaseVehicle) return;

    Alert.alert(
      'Confirm Vehicle Release',
      `Are you sure you want to release "${selectedReleaseVehicle.unitName}" (${selectedReleaseVehicle.unitId}) to the customer?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Release Vehicle',
          style: 'destructive',
          onPress: async () => {
            try {
              // Create release record
              const releaseData = {
                vehicleId: selectedReleaseVehicle._id,
                unitName: selectedReleaseVehicle.unitName,
                unitId: selectedReleaseVehicle.unitId,
                bodyColor: selectedReleaseVehicle.bodyColor,
                variation: selectedReleaseVehicle.variation,
                completedProcesses: selectedReleaseVehicle.processes || [],
                releasedBy: await AsyncStorage.getItem('userName') || 'Admin',
                releasedAt: new Date().toISOString(),
                status: 'Released to Customer'
              };

              console.log('📋 Confirming vehicle release:', releaseData);

              // Send to release endpoint
              const response = await fetch(buildApiUrl('/api/releases'), {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(releaseData),
              });

              const result = await response.json();

              if (!response.ok || !result.success) {
                throw new Error(result.error || 'Failed to confirm release');
              }

              Alert.alert(
                'Success', 
                `Vehicle ${selectedReleaseVehicle.unitName} has been released to customer!`
              );
              
              // Reset and refresh
              setShowReleaseConfirmModal(false);
              setSelectedReleaseVehicle(null);
              fetchPendingReleases();
              
            } catch (error) {
              console.error('Error confirming release:', error);
              Alert.alert('Error', error.message || 'Failed to confirm release');
            }
          }
        }
      ]
    );
  };

  const renderAllocationItem = ({ item }) => (
    <View style={styles.allocationItem}>
      <Text style={styles.itemTitle}>{item.unitName} - {item.variation}</Text>
      <Text style={styles.itemText}>Driver: {item.assignedDriver}</Text>
      <Text style={styles.itemText}>Status: {item.status}</Text>
      <Text style={styles.itemText}>Color: {item.bodyColor}</Text>
    </View>
  );

  const renderDashboardContent = () => (
    <View style={styles.dashboardContainer}>
      {/* Modern Vehicle Assignment Card */}
      <View style={styles.assignmentCard}>
        <View style={styles.assignmentCardHeader}>
          <Text style={styles.assignmentTitle}>Vehicle Assignment</Text>
          <View style={styles.assignmentBadge}>
            <Text style={styles.assignmentBadgeText}>Quick Assign</Text>
          </View>
        </View>

        {/* Input Mode Selection */}
        <View style={styles.assignmentSection}>
          <Text style={styles.assignmentLabel}>Assignment Mode</Text>
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
        </View>

        {mode === 'stock' ? (
          <View style={styles.assignmentForm}>
            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Select Vehicle from Stock</Text>
              <View style={styles.modernPickerContainer}>
                <Picker
                  selectedValue={selectedVin}
                  onValueChange={val => setSelectedVin(val)}
                  style={styles.modernPicker}
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
            </View>

            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Assign to Agent</Text>
              <View style={styles.modernPickerContainer}>
                <Picker
                  selectedValue={selectedAgent}
                  onValueChange={val => setSelectedAgent(val)}
                  style={styles.modernPicker}
                >
                  <Picker.Item label="Select Agent..." value="" />
                  {agents.map(a => (
                    <Picker.Item key={a._id} label={a.accountName || a.username} value={a.username} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.assignmentForm}>
            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Vehicle Details</Text>
              <TextInput
                style={styles.modernInput}
                placeholder="Vehicle Model (e.g., Isuzu D-Max)"
                value={manualModel}
                onChangeText={setManualModel}
                placeholderTextColor="#94a3b8"
              />
              <TextInput
                style={styles.modernInput}
                placeholder="VIN Number"
                value={manualVin}
                onChangeText={setManualVin}
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>Assign to Agent</Text>
              <View style={styles.modernPickerContainer}>
                <Picker
                  selectedValue={selectedAgent}
                  onValueChange={val => setSelectedAgent(val)}
                  style={styles.modernPicker}
                >
                  <Picker.Item label="Select Agent..." value="" />
                  {agents.map(a => (
                    <Picker.Item key={a._id} label={a.accountName || a.username} value={a.username} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>
        )}

        {/* Driver Selection */}
        <View style={styles.assignmentForm}>
          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Assign Driver</Text>
            <View style={styles.modernPickerContainer}>
              <Picker
                selectedValue={selectedDriver}
                onValueChange={val => setSelectedDriver(val)}
                style={styles.modernPicker}
              >
                <Picker.Item label="Select Driver..." value="" />
                {drivers.map(d => (
                  <Picker.Item key={d._id} label={d.accountName || d.username} value={d.username} />
                ))}
              </Picker>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.createAssignmentButton} 
            onPress={mode === 'stock' ? assignToAgent : assignToDriver}
          >
            <Text style={styles.createAssignmentButtonText}>Create Assignment</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Navigation Card */}
      <View style={styles.navigationCard}>
        <Text style={styles.navigationTitle}>Quick Navigation</Text>
        <View style={styles.navigationButtons}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigation.navigate('AdminVehicleTracking')}
          >
            <Text style={styles.navButtonText}>🚗 Vehicle Tracking</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigation.navigate('UserManagement')}
          >
            <Text style={styles.navButtonText}>👥 User Management</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Current Allocations Card */}
      <View style={styles.allocationsCard}>
        <View style={styles.allocationsHeader}>
          <Text style={styles.allocationsTitle}>Vehicle Allocations</Text>
          <View style={styles.allocationsActions}>
            <TouchableOpacity 
              style={styles.allocationNavBtn}
              onPress={() => navigation.navigate('DriverAllocation')}
            >
              <Text style={styles.allocationNavBtnText}>📋 All Allocations</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.allocationNavBtn}
              onPress={() => navigation.navigate('AdminVehicleTracking')}
            >
              <Text style={styles.allocationNavBtnText}>🚗 Vehicle Tracking</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {allocations.length > 0 ? (
          <View style={styles.allocationsList}>
            {allocations.slice(0, 5).map((item) => (
              <View key={item._id} style={styles.allocationItem}>
                <View style={styles.allocationHeader}>
                  <Text style={styles.allocationUnitName}>{item.unitName}</Text>
                  <View style={[styles.allocationStatusBadge, 
                    item.status === 'In Transit' ? {backgroundColor: '#dbeafe'} : 
                    item.status === 'Completed' ? {backgroundColor: '#d1fae5'} :
                    item.status === 'Assigned' ? {backgroundColor: '#fef3c7'} :
                    {backgroundColor: '#fecaca'}
                  ]}>
                    <Text style={[styles.allocationStatusText,
                      item.status === 'In Transit' ? {color: '#1e40af'} : 
                      item.status === 'Completed' ? {color: '#065f46'} :
                      item.status === 'Assigned' ? {color: '#92400e'} :
                      {color: '#dc2626'}
                    ]}>
                      {item.status}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.allocationDetails}>
                  <Text style={styles.allocationDetailText}>
                    Driver: {item.assignedDriver} • {item.variation}
                  </Text>
                  <Text style={styles.allocationDetailText}>
                    Color: {item.bodyColor} • {new Date(item.createdAt || Date.now()).toLocaleDateString()}
                  </Text>
                  {item.assignedAgent && (
                    <Text style={styles.allocationDetailText}>
                      Agent: {item.assignedAgent}
                    </Text>
                  )}
                </View>
              </View>
            ))}
            
            {allocations.length > 5 && (
              <TouchableOpacity 
                style={styles.viewAllAllocationsBtn}
                onPress={() => navigation.navigate('DriverAllocation')}
              >
                <Text style={styles.viewAllAllocationsBtnText}>
                  View All {allocations.length} Allocations →
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.emptyAllocations}>
            <Text style={styles.emptyAllocationsText}>No allocations found</Text>
            <Text style={styles.emptyAllocationsSubtext}>Create your first vehicle assignment</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderReleaseContent = () => (
    <View style={styles.releaseContainer}>
      {/* Header */}
      <View style={styles.releaseHeader}>
        <Text style={styles.releaseTitle}>Vehicle Release Management</Text>
        <Text style={styles.releaseSubtitle}>
          Confirm release for vehicles ready from dispatch
        </Text>
      </View>

      {/* Stats */}
      <View style={styles.releaseStatsContainer}>
        <View style={[styles.releaseStatCard, { backgroundColor: '#FF9800' }]}>
          <Text style={styles.releaseStatNumber}>{pendingReleases.length}</Text>
          <Text style={styles.releaseStatLabel}>Pending Release</Text>
        </View>
        
        <View style={[styles.releaseStatCard, { backgroundColor: '#4CAF50' }]}>
          <Text style={styles.releaseStatNumber}>{releaseHistory.length}</Text>
          <Text style={styles.releaseStatLabel}>Released Today</Text>
        </View>
      </View>

      {/* Pending Releases List */}
      <Text style={styles.sectionTitle}>Vehicles Ready for Release</Text>
      
      {pendingReleases.length === 0 ? (
        <View style={styles.emptyReleaseContainer}>
          <Text style={styles.emptyReleaseText}>No vehicles ready for release</Text>
          <Text style={styles.emptyReleaseSubtext}>
            Vehicles will appear here when all processes are completed in dispatch
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.releaseList}>
          {pendingReleases.map((vehicle, index) => (
            <View key={index} style={styles.releaseVehicleCard}>
              {/* Vehicle Info */}
              <View style={styles.releaseVehicleHeader}>
                <View style={styles.releaseVehicleInfo}>
                  <Text style={styles.releaseVehicleTitle}>
                    {vehicle.unitName || 'Unknown Model'}
                  </Text>
                  <Text style={styles.releaseVehicleSubtitle}>
                    Unit ID: {vehicle.unitId}
                  </Text>
                </View>
                <View style={styles.releaseStatusBadge}>
                  <Text style={styles.releaseStatusText}>Ready</Text>
                </View>
              </View>

              {/* Process Status */}
              <View style={styles.releaseProcessSection}>
                <Text style={styles.releaseProcessTitle}>Completed Processes:</Text>
                <View style={styles.releaseProcessList}>
                  {(vehicle.processes || []).map(processId => (
                    <View key={processId} style={styles.releaseProcessChip}>
                      <Text style={styles.releaseProcessChipText}>{processId}</Text>
                      <Text style={styles.releaseProcessCheckMark}>✓</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Release Action */}
              <TouchableOpacity
                style={styles.releaseConfirmButton}
                onPress={() => {
                  setSelectedReleaseVehicle(vehicle);
                  setShowReleaseConfirmModal(true);
                }}
              >
                <Text style={styles.releaseConfirmButtonText}>
                  🚗 Confirm Release to Customer
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );

  const renderReportsContent = () => (
    <View>
      {/* Reports Summary Cards */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: '#000000' }]}>
          <Text style={styles.statNumber}>{inventory.length}</Text>
          <Text style={styles.statLabel}>Total Vehicles</Text>
        </View>
        
        <View style={[styles.statCard, { backgroundColor: '#8B0000' }]}>
          <Text style={styles.statNumber}>{allocations.length}</Text>
          <Text style={styles.statLabel}>Active Allocations</Text>
        </View>
        
        <View style={[styles.statCard, { backgroundColor: '#CB1E2A' }]}>
          <Text style={styles.statNumber}>{drivers.length}</Text>
          <Text style={styles.statLabel}>Total Drivers</Text>
        </View>
        
        <View style={[styles.statCard, { backgroundColor: '#2D2D2D' }]}>
          <Text style={styles.statNumber}>{agents.length}</Text>
          <Text style={styles.statLabel}>Active Agents</Text>
        </View>
      </View>

      {/* Detailed Reports Table */}
      <View style={styles.tableSection}>
        <Text style={styles.sectionTitle}>System Activity Report</Text>
        <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
          <View style={styles.tableContainer}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: 55 }]}>TYPE</Text>
              <Text style={[styles.tableHeaderCell, { width: 80 }]}>DESCRIPTION</Text>
              <Text style={[styles.tableHeaderCell, { width: 40 }]}>COUNT</Text>
              <Text style={[styles.tableHeaderCell, { width: 55 }]}>STATUS</Text>
              <Text style={[styles.tableHeaderCell, { width: 60 }]}>DATE</Text>
            </View>
            
            {/* Sample Report Data */}
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: 55 }]}>Vehicles</Text>
              <Text style={[styles.tableCell, { width: 80 }]}>Total in System</Text>
              <Text style={[styles.tableCell, { width: 40 }]}>{inventory.length}</Text>
              <Text style={[styles.tableCell, { width: 55 }]}>Active</Text>
              <Text style={[styles.tableCell, { width: 60 }]}>{new Date().toLocaleDateString()}</Text>
            </View>
            
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: 55 }]}>Allocations</Text>
              <Text style={[styles.tableCell, { width: 80 }]}>Driver Assignments</Text>
              <Text style={[styles.tableCell, { width: 40 }]}>{allocations.length}</Text>
              <Text style={[styles.tableCell, { width: 55 }]}>Processing</Text>
              <Text style={[styles.tableCell, { width: 60 }]}>{new Date().toLocaleDateString()}</Text>
            </View>
            
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: 55 }]}>Users</Text>
              <Text style={[styles.tableCell, { width: 80 }]}>Active Drivers</Text>
              <Text style={[styles.tableCell, { width: 40 }]}>{drivers.length}</Text>
              <Text style={[styles.tableCell, { width: 55 }]}>Online</Text>
              <Text style={[styles.tableCell, { width: 60 }]}>{new Date().toLocaleDateString()}</Text>
            </View>
            
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: 70 }]}>Agents</Text>
              <Text style={[styles.tableCell, { width: 100 }]}>Field Agents</Text>
              <Text style={[styles.tableCell, { width: 50 }]}>{agents.length}</Text>
              <Text style={[styles.tableCell, { width: 70 }]}>Available</Text>
              <Text style={[styles.tableCell, { width: 70 }]}>{new Date().toLocaleDateString()}</Text>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Export Options */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Export Reports</Text>
        <TouchableOpacity style={[styles.primaryButton, { backgroundColor: '#6c757d' }]}>
          <Text style={styles.buttonText}>📊 Export Summary Report</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.primaryButton, { backgroundColor: '#333', marginTop: 10 }]}>
          <Text style={styles.buttonText}>📋 Export Detailed Report</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderInventoryContent = () => {
    const filteredInventory = inventory.filter(item =>
      item.unitName?.toLowerCase().includes(inventorySearch.toLowerCase()) ||
      item.unitId?.toLowerCase().includes(inventorySearch.toLowerCase()) ||
      item.bodyColor?.toLowerCase().includes(inventorySearch.toLowerCase()) ||
      item.variation?.toLowerCase().includes(inventorySearch.toLowerCase())
    );

    const renderStockCard = ({ item }) => {
      const getStatusStyle = (status) => {
        switch (status?.toLowerCase()) {
          case 'available':
            return { container: { backgroundColor: '#d1fae5' }, text: { color: '#065f46' } };
          case 'in use':
          case 'allocated':
            return { container: { backgroundColor: '#dbeafe' }, text: { color: '#1e40af' } };
          case 'in dispatch':
            return '#CB1E2A'; // Red
          case 'maintenance':
            return { container: { backgroundColor: '#fef3c7' }, text: { color: '#92400e' } };
          default:
            return { container: { backgroundColor: '#d1fae5' }, text: { color: '#065f46' } };
        }
      };

      const statusStyle = getStatusStyle(item.status || 'Available');

      return (
        <View style={styles.stockCard}>
          <View style={styles.stockCardHeader}>
            <Text style={styles.stockUnitName}>{item.unitName || 'Unknown Unit'}</Text>
            <View style={[styles.stockStatusBadge, statusStyle.container]}>
              <Text style={[styles.stockStatusText, statusStyle.text]}>
                {item.status || 'Available'}
              </Text>
            </View>
          </View>

          <View style={styles.stockCardContent}>
            <View style={styles.stockInfoRow}>
              <Text style={styles.stockInfoLabel}>Unit ID</Text>
              <Text style={styles.stockInfoValue}>{item.unitId || 'N/A'}</Text>
            </View>

            <View style={styles.stockInfoRow}>
              <Text style={styles.stockInfoLabel}>Body Color</Text>
              <Text style={styles.stockInfoValue}>{item.bodyColor || 'N/A'}</Text>
            </View>

            <View style={styles.stockInfoRow}>
              <Text style={styles.stockInfoLabel}>Variation</Text>
              <Text style={styles.stockInfoValue}>{item.variation || 'N/A'}</Text>
            </View>

            <View style={styles.stockDivider} />

            <View style={styles.stockInfoRow}>
              <Text style={styles.stockInfoLabel}>Date Added</Text>
              <Text style={styles.stockInfoValue}>
                {new Date(item.createdAt || Date.now()).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </Text>
            </View>

            <View style={styles.stockInfoRow}>
              <Text style={styles.stockInfoLabel}>Quantity</Text>
              <Text style={styles.stockInfoValue}>{item.quantity || 1}</Text>
            </View>
          </View>

          <View style={styles.stockCardActions}>
            <TouchableOpacity 
              style={styles.stockEditBtn} 
              onPress={() => handleEditStock(item)}
            >
              <Text style={styles.stockActionBtnText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.stockDeleteBtn} 
              onPress={() => handleDeleteStock(item._id)}
            >
              <Text style={styles.stockActionBtnText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    };

    return (
      <View style={styles.inventoryContainer}>
        {/* Header Section */}
        <View style={styles.inventoryHeader}>
          <Text style={styles.inventoryTitle}>Vehicle Inventory Management</Text>
          <TouchableOpacity
            style={styles.addStockButton}
            onPress={() => setShowAddStockModal(true)}
          >
            <Text style={styles.addStockButtonText}>+ Add Stock</Text>
          </TouchableOpacity>
        </View>

        {/* Search Section */}
        <View style={styles.inventorySearchSection}>
          <TextInput
            style={styles.inventorySearchInput}
            placeholder="Search by unit name, ID, color, or variation..."
            value={inventorySearch}
            onChangeText={setInventorySearch}
            placeholderTextColor="#94a3b8"
          />
        </View>

        {/* Stats Cards */}
        <View style={styles.inventoryStatsContainer}>
          <View style={[styles.inventoryStatCard, { backgroundColor: '#CB1E2A' }]}>
            <Text style={styles.inventoryStatNumber}>{inventory.length}</Text>
            <Text style={styles.inventoryStatLabel}>Total Stock</Text>
          </View>
          
          <View style={[styles.inventoryStatCard, { backgroundColor: '#8B0000' }]}>
            <Text style={styles.inventoryStatNumber}>
              {inventory.filter(v => (v.status || 'Available') === 'Available').length}
            </Text>
            <Text style={styles.inventoryStatLabel}>Available</Text>
          </View>
          
          <View style={[styles.inventoryStatCard, { backgroundColor: '#2D2D2D' }]}>
            <Text style={styles.inventoryStatNumber}>
              {inventory.filter(v => v.status === 'In Use' || v.status === 'Allocated').length}
            </Text>
            <Text style={styles.inventoryStatLabel}>In Use</Text>
          </View>
          
          <View style={[styles.inventoryStatCard, { backgroundColor: '#CB1E2A' }]}>
            <Text style={styles.inventoryStatNumber}>
              {inventory.filter(v => v.status === 'In Dispatch').length}
            </Text>
            <Text style={styles.inventoryStatLabel}>In Dispatch</Text>
          </View>
        </View>

        {/* Inventory List */}
        {filteredInventory.length === 0 ? (
          <View style={styles.inventoryEmptyContainer}>
            <Text style={styles.inventoryEmptyText}>No inventory items found</Text>
            <Text style={styles.inventoryEmptySubtext}>
              {inventorySearch ? 'Try adjusting your search terms' : 'Add your first stock item to get started'}
            </Text>
          </View>
        ) : (
          <View style={[styles.inventoryList, { paddingBottom: 20 }]}>
            {filteredInventory.map((item) => 
              <View key={item._id || item.id || Math.random().toString()}>
                {renderStockCard({ item })}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderDispatchAssignmentContent = () => {
    const availableVehicles = inventory.filter(vehicle => 
      vehicle.status === 'Available' || !vehicle.status
    );

    const handleVehicleSelection = (vehicle) => {
      setSelectedVehiclesForDispatch(prev => {
        const isSelected = prev.some(v => v._id === vehicle._id);
        if (isSelected) {
          return prev.filter(v => v._id !== vehicle._id);
        } else {
          return [...prev, vehicle];
        }
      });
    };

    const handleProcessSelection = (processId) => {
      setSelectedDispatchProcesses(prev => {
        const isSelected = prev.includes(processId);
        if (isSelected) {
          return prev.filter(id => id !== processId);
        } else {
          return [...prev, processId];
        }
      });
    };

    const handleSendToDispatch = async () => {
      if (selectedVehiclesForDispatch.length === 0) {
        Alert.alert('Error', 'Please select at least one vehicle');
        return;
      }
      
      if (selectedDispatchProcesses.length === 0) {
        Alert.alert('Error', 'Please select at least one process');
        return;
      }

      try {
        for (const vehicle of selectedVehiclesForDispatch) {
          const assignmentData = {
            vehicleId: vehicle._id,
            unitName: vehicle.unitName,
            unitId: vehicle.unitId,
            bodyColor: vehicle.bodyColor,
            variation: vehicle.variation,
            processes: selectedDispatchProcesses,
            status: 'Assigned to Dispatch',
            assignedAt: new Date().toISOString(),
            assignedBy: 'admin'
          };

          console.log('📋 Sending assignment data:', assignmentData);

          // Send to dispatch endpoint
          const response = await fetch(buildApiUrl('/api/dispatch/assignments'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(assignmentData),
          });

          console.log('📋 Response status:', response.status);

          // Always get the response text first, then try to parse as JSON
          const responseText = await response.text();
          console.log('📋 Raw response:', responseText);

          if (!response.ok) {
            console.error('❌ Dispatch assignment failed:', responseText);
            throw new Error(`Failed to assign ${vehicle.unitName} to dispatch: ${response.status} - ${responseText}`);
          }

          let dispatchResult;
          try {
            dispatchResult = JSON.parse(responseText);
            console.log('✅ Dispatch assignment result:', dispatchResult);
          } catch (jsonError) {
            console.error('❌ JSON parse error for dispatch response:', jsonError);
            console.error('❌ Response text was:', responseText);
            throw new Error(`Invalid JSON response from dispatch assignment endpoint: ${responseText}`);
          }

          // Update vehicle status in inventory
          const inventoryUpdateData = {
            unitName: vehicle.unitName,
            unitId: vehicle.unitId,
            bodyColor: vehicle.bodyColor,
            variation: vehicle.variation,
            quantity: vehicle.quantity || 1,
            status: 'Assigned to Dispatch'
          };
          
          console.log('📋 Updating inventory with data:', inventoryUpdateData);
          
          const inventoryResponse = await fetch(buildApiUrl(`/api/inventory/${vehicle._id}`), {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(inventoryUpdateData),
          });

          console.log('📋 Inventory update status:', inventoryResponse.status);

          if (!inventoryResponse.ok) {
            const inventoryErrorText = await inventoryResponse.text();
            console.error('❌ Inventory update failed:', inventoryErrorText);
            // Don't throw here, just log the error as the dispatch assignment succeeded
            console.warn('⚠️ Vehicle assigned to dispatch but inventory status not updated');
          } else {
            try {
              const inventoryResult = await inventoryResponse.json();
              console.log('✅ Inventory updated:', inventoryResult);
            } catch (jsonError) {
              console.error('❌ JSON parse error for inventory response:', jsonError);
              console.warn('⚠️ Inventory update response invalid but likely succeeded');
            }
          }
        }

        Alert.alert(
          'Success', 
          `${selectedVehiclesForDispatch.length} vehicle(s) assigned to dispatch successfully!`
        );
        
        // Reset selections
        setSelectedVehiclesForDispatch([]);
        setSelectedDispatchProcesses([]);
        
        // Refresh inventory
        fetchInventory();
        
      } catch (error) {
        console.error('Error assigning vehicles to dispatch:', error);
        Alert.alert('Error', 'Failed to assign vehicles to dispatch');
      }
    };

    const handleReleaseConfirm = async () => {
      try {
        if (!selectedReleaseVehicle) return;

        // Create release record
        const releaseData = {
          vehicleId: selectedReleaseVehicle._id,
          unitName: selectedReleaseVehicle.unitName,
          unitId: selectedReleaseVehicle.unitId,
          bodyColor: selectedReleaseVehicle.bodyColor,
          variation: selectedReleaseVehicle.variation,
          processes: selectedReleaseVehicle.processes,
          releasedBy: 'admin',
          releasedAt: new Date().toISOString(),
          status: 'Released to Customer'
        };

        // Send to release history endpoint
        const response = await fetch(buildApiUrl('/api/release/confirm'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(releaseData),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to confirm release');
        }

        Alert.alert(
          'Success', 
          `Vehicle ${selectedReleaseVehicle.unitName} has been released to customer!`
        );
        
        // Reset and refresh
        setShowReleaseConfirmModal(false);
        setSelectedReleaseVehicle(null);
        fetchPendingReleases();
        
      } catch (error) {
        console.error('Error confirming release:', error);
        Alert.alert('Error', error.message || 'Failed to confirm release');
      }
    };

    const handleConfirmRelease = async () => {
      if (!selectedReleaseVehicle) return;

      Alert.alert(
        'Confirm Vehicle Release',
        `Are you sure you want to release "${selectedReleaseVehicle.unitName}" (${selectedReleaseVehicle.unitId}) to the customer?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Release Vehicle',
            style: 'destructive',
            onPress: async () => {
              try {
                // Create release record
                const releaseData = {
                  vehicleId: selectedReleaseVehicle._id,
                  unitName: selectedReleaseVehicle.unitName,
                  unitId: selectedReleaseVehicle.unitId,
                  bodyColor: selectedReleaseVehicle.bodyColor,
                  variation: selectedReleaseVehicle.variation,
                  completedProcesses: selectedReleaseVehicle.processes || [],
                  releasedBy: await AsyncStorage.getItem('userName') || 'Admin',
                  releasedAt: new Date().toISOString(),
                  status: 'Released to Customer'
                };

                // Send to release history endpoint
                const releaseResponse = await fetch(buildApiUrl('/api/releases'), {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(releaseData),
                });

                // Update the dispatch assignment status
                const updateResponse = await fetch(buildApiUrl(`/api/dispatch/assignments/${selectedReleaseVehicle._id}`), {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                    status: 'Released to Customer',
                    releasedBy: await AsyncStorage.getItem('userName') || 'Admin',
                    releasedAt: new Date().toISOString()
                  }),
                });

                Alert.alert('Success', `Vehicle ${selectedReleaseVehicle.unitName} has been released to customer!`);
                
                // Refresh data
                await Promise.all([
                  fetchPendingReleases(),
                  fetchInventory()
                ]);
                
                // Close modal
                setShowReleaseConfirmModal(false);
                setSelectedReleaseVehicle(null);

              } catch (error) {
                console.error('Error releasing vehicle:', error);
                Alert.alert('Error', 'Failed to release vehicle. Please try again.');
              }
            },
          },
        ]
      );
    };

    const renderVehicleCard = ({ item }) => {
      const isSelected = selectedVehiclesForDispatch.some(v => v._id === item._id);
      
      return (
        <TouchableOpacity 
          style={[
            styles.dispatchVehicleCard,
            isSelected && styles.dispatchVehicleCardSelected
          ]}
          onPress={() => handleVehicleSelection(item)}
        >
          <View style={styles.dispatchVehicleHeader}>
            <View style={styles.dispatchVehicleCheckbox}>
              {isSelected && <Text style={styles.dispatchCheckmark}>✓</Text>}
            </View>
            <Text style={styles.dispatchVehicleName}>{item.unitName || 'Unknown Unit'}</Text>
          </View>
          
          <View style={styles.dispatchVehicleDetails}>
            <Text style={styles.dispatchVehicleDetail}>ID: {item.unitId || 'N/A'}</Text>
            <Text style={styles.dispatchVehicleDetail}>Color: {item.bodyColor || 'N/A'}</Text>
            <Text style={styles.dispatchVehicleDetail}>Variation: {item.variation || 'N/A'}</Text>
          </View>
        </TouchableOpacity>
      );
    };

    return (
      <View style={styles.dispatchContainer}>
        {/* Header */}
        <View style={styles.dispatchHeader}>
          <Text style={styles.dispatchTitle}>Dispatch Vehicle Assignment</Text>
          <Text style={styles.dispatchSubtitle}>
            Select vehicles and processes to assign to dispatch team
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.dispatchStatsContainer}>
          <View style={[styles.dispatchStatCard, { backgroundColor: '#CB1E2A' }]}>
            <Text style={styles.dispatchStatNumber}>{availableVehicles.length}</Text>
            <Text style={styles.dispatchStatLabel}>Available Vehicles</Text>
          </View>
          
          <View style={[styles.dispatchStatCard, { backgroundColor: '#8B0000' }]}>
            <Text style={styles.dispatchStatNumber}>{selectedVehiclesForDispatch.length}</Text>
            <Text style={styles.dispatchStatLabel}>Selected</Text>
          </View>
          
          <View style={[styles.dispatchStatCard, { backgroundColor: '#2D2D2D' }]}>
            <Text style={styles.dispatchStatNumber}>{selectedDispatchProcesses.length}</Text>
            <Text style={styles.dispatchStatLabel}>Processes</Text>
          </View>
        </View>

        {/* Send to Dispatch Button */}
        {selectedVehiclesForDispatch.length > 0 && selectedDispatchProcesses.length > 0 && (
          <View style={styles.dispatchActionSection}>
            <TouchableOpacity
              style={styles.dispatchSendButton}
              onPress={handleSendToDispatch}
            >
              <Text style={styles.dispatchSendButtonText}>
                Send {selectedVehiclesForDispatch.length} Vehicle(s) to Dispatch
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Process Selection */}
        <View style={styles.dispatchProcessSection}>
          <Text style={styles.dispatchSectionTitle}>Select Processes</Text>
          <View style={styles.dispatchProcessGrid}>
            {availableProcesses.map((process) => {
              const isSelected = selectedDispatchProcesses.includes(process.id);
              return (
                <TouchableOpacity
                  key={process.id}
                  style={[
                    styles.dispatchProcessCard,
                    isSelected && styles.dispatchProcessCardSelected
                  ]}
                  onPress={() => handleProcessSelection(process.id)}
                >
                  <View style={styles.dispatchProcessIcon}>
                    <Text style={styles.dispatchProcessEmoji}>{process.icon}</Text>
                  </View>
                  <Text style={[
                    styles.dispatchProcessLabel,
                    isSelected && styles.dispatchProcessLabelSelected
                  ]}>
                    {process.label}
                  </Text>
                  {isSelected && (
                    <View style={styles.dispatchProcessCheckmark}>
                      <Text style={styles.dispatchProcessCheck}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Vehicle Selection */}
        <View style={styles.dispatchVehicleSection}>
          <Text style={styles.dispatchSectionTitle}>
            Select Vehicles ({selectedVehiclesForDispatch.length} selected)
          </Text>
          
          {availableVehicles.length === 0 ? (
            <View style={styles.dispatchEmptyState}>
              <Text style={styles.dispatchEmptyText}>No available vehicles</Text>
              <Text style={styles.dispatchEmptySubtext}>
                All vehicles are currently assigned or in use
              </Text>
            </View>
          ) : (
            <View style={{ paddingBottom: 20 }}>
              {availableVehicles.map((item, index) => {
                if (index % 2 === 0) {
                  const nextItem = availableVehicles[index + 1];
                  return (
                    <View key={`row-${index}`} style={styles.dispatchVehicleRow}>
                      {renderVehicleCard({ item })}
                      {nextItem && renderVehicleCard({ item: nextItem })}
                    </View>
                  );
                }
                return null;
              })}
            </View>
          )}
        </View>
      </View>
    );
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
    <View style={{ flex: 1 }}>
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* Header with Logout */}
          <View style={styles.headerContainer}>
            <Text style={styles.header}>Admin Dashboard</Text>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>

          {/* Tab Navigation */}
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tab, currentTab === 'dashboard' && styles.activeTab]}
              onPress={() => setCurrentTab('dashboard')}
            >
              <Text style={[styles.tabText, currentTab === 'dashboard' && styles.activeTabText]}>
                Dashboard
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, currentTab === 'inventory' && styles.activeTab]}
              onPress={() => setCurrentTab('inventory')}
            >
              <Text style={[styles.tabText, currentTab === 'inventory' && styles.activeTabText]}>
                Inventory
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, currentTab === 'dispatch' && styles.activeTab]}
              onPress={() => setCurrentTab('dispatch')}
            >
              <Text style={[styles.tabText, currentTab === 'dispatch' && styles.activeTabText]}>
                Dispatch
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, currentTab === 'release' && styles.activeTab]}
              onPress={() => setCurrentTab('release')}
            >
              <Text style={[styles.tabText, currentTab === 'release' && styles.activeTabText]}>
                Release
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, currentTab === 'reports' && styles.activeTab]}
              onPress={() => setCurrentTab('reports')}
            >
              <Text style={[styles.tabText, currentTab === 'reports' && styles.activeTabText]}>
                Reports
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          {currentTab === 'dashboard' ? renderDashboardContent() : 
           currentTab === 'inventory' ? renderInventoryContent() : 
           currentTab === 'dispatch' ? renderDispatchAssignmentContent() :
           currentTab === 'release' ? renderReleaseContent() :
           renderReportsContent()}
        </View>
      </ScrollView>
      
      {/* Add Stock Modal */}
      <Modal visible={showAddStockModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Stock</Text>

            <TextInput
              style={styles.input}
              placeholder="Unit Name"
              value={newStock.unitName}
              onChangeText={(text) => setNewStock({ ...newStock, unitName: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Conduction Number"
              value={newStock.conductionNumber}
              onChangeText={(text) => setNewStock({ ...newStock, conductionNumber: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Body Color"
              value={newStock.bodyColor}
              onChangeText={(text) => setNewStock({ ...newStock, bodyColor: text })}
            />
            <Picker
              selectedValue={newStock.variation}
              onValueChange={(value) => setNewStock({ ...newStock, variation: value })}
              style={styles.picker}
            >
              <Picker.Item label="Select Variation" value="" />
              <Picker.Item label="4x2 LSA" value="4x2 LSA" />
              <Picker.Item label="4x4" value="4x4" />
              <Picker.Item label="LS-E" value="LS-E" />
              <Picker.Item label="LS" value="LS" />
            </Picker>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonPrimary]} onPress={handleAddStock}>
                <Text style={styles.modalButtonText}>Add</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowAddStockModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Stock Modal */}
      <Modal visible={showEditStockModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Stock</Text>

            <TextInput
              style={styles.input}
              placeholder="Unit Name"
              value={editStock.unitName}
              onChangeText={(text) => setEditStock({ ...editStock, unitName: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Unit ID"
              value={editStock.unitId}
              onChangeText={(text) => setEditStock({ ...editStock, unitId: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Body Color"
              value={editStock.bodyColor}
              onChangeText={(text) => setEditStock({ ...editStock, bodyColor: text })}
            />
            <Picker
              selectedValue={editStock.variation}
              onValueChange={(value) => setEditStock({ ...editStock, variation: value })}
              style={styles.picker}
            >
              <Picker.Item label="Select Variation" value="" />
              <Picker.Item label="4x2 LSA" value="4x2 LSA" />
              <Picker.Item label="4x4" value="4x4" />
              <Picker.Item label="LS-E" value="LS-E" />
              <Picker.Item label="LS" value="LS" />
            </Picker>

            <TextInput
              style={styles.input}
              placeholder="Quantity"
              value={editStock.quantity}
              onChangeText={(text) => setEditStock({ ...editStock, quantity: text })}
              keyboardType="numeric"
            />

            <Picker
              selectedValue={editStock.status}
              onValueChange={(value) => setEditStock({ ...editStock, status: value })}
              style={styles.picker}
            >
              <Picker.Item label="Available" value="Available" />
              <Picker.Item label="In Use" value="In Use" />
              <Picker.Item label="Allocated" value="Allocated" />
              <Picker.Item label="In Dispatch" value="In Dispatch" />
            </Picker>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonPrimary]} onPress={handleUpdateStock}>
                <Text style={styles.modalButtonText}>Update</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowEditStockModal(false);
                  setSelectedStock(null);
                  setEditStock({ unitName: "", unitId: "", bodyColor: "", variation: "", quantity: "", status: "" });
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Release Confirmation Modal */}
      <Modal visible={showReleaseConfirmModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirm Vehicle Release</Text>
            
            {selectedReleaseVehicle && (
              <View style={styles.releaseConfirmContent}>
                <View style={styles.releaseVehicleDetails}>
                  <Text style={styles.releaseVehicleDetailsTitle}>
                    {selectedReleaseVehicle.unitName}
                  </Text>
                  <Text style={styles.releaseVehicleDetailsSubtitle}>
                    Unit ID: {selectedReleaseVehicle.unitId}
                  </Text>
                  <Text style={styles.releaseVehicleDetailsSubtitle}>
                    Body Color: {selectedReleaseVehicle.bodyColor}
                  </Text>
                </View>

                <View style={styles.releaseProcessSummary}>
                  <Text style={styles.releaseProcessSummaryTitle}>Completed Processes:</Text>
                  {(selectedReleaseVehicle.processes || []).map(processId => (
                    <View key={processId} style={styles.releaseProcessSummaryItem}>
                      <Text style={styles.releaseProcessSummaryText}>✓ {processId}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.releaseWarningBox}>
                  <Text style={styles.releaseWarningText}>
                    ⚠️ This action will mark the vehicle as released to customer and cannot be undone.
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.releaseConfirmModalButton} onPress={handleConfirmRelease}>
                <Text style={styles.releaseConfirmModalButtonText}>Confirm Release</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => {
                  setShowReleaseConfirmModal(false);
                  setSelectedReleaseVehicle(null);
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
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
    flex: 1, // Changed from flexGrow: 1 for better layout control
    padding: 8, // Further reduced from 12 to 8 for tighter mobile fit
    backgroundColor: '#F5F5F5',
    width: '100%', // Changed from minWidth to width for better control
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5'
  },
  loadingText: {
    marginTop: 8, // Reduced from 10
    fontSize: 13, // Reduced from 14
    color: '#6B7280'
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12, // Reduced from 16
    paddingBottom: 8, // Reduced from 12
    borderBottomWidth: 2,
    borderBottomColor: '#CB1E2A'
  },
  header: { 
    fontSize: 20, // Reduced from 22 for even better mobile fit
    fontWeight: 'bold', 
    color: '#CB1E2A',
    flex: 1
  },
  logoutButton: {
    backgroundColor: '#8B0000',
    paddingHorizontal: 10, // Reduced from 12
    paddingVertical: 5, // Reduced from 6
    borderRadius: 6
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 11 // Reduced from 12
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 6, // Reduced from 8
    marginBottom: 12, // Reduced from 16
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, // Reduced shadow
    shadowOpacity: 0.08, // Reduced opacity
    shadowRadius: 3, // Reduced radius
  },
  tab: {
    flex: 1,
    paddingVertical: 10, // Slightly increased for better touch target
    paddingHorizontal: 6, // Reduced from 8 for better fit with 4 tabs
    alignItems: 'center',
    borderRadius: 6,
    minHeight: 40, // Ensure consistent height
  },
  activeTab: {
    backgroundColor: '#CB1E2A',
  },
  tabText: {
    fontSize: 11, // Reduced from 12 for better fit with 4 tabs
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center', // Ensure text is centered
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12, // Reduced from 16
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 6, // Reduced from 8
    padding: 10, // Reduced from 12
    marginBottom: 8, // Reduced from 10
    alignItems: 'center',
    elevation: 1, // Reduced elevation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    minHeight: 70, // Reduced from default
  },
  statNumber: {
    fontSize: 18, // Reduced from 20
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 3, // Reduced from 4
  },
  statLabel: {
    fontSize: 10, // Reduced from 12
    color: '#FFFFFF',
    textAlign: 'center',
  },
  tableContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6, // Reduced from 8
    overflow: 'hidden',
    elevation: 1, // Reduced elevation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    marginTop: 5,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#CB1E2A',
    paddingVertical: 8, // Reduced from 10
    paddingHorizontal: 4, // Reduced from 6
  },
  tableHeaderCell: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 10, // Reduced from 11
    textAlign: 'center',
    paddingHorizontal: 2, // Reduced from 4
    minWidth: 70, // Reduced from 80
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8, // Reduced from 10
    paddingHorizontal: 4, // Reduced from 6
    borderBottomWidth: 0.5, // Reduced thickness
    borderBottomColor: '#F5F5F5',
  },
  tableCell: {
    fontSize: 10, // Reduced from 11
    color: '#2D2D2D',
    textAlign: 'center',
    paddingHorizontal: 2, // Reduced from 4
    minWidth: 70, // Reduced from 80
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8, // Reduced from 10
    padding: 10, // Reduced from 12
    marginBottom: 10, // Reduced from 12
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1, // Reduced elevation
  },
  tableSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8, // Reduced from 10
    padding: 15, // Increased from 10 for more space
    marginBottom: 10, // Reduced from 12
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1, // Reduced elevation
    height: 400, // Increased from 300 for more height
    minWidth: '98%', // Increased from 95% for more width
    width: '100%', // Added full width
  },
  sectionTitle: {
    fontSize: 15, // Reduced from 16
    fontWeight: '700',
    color: '#000000',
    marginBottom: 10, // Reduced from 12
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    paddingBottom: 5 // Reduced from 6
  },
  label: { 
    fontSize: 13, // Reduced from 14
    fontWeight: '600', 
    marginBottom: 5, // Reduced from 6
    color: '#000000'
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#6B7280',
    borderRadius: 6, // Reduced from 8
    marginBottom: 10, // Reduced from 12
    backgroundColor: '#FFFFFF'
  },
  picker: {
    fontSize: 13, // Reduced from 14
    color: '#2D2D2D',
    height: 40, // Reduced from 45
  },
  input: {
    borderWidth: 1,
    borderColor: '#6B7280',
    borderRadius: 6, // Reduced from 8
    marginBottom: 10, // Reduced from 12
    fontSize: 13, // Reduced from 14
    padding: 8, // Reduced from 10
    backgroundColor: '#FFFFFF',
    color: '#2D2D2D',
    height: 40, // Reduced from 45
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#6B7280',
    borderRadius: 6, // Reduced from 8
    marginBottom: 10, // Reduced from 12
    fontSize: 13, // Reduced from 14
    padding: 8, // Reduced from 10
    backgroundColor: '#FFFFFF',
    color: '#2D2D2D',
    height: 40, // Reduced from 45
  },
  primaryButton: {
    backgroundColor: '#CB1E2A',
    padding: 10, // Reduced from 12
    borderRadius: 6, // Reduced from 8
    marginTop: 5, // Reduced from 6
    minHeight: 40, // Reduced from 45
    justifyContent: 'center',
  },
  secondaryButton: {
    backgroundColor: '#2D2D2D',
    padding: 10, // Reduced from 12
    borderRadius: 6, // Reduced from 8
    marginBottom: 8, // Reduced from 10
    minHeight: 40, // Reduced from 45
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 13 // Reduced from 14
  },
  allocationItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6, // Reduced from 8
    padding: 10, // Reduced from 12
    marginBottom: 8, // Reduced from 10
    borderLeftWidth: 3, // Reduced from 4
    borderLeftColor: '#CB1E2A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 1,
    elevation: 1
  },
  itemTitle: {
    fontWeight: '700',
    fontSize: 13, // Reduced from 14
    marginBottom: 5, // Reduced from 6
    color: '#000000'
  },
  itemText: {
    fontSize: 11, // Reduced from 12
    color: '#6B7280',
    marginBottom: 2 // Reduced from 3
  },
  emptyContainer: {
    padding: 20, // Reduced from 24
    alignItems: 'center'
  },
  emptyText: {
    fontSize: 13, // Reduced from 14
    color: '#6B7280',
    fontStyle: 'italic'
  },

  // Modern Inventory Management Styles
  inventoryContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 12, // Reduced from 16 for better mobile fit
  },

  inventoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16, // Reduced from 20
    paddingHorizontal: 4, // Added to prevent edge overflow
  },

  inventoryTitle: {
    fontSize: 20, // Reduced from 24 for better mobile fit
    fontWeight: '700',
    color: '#000000',
    flex: 1,
    marginRight: 12, // Space between title and button
  },

  addStockButton: {
    backgroundColor: '#CB1E2A',
    paddingHorizontal: 14, // Reduced from 16
    paddingVertical: 10, // Reduced from 12
    borderRadius: 8, // Reduced from 10
    shadowColor: '#CB1E2A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },

  addStockButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13, // Reduced from 14
    textAlign: 'center',
  },

  // Search Section
  inventorySearchSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10, // Reduced from 12
    padding: 12, // Reduced from 16
    marginBottom: 12, // Reduced from 16
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6, // Reduced from 8
    elevation: 2, // Reduced from 3
  },

  inventorySearchInput: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#6B7280',
    borderRadius: 8, // Reduced from 10
    padding: 12, // Reduced from 14
    fontSize: 14, // Reduced from 16
    color: '#2D2D2D',
  },

  // Stats Section - Mobile Optimized
  inventoryStatsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap', // Allow wrapping on smaller screens
    marginBottom: 12, // Reduced from 16
    gap: 6, // Reduced from 12
  },

  inventoryStatCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },

  inventoryStatNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },

  inventoryStatLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    opacity: 0.9,
  },

  // Stock Cards
  inventoryList: {
    flex: 1,
  },

  stockCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#CB1E2A',
  },

  stockCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  stockUnitName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    flex: 1,
  },

  stockStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },

  stockStatusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  stockCardContent: {
    gap: 8,
  },

  stockInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },

  stockInfoLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    flex: 1,
  },

  stockInfoValue: {
    fontSize: 14,
    color: '#2D2D2D',
    fontWeight: '600',
    flex: 2,
    textAlign: 'right',
  },

  stockDivider: {
    height: 1,
    backgroundColor: '#F5F5F5',
    marginVertical: 8,
  },

  stockCardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 8,
  },

  stockEditBtn: {
    backgroundColor: '#CB1E2A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },

  stockDeleteBtn: {
    backgroundColor: '#8B0000',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },

  stockActionBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },

  // Empty States
  inventoryEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },

  inventoryEmptyText: {
    fontSize: 18,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },

  inventoryEmptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },

  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 20,
    textAlign: 'center',
  },

  picker: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#6B7280',
    borderRadius: 10,
    marginBottom: 12,
    height: 50,
  },

  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 20,
  },

  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },

  modalButtonCancel: {
    backgroundColor: '#6B7280',
  },

  modalButtonPrimary: {
    backgroundColor: '#CB1E2A',
  },

  modalButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },

  // Modern Dashboard Styles
  dashboardContainer: {
    gap: 16,
  },

  // Assignment Card Styles
  assignmentCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },

  assignmentCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },

  assignmentTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },

  assignmentBadge: {
    backgroundColor: '#CB1E2A',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },

  assignmentBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  assignmentSection: {
    marginBottom: 20,
  },

  assignmentLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },

  modeSelector: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },

  modeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },

  modeButtonActive: {
    backgroundColor: '#CB1E2A',
  },

  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },

  modeButtonTextActive: {
    color: '#fff',
  },

  assignmentForm: {
    gap: 16,
  },

  formField: {
    gap: 8,
  },

  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },

  modernPickerContainer: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
  },

  modernPicker: {
    height: 50,
  },

  modernInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 8,
  },

  createAssignmentButton: {
    backgroundColor: '#CB1E2A',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },

  createAssignmentButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  // Navigation Card Styles
  navigationCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },

  navigationTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 16,
  },

  navigationButtons: {
    gap: 12,
  },

  navButton: {
    backgroundColor: '#f8fafc',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },

  // Allocations Card Styles
  allocationsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },

  allocationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 8,
  },

  allocationsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    flex: 1,
    minWidth: 150,
  },

  allocationsActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },

  allocationNavBtn: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  allocationNavBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },

  allocationsList: {
    gap: 12,
  },

  allocationItem: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  allocationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  allocationUnitName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
  },

  allocationStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },

  allocationStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },

  allocationDetails: {
    gap: 4,
  },

  allocationDetailText: {
    fontSize: 14,
    color: '#6B7280',
  },

  viewAllAllocationsBtn: {
    backgroundColor: '#CB1E2A',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },

  viewAllAllocationsBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  allocationFooter: {
    alignItems: 'center',
    paddingTop: 12,
  },

  allocationFooterText: {
    fontSize: 14,
    color: '#64748b',
  },

  emptyAllocations: {
    alignItems: 'center',
    padding: 32,
  },

  emptyAllocationsText: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 4,
  },

  emptyAllocationsSubtext: {
    fontSize: 14,
    color: '#94a3b8',
  },

  // Dispatch Assignment Styles
  dispatchContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
  },

  dispatchHeader: {
    marginBottom: 20,
  },

  dispatchTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },

  dispatchSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },

  dispatchStatsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },

  dispatchStatCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },

  dispatchStatNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },

  dispatchStatLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
  },

  dispatchProcessSection: {
    marginBottom: 24,
  },

  dispatchSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },

  dispatchProcessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  dispatchProcessCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    minWidth: 100,
    position: 'relative',
  },

  dispatchProcessCardSelected: {
    borderColor: '#CB1E2A',
    backgroundColor: '#F5F5F5',
  },

  dispatchProcessIcon: {
    marginBottom: 8,
  },

  dispatchProcessEmoji: {
    fontSize: 24,
  },

  dispatchProcessLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },

  dispatchProcessLabelSelected: {
    color: '#CB1E2A',
  },

  dispatchProcessCheckmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#CB1E2A',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dispatchProcessCheck: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },

  dispatchVehicleSection: {
    flex: 1,
    marginBottom: 24,
  },

  dispatchVehicleRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  dispatchVehicleCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    flex: 0.48,
  },

  dispatchVehicleCardSelected: {
    borderColor: '#CB1E2A',
    backgroundColor: '#F5F5F5',
  },

  dispatchVehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  dispatchVehicleCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#CB1E2A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  dispatchCheckmark: {
    fontSize: 14,
    color: '#CB1E2A',
    fontWeight: 'bold',
  },

  dispatchVehicleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
  },

  dispatchVehicleDetails: {
    gap: 4,
  },

  dispatchVehicleDetail: {
    fontSize: 12,
    color: '#6B7280',
  },

  dispatchEmptyState: {
    alignItems: 'center',
    padding: 32,
  },

  dispatchEmptyText: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 4,
  },

  dispatchEmptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },

  dispatchActionSection: {
    paddingVertical: 16,
  },

  dispatchSendButton: {
    backgroundColor: '#CB1E2A',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },

  dispatchSendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },

  // Release Management Styles
  releaseContainer: {
    flex: 1,
  },

  releaseHeader: {
    marginBottom: 20,
  },

  releaseTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },

  releaseSubtitle: {
    fontSize: 16,
    color: '#6B7280',
  },

  releaseStatsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },

  releaseStatCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },

  releaseStatNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },

  releaseStatLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
  },

  emptyReleaseContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },

  emptyReleaseText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },

  emptyReleaseSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },

  releaseList: {
    flex: 1,
  },

  releaseVehicleCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },

  releaseVehicleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  releaseVehicleInfo: {
    flex: 1,
  },

  releaseVehicleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },

  releaseVehicleSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },

  releaseStatusBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },

  releaseStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  releaseProcessSection: {
    marginBottom: 16,
  },

  releaseProcessTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },

  releaseProcessList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  releaseProcessChip: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },

  releaseProcessChipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },

  releaseProcessCheckMark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },

  releaseConfirmButton: {
    backgroundColor: '#CB1E2A',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },

  releaseConfirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Release Modal Styles
  releaseConfirmContent: {
    marginVertical: 20,
  },

  releaseVehicleDetails: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },

  releaseVehicleDetailsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
  },

  releaseVehicleDetailsSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },

  releaseProcessSummary: {
    marginBottom: 16,
  },

  releaseProcessSummaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },

  releaseProcessSummaryItem: {
    paddingVertical: 4,
  },

  releaseProcessSummaryText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },

  releaseWarningBox: {
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },

  releaseWarningText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
  },

  releaseConfirmModalButton: {
    backgroundColor: '#CB1E2A',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },

  releaseConfirmModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
