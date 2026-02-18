import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { 
  Edit, Trash2, ArrowLeft, Plus, RefreshCw, Search, 
  Car, ChevronDown 
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { buildApiUrl } from '../constants/api';
import UniformLoading from '../components/UniformLoading';

const VehicleModelsScreen = () => {
  const navigation = useNavigation();
  const { isDarkMode, theme } = useTheme();
  
  // State Management
  const [vehicleModels, setVehicleModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedModel, setSelectedModel] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    unitName: '',
    variations: '',
    category: 'Commercial'
  });

  const categories = ['Pickup', 'SUV', 'Commercial', 'Truck', 'Heavy Duty'];

  useEffect(() => {
    fetchVehicleModels();
  }, []);

  const fetchVehicleModels = async () => {
    try {
      setLoading(true);
      const response = await fetch(buildApiUrl('/api/vehicle-models'));
      const result = await response.json();
      
      if (result.success) {
        setVehicleModels(result.data || []);
      } else {
        Alert.alert('Error', 'Failed to fetch vehicle models');
      }
    } catch (error) {
      console.error('Fetch vehicle models error:', error);
      Alert.alert('Error', 'Failed to fetch vehicle models');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchVehicleModels();
    setRefreshing(false);
  };

  const initializeVehicleModels = () => {
    Alert.alert(
      'Initialize Vehicle Models',
      'This will initialize the database with default Isuzu vehicle models. This is safe to run multiple times.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Initialize', 
          onPress: async () => {
            setLoading(true);
            try {
              const response = await fetch(buildApiUrl('/api/vehicle-models/initialize'), {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
              });

              const result = await response.json();
              
              if (result.success) {
                Alert.alert('Success', result.message);
                fetchVehicleModels();
              } else {
                Alert.alert('Error', result.message || 'Failed to initialize vehicle models');
              }
            } catch (error) {
              console.error('Initialize error:', error);
              Alert.alert('Error', 'Failed to initialize vehicle models');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const validateForm = () => {
    const { unitName, variations } = formData;
    
    if (!unitName.trim()) {
      Alert.alert('Validation Error', 'Please enter a unit name');
      return false;
    }
    
    if (!variations.trim()) {
      Alert.alert('Validation Error', 'Please enter at least one variation');
      return false;
    }

    const variationsArray = variations.split('\n').map(v => v.trim()).filter(v => v);
    
    if (variationsArray.length === 0) {
      Alert.alert('Validation Error', 'Please enter at least one valid variation');
      return false;
    }

    return true;
  };

  const handleAddModel = async () => {
    if (!validateForm()) return;

    const { unitName, variations, category } = formData;
    const variationsArray = variations.split('\n').map(v => v.trim()).filter(v => v);
    
    const payload = {
      unitName: unitName.trim(),
      variations: variationsArray,
      category
    };

    try {
      const response = await fetch(buildApiUrl('/api/vehicle-models/create'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      
      if (result.success) {
        Alert.alert('Success', 'Vehicle model added successfully');
        resetForm();
        setShowAddModal(false);
        fetchVehicleModels();
      } else {
        Alert.alert('Error', result.message || 'Failed to add vehicle model');
      }
    } catch (error) {
      console.error('Add model error:', error);
      Alert.alert('Error', 'Failed to add vehicle model');
    }
  };

  const handleEditModel = async () => {
    if (!selectedModel || !validateForm()) return;

    const { unitName, variations, category } = formData;
    const variationsArray = variations.split('\n').map(v => v.trim()).filter(v => v);
    
    const payload = {
      unitName: unitName.trim(),
      variations: variationsArray,
      category
    };

    try {
      const response = await fetch(buildApiUrl(`/api/vehicle-models/${selectedModel._id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      
      if (result.success) {
        Alert.alert('Success', 'Vehicle model updated successfully');
        resetForm();
        setShowEditModal(false);
        setSelectedModel(null);
        fetchVehicleModels();
      } else {
        Alert.alert('Error', result.message || 'Failed to update vehicle model');
      }
    } catch (error) {
      console.error('Edit model error:', error);
      Alert.alert('Error', 'Failed to update vehicle model');
    }
  };

  const handleDeleteModel = (model) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete "${model.unitName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(buildApiUrl(`/api/vehicle-models/${model._id}`), {
                method: 'DELETE',
              });

              const result = await response.json();
              
              if (result.success) {
                Alert.alert('Success', 'Vehicle model deleted successfully');
                fetchVehicleModels();
              } else {
                Alert.alert('Error', result.message || 'Failed to delete vehicle model');
              }
            } catch (error) {
              console.error('Delete model error:', error);
              Alert.alert('Error', 'Failed to delete vehicle model');
            }
          }
        }
      ]
    );
  };

  const openEditModal = (model) => {
    setSelectedModel(model);
    setFormData({
      unitName: model.unitName,
      variations: model.variations.join('\n'),
      category: model.category || 'Commercial'
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      unitName: '',
      variations: '',
      category: 'Commercial'
    });
  };

  const closeModals = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setSelectedModel(null);
    resetForm();
  };

  const filteredModels = vehicleModels.filter(model =>
    (model.unitName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (model.category || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderModelItem = ({ item }) => (
    <View style={[styles.modelCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.modelHeader}>
        <Text style={[styles.modelName, { color: theme.text }]}>
          {item.unitName}
        </Text>
        <View style={[
          styles.categoryBadge,
          { backgroundColor: getCategoryColor(item.category) }
        ]}>
          <Text style={styles.categoryText}>{item.category || 'Commercial'}</Text>
        </View>
      </View>
      
      <View style={styles.variationsContainer}>
        <Text style={[styles.variationsLabel, { color: theme.textSecondary }]}>
          Variations ({item.variations?.length || 0}):
        </Text>
        {item.variations?.slice(0, 3).map((variation, index) => (
          <View key={index} style={styles.variationItem}>
            <Text style={[styles.variationText, { color: theme.text }]}>• {variation}</Text>
          </View>
        ))}
        {item.variations?.length > 3 && (
          <Text style={[styles.moreVariationsText, { color: theme.textSecondary }]}>
            +{item.variations.length - 3} more variations
          </Text>
        )}
      </View>

      <View style={styles.modelActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => openEditModal(item)}
        >
          <Edit size={16} color="white" />
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteModel(item)}
        >
          <Trash2 size={16} color="white" />
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const getCategoryColor = (category) => {
    const colors = {
      'Pickup': '#e50914',
      'SUV': '#10B981',
      'Commercial': '#F59E0B',
      'Truck': '#e50914',
      'Heavy Duty': '#9c27b0'
    };
    return colors[category] || '#e50914';
  };

  if (loading && !refreshing) {
    return (
      <UniformLoading 
        message="Loading Vehicle Models..."
        backgroundColor={theme.background}
        textColor={theme.text}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={24} color="white" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Vehicle Models
        </Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Plus size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.initButton, { backgroundColor: '#e50914' }]}
          onPress={initializeVehicleModels}
        >
          <RefreshCw size={20} color="white" />
          <Text style={styles.initButtonText}>Initialize Models</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Search size={20} color={theme.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search vehicle models..."
          placeholderTextColor={theme.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.statNumber, { color: '#e50914' }]}>{filteredModels.length}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Models</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.statNumber, { color: '#10B981' }]}>
            {filteredModels.reduce((total, model) => total + (model.variations?.length || 0), 0)}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Variations</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.statNumber, { color: '#F59E0B' }]}>
            {new Set(filteredModels.map(model => model.category)).size}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Categories</Text>
        </View>
      </View>

      {/* Models List */}
      <FlatList
        data={filteredModels}
        keyExtractor={(item) => item._id}
        renderItem={renderModelItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
          />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Car size={64} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              {searchQuery ? 'No models match your search' : 'No vehicle models found'}
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
              {!searchQuery && 'Initialize default models or add custom models to get started'}
            </Text>
          </View>
        )}
      />

      {/* Add Model Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={false}
        onRequestClose={closeModals}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeModals}>
              <Text style={[styles.modalCloseText, { color: theme.primary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Add Vehicle Model</Text>
            <TouchableOpacity onPress={handleAddModel}>
              <Text style={[styles.modalSaveText, { color: '#e50914' }]}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Unit Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
                value={formData.unitName}
                onChangeText={(value) => setFormData(prev => ({ ...prev, unitName: value }))}
                placeholder="e.g., Isuzu D-Max"
                placeholderTextColor={theme.textSecondary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Category</Text>
              <View style={[styles.pickerContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => {
                    Alert.alert('Select Category', '', [
                      ...categories.map(cat => ({
                        text: cat,
                        onPress: () => setFormData(prev => ({ ...prev, category: cat }))
                      })),
                      { text: 'Cancel', style: 'cancel' }
                    ]);
                  }}
                >
                  <Text style={[styles.pickerText, { color: theme.text }]}>
                    {formData.category || 'Select Category'}
                  </Text>
                  <MaterialIcons name="expand-more" size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Variations * (one per line)</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
                value={formData.variations}
                onChangeText={(value) => setFormData(prev => ({ ...prev, variations: value }))}
                placeholder="4x2 LS-A AT&#10;4x4 LS-A MT&#10;Cab and Chassis"
                placeholderTextColor={theme.textSecondary}
                multiline={true}
                numberOfLines={8}
                textAlignVertical="top"
              />
              <Text style={[styles.helpText, { color: theme.textSecondary }]}>
                Enter each variation on a new line
              </Text>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Edit Model Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={false}
        onRequestClose={closeModals}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeModals}>
              <Text style={[styles.modalCloseText, { color: theme.primary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Vehicle Model</Text>
            <TouchableOpacity onPress={handleEditModel}>
              <Text style={[styles.modalSaveText, { color: '#e50914' }]}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Unit Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
                value={formData.unitName}
                onChangeText={(value) => setFormData(prev => ({ ...prev, unitName: value }))}
                placeholder="e.g., Isuzu D-Max"
                placeholderTextColor={theme.textSecondary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Category</Text>
              <View style={[styles.pickerContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => {
                    Alert.alert('Select Category', '', [
                      ...categories.map(cat => ({
                        text: cat,
                        onPress: () => setFormData(prev => ({ ...prev, category: cat }))
                      })),
                      { text: 'Cancel', style: 'cancel' }
                    ]);
                  }}
                >
                  <Text style={[styles.pickerText, { color: theme.text }]}>
                    {formData.category || 'Select Category'}
                  </Text>
                  <MaterialIcons name="expand-more" size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Variations * (one per line)</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
                value={formData.variations}
                onChangeText={(value) => setFormData(prev => ({ ...prev, variations: value }))}
                placeholder="4x2 LS-A AT&#10;4x4 LS-A MT&#10;Cab and Chassis"
                placeholderTextColor={theme.textSecondary}
                multiline={true}
                numberOfLines={8}
                textAlignVertical="top"
              />
              <Text style={[styles.helpText, { color: theme.textSecondary }]}>
                Enter each variation on a new line
              </Text>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#e50914',
    minWidth: 40,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#10B981',
    minWidth: 40,
    alignItems: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  initButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
  },
  initButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  searchContainer: {
    marginHorizontal: 20,
    marginVertical: 15,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    marginHorizontal: 5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  modelCard: {
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modelName: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  variationsContainer: {
    marginBottom: 15,
  },
  variationsLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
  },
  variationItem: {
    marginLeft: 10,
    marginBottom: 2,
  },
  variationText: {
    fontSize: 13,
  },
  moreVariationsText: {
    fontSize: 12,
    fontStyle: 'italic',
    marginLeft: 10,
    marginTop: 5,
  },
  modelActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 10,
  },
  editButton: {
    backgroundColor: '#e50914',
  },
  deleteButton: {
    backgroundColor: '#e50914',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 15,
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    marginTop: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalCloseText: {
    fontSize: 16,
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 120,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 15,
  },
  pickerText: {
    fontSize: 16,
  },
  helpText: {
    fontSize: 12,
    marginTop: 5,
    fontStyle: 'italic',
  },
});

export default VehicleModelsScreen;
