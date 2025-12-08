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
  Modal,
  Dimensions
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildApiUrl } from '../constants/api';
import { useTheme } from '../context/ThemeContext';
import StocksOverview from '../components/StocksOverview';
import UniformLoading from '../components/UniformLoading';
import { VEHICLE_MODELS, getUnitNames, getVariationsForUnit, getAllowedStatusTransitions, VEHICLE_STATUS_RULES } from '../constants/VehicleModels';

export default function AdminDashboard() {
  const navigation = useNavigation();
  const { isDarkMode, theme } = useTheme();

  // State management
  const [allocations, setAllocations] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [agents, setAgents] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Inventory management state
  const [inventory, setInventory] = useState([]);
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [showEditStockModal, setShowEditStockModal] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [newStock, setNewStock] = useState({
    unitName: "",
    bodyColor: "",
    variation: "",
    status: "In Stockyard" // Default status
  });
  const [selectedUnitName, setSelectedUnitName] = useState("");
  const [availableVariations, setAvailableVariations] = useState([]);
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
  const [showServicesModal, setShowServicesModal] = useState(false);
  const [selectedVehicleForServices, setSelectedVehicleForServices] = useState(null);
  
  // Release management state
  const [pendingReleases, setPendingReleases] = useState([]);
  const [releaseHistory, setReleaseHistory] = useState([]);
  const [showReleaseConfirmModal, setShowReleaseConfirmModal] = useState(false);
  const [selectedReleaseVehicle, setSelectedReleaseVehicle] = useState(null);
  

  
  // Available processes
  const availableProcesses = [
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
      // Fetch service requests that are ready for release
      const res = await fetch(buildApiUrl('/getRequest'));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      
      if (data.success) {
        // Filter for service requests that are marked ready for release
        const readyForRelease = (data.data || []).filter(request => {
          return request.readyForRelease === true && 
                 !request.releasedToCustomer &&
                 request.status !== 'Cancelled';
        });
        
        // Map to match the expected structure for display
        const mappedReleases = readyForRelease.map(req => ({
          ...req,
          processes: req.completedServices || req.service || []
        }));
        
        setPendingReleases(mappedReleases);
        console.log(`Found ${readyForRelease.length} vehicles ready for release`);
      }
    } catch (err) {
      console.error('Fetch pending releases error:', err);
      // Don't show alert for this as it's not critical
    }
  };

  // Handle unit name selection and update variations
  const handleUnitNameChange = (unitName) => {
    setSelectedUnitName(unitName);
    setNewStock({ ...newStock, unitName: unitName, variation: "" }); // Reset variation when unit changes
    const variations = getVariationsForUnit(unitName);
    setAvailableVariations(variations);
  };

  const handleAddStock = async () => {
    const { unitName, bodyColor, variation, status } = newStock;
    if (!unitName || !bodyColor || !variation) {
      Alert.alert("Error", "Please fill in all fields for adding stock.");
      return;
    }
    
    // Validate status - only 'In Stockyard' or 'Available' allowed for new vehicles
    if (status && status !== 'In Stockyard' && status !== 'Available') {
      Alert.alert("Error", "For new vehicles, only 'In Stockyard' or 'Available' status is allowed.");
      return;
    }
    
    try {
      const response = await fetch(buildApiUrl('/createStock'), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitName,
          unitId: `${unitName.replace(/\s+/g, '')}_${Date.now()}`, // Generate unitId
          bodyColor,
          variation,
          status: status || 'In Stockyard' // Default to 'In Stockyard'
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to add stock.");
      }
      
      Alert.alert("Success", `Stock added successfully with status: ${result.data.status}!`);
      setNewStock({ unitName: "", bodyColor: "", variation: "", status: "In Stockyard" });
      setSelectedUnitName("");
      setAvailableVariations([]);
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
      status: item.status || "Available",
      currentStatus: item.status || "Available", // Track original status for validation
      assignedAgent: item.assignedAgent || ""
    });
    setShowEditStockModal(true);
  };

  // Helper to get allowed status options for Edit modal based on current status
  const getAllowedStatusOptions = (currentStatus, hasDriver, driverAccepted, hasLocation) => {
    const allowed = getAllowedStatusTransitions(currentStatus, hasDriver, driverAccepted, hasLocation);
    // Add current status as first option (no change)
    return [currentStatus, ...allowed.filter(status => status !== currentStatus)];
  };

  const handleUpdateStock = async () => {
    if (!editStock.unitName || !editStock.unitId || !editStock.bodyColor || !editStock.variation) {
      Alert.alert("Missing Info", "Please fill in all required fields.");
      return;
    }

    // Validate status transition if status is being changed
    if (editStock.status !== editStock.currentStatus) {
      const hasDriver = !!selectedStock.assignedDriver;
      const driverAccepted = selectedStock.driverAccepted === true;
      const hasLocation = !!(selectedStock.location?.latitude && selectedStock.location?.longitude);
      
      const allowedTransitions = getAllowedStatusTransitions(
        editStock.currentStatus, 
        hasDriver, 
        driverAccepted, 
        hasLocation
      );
      
      if (!allowedTransitions.includes(editStock.status)) {
        const rule = VEHICLE_STATUS_RULES[editStock.currentStatus];
        Alert.alert(
          "Invalid Status Change", 
          `Cannot change status from '${editStock.currentStatus}' to '${editStock.status}'.\n\nRequirements: ${rule?.requirements || 'Unknown'}`
        );
        return;
      }

      // Additional validation for 'Released' status - should only be set via Release button
      if (editStock.status === 'Released') {
        Alert.alert(
          "Invalid Status Change",
          "Vehicles can only be set to 'Released' status using the Release button after completing all required processes."
        );
        return;
      }
    }

    try {
      const updatePayload = {
        unitName: editStock.unitName,
        unitId: editStock.unitId,
        bodyColor: editStock.bodyColor,
        variation: editStock.variation,
        quantity: parseInt(editStock.quantity) || 1
      };

      // Only include status in update if it changed and passed validation
      if (editStock.status !== editStock.currentStatus) {
        updatePayload.status = editStock.status;
      }

      // Include assignedAgent in update (can be empty to unassign)
      if (editStock.assignedAgent !== undefined) {
        updatePayload.assignedAgent = editStock.assignedAgent || null;
      }

      const response = await fetch(buildApiUrl(`/updateStock/${selectedStock._id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update stock.');
      }
      
      Alert.alert("Success", "Stock updated successfully!");
      setEditStock({ unitName: "", unitId: "", bodyColor: "", variation: "", quantity: "", status: "", currentStatus: "" });
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
        status: 'Pending',
        allocatedBy: 'Admin',
        date: new Date()
      };

      const res = await fetch(buildApiUrl('/createAllocation'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(allocationPayload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to assign vehicle');

      // Status automatically updated to 'Pending' by backend
      Alert.alert('Success', 'Vehicle assigned successfully to driver and agent!');
      setSelectedVin('');
      setSelectedAgent('');
      setSelectedDriver('');
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

    try {
      const allocationPayload = {
        unitName: manualModel,
        unitId: manualVin,
        bodyColor: 'Manual Entry',
        variation: 'Manual Entry',
        assignedDriver: selectedDriver,
        assignedAgent: selectedAgent,
        status: 'Pending',
        allocatedBy: 'Admin',
        date: new Date()
      };

      const res = await fetch(buildApiUrl('/createAllocation'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(allocationPayload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to assign');

      Alert.alert('Success', 'Vehicle assigned successfully to driver and agent!');
      setManualModel('');
      setManualVin('');
      setSelectedDriver('');
      setSelectedAgent('');
      fetchAllocations();
    } catch (err) {
      console.error('Assign to driver error:', err);
      Alert.alert('Error', err.message);
    }
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
              const accountName = await AsyncStorage.getItem('accountName') || 'Admin';
              
              console.log('📋 Confirming vehicle release for:', selectedReleaseVehicle._id);

              // Use the service request release endpoint
              const response = await fetch(buildApiUrl(`/releaseToCustomer/${selectedReleaseVehicle._id}`), {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                  releasedBy: accountName,
                  releasedAt: new Date().toISOString()
                }),
              });

              const result = await response.json();

              if (!response.ok || !result.success) {
                throw new Error(result.message || 'Failed to confirm release');
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

  const renderDashboardContent = () => {
    // Calculate statistics for dashboard
    const totalStocks = inventory.length;
    const finishedVehiclePreparation = allocations.filter(a => a.status === 'Ready for Release').length;
    const ongoingShipment = allocations.filter(a => a.status === 'In Transit').length;
    const ongoingVehiclePreparation = allocations.filter(a => a.status === 'Assigned to Dispatch' || a.status === 'In Progress').length;

    // Recent in-progress preparation
    const recentPreparation = allocations
      .filter(a => a.status === 'Assigned to Dispatch' || a.status === 'In Progress')
      .slice(0, 3);

    // Recent assigned shipments  
    const recentShipments = allocations
      .filter(a => a.status === 'In Transit' || a.status === 'Pending')
      .slice(0, 3);

    return (
      <View style={styles.dashboardContainer}>
        {/* Statistics Cards */}
        <View style={styles.reportsStatsGrid}>
          <View style={[styles.reportsStatCard, { backgroundColor: '#e50914' }]}>
            <Text style={styles.reportsStatNumber}>{totalStocks}</Text>
            <Text style={styles.reportsStatLabel}>Total{'\n'}Stocks</Text>
          </View>
          
          <View style={[styles.reportsStatCard, { backgroundColor: '#374151' }]}>
            <Text style={styles.reportsStatNumber}>{finishedVehiclePreparation}</Text>
            <Text style={styles.reportsStatLabel}>Finished Vehicle{'\n'}Preparation</Text>
          </View>
          
          <View style={[styles.reportsStatCard, { backgroundColor: '#e50914' }]}>
            <Text style={styles.reportsStatNumber}>{ongoingShipment}</Text>
            <Text style={styles.reportsStatLabel}>Ongoing{'\n'}Shipment</Text>
          </View>
          
          <View style={[styles.reportsStatCard, { backgroundColor: '#e50914' }]}>
            <Text style={styles.reportsStatNumber}>{ongoingVehiclePreparation}</Text>
            <Text style={styles.reportsStatLabel}>Ongoing Vehicle{'\n'}Preparation</Text>
          </View>
        </View>

        {/* Stocks Overview with Pie Charts */}
        <StocksOverview inventory={inventory} theme={theme} />

        {/* Recent In Progress Vehicle Preparation */}
        <View style={[styles.reportsSection, { backgroundColor: theme.card }]}>
          <Text style={[styles.reportsSectionTitle, { color: theme.text }]}>Recent In Progress Vehicle Preparation</Text>
          
          <View style={[styles.reportsTable, { backgroundColor: theme.surface }]}>
            <View style={[styles.reportsTableHeader, { backgroundColor: theme.borderLight }]}>
              <Text style={[styles.reportsTableHeaderCell, { flex: 2, color: theme.textSecondary }]}>CONDUCTION NO.</Text>
              <Text style={[styles.reportsTableHeaderCell, { flex: 1, color: theme.textSecondary }]}>SERVICE</Text>
            </View>
            
            {recentPreparation.length > 0 ? recentPreparation.map((item, index) => (
              <View key={index} style={[styles.reportsTableRow, { borderBottomColor: theme.border }]}>
                <Text style={[styles.reportsTableCell, { flex: 2, color: theme.text }]}>{item.unitId || 'N/A'}</Text>
                <Text style={[styles.reportsTableCell, { flex: 1, color: theme.text }]}>
                  {item.requestedProcesses && item.requestedProcesses.length > 0 
                    ? item.requestedProcesses[0].name || 'Processing'
                    : 'Processing'}
                </Text>
              </View>
            )) : (
              <View style={styles.reportsTableRow}>
                <Text style={[styles.emptyTableText, { color: theme.textTertiary }]}>No vehicle preparation in progress</Text>
              </View>
            )}
          </View>
        </View>

        {/* Recent Assigned Shipments */}
        <View style={[styles.reportsSection, { backgroundColor: theme.card }]}>
          <Text style={[styles.reportsSectionTitle, { color: theme.text }]}>Recent Assigned Shipments</Text>
          
          <View style={[styles.reportsTable, { backgroundColor: theme.surface }]}>
            <View style={[styles.reportsTableHeader, { backgroundColor: theme.borderLight }]}>
              <Text style={[styles.reportsTableHeaderCell, { flex: 2, color: theme.textSecondary }]}>UNIT NAME</Text>
              <Text style={[styles.reportsTableHeaderCell, { flex: 2, color: theme.textSecondary }]}>DRIVER</Text>
              <Text style={[styles.reportsTableHeaderCell, { flex: 1, color: theme.textSecondary }]}>STATUS</Text>
            </View>
            
            {recentShipments.length > 0 ? recentShipments.map((item, index) => (
              <View key={index} style={[styles.reportsTableRow, { borderBottomColor: theme.border }]}>
                <Text style={[styles.reportsTableCell, { flex: 2, color: theme.text }]}>{item.unitName || 'N/A'}</Text>
                <Text style={[styles.reportsTableCell, { flex: 2, color: theme.text }]}>{item.assignedDriver || 'N/A'}</Text>
                <View style={[styles.reportsTableCell, { flex: 1 }]}>
                  <View style={[
                    styles.statusBadge, 
                    { backgroundColor: '#e50914' }
                  ]}>
                    <Text style={styles.statusBadgeText}>
                      {item.status === 'In Transit' ? 'IN TRANSIT' : 'PENDING'}
                    </Text>
                  </View>
                </View>
              </View>
            )) : (
              <View style={styles.reportsTableRow}>
                <Text style={[styles.emptyTableText, { color: theme.textTertiary }]}>No recent shipments</Text>
              </View>
            )}
          </View>
        </View>

        {/* Recent Completed Requests */}
        <View style={[styles.reportsSection, { backgroundColor: theme.card }]}>
          <Text style={[styles.reportsSectionTitle, { color: theme.text }]}>Recent Completed Requests</Text>
          
          <View style={[styles.reportsTable, { backgroundColor: theme.surface }]}>
            <View style={[styles.reportsTableHeader, { backgroundColor: theme.borderLight }]}>
              <Text style={[styles.reportsTableHeaderCell, { flex: 2, color: theme.textSecondary }]}>CONDUCTION NO.</Text>
              <Text style={[styles.reportsTableHeaderCell, { flex: 1, color: theme.textSecondary }]}>DATE</Text>
            </View>
            
            <View style={styles.reportsTableRow}>
              <Text style={[styles.emptyTableText, { color: theme.textTertiary }]}>No completed requests</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

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
        <View style={[styles.releaseStatCard, { backgroundColor: '#e50914' }]}>
          <Text style={styles.releaseStatNumber}>{pendingReleases.length}</Text>
          <Text style={styles.releaseStatLabel}>Pending Release</Text>
        </View>
        
        <View style={[styles.releaseStatCard, { backgroundColor: '#e50914' }]}>
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

  const renderReportsContent = () => {
    // Calculate statistics for dashboard
    const totalStocks = inventory.length;
    const finishedVehiclePreparation = allocations.filter(a => a.status === 'Ready for Release').length;
    const ongoingShipment = allocations.filter(a => a.status === 'In Transit').length;
    const ongoingVehiclePreparation = allocations.filter(a => a.status === 'In Progress' || a.status === 'Assigned to Dispatch').length;

    // Get accurate stock data for pie chart (stock status instead of just model distribution)
    const stockData = inventory.reduce((acc, vehicle) => {
      // Determine stock status based on allocation status
      let stockStatus = 'Available';
      
      // Check if this vehicle is allocated
      const isAllocated = allocations.some(allocation => 
        allocation.unitId === vehicle.unitId || 
        allocation.vin === vehicle.vin ||
        allocation.unitName === vehicle.unitName
      );
      
      if (isAllocated) {
        const allocation = allocations.find(a => 
          a.unitId === vehicle.unitId || 
          a.vin === vehicle.vin ||
          a.unitName === vehicle.unitName
        );
        
        if (allocation) {
          switch (allocation.status) {
            case 'Assigned to Dispatch':
            case 'In Progress':
              stockStatus = 'In Preparation';
              break;
            case 'Ready for Release':
              stockStatus = 'Ready for Release';
              break;
            case 'Released':
            case 'Done':
              stockStatus = 'Released';
              break;
            case 'In Transit':
              stockStatus = 'In Transit';
              break;
            default:
              stockStatus = 'Allocated';
          }
        }
      }
      
      acc[stockStatus] = (acc[stockStatus] || 0) + 1;
      return acc;
    }, {});

    // Also keep vehicle breakdown for compatibility
    const vehicleBreakdown = inventory.reduce((acc, vehicle) => {
      const model = vehicle.unitName || 'Unknown';
      acc[model] = (acc[model] || 0) + 1;
      return acc;
    }, {});

    // Recent in-progress preparation
    const recentPreparation = allocations
      .filter(a => a.status === 'Assigned to Dispatch' || a.status === 'In Progress')
      .slice(0, 3);

    // Recent assigned shipments  
    const recentShipments = allocations
      .filter(a => a.status === 'In Transit' || a.status === 'Pending')
      .slice(0, 3);

    return (
      <ScrollView style={styles.reportsContainer}>
        {/* Statistics Cards */}
        <View style={styles.reportsStatsGrid}>
          <View style={[styles.reportsStatCard, { backgroundColor: '#e50914' }]}>
            <Text style={styles.reportsStatNumber}>{totalStocks}</Text>
            <Text style={styles.reportsStatLabel}>Total{'\n'}Stocks</Text>
          </View>
          
          <View style={[styles.reportsStatCard, { backgroundColor: '#e50914' }]}>
            <Text style={styles.reportsStatNumber}>{finishedVehiclePreparation}</Text>
            <Text style={styles.reportsStatLabel}>Finished Vehicle{'\n'}Preparation</Text>
          </View>
          
          <View style={[styles.reportsStatCard, { backgroundColor: '#e50914' }]}>
            <Text style={styles.reportsStatNumber}>{ongoingShipment}</Text>
            <Text style={styles.reportsStatLabel}>Ongoing{'\n'}Shipment</Text>
          </View>
          
          <View style={[styles.reportsStatCard, { backgroundColor: '#e50914' }]}>
            <Text style={styles.reportsStatNumber}>{ongoingVehiclePreparation}</Text>
            <Text style={styles.reportsStatLabel}>Ongoing Vehicle{'\n'}Preparation</Text>
          </View>
        </View>

        {/* Stocks Overview with Real Pie Charts */}
        <StocksOverview inventory={inventory} theme={theme} />

        {/* Recent In Progress Vehicle Preparation */}
        <View style={[styles.reportsSection, { backgroundColor: theme.card }]}>
          <Text style={[styles.reportsSectionTitle, { color: theme.text }]}>Recent In Progress Vehicle Preparation</Text>
          
          <View style={[styles.reportsTable, { backgroundColor: theme.surface }]}>
            <View style={[styles.reportsTableHeader, { backgroundColor: theme.borderLight }]}>
              <Text style={[styles.reportsTableHeaderCell, { flex: 2, color: theme.textSecondary }]}>CONDUCTION NUMBER</Text>
              <Text style={[styles.reportsTableHeaderCell, { flex: 1, color: theme.textSecondary }]}>SERVICE</Text>
            </View>
            
            {recentPreparation.length > 0 ? recentPreparation.map((item, index) => (
              <View key={index} style={[styles.reportsTableRow, { borderBottomColor: theme.border }]}>
                <Text style={[styles.reportsTableCell, { flex: 2, color: theme.text }]}>{item.unitId || 'N/A'}</Text>
                <Text style={[styles.reportsTableCell, { flex: 1, color: theme.text }]}>
                  {item.requestedProcesses && item.requestedProcesses.length > 0 
                    ? item.requestedProcesses[0].name || 'Processing'
                    : 'Processing'}
                </Text>
              </View>
            )) : (
              <View style={styles.reportsTableRow}>
                <Text style={[styles.emptyTableText, { color: theme.textTertiary }]}>No vehicle preparation in progress</Text>
              </View>
            )}
          </View>
        </View>

        {/* Recent Assigned Shipments */}
        <View style={[styles.reportsSection, { backgroundColor: theme.card }]}>
          <Text style={[styles.reportsSectionTitle, { color: theme.text }]}>Recent Assigned Shipments</Text>
          
          <View style={[styles.reportsTable, { backgroundColor: theme.surface }]}>
            <View style={[styles.reportsTableHeader, { backgroundColor: theme.borderLight }]}>
              <Text style={[styles.reportsTableHeaderCell, { flex: 2, color: theme.textSecondary }]}>UNIT NAME</Text>
              <Text style={[styles.reportsTableHeaderCell, { flex: 2, color: theme.textSecondary }]}>DRIVER</Text>
              <Text style={[styles.reportsTableHeaderCell, { flex: 1, color: theme.textSecondary }]}>STATUS</Text>
            </View>
            
            {recentShipments.length > 0 ? recentShipments.map((item, index) => (
              <View key={index} style={[styles.reportsTableRow, { borderBottomColor: theme.border }]}>
                <Text style={[styles.reportsTableCell, { flex: 2, color: theme.text }]}>{item.unitName || 'N/A'}</Text>
                <Text style={[styles.reportsTableCell, { flex: 2, color: theme.text }]}>{item.assignedDriver || 'N/A'}</Text>
                <View style={[styles.reportsTableCell, { flex: 1 }]}>
                  <View style={[
                    styles.statusBadge, 
                    { backgroundColor: '#e50914' }
                  ]}>
                    <Text style={styles.statusBadgeText}>
                      {item.status === 'In Transit' ? 'IN TRANSIT' : 'PENDING'}
                    </Text>
                  </View>
                </View>
              </View>
            )) : (
              <View style={styles.reportsTableRow}>
                <Text style={[styles.emptyTableText, { color: theme.textTertiary }]}>No recent shipments</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    );
  };


  const renderInventoryContent = () => {
    const filteredInventory = inventory.filter(item =>
      item.unitName?.toLowerCase().includes(inventorySearch.toLowerCase()) ||
      item.unitId?.toLowerCase().includes(inventorySearch.toLowerCase()) ||
      item.bodyColor?.toLowerCase().includes(inventorySearch.toLowerCase()) ||
      item.variation?.toLowerCase().includes(inventorySearch.toLowerCase())
    );

    const renderStockCard = ({ item }) => {
      const getStatusStyle = (status) => {
        // All statuses use primary color with varying opacity for distinction
        const baseStyle = { 
          container: { backgroundColor: '#e50914' }, 
          text: { color: '#ffffff' } 
        };
        
        switch (status?.toLowerCase()) {
          case 'available':
            return { container: { ...baseStyle.container, opacity: 0.7 }, text: baseStyle.text };
          case 'in use':
          case 'allocated':
            return { container: { ...baseStyle.container, opacity: 0.85 }, text: baseStyle.text };
          case 'in dispatch':
            return { container: { backgroundColor: '#e50914' }, text: baseStyle.text };
          case 'maintenance':
            return { container: { ...baseStyle.container, opacity: 0.9 }, text: baseStyle.text };
          default:
            return { container: { ...baseStyle.container, opacity: 0.7 }, text: baseStyle.text };
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
            placeholderTextColor='#6B7280'
          />
        </View>

        {/* Stats Cards */}
        <View style={styles.inventoryStatsContainer}>
          <View style={[styles.inventoryStatCard, { backgroundColor: '#e50914' }]}>
            <Text style={styles.inventoryStatNumber}>{inventory.length}</Text>
            <Text style={styles.inventoryStatLabel}>Total Stock</Text>
          </View>
          
          <View style={[styles.inventoryStatCard, { backgroundColor: '#e50914' }]}>
            <Text style={styles.inventoryStatNumber}>
              {inventory.filter(v => (v.status || 'Available') === 'Available').length}
            </Text>
            <Text style={styles.inventoryStatLabel}>Available</Text>
          </View>
          
          <View style={[styles.inventoryStatCard, { backgroundColor: '#e50914' }]}>
            <Text style={styles.inventoryStatNumber}>
              {inventory.filter(v => v.status === 'In Use' || v.status === 'Allocated').length}
            </Text>
            <Text style={styles.inventoryStatLabel}>In Use</Text>
          </View>
          
          <View style={[styles.inventoryStatCard, { backgroundColor: '#e50914' }]}>
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

          // Status automatically updated to 'Preparing' by backend
          console.log('✅ Vehicle status will be automatically updated to "Preparing" by backend');
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
      <ScrollView style={[styles.dispatchContainer, { backgroundColor: theme.background }]}>
        {/* Cleaner Header */}
        <View style={[styles.cleanDispatchHeader, { backgroundColor: theme.card }]}>
          <Text style={[styles.cleanDispatchTitle, { color: theme.text }]}>Vehicle Dispatch</Text>
          <Text style={[styles.cleanDispatchSubtitle, { color: theme.textSecondary }]}>
            Select vehicles one by one to dispatch
          </Text>
        </View>

        {/* Vehicle List - One by One Selection */}
        <View style={[styles.cleanDispatchSection, { backgroundColor: theme.card }]}>
          <View style={styles.cleanSectionHeader}>
            <Text style={[styles.cleanSectionTitle, { color: theme.text }]}>Available Vehicles</Text>
          </View>
          
          {availableVehicles.length === 0 ? (
            <View style={styles.cleanEmptyState}>
              <Text style={[styles.cleanEmptyIcon, { color: theme.textSecondary }]}>🚗</Text>
              <Text style={[styles.cleanEmptyText, { color: theme.textSecondary }]}>No available vehicles</Text>
            </View>
          ) : (
            <View style={styles.vehicleListContainer}>
              {availableVehicles.map((item, index) => (
                <TouchableOpacity 
                  key={item._id}
                  style={[
                    styles.individualVehicleCard,
                    { backgroundColor: theme.surface, borderColor: theme.border }
                  ]}
                  onPress={() => {
                    setSelectedVehicleForServices(item);
                    setShowServicesModal(true);
                  }}
                >
                  <View style={styles.vehicleCardContent}>
                    <View style={styles.vehicleMainInfo}>
                      <Text style={[styles.vehicleModelText, { color: theme.text }]}>
                        {item.unitName || 'Unknown Vehicle'}
                      </Text>
                      <Text style={[styles.vehicleDetailsText, { color: theme.textSecondary }]}>
                        VIN: {item.unitId || 'N/A'} • {item.bodyColor || 'N/A'}
                      </Text>
                    </View>
                    <View style={[styles.selectButton, { backgroundColor: theme.primary }]}>
                      <Text style={styles.selectButtonText}>Select</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <UniformLoading 
        message="Loading Admin Dashboard..." 
        size="large" 
        backgroundColor="#F5F5F5"
      />
    );
  }

  // Create themed styles
  const styles = createStyles(theme);

  return (
    <View style={[{ flex: 1 }, { backgroundColor: theme.background }]}>
      <ScrollView 
        style={[{ flex: 1 }, { backgroundColor: theme.background }]}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          {/* Header */}
          <View style={styles.headerContainer}>
            <Text style={[styles.header, { color: theme.text }]}>Admin Dashboard</Text>
          </View>

          {/* Main Dashboard Content */}
          {renderDashboardContent()}
        </View>
      </ScrollView>
      
      {/* Services Selection Modal */}
      <Modal
        visible={showServicesModal}
        animationType="slide"
        transparent={false}
      >
        <View style={[styles.servicesModalContainer, { backgroundColor: theme.background }]}>
          {/* Header */}
          <View style={[styles.servicesModalHeader, { backgroundColor: theme.primary }]}>
            <TouchableOpacity
              style={styles.modalBackButton}
              onPress={() => {
                setShowServicesModal(false);
                setSelectedVehicleForServices(null);
                setSelectedDispatchProcesses([]);
              }}
            >
              <Text style={styles.modalBackText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.servicesModalTitle}>Select Services</Text>
            <View style={styles.modalBackButton} />
          </View>

          {/* Vehicle Info */}
          {selectedVehicleForServices && (
            <View style={[styles.selectedVehicleInfo, { backgroundColor: theme.card }]}>
              <Text style={[styles.selectedVehicleTitle, { color: theme.text }]}>
                {selectedVehicleForServices.unitName}
              </Text>
              <Text style={[styles.selectedVehicleDetails, { color: theme.textSecondary }]}>
                VIN: {selectedVehicleForServices.unitId} • {selectedVehicleForServices.bodyColor}
              </Text>
            </View>
          )}

          {/* Services List */}
          <ScrollView style={styles.servicesScrollContainer}>
            <View style={styles.servicesGrid}>
              {availableProcesses.map((process) => {
                const isSelected = selectedDispatchProcesses.includes(process.id);
                return (
                  <TouchableOpacity
                    key={process.id}
                    style={[
                      styles.serviceModalCard,
                      { backgroundColor: theme.surface, borderColor: theme.border },
                      isSelected && { backgroundColor: theme.primary, borderColor: theme.primary }
                    ]}
                    onPress={() => {
                      setSelectedDispatchProcesses(prev => {
                        const isCurrentlySelected = prev.includes(process.id);
                        if (isCurrentlySelected) {
                          return prev.filter(id => id !== process.id);
                        } else {
                          return [...prev, process.id];
                        }
                      });
                    }}
                  >
                    <Text style={styles.serviceModalIcon}>{process.icon}</Text>
                    <Text style={[
                      styles.serviceModalLabel,
                      { color: isSelected ? '#fff' : theme.text }
                    ]}>
                      {process.label}
                    </Text>
                    {isSelected && (
                      <View style={styles.serviceModalCheckmark}>
                        <Text style={styles.serviceModalCheck}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Dispatch Button */}
          {selectedDispatchProcesses.length > 0 && (
            <View style={styles.servicesModalFooter}>
              <TouchableOpacity
                style={[styles.dispatchVehicleButton, { backgroundColor: theme.primary }]}
                onPress={async () => {
                  try {
                    if (!selectedVehicleForServices) return;

                    const assignmentData = {
                      vehicleId: selectedVehicleForServices._id,
                      unitName: selectedVehicleForServices.unitName,
                      unitId: selectedVehicleForServices.unitId,
                      bodyColor: selectedVehicleForServices.bodyColor,
                      variation: selectedVehicleForServices.variation,
                      processes: selectedDispatchProcesses,
                      status: 'Assigned to Dispatch',
                      assignedAt: new Date().toISOString(),
                      assignedBy: 'admin'
                    };

                    const response = await fetch(buildApiUrl('/api/dispatch/assignments'), {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(assignmentData),
                    });

                    const result = await response.json();
                    if (response.ok) {
                      Alert.alert('Success', `${selectedVehicleForServices.unitName} assigned to dispatch successfully!`);
                      
                      // Status automatically updated to 'Preparing' by backend
                      // Close modal and refresh
                      setShowServicesModal(false);
                      setSelectedVehicleForServices(null);
                      setSelectedDispatchProcesses([]);
                      fetchInventory();
                    } else {
                      Alert.alert('Error', 'Failed to assign vehicle to dispatch');
                    }
                  } catch (error) {
                    console.error('Error dispatching vehicle:', error);
                    Alert.alert('Error', 'Failed to assign vehicle to dispatch');
                  }
                }}
              >
                <Text style={styles.dispatchVehicleButtonText}>
                  🚚 Dispatch {selectedVehicleForServices?.unitName}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>


      
      {/* Add Stock Modal */}
      <Modal visible={showAddStockModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Stock</Text>

            {/* Unit Name Dropdown */}
            <Picker
              selectedValue={selectedUnitName}
              onValueChange={handleUnitNameChange}
              style={styles.picker}
            >
              <Picker.Item label="Select Unit Name" value="" />
              {getUnitNames().map((unitName) => (
                <Picker.Item key={unitName} label={unitName} value={unitName} />
              ))}
            </Picker>
            
            <TextInput
              style={styles.input}
              placeholder="Body Color"
              value={newStock.bodyColor}
              onChangeText={(text) => setNewStock({ ...newStock, bodyColor: text })}
            />
            
            {/* Variation Dropdown - only enabled when unit name is selected */}
            <Picker
              selectedValue={newStock.variation}
              onValueChange={(value) => setNewStock({ ...newStock, variation: value })}
              style={[styles.picker, !selectedUnitName && styles.disabledPicker]}
              enabled={!!selectedUnitName}
            >
              <Picker.Item 
                label={selectedUnitName ? "Select Variation" : "First select Unit Name"} 
                value="" 
              />
              {availableVariations.map((variation) => (
                <Picker.Item key={variation} label={variation} value={variation} />
              ))}
            </Picker>

            {/* Status Dropdown - Only 'In Stockyard' or 'Available' allowed for new vehicles */}
            <Text style={styles.label}>Initial Status</Text>
            <Picker
              selectedValue={newStock.status}
              onValueChange={(value) => setNewStock({ ...newStock, status: value })}
              style={styles.picker}
            >
              <Picker.Item label="In Stockyard (Default - at warehouse)" value="In Stockyard" />
              <Picker.Item label="Available (Already at Isuzu Pasig)" value="Available" />
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
            <Text style={styles.modalTitle}>Edit Vehicle</Text>

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

            {/* Status Picker - Shows only allowed transitions based on current status */}
            <Text style={styles.label}>Vehicle Status</Text>
            <Picker
              selectedValue={editStock.status}
              onValueChange={(value) => setEditStock({ ...editStock, status: value })}
              style={styles.picker}
            >
              {selectedStock && getAllowedStatusOptions(
                editStock.currentStatus,
                !!selectedStock.assignedDriver,
                selectedStock.driverAccepted === true,
                !!(selectedStock.location?.latitude && selectedStock.location?.longitude)
              ).map((status) => {
                const isCurrent = status === editStock.currentStatus;
                const label = isCurrent ? `${status} (Current)` : status;
                return <Picker.Item key={status} label={label} value={status} />;
              })}
            </Picker>
            {editStock.currentStatus && VEHICLE_STATUS_RULES[editStock.currentStatus] && (
              <Text style={styles.statusHintText}>
                Requirements for transitions: {VEHICLE_STATUS_RULES[editStock.currentStatus].requirements}
              </Text>
            )}

            {/* Assign to Agent Section */}
            <View style={styles.assignAgentSection}>
              <Text style={styles.label}>Assign to Agent</Text>
              <Picker
                selectedValue={editStock.assignedAgent || ''}
                onValueChange={(value) => setEditStock({ ...editStock, assignedAgent: value })}
                style={styles.picker}
              >
                <Picker.Item label="No Agent Assigned" value="" />
                {agents.map(a => (
                  <Picker.Item key={a._id} label={a.accountName || a.username} value={a.username} />
                ))}
              </Picker>
              {selectedStock?.assignedAgent && (
                <Text style={styles.statusHintText}>
                  Currently assigned to: {selectedStock.assignedAgent}
                </Text>
              )}
            </View>

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

const createStyles = (theme) => StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: '#f8fafc', // Light gray background for better contrast
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500'
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: { 
    fontSize: 28,
    fontWeight: '700', 
    color: '#1a202c',
    flex: 1
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
    backgroundColor: '#e50914',
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
    backgroundColor: '#e50914',
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
    fontSize: 22,
    fontWeight: '800',
    color: '#1a202c',
    marginBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 12,
    letterSpacing: -0.5,
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
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    marginBottom: 16,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    color: '#1F2937',
    minHeight: 52,
    fontWeight: '500',
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    marginBottom: 16,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    color: '#1F2937',
    minHeight: 52,
    fontWeight: '500',
  },
  primaryButton: {
    backgroundColor: '#e50914',
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
    borderLeftColor: '#e50914',
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
    backgroundColor: '#f8fafc',
    padding: 16,
  },

  inventoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  inventoryTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1a202c',
    flex: 1,
    letterSpacing: -0.5,
  },

  addStockButton: {
    backgroundColor: '#e50914',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#e50914',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },

  addStockButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Search Section
  inventorySearchSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  inventorySearchInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
    minHeight: 52,
  },

  // Stats Section - Mobile Optimized
  inventoryStatsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
    gap: 12,
  },

  inventoryStatCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },

  inventoryStatNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
  },

  inventoryStatLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Stock Cards
  inventoryList: {
    flex: 1,
  },

  stockCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderLeftWidth: 6,
    borderLeftColor: '#e50914',
  },

  stockCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },

  stockUnitName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a202c',
    flex: 1,
    letterSpacing: -0.5,
  },

  stockStatusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },

  stockStatusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  stockCardContent: {
    gap: 12,
  },

  stockInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },

  stockInfoLabel: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '600',
    flex: 1,
  },

  stockInfoValue: {
    fontSize: 16,
    color: '#1a202c',
    fontWeight: '700',
    flex: 2,
    textAlign: 'right',
  },

  stockDivider: {
    height: 2,
    backgroundColor: '#f1f5f9',
    marginVertical: 12,
    borderRadius: 1,
  },

  stockCardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    gap: 12,
  },

  stockEditBtn: {
    backgroundColor: '#e50914',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: '#e50914',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },

  stockDeleteBtn: {
    backgroundColor: '#e50914',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: '#e50914',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },

  stockActionBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Empty States
  inventoryEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 60,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },

  inventoryEmptyText: {
    fontSize: 24,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '700',
  },

  inventoryEmptySubtext: {
    fontSize: 18,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '500',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 32,
    width: '95%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1a202c',
    marginBottom: 24,
    textAlign: 'center',
    letterSpacing: -0.5,
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
    backgroundColor: '#e50914',
  },

  modalButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },

  // Modern Dashboard Styles
  dashboardContainer: {
    padding: 16,
    gap: 20,
  },

  // Assignment Card Styles
  assignmentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 0,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  assignmentCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },

  assignmentTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1a202c',
    letterSpacing: -0.5,
  },

  assignmentBadge: {
    backgroundColor: '#e50914',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },

  assignmentBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  assignmentSection: {
    marginBottom: 24,
  },

  assignmentLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a202c',
    marginBottom: 16,
  },

  modeSelector: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
    padding: 6,
    gap: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  modeButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modeButtonActive: {
    backgroundColor: '#e50914',
    shadowColor: '#e50914',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },

  modeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },

  modeButtonTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },

  assignmentForm: {
    gap: 20,
  },

  formField: {
    gap: 12,
  },

  fieldLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a202c',
    marginBottom: 4,
  },

  modernPickerContainer: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },

  modernPicker: {
    height: 56,
    fontSize: 16,
    color: '#1a202c',
  },

  modernInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 16,
    minHeight: 52,
    fontWeight: '500',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },

  createAssignmentButton: {
    backgroundColor: '#e50914',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#e50914',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },

  createAssignmentButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },



  // Allocations Card Styles
  allocationsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 0,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  allocationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },

  allocationsTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a202c',
    flex: 1,
    letterSpacing: -0.5,
  },

  allocationsActions: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },

  allocationNavBtn: {
    backgroundColor: '#e50914',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e50914',
    shadowColor: '#e50914',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },

  allocationNavBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  allocationsList: {
    gap: 16,
  },

  allocationItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },

  allocationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  allocationUnitName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a202c',
    flex: 1,
  },

  allocationStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },

  allocationStatusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  allocationDetails: {
    gap: 8,
  },

  allocationDetailText: {
    fontSize: 16,
    color: '#4a5568',
    fontWeight: '500',
  },

  viewAllAllocationsBtn: {
    backgroundColor: '#e50914',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#e50914',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },

  viewAllAllocationsBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    padding: 40,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    marginTop: 8,
  },

  emptyAllocationsText: {
    fontSize: 20,
    color: '#374151',
    marginBottom: 8,
    fontWeight: '700',
  },

  emptyAllocationsSubtext: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '500',
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
    borderColor: '#e50914',
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
    color: '#e50914',
  },

  dispatchProcessCheckmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#e50914',
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
    borderColor: '#e50914',
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
    borderColor: '#e50914',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  dispatchCheckmark: {
    fontSize: 14,
    color: '#e50914',
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
    backgroundColor: '#e50914',
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

  // Clean Dispatch Styles
  cleanDispatchHeader: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  cleanDispatchTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },

  cleanDispatchSubtitle: {
    fontSize: 14,
    opacity: 0.8,
  },

  cleanDispatchSection: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  cleanSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },

  cleanSectionNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  cleanSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },

  cleanSectionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 32,
    alignItems: 'center',
  },

  cleanVehicleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  cleanVehicleCard: {
    width: '48%',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    marginBottom: 8,
  },

  cleanVehicleCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  cleanVehicleCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  cleanCheckmark: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },

  cleanVehicleName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },

  cleanVehicleDetail: {
    fontSize: 12,
    opacity: 0.8,
  },

  cleanServiceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  cleanServiceCard: {
    width: '48%',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    alignItems: 'center',
    position: 'relative',
  },

  cleanServiceIcon: {
    fontSize: 32,
    marginBottom: 8,
  },

  cleanServiceLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },

  cleanServiceCheckmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#fff',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cleanServiceCheck: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: 'bold',
  },

  cleanSummaryContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },

  cleanSummaryItem: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  cleanSummaryLabel: {
    fontSize: 12,
    fontWeight: '500',
  },

  cleanSummaryValue: {
    fontSize: 14,
    fontWeight: '600',
  },

  cleanDispatchButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },

  cleanDispatchButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },

  cleanResetButton: {
    marginTop: 8,
    marginBottom: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },

  cleanResetButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },

  cleanEmptyState: {
    alignItems: 'center',
    padding: 32,
  },

  cleanEmptyIcon: {
    fontSize: 48,
    marginBottom: 8,
  },

  cleanEmptyText: {
    fontSize: 16,
  },

  // Individual Vehicle Selection Styles
  vehicleListContainer: {
    gap: 12,
  },

  individualVehicleCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    marginBottom: 12,
  },

  vehicleCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  vehicleMainInfo: {
    flex: 1,
  },

  vehicleModelText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },

  vehicleDetailsText: {
    fontSize: 12,
    opacity: 0.8,
  },

  selectButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },

  selectButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Services Modal Styles
  servicesModalContainer: {
    flex: 1,
  },

  servicesModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },

  modalBackButton: {
    width: 60,
  },

  modalBackText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  servicesModalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },

  selectedVehicleInfo: {
    padding: 20,
    margin: 16,
    borderRadius: 12,
  },

  selectedVehicleTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },

  selectedVehicleDetails: {
    fontSize: 14,
    opacity: 0.8,
  },

  servicesScrollContainer: {
    flex: 1,
    padding: 16,
  },

  servicesGrid: {
    gap: 12,
  },

  serviceModalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    position: 'relative',
  },

  serviceModalIcon: {
    fontSize: 24,
    marginRight: 16,
  },

  serviceModalLabel: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },

  serviceModalCheckmark: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#fff',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  serviceModalCheck: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: 'bold',
  },

  servicesModalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },

  dispatchVehicleButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },

  dispatchVehicleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    backgroundColor: '#e50914',
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
    backgroundColor: '#e50914',
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

  // Reports Dashboard Styles
  reportsContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
  },

  reportsStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },

  reportsStatCard: {
    width: '48%',
    backgroundColor: '#e50914',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 8,
  },

  reportsStatNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },

  reportsStatLabel: {
    fontSize: 11,
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 14,
  },

  reportsContentRow: {
    flexDirection: 'row',
    gap: 16,
    flex: 1,
  },

  reportsLeftColumn: {
    flex: 1,
  },

  reportsRightColumn: {
    flex: 2,
  },

  reportsSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  reportsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },



  vehicleBreakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 8,
  },

  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },

  vehicleModel: {
    flex: 1,
    fontSize: 14,
    color: theme.textPrimary,
    fontWeight: '500',
  },

  vehicleCount: {
    fontSize: 14,
    color: theme.textSecondary,
    fontWeight: '600',
  },

  vehiclePercentage: {
    fontSize: 12,
    color: theme.textSecondary,
    marginLeft: 5,
  },

  reportsTable: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    overflow: 'hidden',
  },

  reportsTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },

  reportsTableHeaderCell: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
  },

  reportsTableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    alignItems: 'center',
  },

  reportsTableCell: {
    fontSize: 14,
    color: '#374151',
  },

  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
  },

  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
  },

  emptyTableText: {
    flex: 1,
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
    textAlign: 'center',
  },

  disabledPicker: {
    opacity: 0.5,
    backgroundColor: '#f5f5f5',
  },

  statusHintText: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: -8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },

  assignAgentSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },

  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    padding: 4,
  },
  quickActionButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#e50914',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  quickActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
