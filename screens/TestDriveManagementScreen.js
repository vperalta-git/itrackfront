import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Dimensions
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { buildApiUrl } from '../constants/api';

const { width } = Dimensions.get('window');

const TestDriveManagementScreen = ({ navigation }) => {
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('today');
  
  // Stats
  const [stats, setStats] = useState({
    totalBookings: 0,
    pendingBookings: 0,
    confirmedBookings: 0,
    completedBookings: 0
  });

  const statusOptions = [
    'All Status',
    'Pending',
    'Confirmed', 
    'In Progress',
    'Completed',
    'Cancelled',
    'No Show'
  ];

  const vehicleTypeOptions = [
    'All Types',
    'Truck',
    'SUV', 
    'Van',
    'Bus',
    'Commercial Vehicle',
    'Other'
  ];

  const dateFilterOptions = [
    { label: 'Today', value: 'today' },
    { label: 'Tomorrow', value: 'tomorrow' },
    { label: 'This Week', value: 'week' },
    { label: 'This Month', value: 'month' },
    { label: 'All Time', value: 'all' }
  ];

  useEffect(() => {
    fetchBookings();
    fetchStats();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [bookings, searchQuery, statusFilter, vehicleTypeFilter, dateFilter]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      let url = buildApiUrl(`/api/testdrive/bookings?limit=100&sortBy=bookingDate&sortOrder=asc`);
      
      // Add date filter to API call
      if (dateFilter !== 'all') {
        const dates = getDateRange(dateFilter);
        if (dates.from) url += `&dateFrom=${dates.from}`;
        if (dates.to) url += `&dateTo=${dates.to}`;
      }

      const response = await fetch(url);
      const result = await response.json();
      
      if (result.success) {
        setBookings(result.data);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load bookings'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(buildApiUrl('/api/testdrive/stats'));
      const result = await response.json();
      
      if (result.success) {
        const statusBreakdown = result.data.statusBreakdown;
        const newStats = {
          totalBookings: result.data.totalBookings,
          pendingBookings: statusBreakdown.find(s => s._id === 'Pending')?.count || 0,
          confirmedBookings: statusBreakdown.find(s => s._id === 'Confirmed')?.count || 0,
          completedBookings: statusBreakdown.find(s => s._id === 'Completed')?.count || 0
        };
        setStats(newStats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const getDateRange = (filter) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    switch (filter) {
      case 'today':
        return {
          from: today.toISOString().split('T')[0],
          to: today.toISOString().split('T')[0]
        };
      case 'tomorrow':
        return {
          from: tomorrow.toISOString().split('T')[0],
          to: tomorrow.toISOString().split('T')[0]
        };
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return {
          from: weekStart.toISOString().split('T')[0],
          to: weekEnd.toISOString().split('T')[0]
        };
      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return {
          from: monthStart.toISOString().split('T')[0],
          to: monthEnd.toISOString().split('T')[0]
        };
      default:
        return { from: null, to: null };
    }
  };

  const applyFilters = () => {
    let filtered = [...bookings];
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(booking =>
        booking.customerName.toLowerCase().includes(query) ||
        booking.customerPhone.includes(query) ||
        booking.customerEmail.toLowerCase().includes(query) ||
        booking.vehicleModel.toLowerCase().includes(query) ||
        booking.bookingReference.toLowerCase().includes(query)
      );
    }
    
    // Status filter
    if (statusFilter && statusFilter !== 'All Status') {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }
    
    // Vehicle type filter
    if (vehicleTypeFilter && vehicleTypeFilter !== 'All Types') {
      filtered = filtered.filter(booking => booking.vehicleType === vehicleTypeFilter);
    }
    
    setFilteredBookings(filtered);
  };

  const updateBookingStatus = async (bookingId, newStatus, notes = '') => {
    try {
      const response = await fetch(buildApiUrl(`/api/testdrive/bookings/${bookingId}/status`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          notes: notes
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Update local state
        const updatedBookings = bookings.map(booking =>
          booking._id === bookingId ? { ...booking, status: newStatus } : booking
        );
        setBookings(updatedBookings);
        
        // Update selected booking if it's the one we updated
        if (selectedBooking && selectedBooking._id === bookingId) {
          setSelectedBooking({ ...selectedBooking, status: newStatus });
        }
        
        Toast.show({
          type: 'success',
          text1: 'Status Updated',
          text2: `Booking marked as ${newStatus}`
        });
        
        fetchStats(); // Refresh stats
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update booking status'
      });
    }
  };

  const assignStaff = async (bookingId, salesAgentId, driverId) => {
    try {
      const response = await fetch(buildApiUrl(`/api/testdrive/bookings/${bookingId}/assign`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          salesAgentId,
          driverId
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Update local state
        const updatedBookings = bookings.map(booking =>
          booking._id === bookingId ? result.data : booking
        );
        setBookings(updatedBookings);
        
        Toast.show({
          type: 'success',
          text1: 'Staff Assigned',
          text2: 'Staff successfully assigned to booking'
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error assigning staff:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to assign staff'
      });
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'Pending': '#FFA500',
      'Confirmed': '#4CAF50',
      'In Progress': '#2196F3',
      'Completed': '#8BC34A',
      'Cancelled': '#F44336',
      'No Show': '#9E9E9E'
    };
    return colors[status] || '#9E9E9E';
  };

  const formatDateTime = (date, time) => {
    const bookingDate = new Date(date);
    return `${bookingDate.toLocaleDateString()} at ${time}`;
  };

  const showStatusActionSheet = (booking) => {
    const options = statusOptions.filter(status => status !== 'All Status');
    
    Alert.alert(
      'Update Status',
      `Current status: ${booking.status}`,
      options.map(status => ({
        text: status,
        onPress: () => {
          if (status !== booking.status) {
            updateBookingStatus(booking._id, status);
          }
        }
      })).concat([{ text: 'Cancel', style: 'cancel' }])
    );
  };

  const renderBookingCard = ({ item }) => (
    <TouchableOpacity
      style={styles.bookingCard}
      onPress={() => {
        setSelectedBooking(item);
        setShowDetailsModal(true);
      }}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.bookingReference}>{item.bookingReference}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      
      <Text style={styles.customerName}>{item.customerName}</Text>
      <Text style={styles.vehicleInfo}>{item.vehicleModel} ({item.vehicleType})</Text>
      <Text style={styles.dateTime}>{formatDateTime(item.bookingDate, item.bookingTime)}</Text>
      <Text style={styles.phone}>{item.customerPhone}</Text>
      
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => showStatusActionSheet(item)}
        >
          <Text style={styles.actionButtonText}>Update Status</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.callButton]}
          onPress={() => {
            // Handle phone call
            Alert.alert(
              'Call Customer',
              `Call ${item.customerName} at ${item.customerPhone}?`,
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Call', onPress: () => {
                  // Implementation for phone call functionality
                  console.log('Call customer:', item.customerPhone);
                }}
              ]
            );
          }}
        >
          <Text style={styles.actionButtonText}>📞 Call</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const BookingDetailsModal = () => (
    <Modal
      visible={showDetailsModal}
      animationType="slide"
      onRequestClose={() => setShowDetailsModal(false)}
    >
      <ScrollView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Booking Details</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowDetailsModal(false)}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
        
        {selectedBooking && (
          <View style={styles.detailsContent}>
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Booking Information</Text>
              <Text style={styles.detailItem}>Reference: {selectedBooking.bookingReference}</Text>
              <Text style={styles.detailItem}>Status: {selectedBooking.status}</Text>
              <Text style={styles.detailItem}>
                Date: {formatDateTime(selectedBooking.bookingDate, selectedBooking.bookingTime)}
              </Text>
              <Text style={styles.detailItem}>Duration: {selectedBooking.duration} minutes</Text>
              <Text style={styles.detailItem}>Route: {selectedBooking.testDriveRoute}</Text>
              <Text style={styles.detailItem}>Pickup: {selectedBooking.pickupLocation}</Text>
            </View>
            
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Customer Information</Text>
              <Text style={styles.detailItem}>Name: {selectedBooking.customerName}</Text>
              <Text style={styles.detailItem}>Phone: {selectedBooking.customerPhone}</Text>
              <Text style={styles.detailItem}>Email: {selectedBooking.customerEmail}</Text>
              <Text style={styles.detailItem}>Age: {selectedBooking.customerAge}</Text>
              <Text style={styles.detailItem}>License: {selectedBooking.customerLicenseNumber}</Text>
              {selectedBooking.customerAddress && (
                <Text style={styles.detailItem}>Address: {selectedBooking.customerAddress}</Text>
              )}
            </View>
            
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Vehicle Information</Text>
              <Text style={styles.detailItem}>Model: {selectedBooking.vehicleModel}</Text>
              <Text style={styles.detailItem}>Type: {selectedBooking.vehicleType}</Text>
              {selectedBooking.vehicleColor && (
                <Text style={styles.detailItem}>Color: {selectedBooking.vehicleColor}</Text>
              )}
            </View>
            
            {(selectedBooking.specialRequests || selectedBooking.customerNotes) && (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Notes</Text>
                {selectedBooking.specialRequests && (
                  <Text style={styles.detailItem}>Special Requests: {selectedBooking.specialRequests}</Text>
                )}
                {selectedBooking.customerNotes && (
                  <Text style={styles.detailItem}>Customer Notes: {selectedBooking.customerNotes}</Text>
                )}
              </View>
            )}
            
            {selectedBooking.assignedSalesAgent || selectedBooking.assignedDriver ? (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Assigned Staff</Text>
                {selectedBooking.assignedSalesAgent && (
                  <Text style={styles.detailItem}>
                    Sales Agent: {selectedBooking.assignedSalesAgent.accountName}
                  </Text>
                )}
                {selectedBooking.assignedDriver && (
                  <Text style={styles.detailItem}>
                    Driver: {selectedBooking.assignedDriver.accountName}
                  </Text>
                )}
              </View>
            ) : null}
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalActionButton}
                onPress={() => showStatusActionSheet(selectedBooking)}
              >
                <Text style={styles.modalActionButtonText}>Update Status</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalActionButton, styles.assignButton]}
                onPress={() => {
                  // Navigate to staff assignment screen
                  setShowDetailsModal(false);
                  navigation.navigate('AssignStaff', { 
                    booking: selectedBooking,
                    onAssign: assignStaff
                  });
                }}
              >
                <Text style={styles.modalActionButtonText}>Assign Staff</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </Modal>
  );

  const FilterModal = () => (
    <Modal
      visible={showFilterModal}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.filterModalOverlay}>
        <View style={styles.filterModal}>
          <Text style={styles.filterTitle}>Filter Bookings</Text>
          
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Status</Text>
            <Picker
              selectedValue={statusFilter}
              onValueChange={setStatusFilter}
              style={styles.filterPicker}
            >
              {statusOptions.map((status) => (
                <Picker.Item key={status} label={status} value={status === 'All Status' ? '' : status} />
              ))}
            </Picker>
          </View>
          
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Vehicle Type</Text>
            <Picker
              selectedValue={vehicleTypeFilter}
              onValueChange={setVehicleTypeFilter}
              style={styles.filterPicker}
            >
              {vehicleTypeOptions.map((type) => (
                <Picker.Item key={type} label={type} value={type === 'All Types' ? '' : type} />
              ))}
            </Picker>
          </View>
          
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Date Range</Text>
            <Picker
              selectedValue={dateFilter}
              onValueChange={setDateFilter}
              style={styles.filterPicker}
            >
              {dateFilterOptions.map((option) => (
                <Picker.Item key={option.value} label={option.label} value={option.value} />
              ))}
            </Picker>
          </View>
          
          <View style={styles.filterActions}>
            <TouchableOpacity
              style={styles.filterActionButton}
              onPress={() => {
                setStatusFilter('');
                setVehicleTypeFilter('');
                setDateFilter('all');
                setSearchQuery('');
              }}
            >
              <Text style={styles.filterActionButtonText}>Clear All</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.filterActionButton, styles.applyButton]}
              onPress={() => {
                setShowFilterModal(false);
                fetchBookings();
              }}
            >
              <Text style={styles.filterActionButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {/* Stats Header */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.totalBookings}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.pendingBookings}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.confirmedBookings}</Text>
          <Text style={styles.statLabel}>Confirmed</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.completedBookings}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>
      
      {/* Search and Filter */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, phone, email, or reference..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
        >
          <Text style={styles.filterButtonText}>🔍 Filter</Text>
        </TouchableOpacity>
      </View>
      
      {/* Bookings List */}
      <FlatList
        data={filteredBookings}
        keyExtractor={(item) => item._id}
        renderItem={renderBookingCard}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchBookings} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {loading ? 'Loading bookings...' : 'No bookings found'}
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContainer}
      />
      
      <BookingDetailsModal />
      <FilterModal />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 15,
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  statCard: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#CB1E2A',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#fff',
    marginTop: 5,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginRight: 10,
    fontSize: 16,
  },
  filterButton: {
    backgroundColor: '#CB1E2A',
    padding: 10,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  filterButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  listContainer: {
    paddingBottom: 20,
  },
  bookingCard: {
    backgroundColor: '#fff',
    margin: 10,
    padding: 15,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  bookingReference: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#CB1E2A',
    marginBottom: 5,
  },
  vehicleInfo: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  dateTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  phone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 8,
    borderRadius: 5,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  callButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#CB1E2A',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#fff',
  },
  detailsContent: {
    padding: 20,
  },
  detailSection: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 15,
  },
  detailSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#CB1E2A',
    marginBottom: 10,
  },
  detailItem: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalActionButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  assignButton: {
    backgroundColor: '#4CAF50',
  },
  modalActionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterModal: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: width * 0.9,
    maxHeight: '80%',
  },
  filterTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#CB1E2A',
  },
  filterSection: {
    marginBottom: 15,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
    color: '#333',
  },
  filterPicker: {
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  filterActionButton: {
    flex: 1,
    backgroundColor: '#666',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  applyButton: {
    backgroundColor: '#CB1E2A',
  },
  filterActionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default TestDriveManagementScreen;