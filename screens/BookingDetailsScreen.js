import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import Toast from 'react-native-toast-message';
import { buildApiUrl } from '../constants/api';

const BookingDetailsScreen = ({ route, navigation }) => {
  const { bookingId, bookingReference } = route.params || {};
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (bookingId) {
      fetchBookingById();
    } else if (bookingReference) {
      fetchBookingByReference();
    }
  }, [bookingId, bookingReference]);

  const fetchBookingById = async () => {
    try {
      const response = await fetch(buildApiUrl(`/api/testdrive/bookings/${bookingId}`));
      const result = await response.json();
      
      if (result.success) {
        setBooking(result.data);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error fetching booking:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Could not load booking details'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchBookingByReference = async () => {
    try {
      const response = await fetch(buildApiUrl(`/api/testdrive/mobile/lookup/${bookingReference}`));
      const result = await response.json();
      
      if (result.success) {
        setBooking(result.data);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error fetching booking:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Could not find booking with that reference'
      });
      navigation.goBack();
    } finally {
      setLoading(false);
      setRefreshing(false);
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

  const getStatusDescription = (status) => {
    const descriptions = {
      'Pending': 'Your booking has been received and is being reviewed. You will receive a confirmation call soon.',
      'Confirmed': 'Your test drive is confirmed! Please arrive 15 minutes early with your driver\'s license.',
      'In Progress': 'Your test drive is currently underway. Enjoy the experience!',
      'Completed': 'Thank you for your test drive! Our sales team will follow up with you soon.',
      'Cancelled': 'This booking has been cancelled. Please contact us if you have any questions.',
      'No Show': 'You did not arrive for your scheduled test drive. Please contact us to reschedule.'
    };
    return descriptions[status] || 'Status information not available.';
  };

  const formatDateTime = (date, time) => {
    const bookingDate = new Date(date);
    return {
      date: bookingDate.toLocaleDateString('en-US', { 
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      time: time
    };
  };

  const canCancelBooking = () => {
    if (!booking) return false;
    if (booking.status !== 'Pending' && booking.status !== 'Confirmed') return false;
    
    const now = new Date();
    const bookingDateTime = new Date(`${booking.bookingDate.split('T')[0]}T${booking.bookingTime}:00`);
    const hoursDifference = (bookingDateTime - now) / (1000 * 60 * 60);
    
    return hoursDifference > 2; // Can cancel if more than 2 hours away
  };

  const handleCancelBooking = () => {
    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this test drive booking?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: confirmCancel
        }
      ]
    );
  };

  const confirmCancel = async () => {
    try {
      const response = await fetch(buildApiUrl(`api/testdrive/bookings/${booking._id}`), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: 'Cancelled by customer'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setBooking({ ...booking, status: 'Cancelled' });
        Toast.show({
          type: 'success',
          text1: 'Booking Cancelled',
          text2: 'Your test drive booking has been cancelled'
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error cancelling booking:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Could not cancel booking. Please contact us.'
      });
    }
  };

  const handleReschedule = () => {
    Alert.alert(
      'Reschedule Booking',
      'To reschedule your test drive, please contact our sales team or book a new appointment.',
      [
        { text: 'Contact Sales', onPress: () => {
          // Handle contact sales - could open phone dialer or navigate to contact screen
          Alert.alert('Contact Sales', 'Please call us at +1-234-567-8900 to reschedule.');
        }},
        { text: 'Book New', onPress: () => {
          navigation.navigate('TestDriveBookingScreen');
        }},
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e50914" />
        <Text style={styles.loadingText}>Loading booking details...</Text>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Booking not found</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const dateTime = formatDateTime(booking.bookingDate, booking.bookingTime);

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={() => {
            setRefreshing(true);
            if (bookingId) {
              fetchBookingById();
            } else {
              fetchBookingByReference();
            }
          }} 
        />
      }
    >
      {/* Status Header */}
      <View style={[styles.statusHeader, { backgroundColor: getStatusColor(booking.status) }]}>
        <Text style={styles.statusTitle}>{booking.status}</Text>
        <Text style={styles.bookingReference}>#{booking.bookingReference}</Text>
        <Text style={styles.statusDescription}>
          {getStatusDescription(booking.status)}
        </Text>
      </View>

      {/* Booking Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📅 Booking Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Date:</Text>
          <Text style={styles.infoValue}>{dateTime.date}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Time:</Text>
          <Text style={styles.infoValue}>{dateTime.time}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Duration:</Text>
          <Text style={styles.infoValue}>{booking.duration} minutes</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Route:</Text>
          <Text style={styles.infoValue}>{booking.testDriveRoute}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Pickup:</Text>
          <Text style={styles.infoValue}>{booking.pickupLocation}</Text>
        </View>
        {booking.customPickupAddress && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Address:</Text>
            <Text style={styles.infoValue}>{booking.customPickupAddress}</Text>
          </View>
        )}
      </View>

      {/* Vehicle Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🚗 Vehicle Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Model:</Text>
          <Text style={styles.infoValue}>{booking.vehicleModel}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Type:</Text>
          <Text style={styles.infoValue}>{booking.vehicleType}</Text>
        </View>
        {booking.vehicleColor && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Color:</Text>
            <Text style={styles.infoValue}>{booking.vehicleColor}</Text>
          </View>
        )}
      </View>

      {/* Customer Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👤 Customer Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Name:</Text>
          <Text style={styles.infoValue}>{booking.customerName}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Phone:</Text>
          <Text style={styles.infoValue}>{booking.customerPhone}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email:</Text>
          <Text style={styles.infoValue}>{booking.customerEmail}</Text>
        </View>
      </View>

      {/* Assigned Staff (if any) */}
      {(booking.assignedSalesAgent || booking.assignedDriver) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👥 Assigned Staff</Text>
          {booking.assignedSalesAgent && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Sales Agent:</Text>
              <Text style={styles.infoValue}>{booking.assignedSalesAgent.accountName}</Text>
            </View>
          )}
          {booking.assignedDriver && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Driver:</Text>
              <Text style={styles.infoValue}>{booking.assignedDriver.accountName}</Text>
            </View>
          )}
        </View>
      )}

      {/* Notes */}
      {(booking.specialRequests || booking.customerNotes) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Notes</Text>
          {booking.specialRequests && (
            <View style={styles.noteContainer}>
              <Text style={styles.noteTitle}>Special Requests:</Text>
              <Text style={styles.noteText}>{booking.specialRequests}</Text>
            </View>
          )}
          {booking.customerNotes && (
            <View style={styles.noteContainer}>
              <Text style={styles.noteTitle}>Your Notes:</Text>
              <Text style={styles.noteText}>{booking.customerNotes}</Text>
            </View>
          )}
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        {canCancelBooking() && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancelBooking}
          >
            <Text style={styles.cancelButtonText}>Cancel Booking</Text>
          </TouchableOpacity>
        )}
        
        {(booking.status === 'Pending' || booking.status === 'Confirmed') && (
          <TouchableOpacity
            style={styles.rescheduleButton}
            onPress={handleReschedule}
          >
            <Text style={styles.rescheduleButtonText}>Reschedule</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={styles.contactButton}
          onPress={() => {
            Alert.alert(
              'Contact Us',
              'How would you like to contact us?',
              [
                { text: 'Call', onPress: () => {
                  Alert.alert('Call Us', 'Please call us at +1-234-567-8900');
                }},
                { text: 'Email', onPress: () => {
                  Alert.alert('Email Us', 'Send us an email at testdrive@itrack.com');
                }},
                { text: 'Cancel', style: 'cancel' }
              ]
            );
          }}
        >
          <Text style={styles.contactButtonText}>Contact Us</Text>
        </TouchableOpacity>
      </View>

      {/* Important Information */}
      <View style={styles.importantInfo}>
        <Text style={styles.importantTitle}>📋 Important Information</Text>
        <Text style={styles.importantText}>
          • Please arrive 15 minutes early{'\n'}
          • Bring a valid driver's license{'\n'}
          • Cancellations must be made at least 2 hours in advance{'\n'}
          • For questions, contact our sales team{'\n'}
          • Test drives are subject to insurance verification
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    fontSize: 18,
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#e50914',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusHeader: {
    padding: 20,
    alignItems: 'center',
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  bookingReference: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 10,
    opacity: 0.9,
  },
  statusDescription: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.95,
  },
  section: {
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e50914',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 5,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    width: 100,
    marginRight: 10,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    lineHeight: 22,
  },
  noteContainer: {
    marginBottom: 12,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 5,
  },
  noteText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
    backgroundColor: '#f8f8f8',
    padding: 10,
    borderRadius: 5,
  },
  actions: {
    margin: 10,
    gap: 10,
  },
  cancelButton: {
    backgroundColor: '#F44336',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  rescheduleButton: {
    backgroundColor: '#FF9800',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  rescheduleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  contactButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  importantInfo: {
    margin: 10,
    marginTop: 5,
    padding: 15,
    backgroundColor: '#fff8dc',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ffa500',
  },
  importantTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  importantText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default BookingDetailsScreen;
