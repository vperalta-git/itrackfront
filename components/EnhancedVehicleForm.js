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
import Colors from '../constants/Colors';
import { 
  VEHICLE_STATUS_OPTIONS,
  BODY_COLOR_OPTIONS 
} from '../constants/VehicleModels';
import { useVehicleModels } from '../hooks/useVehicleModels';

const { width } = Dimensions.get('window');

export default function EnhancedVehicleForm({ 
  visible, 
  onClose, 
  onSubmit, 
  initialData = null,
  title = "Add Vehicle"
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
    vin: '',
    bodyColor: '',
    status: 'Available',
    engineNumber: '',
    keyNumber: '',
    plateNumber: '',
    chassisNumber: '',
    notes: ''
  });

  const [availableVariations, setAvailableVariations] = useState([]);
  const [errors, setErrors] = useState({});
  const [variationsLoading, setVariationsLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      if (initialData.unitName) {
        loadVariationsForUnit(initialData.unitName);
      }
    } else {
      resetForm();
    }
  }, [initialData, visible]);

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
      vin: '',
      bodyColor: '',
      status: 'Available',
      engineNumber: '',
      keyNumber: '',
      plateNumber: '',
      chassisNumber: '',
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

    if (!formData.conductionNumber.trim()) {
      newErrors.conductionNumber = 'Conduction Number is required';
    }

    if (!formData.vin.trim()) {
      newErrors.vin = 'VIN is required';
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
            <MaterialIcons name="close" size={24} color={Colors.textPrimary} />
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
                    <ActivityIndicator size="small" color={Colors.primary} />
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
              'Enter conduction number'
            )}
            
            {renderInput(
              'VIN *', 
              'vin', 
              'Enter Vehicle Identification Number'
            )}
            
            {renderInput(
              'Engine Number', 
              'engineNumber', 
              'Enter engine number'
            )}
            
            {renderInput(
              'Chassis Number', 
              'chassisNumber', 
              'Enter chassis number'
            )}
            
            {renderInput(
              'Key Number', 
              'keyNumber', 
              'Enter key number'
            )}
            
            {renderInput(
              'Plate Number', 
              'plateNumber', 
              'Enter plate number'
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
              'Status', 
              'status', 
              VEHICLE_STATUS_OPTIONS, 
              "Select Status"
            )}
          </View>

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
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
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
    color: Colors.textPrimary,
    marginBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
    paddingBottom: 5,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: Colors.error,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    marginTop: 5,
    marginLeft: 5,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 8,
    backgroundColor: Colors.background,
  },
  picker: {
    height: 50,
    color: Colors.textPrimary,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 15,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.buttonSecondary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  cancelButtonText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: Colors.textLight,
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
    color: Colors.textSecondary,
  },
});