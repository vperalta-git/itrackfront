import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { MaterialIcons } from '@expo/vector-icons';
import { 
  VEHICLE_STATUS_OPTIONS,
  BODY_COLOR_OPTIONS,
  getAddVehicleStatusOptions,
  getAllowedStatusTransitions,
  isValidStatusTransition
} from '../constants/VehicleModels';
import { useVehicleModels } from '../hooks/useVehicleModels';

const { width } = Dimensions.get('window');

export default function EnhancedVehicleForm({ 
  visible, 
  onClose, 
  onSubmit, 
  initialData = null,
  mode = "add" // "add" or "edit"
}) {
  const {
    unitNames,
    loading: modelsLoading,
    error: modelsError,
    isOnline,
    getVariationsForUnit,
    getVariationsForUnitAsync,
    validateUnitVariationPair
  } = useVehicleModels();

  const [formData, setFormData] = useState({
    unitName: '',
    variation: '',
    conductionNumber: '',
    engineNumber: '',
    chassisNumber: '',
    keyNumber: '',
    plateNumber: '',
    bodyColor: '',
    status: 'Available',
    assignedAgent: '',
    notes: ''
  });

  const [availableVariations, setAvailableVariations] = useState([]);
  const [errors, setErrors] = useState({});
  const [variationsLoading, setVariationsLoading] = useState(false);
  const [agents, setAgents] = useState([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  
  const title = mode === "edit" ? "Edit Vehicle" : "Add Vehicle";

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      if (initialData.unitName) {
        loadVariationsForUnit(initialData.unitName);
      }
    } else {
      resetForm();
    }
    
    // Fetch agents only in edit mode
    if (mode === 'edit' && visible) {
      fetchAgents();
    }
  }, [initialData, visible, mode]);
  
  // Fetch agents from API
  const fetchAgents = async () => {
    setAgentsLoading(true);
    try {
      const { buildApiUrl } = await import('../constants/api');
      const response = await fetch(buildApiUrl('/getUsers'));
      const result = await response.json();
      
      if (result.success && Array.isArray(result.data)) {
        const agentList = result.data.filter(user => user.role === 'Sales Agent');
        setAgents(agentList);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
    } finally {
      setAgentsLoading(false);
    }
  };

  // Load variations for selected unit
  const loadVariationsForUnit = async (unitName) => {
    if (!unitName) {
      setAvailableVariations([]);
      return;
    }

    setVariationsLoading(true);
    try {
      const variations = await getVariationsForUnitAsync(unitName);
      setAvailableVariations(variations);
    } catch (error) {
      console.warn('Failed to load variations:', error);
      // Fallback to local data
      setAvailableVariations(getVariationsForUnit(unitName));
    } finally {
      setVariationsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      unitName: '',
      variation: '',
      conductionNumber: '',
      engineNumber: '',
      chassisNumber: '',
      keyNumber: '',
      plateNumber: '',
      bodyColor: '',
      status: 'In Stockyard', // Default status for new vehicles
      notes: ''
    });
    setAvailableVariations([]);
    setErrors({});
  };

  const handleUnitNameChange = async (unitName) => {
    setFormData(prev => ({
      ...prev,
      unitName,
      variation: '' // Reset variation when unit changes
    }));
    
    // Load variations for the selected unit
    await loadVariationsForUnit(unitName);
    
    // Clear variation error if exists
    if (errors.variation) {
      setErrors(prev => ({ ...prev, variation: null }));
    }
  };

  const handleVariationChange = async (variation) => {
    // Validate that variation belongs to selected unit
    if (formData.unitName && variation) {
      const validation = await validateUnitVariationPair(formData.unitName, variation);
      
      if (!validation.isValid) {
        setErrors(prev => ({ 
          ...prev, 
          variation: validation.error || 'Selected variation does not belong to the chosen unit' 
        }));
        return;
      }
    }
    
    setFormData(prev => ({ ...prev, variation }));
    setErrors(prev => ({ ...prev, variation: null }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.unitName.trim()) {
      newErrors.unitName = 'Unit Name is required';
    }

    if (!formData.variation.trim()) {
      newErrors.variation = 'Variation is required';
    } else if (!availableVariations.includes(formData.variation)) {
      newErrors.variation = 'Invalid variation for selected unit';
    }
    
    // Validate status for new vehicles
    if (!initialData) {
      const allowedStatuses = getAddVehicleStatusOptions();
      if (!allowedStatuses.includes(formData.status)) {
        newErrors.status = 'Invalid status for new vehicle. Must be "In Stockyard" or "Available"';
      }
    }

    if (!formData.conductionNumber.trim()) {
      newErrors.conductionNumber = 'Conduction Number is required';
    }

    if (!formData.bodyColor.trim()) {
      newErrors.bodyColor = 'Body Color is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit(formData);
      onClose();
      if (!initialData) {
        resetForm();
      }
    }
  };

  const renderInput = (label, key, placeholder, multiline = false) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          multiline && styles.textArea,
          errors[key] && styles.inputError
        ]}
        placeholder={placeholder}
        value={formData[key]}
        onChangeText={(value) => {
          setFormData(prev => ({ ...prev, [key]: value }));
          if (errors[key]) {
            setErrors(prev => ({ ...prev, [key]: null }));
          }
        }}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
      />
      {errors[key] && <Text style={styles.errorText}>{errors[key]}</Text>}
    </View>
  );

  const renderPicker = (label, key, options, placeholder = "Select an option") => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.pickerContainer, errors[key] && styles.inputError]}>
        <Picker
          selectedValue={formData[key]}
          onValueChange={(value) => {
            if (key === 'unitName') {
              handleUnitNameChange(value);
            } else if (key === 'variation') {
              handleVariationChange(value);
            } else {
              setFormData(prev => ({ ...prev, [key]: value }));
              if (errors[key]) {
                setErrors(prev => ({ ...prev, [key]: null }));
              }
            }
          }}
          style={styles.picker}
        >
          <Picker.Item label={placeholder} value="" />
          {options.map((option) => (
            <Picker.Item key={option} label={option} value={option} />
          ))}
        </Picker>
      </View>
      {errors[key] && <Text style={styles.errorText}>{errors[key]}</Text>}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color='#1F2937' />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Vehicle Model Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vehicle Model Information</Text>
            
            {renderPicker(
              'Unit Name *', 
              'unitName', 
              unitNames, 
              modelsLoading ? "Loading units..." : "Select Vehicle Unit"
            )}
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Variation *</Text>
              <View style={[styles.pickerContainer, errors.variation && styles.inputError]}>
                {variationsLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color='#DC2626' />
                    <Text style={styles.loadingText}>Loading variations...</Text>
                  </View>
                ) : (
                  <Picker
                    selectedValue={formData.variation}
                    onValueChange={handleVariationChange}
                    style={styles.picker}
                    enabled={!!formData.unitName && availableVariations.length > 0}
                  >
                    <Picker.Item 
                      label={
                        !formData.unitName 
                          ? "Select Unit Name first"
                          : availableVariations.length === 0 
                          ? "No variations available"
                          : "Select Variation"
                      } 
                      value="" 
                    />
                    {availableVariations.map((variation) => (
                      <Picker.Item key={variation} label={variation} value={variation} />
                    ))}
                  </Picker>
                )}
              </View>
              {errors.variation && <Text style={styles.errorText}>{errors.variation}</Text>}
            </View>
          </View>

          {/* Vehicle Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vehicle Details</Text>
            
            {renderInput(
              'Conduction Number *', 
              'conductionNumber', 
              'Enter Conduction Number'
            )}
          </View>

          {/* Appearance & Status */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Appearance & Status</Text>
            
            {renderPicker(
              'Body Color *', 
              'bodyColor', 
              BODY_COLOR_OPTIONS, 
              "Select Body Color"
            )}
            
            {renderPicker(
              'Status *', 
              'status', 
              initialData ? VEHICLE_STATUS_OPTIONS : getAddVehicleStatusOptions(), 
              "Select Status"
            )}
            {!initialData && (
              <Text style={styles.hintText}>
                Default: In Stockyard. Select "Available" only if vehicle is already at Isuzu Pasig.
              </Text>
            )}
          </View>

          {/* Assign to Agent - Only show in Edit mode */}
          {mode === 'edit' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Assign to Agent</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Sales Agent</Text>
                <View style={[styles.pickerContainer, errors.assignedAgent && styles.inputError]}>
                  {agentsLoading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color='#DC2626' />
                      <Text style={styles.loadingText}>Loading agents...</Text>
                    </View>
                  ) : (
                    <Picker
                      selectedValue={formData.assignedAgent || ''}
                      onValueChange={(value) => {
                        setFormData(prev => ({ ...prev, assignedAgent: value }));
                        if (errors.assignedAgent) {
                          setErrors(prev => ({ ...prev, assignedAgent: null }));
                        }
                      }}
                      style={styles.picker}
                    >
                      <Picker.Item label="No Agent Assigned" value="" />
                      {agents.map((agent) => (
                        <Picker.Item 
                          key={agent._id} 
                          label={agent.accountName || agent.username} 
                          value={agent.username} 
                        />
                      ))}
                    </Picker>
                  )}
                </View>
                {formData.assignedAgent && (
                  <Text style={styles.hintText}>
                    Vehicle can be assigned to both an agent and a driver simultaneously
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Additional Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Information</Text>
            
            {renderInput(
              'Notes', 
              'notes', 
              'Enter any additional notes or comments',
              true
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
              <Text style={styles.submitButtonText}>
                {initialData ? 'Update Vehicle' : 'Add Vehicle'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Bottom spacing */}
          <View style={{ height: 50 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  closeButton: {
    padding: 8,
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
    color: '#1F2937',
    marginBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#DC2626',
    paddingBottom: 5,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#DC2626',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    marginTop: 5,
    marginLeft: 5,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  picker: {
    height: 50,
    color: '#1F2937',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 15,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#DC2626',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    paddingHorizontal: 12,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#6B7280',
  },
  hintText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 5,
    paddingHorizontal: 5,
  },
});