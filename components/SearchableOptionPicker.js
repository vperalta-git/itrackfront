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

export default function SearchableOptionPicker({ 
  visible, 
  options, 
  selectedValue, 
  onSelect, 
  onClose,
  title = "Select Option",
  placeholder = "Select...",
  searchPlaceholder = "Search options...",
  showSearch = true
}) {
  const [searchText, setSearchText] = useState('');

  const filteredOptions = options.filter(option => {
    if (!showSearch || !searchText) return true;
    const searchLower = searchText.toLowerCase();
    const optionLower = option.toLowerCase();
    return optionLower.includes(searchLower);
  });

  const renderOptionItem = ({ item }) => {
    const isSelected = selectedValue === item;

    return (
      <TouchableOpacity
        style={[styles.optionCard, isSelected && styles.selectedCard]}
        onPress={() => {
          onSelect(item);
          setSearchText('');
          onClose();
        }}
        activeOpacity={0.7}
      >
        <View style={styles.optionContent}>
          <Text style={[styles.optionText, isSelected && styles.selectedText]}>
            {item}
          </Text>
          {isSelected && (
            <MaterialIcons name="check-circle" size={24} color="#e50914" />
          )}
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
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          {showSearch && (
            <>
              <View style={styles.searchContainer}>
                <MaterialIcons name="search" size={20} color="#6b7280" />
                <TextInput
                  style={styles.searchInput}
                  placeholder={searchPlaceholder}
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
                {filteredOptions.length} option{filteredOptions.length !== 1 ? 's' : ''} available
              </Text>
            </>
          )}

          {/* Options List */}
          <FlatList
            data={filteredOptions}
            renderItem={renderOptionItem}
            keyExtractor={(item, index) => `${item}-${index}`}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialIcons name="search-off" size={48} color="#d1d5db" />
                <Text style={styles.emptyText}>No options found</Text>
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
    maxHeight: '80%',
    minHeight: '50%'
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
  optionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
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
  optionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    flex: 1
  },
  selectedText: {
    color: '#111827',
    fontWeight: '600'
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
