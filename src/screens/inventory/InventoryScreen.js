import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Image,
  RefreshControl,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../../context/AuthContext';
import { apiGet, apiPost, apiPut, apiDelete } from '../../utils/api';
import { API_ENDPOINTS } from '../../config/api';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../constants/theme';
import { ROLES, hasPermission } from '../../constants/roles';

const InventoryScreen = () => {
  const { user } = useAuth();
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    unitName: '',
    unitId: '',
    bodyColor: '',
    variation: '',
    status: 'In Stockyard',
  });

  // Unit options - matching web version
  const unitOptions = {
    "Isuzu D-Max": [
      "Cab and Chassis",
      "CC Utility Van Dual AC",
      "4x2 LT MT",
      "4x4 LT MT",
      "4x2 LS-A MT",
      "4x2 LS-A MT Plus",
      "4x2 LS-A AT",
      "4x2 LS-A AT Plus",
      "4x4 LS-A MT",
      "4x4 LS-A MT Plus",
      "4x2 LS-E AT",
      "4x4 LS-E AT",
      "4x4 Single Cab MT"
    ],
    "Isuzu MU-X": [
      "1.9L MU-X 4x2 LS AT",
      "3.0L MU-X 4x2 LS-A AT",
      "3.0L MU-X 4x2 LS-E AT",
      "3.0L MU-X 4x4 LS-E AT"
    ],
    "Isuzu Traviz": [
      "SWB 2.5L 4W 9FT Cab & Chassis",
      "SWB 2.5L 4W 9FT Utility Van Dual AC",
      "LWB 2.5L 4W 10FT Cab & Chassis",
      "LWB 2.5L 4W 10FT Utility Van Dual AC",
      "LWB 2.5L 4W 10FT Aluminum Van",
      "LWB 2.5L 4W 10FT Aluminum Van w/ Single AC",
      "LWB 2.5L 4W 10FT Dropside Body",
      "LWB 2.5L 4W 10FT Dropside Body w/ Single AC"
    ],
    "Isuzu QLR Series": [
      "QLR77 E Tilt 3.0L 4W 10ft 60A Cab & Chassis",
      "QLR77 E Tilt Utility Van w/o AC",
      "QLR77 E Non-Tilt 3.0L 4W 10ft 60A Cab & Chassis",
      "QLR77 E Non-Tilt Utility Van w/o AC",
      "QLR77 E Non-Tilt Utility Van Dual AC"
    ],
    "Isuzu NLR Series": [
      "NLR77 H Tilt 3.0L 4W 14ft 60A",
      "NLR77 H Jeepney Chassis (135A)",
      "NLR85 Tilt 3.0L 4W 10ft 90A",
      "NLR85E Smoother"
    ],
    "Isuzu NMR Series": [
      "NMR85H Smoother",
      "NMR85 H Tilt 3.0L 6W 14ft 80A Non-AC"
    ],
    "Isuzu NPR Series": [
      "NPR85 Tilt 3.0L 6W 16ft 90A",
      "NPR85 Cabless for Armored"
    ],
    "Isuzu NPS Series": [
      "NPS75 H 3.0L 6W 16ft 90A"
    ],
    "Isuzu NQR Series": [
      "NQR75L Smoother",
      "NQR75 Tilt 5.2L 6W 18ft 90A"
    ],
    "Isuzu FRR Series": [
      "FRR90M 6W 20ft 5.2L",
      "FRR90M Smoother"
    ],
    "Isuzu FTR Series": [
      "FTR90M 6W 19ft 5.2L"
    ],
    "Isuzu FVR Series": [
      "FVR34Q Smoother",
      "FVR 34Q 6W 24ft 7.8L w/ ABS"
    ],
    "Isuzu FTS Series": [
      "FTS34 J",
      "FTS34L"
    ],
    "Isuzu FVM Series": [
      "FVM34T 10W 26ft 7.8L w/ ABS",
      "FVM34W 10W 32ft 7.8L w/ ABS"
    ],
    "Isuzu FXM Series": [
      "FXM60W"
    ],
    "Isuzu GXZ Series": [
      "GXZ60N"
    ],
    "Isuzu EXR Series": [
      "EXR77H 380PS 6W Tractor Head"
    ]
  };

  const bodyColors = ['Black', 'White', 'Gray', 'Blue', 'Orange'];
  const statusOptions = ['In Stockyard', 'Available', 'Pending', 'Allocated'];

  useEffect(() => {
    fetchStock();
  }, []);

  const fetchStock = async () => {
    try {
      setLoading(true);
      const response = await apiGet(API_ENDPOINTS.GET_STOCK);
      setStock(response.data || []);
    } catch (error) {
      console.error('Error fetching stock:', error);
      Alert.alert('Error', 'Failed to load inventory');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchStock();
  };

  const handleAddStock = async () => {
    if (!formData.unitName || !formData.unitId || !formData.bodyColor || !formData.variation) {
      Alert.alert('Missing Fields', 'Please fill in all required fields');
      return;
    }

    try {
      await apiPost(API_ENDPOINTS.CREATE_STOCK, formData);
      Alert.alert('Success', 'Stock item added successfully');
      setShowAddModal(false);
      resetForm();
      fetchStock();
    } catch (error) {
      console.error('Error adding stock:', error);
      Alert.alert('Error', 'Failed to add stock item');
    }
  };

  const handleUpdateStock = async () => {
    if (!selectedItem) return;

    try {
      await apiPut(`${API_ENDPOINTS.UPDATE_STOCK}/${selectedItem._id}`, formData);
      Alert.alert('Success', 'Stock item updated successfully');
      setShowEditModal(false);
      resetForm();
      fetchStock();
    } catch (error) {
      console.error('Error updating stock:', error);
      Alert.alert('Error', 'Failed to update stock item');
    }
  };

  const handleDeleteStock = (item) => {
    Alert.alert(
      'Delete Stock',
      `Are you sure you want to delete "${item.unitName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiDelete(`${API_ENDPOINTS.DELETE_STOCK}/${item._id}`);
              Alert.alert('Success', 'Stock item deleted successfully');
              fetchStock();
            } catch (error) {
              console.error('Error deleting stock:', error);
              Alert.alert('Error', 'Failed to delete stock item');
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setFormData({
      unitName: '',
      unitId: '',
      bodyColor: '',
      variation: '',
      status: 'In Stockyard',
    });
    setSelectedItem(null);
  };

  const openEditModal = (item) => {
    setSelectedItem(item);
    setFormData({
      unitName: item.unitName,
      unitId: item.unitId,
      bodyColor: item.bodyColor,
      variation: item.variation,
      status: item.status || 'In Stockyard',
    });
    setShowEditModal(true);
  };

  const getAgeString = (createdAt) => {
    if (!createdAt) return 'N/A';
    const created = new Date(createdAt);
    const now = new Date();
    const diffMs = now - created;
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
  };

  // Filter stock
  const filteredStock = stock.filter((item) => {
    const matchesSearch =
      item.unitName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.unitId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.bodyColor?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.variation?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = !filterStatus || item.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const canEdit = hasPermission(user?.role, 'canManageInventory');

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Image
          source={require('../../../assets/loading.gif')}
          style={styles.loadingGif}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search inventory..."
          placeholderTextColor={COLORS.gray400}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {canEdit && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
          >
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Status:</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={filterStatus}
            onValueChange={setFilterStatus}
            style={styles.picker}
          >
            <Picker.Item label="All" value="" />
            {statusOptions.map((status) => (
              <Picker.Item key={status} label={status} value={status} />
            ))}
          </Picker>
        </View>
      </View>

      {/* Stock List */}
      <ScrollView
        style={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredStock.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No inventory items found</Text>
          </View>
        ) : (
          filteredStock.map((item) => (
            <View key={item._id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.unitName}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                  <Text style={styles.statusText}>{item.status || 'N/A'}</Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <View style={styles.row}>
                  <Text style={styles.label}>Conduction #:</Text>
                  <Text style={styles.value}>{item.unitId}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Color:</Text>
                  <Text style={styles.value}>{item.bodyColor}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Variation:</Text>
                  <Text style={styles.value}>{item.variation}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Age:</Text>
                  <Text style={styles.value}>{getAgeString(item.createdAt)}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Added:</Text>
                  <Text style={styles.value}>
                    {item.createdAt
                      ? new Date(item.createdAt).toLocaleDateString()
                      : 'N/A'}
                  </Text>
                </View>
              </View>

              {canEdit && (
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => openEditModal(item)}
                  >
                    <Text style={styles.editButtonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteStock(item)}
                  >
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={showAddModal || showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowAddModal(false);
          setShowEditModal(false);
          resetForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>
              {showAddModal ? 'Add Stock' : 'Edit Stock'}
            </Text>

            <ScrollView style={styles.modalContent}>
              {/* Unit Name */}
              <Text style={styles.inputLabel}>Unit Name *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.unitName}
                  onValueChange={(value) => {
                    setFormData({ ...formData, unitName: value, variation: '' });
                  }}
                  style={styles.picker}
                >
                  <Picker.Item label="Select Unit" value="" />
                  {Object.keys(unitOptions).map((unit) => (
                    <Picker.Item key={unit} label={unit} value={unit} />
                  ))}
                </Picker>
              </View>

              {/* Conduction Number */}
              <Text style={styles.inputLabel}>Conduction Number *</Text>
              <TextInput
                style={styles.input}
                value={formData.unitId}
                onChangeText={(text) =>
                  setFormData({ ...formData, unitId: text.toUpperCase() })
                }
                placeholder="Enter conduction number"
                placeholderTextColor={COLORS.gray400}
                autoCapitalize="characters"
              />

              {/* Body Color */}
              <Text style={styles.inputLabel}>Body Color *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.bodyColor}
                  onValueChange={(value) =>
                    setFormData({ ...formData, bodyColor: value })
                  }
                  style={styles.picker}
                >
                  <Picker.Item label="Select Color" value="" />
                  {bodyColors.map((color) => (
                    <Picker.Item key={color} label={color} value={color} />
                  ))}
                </Picker>
              </View>

              {/* Variation */}
              <Text style={styles.inputLabel}>Variation *</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.variation}
                  onValueChange={(value) =>
                    setFormData({ ...formData, variation: value })
                  }
                  style={styles.picker}
                  enabled={!!formData.unitName}
                >
                  <Picker.Item label="Select Variation" value="" />
                  {formData.unitName &&
                    unitOptions[formData.unitName]?.map((variation) => (
                      <Picker.Item
                        key={variation}
                        label={variation}
                        value={variation}
                      />
                    ))}
                </Picker>
              </View>

              {/* Status */}
              <Text style={styles.inputLabel}>Status</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.status}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status: value })
                  }
                  style={styles.picker}
                >
                  {statusOptions.map((status) => (
                    <Picker.Item key={status} label={status} value={status} />
                  ))}
                </Picker>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  resetForm();
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={showAddModal ? handleAddStock : handleUpdateStock}
              >
                <Text style={styles.saveButtonText}>
                  {showAddModal ? 'Add' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const getStatusColor = (status) => {
  switch (status) {
    case 'Available':
      return COLORS.success + '20';
    case 'Pending':
      return COLORS.warning + '20';
    case 'Allocated':
      return COLORS.info + '20';
    default:
      return COLORS.gray200;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingGif: {
    width: 60,
    height: 60,
  },
  header: {
    flexDirection: 'row',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    backgroundColor: COLORS.white,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
  },
  addButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  filterLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.gray700,
    marginRight: SPACING.sm,
  },
  pickerContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.white,
  },
  picker: {
    height: 50,
  },
  list: {
    flex: 1,
    padding: SPACING.md,
  },
  emptyContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray500,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  cardTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.gray900,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  statusText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.gray700,
  },
  cardBody: {
    marginBottom: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray600,
  },
  value: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.gray900,
  },
  cardActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  editButton: {
    flex: 1,
    backgroundColor: COLORS.info,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  editButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: COLORS.error,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    paddingTop: SPACING.lg,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.gray900,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  modalContent: {
    paddingHorizontal: SPACING.lg,
    maxHeight: 400,
  },
  inputLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.gray700,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    backgroundColor: COLORS.white,
  },
  modalActions: {
    flexDirection: 'row',
    padding: SPACING.lg,
    gap: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: COLORS.gray300,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: COLORS.gray700,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
});

export default InventoryScreen;
