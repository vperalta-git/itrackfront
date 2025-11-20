import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { buildApiUrl } from '../constants/api';

const EnhancedVehicleAssignment = ({ visible, onClose, onVehicleAssigned }) => {
  const [drivers, setDrivers] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  
  const [assignmentData, setAssignmentData] = useState({
    unitName: '',
    unitId: '',
    driverUsername: '',
    agentUsername: '',
    bodyColor: '',
    variation: '',
    processes: []
  });

  const availableProcesses = [
    { id: 'delivery_to_isuzu_pasig', label: '🚛 Delivery to Isuzu Pasig' },
    { id: 'stock_integration', label: '📦 Stock Integration' },
    { id: 'documentation_check', label: '📋 Documentation Check' },
    { id: 'tinting', label: '🪟 Window Tinting' },
    { id: 'carwash', label: '🚿 Car Wash' },
    { id: 'ceramic_coating', label: '✨ Ceramic Coating' },
    { id: 'accessories', label: '🔧 Accessories Installation' },
    { id: 'rust_proof', label: '🛡️ Rust Proofing' }
  ];

  useEffect(() => {
    if (visible) {
      fetchDriversAndAgents();
    }
  }, [visible]);

  const fetchDriversAndAgents = async () => {
    setFetchingData(true);
    try {
      const response = await fetch(buildApiUrl('/getUsers'));
      const result = await response.json();
      
      if (result.success && result.data) {
        const driverList = result.data.filter(u => u.role === 'Driver' && u.isActive !== false);
        const agentList = result.data.filter(u => 
          (u.role === 'Sales Agent' || u.role === 'Agent') && u.isActive !== false
        );
        
        setDrivers(driverList);
        setAgents(agentList);
        
        console.log('📊 Fetched:', { drivers: driverList.length, agents: agentList.length });
      }
    } catch (error) {
      console.error('❌ Error fetching users:', error);
      Alert.alert('Error', 'Failed to load drivers and agents');
    } finally {
      setFetchingData(false);
    }
  };

  const handleAssignVehicle = async () => {
    if (!assignmentData.unitName || !assignmentData.unitId || !assignmentData.driverUsername) {
      Alert.alert('Missing Fields', 'Vehicle name, VIN/ID, and driver are required.');
      return;
    }

    const selectedDriver = drivers.find(d => d.username === assignmentData.driverUsername);
    const selectedAgent = agents.find(a => a.username === assignmentData.agentUsername);

    if (!selectedDriver) {
      Alert.alert('Error', 'Selected driver not found.');
      return;
    }

    setLoading(true);
    try {
      console.log('🚗 Assigning vehicle:', {
        vehicle: `${assignmentData.unitName} (${assignmentData.unitId})`,
        driver: selectedDriver.accountName,
        agent: selectedAgent?.accountName || 'None',
        processes: assignmentData.processes.length
      });
      
      const response = await fetch(buildApiUrl('/createAllocation'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitName: assignmentData.unitName,
          unitId: assignmentData.unitId,
          assignedDriver: selectedDriver.accountName, // Use accountName for consistent matching
          assignedDriverEmail: selectedDriver.email, // Store email for reliable matching
          assignedAgent: selectedAgent?.accountName || null,
          bodyColor: assignmentData.bodyColor || 'Not Specified',
          variation: assignmentData.variation || 'Standard',
          status: 'Pending',
          allocatedBy: 'Admin - Vehicle Assignment',
          processesToBeDone: assignmentData.processes.length > 0 ? assignmentData.processes : ['delivery_to_isuzu_pasig'],
          date: new Date(),
          createdAt: new Date()
        }),
      });

      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to assign vehicle');
      }

      Alert.alert(
        'Vehicle Assigned Successfully!',
        `Vehicle: ${assignmentData.unitName}\nVIN: ${assignmentData.unitId}\nAssigned to: ${selectedDriver.accountName}\nAgent: ${selectedAgent?.accountName || 'None'}\nProcesses: ${result.data.processesToBeDone?.length || 1}`,
        [
          {
            text: 'OK',
            onPress: () => {
              resetForm();
              onClose();
              if (onVehicleAssigned) onVehicleAssigned(result.data);
            }
          }
        ]
      );
    } catch (error) {
      console.error('❌ Vehicle assignment error:', error);
      Alert.alert('Assignment Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setAssignmentData({
      unitName: '',
      unitId: '',
      driverUsername: '',
      agentUsername: '',
      bodyColor: '',
      variation: '',
      processes: []
    });
  };

  const toggleProcess = (processId) => {
    setAssignmentData(prev => ({
      ...prev,
      processes: prev.processes.includes(processId)
        ? prev.processes.filter(p => p !== processId)
        : [...prev.processes, processId]
    }));
  };

  const generateVIN = () => {
    const randomVIN = `ISUZU${Date.now().toString().slice(-6)}`;
    setAssignmentData(prev => ({ ...prev, unitId: randomVIN }));
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Assign Vehicle to Driver</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {fetchingData ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading drivers and agents...</Text>
          </View>
        ) : (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Vehicle Information</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Vehicle Model <Text style={{ fontSize: 11, color: '#999' }}>(Required field)</Text></Text>
                <TextInput
                  style={styles.input}
                  value={assignmentData.unitName}
                  onChangeText={(text) => setAssignmentData(prev => ({ ...prev, unitName: text }))}
                  placeholder="e.g., Isuzu D-Max, Isuzu MU-X"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>VIN/Unit ID <Text style={{ fontSize: 11, color: '#999' }}>(Required field)</Text></Text>
                <View style={styles.vinRow}>
                  <TextInput
                    style={[styles.input, styles.vinInput]}
                    value={assignmentData.unitId}
                    onChangeText={(text) => setAssignmentData(prev => ({ ...prev, unitId: text.toUpperCase() }))}
                    placeholder="Enter VIN or Unit ID"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="characters"
                  />
                  <TouchableOpacity onPress={generateVIN} style={styles.generateButton}>
                    <Text style={styles.generateButtonText}>Gen</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>Body Color</Text>
                  <TextInput
                    style={styles.input}
                    value={assignmentData.bodyColor}
                    onChangeText={(text) => setAssignmentData(prev => ({ ...prev, bodyColor: text }))}
                    placeholder="e.g., White, Black"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
                
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>Variation</Text>
                  <TextInput
                    style={styles.input}
                    value={assignmentData.variation}
                    onChangeText={(text) => setAssignmentData(prev => ({ ...prev, variation: text }))}
                    placeholder="e.g., 4x2, 4x4"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Assignment Details</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Assign to Driver <Text style={{ fontSize: 11, color: '#999' }}>(Required field)</Text></Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={assignmentData.driverUsername}
                    onValueChange={(value) => setAssignmentData(prev => ({ ...prev, driverUsername: value }))}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select a driver..." value="" />
                    {drivers.map(driver => (
                      <Picker.Item 
                        key={driver._id} 
                        label={`${driver.accountName || driver.name} (${driver.username})`}
                        value={driver.username} 
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Assign to Sales Agent (Optional)</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={assignmentData.agentUsername}
                    onValueChange={(value) => setAssignmentData(prev => ({ ...prev, agentUsername: value }))}
                    style={styles.picker}
                  >
                    <Picker.Item label="No agent assigned" value="" />
                    {agents.map(agent => (
                      <Picker.Item 
                        key={agent._id} 
                        label={`${agent.accountName || agent.name} (${agent.username})`}
                        value={agent.username} 
                      />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Required Processes</Text>
              <Text style={styles.sectionSubtitle}>
                Select processes to be completed (default: delivery will be selected if none chosen)
              </Text>
              
              <View style={styles.processGrid}>
                {availableProcesses.map(process => (
                  <TouchableOpacity 
                    key={process.id}
                    style={[
                      styles.processCard,
                      assignmentData.processes.includes(process.id) && styles.processCardSelected
                    ]}
                    onPress={() => toggleProcess(process.id)}
                  >
                    <Text style={[
                      styles.processText,
                      assignmentData.processes.includes(process.id) && styles.processTextSelected
                    ]}>
                      {process.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.note}>
                📝 This vehicle will be assigned to the selected driver and appear in their task list.
              </Text>
            </View>
          </ScrollView>
        )}

        <View style={styles.footer}>
          <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={handleAssignVehicle} 
            style={[styles.assignButton, (loading || fetchingData) && styles.disabledButton]}
            disabled={loading || fetchingData}
          >
            <Text style={styles.assignButtonText}>
              {loading ? 'Assigning...' : 'Assign Vehicle'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#dc2626',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
  },
  closeButton: {
    padding: 10,
  },
  closeButtonText: {
    fontSize: 20,
    color: 'white',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 15,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  inputGroup: {
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    flex: 0.48,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    backgroundColor: 'white',
    color: '#1f2937',
  },
  vinRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vinInput: {
    flex: 1,
    marginRight: 10,
  },
  generateButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderRadius: 10,
  },
  generateButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 14,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    backgroundColor: 'white',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  processGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  processCard: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    minWidth: '45%',
    marginBottom: 10,
  },
  processCardSelected: {
    backgroundColor: '#dbeafe',
    borderColor: '#2563eb',
  },
  processText: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
  },
  processTextSelected: {
    color: '#2563eb',
    fontWeight: '500',
  },
  note: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 40,
    gap: 15,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#6b7280',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  assignButton: {
    flex: 1,
    backgroundColor: '#dc2626',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  assignButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
});

export default EnhancedVehicleAssignment;
