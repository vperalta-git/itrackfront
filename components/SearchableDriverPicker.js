import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Image,
  Dimensions
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function SearchableDriverPicker({ 
  visible, 
  drivers, 
  selectedValue, 
  onSelect, 
  onClose,
  placeholder = "Select Driver" 
}) {
  const [searchText, setSearchText] = useState('');

  const filteredDrivers = drivers.filter(driver => {
    const searchLower = searchText.toLowerCase();
    const username = (driver.username || '').toLowerCase();
    const accountName = (driver.accountName || '').toLowerCase();
    const email = (driver.email || '').toLowerCase();
    const phone = (driver.phone || '').toLowerCase();
    
    return username.includes(searchLower) ||
           accountName.includes(searchLower) ||
           email.includes(searchLower) ||
           phone.includes(searchLower);
  });

  const renderDriverItem = ({ item }) => {
    const isSelected = selectedValue === item.username;
    const driverName = item.accountName || item.username || 'Unknown Driver';
    const hasProfilePic = item.picture && item.picture.trim() !== '';

    return (
      <TouchableOpacity
        style={[styles.driverCard, isSelected && styles.selectedCard]}
        onPress={() => {
          onSelect(item);
          setSearchText('');
          onClose();
        }}
        activeOpacity={0.7}
      >
        <View style={styles.driverHeader}>
          {/* Profile Picture or Icon */}
          <View style={styles.profileContainer}>
            {hasProfilePic ? (
              <Image 
                source={{ uri: item.picture }} 
                style={styles.profileImage}
                defaultSource={require('../assets/icon.png')}
              />
            ) : (
              <View style={styles.profilePlaceholder}>
                <MaterialIcons name="person" size={28} color="#6b7280" />
              </View>
            )}
          </View>

          {/* Driver Info */}
          <View style={styles.driverInfo}>
            <Text style={styles.driverName} numberOfLines={1}>
              {driverName}
            </Text>
            {item.email && (
              <Text style={styles.driverEmail} numberOfLines={1}>
                {item.email}
              </Text>
            )}
            {item.phone && (
              <Text style={styles.driverPhone} numberOfLines={1}>
                📱 {item.phone}
              </Text>
            )}
          </View>

          {/* Selection Indicator */}
          {isSelected && (
            <MaterialIcons name="check-circle" size={24} color="#e50914" />
          )}
        </View>

        {/* Additional Info */}
        {item.username && item.username !== driverName && (
          <View style={styles.driverFooter}>
            <MaterialIcons name="badge" size={14} color="#6b7280" />
            <Text style={styles.usernameText}>@{item.username}</Text>
          </View>
        )}
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
            <Text style={styles.modalTitle}>Select Driver</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <MaterialIcons name="search" size={20} color="#6b7280" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, email, or phone..."
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
            {filteredDrivers.length} driver{filteredDrivers.length !== 1 ? 's' : ''} found
          </Text>

          {/* Driver List */}
          <FlatList
            data={filteredDrivers}
            renderItem={renderDriverItem}
            keyExtractor={(item) => item.username || item._id || Math.random().toString()}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialIcons name="person-search" size={48} color="#d1d5db" />
                <Text style={styles.emptyText}>No drivers found</Text>
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
  driverCard: {
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
  driverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  profileContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6'
  },
  profileImage: {
    width: 56,
    height: 56,
    borderRadius: 28
  },
  profilePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center'
  },
  driverInfo: {
    flex: 1,
    justifyContent: 'center'
  },
  driverName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4
  },
  driverEmail: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 2
  },
  driverPhone: {
    fontSize: 13,
    color: '#6b7280'
  },
  driverFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6'
  },
  usernameText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500'
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
