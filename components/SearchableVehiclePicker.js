import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Dimensions
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function SearchableVehiclePicker({ 
  visible, 
  vehicles, 
  selectedValue, 
  onSelect, 
  onClose,
  placeholder = "Select Vehicle" 
}) {
  const [searchText, setSearchText] = useState('');

  const filteredVehicles = vehicles.filter(vehicle => {
    const searchLower = searchText.toLowerCase();
    const unitName = (vehicle.unitName || '').toLowerCase();
    const variation = (vehicle.variation || '').toLowerCase();
    const bodyColor = (vehicle.bodyColor || '').toLowerCase();
    const unitId = (vehicle.unitId || '').toLowerCase();
    const status = (vehicle.status || '').toLowerCase();
    
    return unitName.includes(searchLower) ||
           variation.includes(searchLower) ||
           bodyColor.includes(searchLower) ||
           unitId.includes(searchLower) ||
           status.includes(searchLower);
  });

  const getStatusColor = (status) => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower === 'in stockyard' || statusLower === 'available') {
      return '#10b981'; // green
    } else if (statusLower === 'assigned' || statusLower === 'in progress') {
      return '#f59e0b'; // orange
    } else if (statusLower === 'delivered' || statusLower === 'completed') {
      return '#6b7280'; // gray
    }
    return '#3b82f6'; // blue default
  };

  const renderVehicleItem = ({ item }) => {
    const isSelected = selectedValue === item.unitId;
    const statusColor = getStatusColor(item.status);

    return (
      <TouchableOpacity
        style={[styles.vehicleCard, isSelected && styles.selectedCard]}
        onPress={() => {
          onSelect(item);
          setSearchText('');
          onClose();
        }}
        activeOpacity={0.7}
      >
        <View style={styles.vehicleHeader}>
          <View style={styles.vehicleMainInfo}>
            <Text style={styles.vehicleName} numberOfLines={1}>
              {item.unitName || 'Unknown Model'}
            </Text>
            <Text style={styles.vehicleVariation} numberOfLines={1}>
              {item.variation || 'Standard'}
            </Text>
          </View>
          {isSelected && (
            <MaterialIcons name="check-circle" size={24} color="#e50914" />
          )}
        </View>

        <View style={styles.vehicleDetails}>
          <View style={styles.detailRow}>
            <MaterialIcons name="confirmation-number" size={14} color="#6b7280" />
            <Text style={styles.detailText}>{item.unitId || 'N/A'}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <MaterialIcons name="palette" size={14} color="#6b7280" />
            <Text style={styles.detailText}>{item.bodyColor || 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.vehicleFooter}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{item.status || 'Available'}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Vehicle</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <MaterialIcons name="search" size={20} color="#6b7280" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by model, color, ID, or status..."
              value={searchText}
              onChangeText={setSearchText}
              placeholderTextColor="#9ca3af"
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <MaterialIcons name="clear" size={20} color="#6b7280" />
              </TouchableOpacity>
            )}
          </View>

          {/* Results Count */}
          <Text style={styles.resultsCount}>
            {filteredVehicles.length} vehicle{filteredVehicles.length !== 1 ? 's' : ''} found
          </Text>

          {/* Vehicle List */}
          <FlatList
            data={filteredVehicles}
            renderItem={renderVehicleItem}
            keyExtractor={(item) => item.unitId || item._id || Math.random().toString()}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialIcons name="search-off" size={48} color="#d1d5db" />
                <Text style={styles.emptyText}>No vehicles found</Text>
                <Text style={styles.emptySubtext}>Try adjusting your search</Text>
              </View>
            }
          />

          {/* Cancel Button */}
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 32,
    maxHeight: '90%',
    minHeight: '60%'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827'
  },
  closeButton: {
    padding: 4
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#111827'
  },
  resultsCount: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500'
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16
  },
  vehicleCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  selectedCard: {
    borderColor: '#e50914',
    borderWidth: 2,
    backgroundColor: '#fef2f2'
  },
  vehicleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  vehicleMainInfo: {
    flex: 1,
    marginRight: 8
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4
  },
  vehicleVariation: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500'
  },
  vehicleDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  detailText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500'
  },
  vehicleFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-start'
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase'
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4
  },
  cancelButton: {
    marginHorizontal: 20,
    marginTop: 8,
    paddingVertical: 14,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    alignItems: 'center'
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151'
  }
});
