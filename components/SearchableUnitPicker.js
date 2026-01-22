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

export default function SearchableUnitPicker({ 
  visible, 
  units, 
  selectedValue, 
  onSelect, 
  onClose,
  placeholder = "Select Unit" 
}) {
  const [searchText, setSearchText] = useState('');

  const filteredUnits = units.filter(unit => {
    const searchLower = searchText.toLowerCase();
    const unitName = (unit.unitName || '').toLowerCase();
    const unitId = (unit.unitId || '').toLowerCase();
    const bodyColor = (unit.bodyColor || '').toLowerCase();
    const variation = (unit.variation || '').toLowerCase();
    const status = (unit.status || '').toLowerCase();
    
    return unitName.includes(searchLower) ||
           unitId.includes(searchLower) ||
           bodyColor.includes(searchLower) ||
           variation.includes(searchLower) ||
           status.includes(searchLower);
  });

  const getStatusColor = (status) => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower === 'in stockyard' || statusLower === 'available') {
      return '#10b981'; // green
    } else if (statusLower === 'assigned' || statusLower === 'allocated') {
      return '#f59e0b'; // orange
    } else if (statusLower === 'delivered' || statusLower === 'completed') {
      return '#6b7280'; // gray
    }
    return '#3b82f6'; // blue default
  };

  const renderUnitItem = ({ item }) => {
    const isSelected = selectedValue === item.unitId;
    const statusColor = getStatusColor(item.status);

    return (
      <TouchableOpacity
        style={[styles.unitCard, isSelected && styles.selectedCard]}
        onPress={() => {
          onSelect(item);
          setSearchText('');
          onClose();
        }}
        activeOpacity={0.7}
      >
        <View style={styles.unitHeader}>
          <View style={styles.unitMainInfo}>
            <Text style={styles.unitName} numberOfLines={1}>
              {item.unitName || 'Unknown Model'}
            </Text>
            <Text style={styles.unitId} numberOfLines={1}>
              {item.unitId || 'N/A'}
            </Text>
          </View>
          {isSelected && (
            <MaterialIcons name="check-circle" size={24} color="#e50914" />
          )}
        </View>

        <View style={styles.unitDetails}>
          <View style={styles.detailRow}>
            <MaterialIcons name="settings" size={14} color="#6b7280" />
            <Text style={styles.detailText}>{item.variation || 'Standard'}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <MaterialIcons name="palette" size={14} color="#6b7280" />
            <Text style={styles.detailText}>{item.bodyColor || 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.unitFooter}>
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
            <Text style={styles.modalTitle}>Select Unit</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <MaterialIcons name="search" size={20} color="#6b7280" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by model, ID, color, or variation..."
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
            {filteredUnits.length} unit{filteredUnits.length !== 1 ? 's' : ''} found
          </Text>

          {/* Unit List */}
          <FlatList
            data={filteredUnits}
            renderItem={renderUnitItem}
            keyExtractor={(item) => item.unitId || item._id || Math.random().toString()}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialIcons name="search-off" size={48} color="#d1d5db" />
                <Text style={styles.emptyText}>No units found</Text>
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
  unitCard: {
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
  unitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  unitMainInfo: {
    flex: 1,
    marginRight: 8
  },
  unitName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4
  },
  unitId: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500'
  },
  unitDetails: {
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
  unitFooter: {
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
