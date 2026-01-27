import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { buildApiUrl } from '../constants/api';
import { useTheme } from '../context/ThemeContext';

export default function VehicleAssignmentScreen({ navigation }) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const [drivers, setDrivers] = useState([]);
  const [agents, setAgents] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [mode, setMode] = useState('stock'); // 'stock' or 'manual'
  const [selectedVin, setSelectedVin] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('');
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
  const [vehicleSearchQuery, setVehicleSearchQuery] = useState('');
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const [agentSearchQuery, setAgentSearchQuery] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [manualModel, setManualModel] = useState('');
  const [manualVin, setManualVin] = useState('');
  const [selectedProcesses, setSelectedProcesses] = useState([]);

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
        fetchAgents(),
        fetchDrivers(),
        fetchInventory()
      ]);
    } catch (error) {
      console.error('Error initializing data:', error);
      Alert.alert('Error', 'Failed to load data. Please check your connection.');
    } finally {
      setLoading(false);
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

  const assignFromStock = async () => {
    if (!selectedVin || !selectedAgent) {
      Alert.alert('Missing Info', 'Please select vehicle and agent.');
      return;
    }

    try {
      const selectedVehicle = inventory.find(v => (v.unitId || v._id) === selectedVin);
      if (!selectedVehicle) {
        Alert.alert('Error', 'Selected vehicle not found in inventory.');
        return;
      }

      const agentRecord = agents.find(a => a._id === selectedAgent || a.username === selectedAgent || a.accountName === selectedAgent);
      const managerId = agentRecord?.assignedTo || agentRecord?.managerId || '';
      const allocationPayload = {
        unitName: selectedVehicle.unitName,
        unitId: selectedVehicle.unitId || selectedVehicle._id,
        bodyColor: selectedVehicle.bodyColor,
        variation: selectedVehicle.variation,
        assignedAgent: agentRecord?.accountName || agentRecord?.username || selectedAgent,
        assignedAgentId: agentRecord?._id || '',
        managerId,
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
      Alert.alert('Success', 'Vehicle assigned successfully to agent!');
      resetForm();
      await fetchInventory();
    } catch (err) {
      console.error('Assign to agent error:', err);
      Alert.alert('Error', err.message);
    }
  };

  const assignManual = async () => {
    if (!manualModel || !manualVin || !selectedDriver || !selectedAgent) {
      Alert.alert('Missing Info', 'Please fill in all fields for manual entry.');
      return;
    }

    try {
      const agentRecord = agents.find(a => a._id === selectedAgent || a.username === selectedAgent || a.accountName === selectedAgent);
      const managerId = agentRecord?.assignedTo || agentRecord?.managerId || '';
      const allocationPayload = {
        unitName: manualModel,
        unitId: manualVin,
        bodyColor: 'Manual Entry',
        variation: 'Manual Entry',
        assignedDriver: selectedDriver,
        assignedAgent: agentRecord?.accountName || agentRecord?.username || selectedAgent,
        assignedAgentId: agentRecord?._id || '',
        managerId,
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

      Alert.alert('Success', 'Vehicle assigned successfully!');
      resetForm();
    } catch (err) {
      console.error('Assign manual error:', err);
      Alert.alert('Error', err.message);
    }
  };

  const resetForm = () => {
    setSelectedVin('');
    setSelectedAgent('');
    setShowVehicleDropdown(false);
    setShowAgentDropdown(false);
    setVehicleSearchQuery('');
    setAgentSearchQuery('');
    setSelectedDriver('');
    setManualModel('');
    setManualVin('');
    setSelectedProcesses([]);
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.text }]}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.card }]}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Vehicle Allocation</Text>
        </View>

        {/* Vehicle Selection */}
        {
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <Text style={[styles.fieldLabel, { color: theme.text }]}>Select Vehicle from Stock</Text>
            <TouchableOpacity
              style={[styles.searchableDropdown, { borderColor: theme.border, backgroundColor: theme.inputBackground }]}
              onPress={() => setShowVehicleDropdown(!showVehicleDropdown)}
              activeOpacity={0.85}
            >
              <View style={styles.selectedItemContainer}>
                {(() => {
                  if (!selectedVin) return <Text style={styles.placeholderText}>Choose Vehicle...</Text>;
                  const unit = inventory.find(v => (v.unitId || v._id) === selectedVin);
                  if (!unit) return <Text style={styles.placeholderText}>Choose Vehicle...</Text>;
                  const label = `${unit.unitName} - ${unit.variation || ''}${unit.bodyColor ? ` (${unit.bodyColor})` : ''}`.trim();
                  return <Text style={styles.selectedAgentText}>{label}</Text>;
                })()}
              </View>
              <MaterialIcons name={showVehicleDropdown ? 'arrow-drop-up' : 'arrow-drop-down'} size={24} color={theme.textSecondary} />
            </TouchableOpacity>

            {showVehicleDropdown && (
              <View style={[styles.dropdownContainer, { borderColor: theme.border, backgroundColor: theme.card }]}> 
                <View style={styles.searchContainer}>
                  <MaterialIcons name="search" size={20} color="#999" style={styles.searchIcon} />
                  <TextInput
                    style={[styles.searchInput, { color: theme.text }]}
                    placeholder="Search vehicles..."
                    placeholderTextColor={theme.textSecondary}
                    value={vehicleSearchQuery}
                    onChangeText={setVehicleSearchQuery}
                  />
                  {vehicleSearchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setVehicleSearchQuery('')}>
                      <MaterialIcons name="close" size={20} color="#999" />
                    </TouchableOpacity>
                  )}
                </View>

                <ScrollView style={styles.dropdownList} nestedScrollEnabled>
                  {inventory
                    .filter(item => {
                      const status = item.status || 'In Stockyard';
                      const available = (status === 'In Stockyard' || status === 'Available') && !item.assignedDriver;
                      if (!available) return false;
                      const q = vehicleSearchQuery.toLowerCase();
                      return [item.unitName, item.unitId, item.bodyColor, item.variation]
                        .some(f => (f || '').toLowerCase().includes(q));
                    })
                    .map(item => {
                      const label = `${item.unitName} - ${item.variation || ''}${item.bodyColor ? ` (${item.bodyColor})` : ''}`.trim();
                      const isSelected = selectedVin === (item.unitId || item._id);
                      return (
                        <TouchableOpacity
                          key={item._id}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setSelectedVin(item.unitId || item._id);
                            setShowVehicleDropdown(false);
                            setVehicleSearchQuery('');
                          }}
                        >
                          <View style={styles.dropdownItemInfo}>
                            <Text style={[styles.agentName, { color: theme.text }]}>{label}</Text>
                            <Text style={[styles.agentRole, { color: theme.textSecondary }]}>{item.status || 'In Stockyard'}</Text>
                          </View>
                          {isSelected && <MaterialIcons name="check-circle" size={22} color="#059669" />}
                        </TouchableOpacity>
                      );
                    })}

                  {inventory.filter(item => {
                    const status = item.status || 'In Stockyard';
                    const available = (status === 'In Stockyard' || status === 'Available') && !item.assignedDriver;
                    if (!available) return false;
                    const q = vehicleSearchQuery.toLowerCase();
                    return [item.unitName, item.unitId, item.bodyColor, item.variation]
                      .some(f => (f || '').toLowerCase().includes(q));
                  }).length === 0 && (
                    <View style={styles.noResultsContainer}>
                      <MaterialIcons name="search-off" size={48} color="#ccc" />
                      <Text style={[styles.noResultsText, { color: theme.textSecondary }]}>No vehicles found</Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            )}
          </View>
        }

        {/* Agent Selection - For Sales Agents Only */}
          <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.fieldLabel, { color: theme.text }]}>Assign to Agent</Text>
          <TouchableOpacity
            style={[styles.searchableDropdown, { borderColor: theme.border, backgroundColor: theme.inputBackground }]}
            onPress={() => setShowAgentDropdown(!showAgentDropdown)}
            activeOpacity={0.85}
          >
            <View style={styles.selectedItemContainer}>
              {(() => {
                if (!selectedAgent) return <Text style={styles.placeholderText}>Select Agent...</Text>;
                const agent = agents.find(a => (a.accountName || a.name || a.username) === selectedAgent);
                const label = agent ? (agent.accountName || agent.name || agent.username) : 'Select Agent...';
                return <Text style={styles.selectedAgentText}>{label}</Text>;
              })()}
            </View>
            <MaterialIcons name={showAgentDropdown ? 'arrow-drop-up' : 'arrow-drop-down'} size={24} color={theme.textSecondary} />
          </TouchableOpacity>

          {showAgentDropdown && (
            <View style={[styles.dropdownContainer, { borderColor: theme.border, backgroundColor: theme.card }]}>
              <View style={styles.searchContainer}>
                <MaterialIcons name="search" size={20} color="#999" style={styles.searchIcon} />
                <TextInput
                  style={[styles.searchInput, { color: theme.text }]}
                  placeholder="Search agents..."
                  placeholderTextColor={theme.textSecondary}
                  value={agentSearchQuery}
                  onChangeText={setAgentSearchQuery}
                />
                {agentSearchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setAgentSearchQuery('')}>
                    <MaterialIcons name="close" size={20} color="#999" />
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView style={styles.dropdownList} nestedScrollEnabled>
                {agents
                  .filter(a => (a.accountName || a.name || a.username || '').toLowerCase().includes(agentSearchQuery.toLowerCase()))
                  .map(a => {
                    const label = a.accountName || a.name || a.username;
                    const isSelected = selectedAgent === label;
                    return (
                      <TouchableOpacity
                        key={a._id}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setSelectedAgent(label);
                          setShowAgentDropdown(false);
                          setAgentSearchQuery('');
                        }}
                      >
                        <View style={styles.dropdownItemInfo}>
                          <Text style={[styles.agentName, { color: theme.text }]}>{label}</Text>
                          <Text style={[styles.agentRole, { color: theme.textSecondary }]}>{a.email || a.username || ''}</Text>
                        </View>
                        {isSelected && <MaterialIcons name="check-circle" size={22} color="#059669" />}
                      </TouchableOpacity>
                    );
                  })}

                {agents.filter(a => (a.accountName || a.name || a.username || '').toLowerCase().includes(agentSearchQuery.toLowerCase())).length === 0 && (
                  <View style={styles.noResultsContainer}>
                    <MaterialIcons name="search-off" size={48} color="#ccc" />
                    <Text style={[styles.noResultsText, { color: theme.textSecondary }]}>No agents found</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Create Assignment Button */}
        <TouchableOpacity 
          style={[styles.createButton, { backgroundColor: theme.primary }]}
          onPress={mode === 'stock' ? assignFromStock : assignManual}
        >
          <Text style={styles.createButtonText}>CREATE ASSIGNMENT</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  badge: {
    backgroundColor: '#e50914',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 4,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  modeButtonTextActive: {
    color: '#fff',
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  // Searchable dropdowns
  searchableDropdown: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  selectedItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  placeholderText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  selectedAgentText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dropdownContainer: {
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 6,
    maxHeight: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchIcon: {
    marginRight: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 6,
  },
  dropdownList: {
    maxHeight: 260,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 12,
  },
  dropdownItemInfo: {
    flex: 1,
  },
  agentName: {
    fontSize: 14,
    fontWeight: '700',
  },
  agentRole: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  noResultsText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 12,
    fontWeight: '500',
  },
  createButton: {
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
