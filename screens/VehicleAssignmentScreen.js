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
import { Picker } from '@react-native-picker/picker';
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
    if (!selectedVin || !selectedAgent || !selectedDriver) {
      Alert.alert('Missing Info', 'Please select vehicle, agent, and driver.');
      return;
    }

    let processesToAssign = selectedProcesses;
    if (processesToAssign.length === 0) {
      processesToAssign = [
        'delivery_to_isuzu_pasig',
        'stock_integration',
        'documentation_check'
      ];
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

      await fetch(buildApiUrl(`/updateStock/${selectedVehicle._id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...selectedVehicle,
          status: 'Allocated'
        }),
      });

      Alert.alert('Success', `Vehicle assigned successfully with ${processesToAssign.length} process(es)`);
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

    let processesToAssign = selectedProcesses;
    if (processesToAssign.length === 0) {
      processesToAssign = [
        'delivery_to_isuzu_pasig',
        'stock_integration',
        'documentation_check'
      ];
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

      Alert.alert('Success', `Vehicle assigned with ${processesToAssign.length} process(es)`);
      resetForm();
    } catch (err) {
      console.error('Assign manual error:', err);
      Alert.alert('Error', err.message);
    }
  };

  const resetForm = () => {
    setSelectedVin('');
    setSelectedAgent('');
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
          <Text style={[styles.headerTitle, { color: theme.text }]}>Vehicle Assignment</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>QUICK ASSIGN</Text>
          </View>
        </View>

        {/* Assignment Mode */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Assignment Mode</Text>
          <View style={styles.modeSelector}>
            <TouchableOpacity
              style={[
                styles.modeButton,
                mode === 'stock' && { backgroundColor: theme.primary }
              ]}
              onPress={() => setMode('stock')}
            >
              <Text style={[
                styles.modeButtonText,
                mode === 'stock' && styles.modeButtonTextActive
              ]}>
                From Stock
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modeButton,
                mode === 'manual' && { backgroundColor: theme.primary }
              ]}
              onPress={() => setMode('manual')}
            >
              <Text style={[
                styles.modeButtonText,
                mode === 'manual' && styles.modeButtonTextActive
              ]}>
                Manual Entry
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Vehicle Selection */}
        {mode === 'stock' ? (
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <Text style={[styles.fieldLabel, { color: theme.text }]}>Select Vehicle from Stock</Text>
            <View style={[styles.pickerContainer, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
              <Picker
                selectedValue={selectedVin}
                onValueChange={val => setSelectedVin(val)}
                style={styles.picker}
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
        ) : (
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Vehicle Details</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.text }]}
              placeholder="Vehicle Model (e.g., Isuzu D-Max)"
              placeholderTextColor={theme.textSecondary}
              value={manualModel}
              onChangeText={setManualModel}
            />
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.text }]}
              placeholder="VIN Number"
              placeholderTextColor={theme.textSecondary}
              value={manualVin}
              onChangeText={setManualVin}
            />
          </View>
        )}

        {/* Agent Selection */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.fieldLabel, { color: theme.text }]}>Assign to Agent</Text>
          <View style={[styles.pickerContainer, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
            <Picker
              selectedValue={selectedAgent}
              onValueChange={val => setSelectedAgent(val)}
              style={styles.picker}
            >
              <Picker.Item label="Select Agent..." value="" />
              {agents.map(a => (
                <Picker.Item key={a._id} label={a.accountName || a.username} value={a.username} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Driver Selection */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.fieldLabel, { color: theme.text }]}>Assign Driver</Text>
          <View style={[styles.pickerContainer, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
            <Picker
              selectedValue={selectedDriver}
              onValueChange={val => setSelectedDriver(val)}
              style={styles.picker}
            >
              <Picker.Item label="Select Driver..." value="" />
              {drivers.map(d => (
                <Picker.Item key={d._id} label={d.accountName || d.username} value={d.username} />
              ))}
            </Picker>
          </View>
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
    backgroundColor: '#DC2626',
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
  pickerContainer: {
    borderWidth: 1.5,
    borderRadius: 12,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
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
