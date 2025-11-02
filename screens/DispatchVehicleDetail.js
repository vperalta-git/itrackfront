// DispatchVehicleDetail.js - Enhanced for I-Track
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { buildApiUrl } from '../constants/api';

const ALL_PROCESSES = [
  { key: 'tinting', label: 'Tinting' },
  { key: 'carwash', label: 'Carwash' },
  { key: 'ceramic_coating', label: 'Ceramic Coating' },
  { key: 'accessories', label: 'Accessories' },
  { key: 'rust_proof', label: 'Rust Proof' },
];

// Status options for dispatch workflow
const DISPATCH_STATUSES = [
  { value: 'awaiting_dispatch', label: 'Awaiting Dispatch', color: '#FFA726' },
  { value: 'in_transit', label: 'In Transit', color: '#1976D2' },
  { value: 'arrived_dealership', label: 'Arrived at Dealership', color: '#7B1FA2' },
  { value: 'under_preparation', label: 'Under Preparation', color: '#FDD835' },
  { value: 'ready_for_release', label: 'Ready for Release', color: '#66BB6A' },
  { value: 'released_to_customer', label: 'Released to Customer', color: '#4CAF50' },
];

export default function DispatchVehicleDetail() {
  const { params } = useRoute();
  const navigation = useNavigation();
  const { vin, allocationId } = params;
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('');

  useEffect(() => {
    fetchVehicle();
  }, []);

  const fetchVehicle = async () => {
    try {
      setLoading(true);
      const res = await fetch(buildApiUrl(`/getAllocation`));
      const data = await res.json();
      
      // Find the specific vehicle by allocation ID or VIN
      const foundVehicle = (data.allocation || data || []).find(v => 
        v._id === allocationId || v.unitId === vin
      );
      
      if (foundVehicle) {
        setVehicle(foundVehicle);
        setSelectedStatus(foundVehicle.dispatchStatus || 'awaiting_dispatch');
      } else {
        throw new Error('Vehicle not found');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to load vehicle details.');
    } finally {
      setLoading(false);
    }
  };

  const updateDispatchStatus = async (newStatus) => {
    try {
      const res = await fetch(buildApiUrl(`/updateAllocation/${vehicle._id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          dispatchStatus: newStatus,
          lastUpdated: new Date().toISOString()
        }),
      });

      const data = await res.json();
      if (data.success) {
        setVehicle({ ...vehicle, dispatchStatus: newStatus });
        setSelectedStatus(newStatus);
        Alert.alert('Success', `Status updated to ${DISPATCH_STATUSES.find(s => s.value === newStatus)?.label}`);
      } else {
        throw new Error(data.message || 'Failed to update status');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to update dispatch status');
    }
  };

  const toggleProcessCompletion = async (process) => {
    try {
      const currentStatus = vehicle.preparationStatus || {};
      const newStatus = { ...currentStatus, [process]: !currentStatus[process] };
      
      const res = await fetch(buildApiUrl(`/updateAllocation/${vehicle._id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          preparationStatus: newStatus,
          lastUpdated: new Date().toISOString()
        }),
      });

      const data = await res.json();
      if (data.success) {
        setVehicle({ ...vehicle, preparationStatus: newStatus });
        
        // Auto-update dispatch status based on preparation progress
        const allCompleted = (vehicle.requestedProcesses || []).every(p => newStatus[p]);
        if (allCompleted && vehicle.dispatchStatus !== 'ready_for_release') {
          await updateDispatchStatus('ready_for_release');
        }
      } else {
        throw new Error(data.message || 'Failed to update process');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to update process completion');
    }
  };

  const getStatusInfo = (status) => {
    return DISPATCH_STATUSES.find(s => s.value === status) || 
           { value: status, label: status, color: '#9E9E9E' };
  };

  const getProcessProgress = () => {
    const requested = vehicle?.requestedProcesses || [];
    const completed = Object.keys(vehicle?.preparationStatus || {}).filter(
      key => vehicle.preparationStatus[key] === true
    );
    return { completed: completed.length, total: requested.length };
  };

  if (loading || !vehicle) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e50914" />
        <Text style={styles.loadingText}>Loading vehicle details...</Text>
      </View>
    );
  }

  const statusInfo = getStatusInfo(vehicle.dispatchStatus || 'awaiting_dispatch');
  const progress = getProcessProgress();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← BACK</Text>
        </TouchableOpacity>
      </View>

      {/* Vehicle Info Card */}
      <View style={styles.vehicleCard}>
        <View style={styles.vehicleHeader}>
          <View style={styles.vehicleInfo}>
            <Text style={styles.vinText}>{vehicle.unitId} – {vehicle.model}</Text>
            <Text style={styles.customerText}>Driver: {vehicle.assignedDriver || 'Unassigned'}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
            <Text style={styles.statusText}>{statusInfo.label}</Text>
          </View>
        </View>
        
        <View style={styles.customerInfo}>
          <Text style={styles.customerName}>Customer: {vehicle.customerName}</Text>
          <Text style={styles.contactInfo}>Contact: {vehicle.contactNumber}</Text>
        </View>
      </View>

      {/* Dispatch Status Update */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dispatch Status</Text>
        <View style={styles.statusSelector}>
          <Picker
            selectedValue={selectedStatus}
            onValueChange={(value) => {
              setSelectedStatus(value);
              updateDispatchStatus(value);
            }}
            style={styles.picker}
          >
            {DISPATCH_STATUSES.map(status => (
              <Picker.Item 
                key={status.value} 
                label={status.label} 
                value={status.value}
                color={status.color}
              />
            ))}
          </Picker>
        </View>
      </View>

      {/* Preparation Progress */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Preparation Progress ({progress.completed}/{progress.total})
        </Text>
        
        {vehicle.requestedProcesses && vehicle.requestedProcesses.length > 0 ? (
          <View style={styles.processContainer}>
            {vehicle.requestedProcesses.map(processKey => {
              const process = ALL_PROCESSES.find(p => p.key === processKey);
              const isCompleted = vehicle.preparationStatus?.[processKey];
              
              return (
                <TouchableOpacity
                  key={processKey}
                  style={[
                    styles.processItem,
                    isCompleted ? styles.processCompleted : styles.processPending
                  ]}
                  onPress={() => toggleProcessCompletion(processKey)}
                  activeOpacity={0.7}
                >
                  <View style={styles.processContent}>
                    <Text style={[
                      styles.processLabel,
                      isCompleted ? styles.processLabelCompleted : styles.processLabelPending
                    ]}>
                      {process?.label || processKey}
                    </Text>
                    <View style={[
                      styles.checkbox,
                      isCompleted ? styles.checkboxCompleted : styles.checkboxPending
                    ]}>
                      {isCompleted && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <Text style={styles.noProcesses}>No preparation processes required</Text>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.markCompleteBtn]}
            onPress={() => updateDispatchStatus('ready_for_release')}
          >
            <Text style={styles.actionBtnText}>Mark as Ready for Release</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionBtn, styles.releaseBtn]}
            onPress={() => updateDispatchStatus('released_to_customer')}
          >
            <Text style={styles.actionBtnText}>Release to Customer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  
  contentContainer: {
    paddingBottom: 20,
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },

  header: {
    backgroundColor: '#1976D2',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 40,
  },
  
  backBtn: {
    alignSelf: 'flex-start',
  },
  
  backText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },

  vehicleCard: {
    backgroundColor: '#fff',
    margin: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#e50914',
  },

  vehicleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },

  vehicleInfo: {
    flex: 1,
  },

  vinText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e50914',
    marginBottom: 4,
  },

  customerText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },

  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 12,
  },

  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  customerInfo: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },

  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },

  contactInfo: {
    fontSize: 14,
    color: '#666',
  },

  section: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },

  statusSelector: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },

  picker: {
    height: 50,
  },

  processContainer: {
    gap: 12,
  },

  processItem: {
    borderRadius: 10,
    padding: 16,
    borderWidth: 2,
  },

  processCompleted: {
    backgroundColor: '#e8f5e8',
    borderColor: '#e50914',
  },

  processPending: {
    backgroundColor: '#fff',
    borderColor: '#e0e0e0',
  },

  processContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  processLabel: {
    fontSize: 16,
    fontWeight: '500',
  },

  processLabelCompleted: {
    color: '#e50914',
  },

  processLabelPending: {
    color: '#333',
  },

  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },

  checkboxCompleted: {
    backgroundColor: '#e50914',
    borderColor: '#e50914',
  },

  checkboxPending: {
    backgroundColor: '#fff',
    borderColor: '#d0d0d0',
  },

  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },

  noProcesses: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 20,
  },

  actionButtons: {
    gap: 12,
  },

  actionBtn: {
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },

  markCompleteBtn: {
    backgroundColor: '#e50914',
  },

  releaseBtn: {
    backgroundColor: '#4CAF50',
  },

  actionBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
