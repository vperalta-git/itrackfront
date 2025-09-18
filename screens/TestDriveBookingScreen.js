import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  Platform,
  StyleSheet,
  Dimensions
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { buildApiUrl } from '../constants/api';

const { width } = Dimensions.get('window');

const TestDriveBookingScreen = ({ navigation }) => {
  // Customer Information
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerLicenseNumber, setCustomerLicenseNumber] = useState('');
  const [customerAge, setCustomerAge] = useState('');

  // Vehicle Information
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleType, setVehicleType] = useState('Truck');
  const [vehicleColor, setVehicleColor] = useState('');

  // Booking Details
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState('09:00');
  const [duration, setDuration] = useState('60');
  const [testDriveRoute, setTestDriveRoute] = useState('City Route');
  const [pickupLocation, setPickupLocation] = useState('Dealership');
  const [customPickupAddress, setCustomPickupAddress] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');

  // UI State
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);

  // Available vehicle models (you can populate this from your inventory)
  const vehicleModels = [
    'Isuzu D-Max',
    'Isuzu NPR',
    'Isuzu NLR',
    'Isuzu FTR',
    'Isuzu Giga',
    'Isuzu Forward',
    'Other'
  ];

  const vehicleTypes = ['Truck', 'SUV', 'Van', 'Bus', 'Commercial Vehicle', 'Other'];
  const routeOptions = ['City Route', 'Highway Route', 'Mixed Route', 'Custom Route'];
  const durationOptions = ['30', '60', '90', '120'];
  const pickupOptions = ['Dealership', 'Customer Location', 'Other'];

  useEffect(() => {
    // Pre-fill user data if available
    loadUserData();
  }, []);

  useEffect(() => {
    // Fetch available time slots when date changes
    if (selectedDate) {
      fetchAvailableSlots();
    }
  }, [selectedDate, duration]);

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const user = JSON.parse(userData);
        if (user.email) setCustomerEmail(user.email);
        if (user.phoneNumber) setCustomerPhone(user.phoneNumber);
      }
    } catch (error) {
      console.log('Error loading user data:', error);
    }
  };

  const fetchAvailableSlots = async () => {
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const response = await fetch(buildApiUrl(`/api/testdrive/available-slots?date=${dateStr}&duration=${duration}`));
      const result = await response.json();
      
      if (result.success) {
        setAvailableSlots(result.data.availableSlots);
        
        // If currently selected time is not available, reset to first available slot
        if (result.data.availableSlots.length > 0 && !result.data.availableSlots.includes(selectedTime)) {
          setSelectedTime(result.data.availableSlots[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching available slots:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Could not load available time slots'
      });
    }
  };

  const validateForm = () => {
    if (!customerName.trim()) {
      Alert.alert('Validation Error', 'Please enter your full name');
      return false;
    }
    if (!customerPhone.trim()) {
      Alert.alert('Validation Error', 'Please enter your phone number');
      return false;
    }
    if (!customerEmail.trim()) {
      Alert.alert('Validation Error', 'Please enter your email address');
      return false;
    }
    if (!customerLicenseNumber.trim()) {
      Alert.alert('Validation Error', 'Please enter your driver\'s license number');
      return false;
    }
    if (!customerAge || parseInt(customerAge) < 18) {
      Alert.alert('Validation Error', 'You must be at least 18 years old to book a test drive');
      return false;
    }
    if (!vehicleModel.trim()) {
      Alert.alert('Validation Error', 'Please select a vehicle model');
      return false;
    }
    if (availableSlots.length === 0) {
      Alert.alert('Validation Error', 'No available time slots for selected date');
      return false;
    }
    if (!availableSlots.includes(selectedTime)) {
      Alert.alert('Validation Error', 'Selected time slot is not available');
      return false;
    }

    return true;
  };

  const handleBooking = async () => {
    if (!validateForm()) return;

    setLoading(true);
    
    try {
      const userData = await AsyncStorage.getItem('userData');
      let createdBy = null;
      if (userData) {
        const user = JSON.parse(userData);
        createdBy = user._id;
      }

      const bookingData = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim().toLowerCase(),
        customerAddress: customerAddress.trim(),
        customerLicenseNumber: customerLicenseNumber.trim().toUpperCase(),
        customerAge: parseInt(customerAge),
        vehicleModel: vehicleModel.trim(),
        vehicleType,
        vehicleColor: vehicleColor.trim(),
        bookingDate: selectedDate.toISOString(),
        bookingTime: selectedTime,
        duration: parseInt(duration),
        testDriveRoute,
        pickupLocation,
        customPickupAddress: pickupLocation === 'Customer Location' ? customPickupAddress.trim() : '',
        specialRequests: specialRequests.trim(),
        customerNotes: customerNotes.trim(),
        createdBy
      };

      const response = await fetch(buildApiUrl('/api/testdrive/mobile/quick-book'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData)
      });

      const result = await response.json();

      if (result.success) {
        Toast.show({
          type: 'success',
          text1: 'Booking Confirmed!',
          text2: `Reference: ${result.data.bookingReference}`,
          visibilityTime: 5000
        });

        // Show confirmation alert with booking details
        Alert.alert(
          'Test Drive Booked Successfully!',
          `Your booking reference is: ${result.data.bookingReference}\n\nDate: ${selectedDate.toDateString()}\nTime: ${selectedTime}\nVehicle: ${vehicleModel}\n\nYou will receive a confirmation call shortly.`,
          [
            {
              text: 'View Booking',
              onPress: () => {
                navigation.navigate('BookingDetails', { 
                  bookingId: result.data._id,
                  bookingReference: result.data.bookingReference 
                });
              }
            },
            {
              text: 'Book Another',
              onPress: () => clearForm()
            },
            {
              text: 'Done',
              onPress: () => navigation.goBack()
            }
          ]
        );

      } else {
        throw new Error(result.message || 'Booking failed');
      }
    } catch (error) {
      console.error('Booking error:', error);
      Toast.show({
        type: 'error',
        text1: 'Booking Failed',
        text2: error.message || 'Please try again later'
      });
      Alert.alert('Booking Failed', error.message || 'Please try again later');
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setCustomerAddress('');
    setCustomerLicenseNumber('');
    setCustomerAge('');
    setVehicleModel('');
    setVehicleColor('');
    setSpecialRequests('');
    setCustomerNotes('');
    setSelectedDate(new Date());
    setDuration('60');
    setTestDriveRoute('City Route');
    setPickupLocation('Dealership');
    setCustomPickupAddress('');
  };

  const onDateChange = (event, date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setSelectedDate(date);
    }
  };

  const TimeSlotSelector = () => (
    <Modal
      visible={showTimeModal}
      transparent={true}
      animationType="slide"
    >
      <View style={styles.modalOverlay}>
        <View style={styles.timeModal}>
          <Text style={styles.modalTitle}>Available Time Slots</Text>
          <ScrollView style={styles.timeSlotContainer}>
            {availableSlots.length === 0 ? (
              <Text style={styles.noSlotsText}>No available slots for this date</Text>
            ) : (
              availableSlots.map((time) => (
                <TouchableOpacity
                  key={time}
                  style={[
                    styles.timeSlot,
                    selectedTime === time && styles.selectedTimeSlot
                  ]}
                  onPress={() => {
                    setSelectedTime(time);
                    setShowTimeModal(false);
                  }}
                >
                  <Text style={[
                    styles.timeSlotText,
                    selectedTime === time && styles.selectedTimeSlotText
                  ]}>
                    {time}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowTimeModal(false)}
          >
            <Text style={styles.modalCloseButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Book Test Drive</Text>
        <Text style={styles.headerSubtitle}>Experience your next vehicle</Text>
      </View>

      {/* Customer Information Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Customer Information</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Full Name *"
          value={customerName}
          onChangeText={setCustomerName}
          autoCapitalize="words"
        />
        
        <TextInput
          style={styles.input}
          placeholder="Phone Number *"
          value={customerPhone}
          onChangeText={setCustomerPhone}
          keyboardType="phone-pad"
        />
        
        <TextInput
          style={styles.input}
          placeholder="Email Address *"
          value={customerEmail}
          onChangeText={setCustomerEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        
        <TextInput
          style={styles.input}
          placeholder="Address"
          value={customerAddress}
          onChangeText={setCustomerAddress}
          multiline={true}
          numberOfLines={2}
        />
        
        <TextInput
          style={styles.input}
          placeholder="Driver's License Number *"
          value={customerLicenseNumber}
          onChangeText={setCustomerLicenseNumber}
          autoCapitalize="characters"
        />
        
        <TextInput
          style={styles.input}
          placeholder="Age *"
          value={customerAge}
          onChangeText={setCustomerAge}
          keyboardType="numeric"
        />
      </View>

      {/* Vehicle Information Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Vehicle Information</Text>
        
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>Vehicle Model *</Text>
          <Picker
            selectedValue={vehicleModel}
            onValueChange={setVehicleModel}
            style={styles.picker}
          >
            <Picker.Item label="Select Vehicle Model" value="" />
            {vehicleModels.map((model) => (
              <Picker.Item key={model} label={model} value={model} />
            ))}
          </Picker>
        </View>
        
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>Vehicle Type</Text>
          <Picker
            selectedValue={vehicleType}
            onValueChange={setVehicleType}
            style={styles.picker}
          >
            {vehicleTypes.map((type) => (
              <Picker.Item key={type} label={type} value={type} />
            ))}
          </Picker>
        </View>
        
        <TextInput
          style={styles.input}
          placeholder="Preferred Color (Optional)"
          value={vehicleColor}
          onChangeText={setVehicleColor}
        />
      </View>

      {/* Booking Details Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Booking Details</Text>
        
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.dateButtonText}>
            📅 Date: {selectedDate.toDateString()}
          </Text>
        </TouchableOpacity>
        
        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            minimumDate={new Date()}
            onChange={onDateChange}
          />
        )}
        
        <TouchableOpacity
          style={styles.timeButton}
          onPress={() => setShowTimeModal(true)}
        >
          <Text style={styles.timeButtonText}>
            ⏰ Time: {selectedTime} ({availableSlots.length} slots available)
          </Text>
        </TouchableOpacity>
        
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>Duration</Text>
          <Picker
            selectedValue={duration}
            onValueChange={setDuration}
            style={styles.picker}
          >
            {durationOptions.map((dur) => (
              <Picker.Item 
                key={dur} 
                label={`${dur} minutes`} 
                value={dur} 
              />
            ))}
          </Picker>
        </View>
        
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>Test Drive Route</Text>
          <Picker
            selectedValue={testDriveRoute}
            onValueChange={setTestDriveRoute}
            style={styles.picker}
          >
            {routeOptions.map((route) => (
              <Picker.Item key={route} label={route} value={route} />
            ))}
          </Picker>
        </View>
        
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>Pickup Location</Text>
          <Picker
            selectedValue={pickupLocation}
            onValueChange={setPickupLocation}
            style={styles.picker}
          >
            {pickupOptions.map((location) => (
              <Picker.Item key={location} label={location} value={location} />
            ))}
          </Picker>
        </View>
        
        {pickupLocation === 'Customer Location' && (
          <TextInput
            style={styles.input}
            placeholder="Custom Pickup Address"
            value={customPickupAddress}
            onChangeText={setCustomPickupAddress}
            multiline={true}
            numberOfLines={2}
          />
        )}
      </View>

      {/* Additional Information Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Additional Information</Text>
        
        <TextInput
          style={styles.textArea}
          placeholder="Special Requests (Optional)"
          value={specialRequests}
          onChangeText={setSpecialRequests}
          multiline={true}
          numberOfLines={3}
          textAlignVertical="top"
        />
        
        <TextInput
          style={styles.textArea}
          placeholder="Notes or Comments (Optional)"
          value={customerNotes}
          onChangeText={setCustomerNotes}
          multiline={true}
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      {/* Booking Button */}
      <TouchableOpacity
        style={[styles.bookButton, loading && styles.bookButtonDisabled]}
        onPress={handleBooking}
        disabled={loading}
      >
        <Text style={styles.bookButtonText}>
          {loading ? 'Booking...' : 'Book Test Drive'}
        </Text>
      </TouchableOpacity>

      {/* Disclaimer */}
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          • You must be 18+ years old to book a test drive{'\n'}
          • Valid driver's license required{'\n'}
          • Confirmation call will be made within 2 hours{'\n'}
          • Cancellation must be made at least 2 hours in advance
        </Text>
      </View>

      <TimeSlotSelector />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#CB1E2A',
    padding: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
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
    color: '#CB1E2A',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 12,
    marginBottom: 10,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 12,
    marginBottom: 10,
    fontSize: 16,
    backgroundColor: '#fafafa',
    minHeight: 80,
  },
  pickerContainer: {
    marginBottom: 15,
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
    color: '#333',
  },
  picker: {
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
  },
  dateButton: {
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 15,
    marginBottom: 10,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
  },
  timeButton: {
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 15,
    marginBottom: 10,
  },
  timeButtonText: {
    fontSize: 16,
    color: '#333',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeModal: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: width * 0.85,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
    color: '#CB1E2A',
  },
  timeSlotContainer: {
    maxHeight: 300,
  },
  timeSlot: {
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    marginBottom: 10,
    alignItems: 'center',
  },
  selectedTimeSlot: {
    backgroundColor: '#CB1E2A',
    borderColor: '#CB1E2A',
  },
  timeSlotText: {
    fontSize: 16,
    color: '#333',
  },
  selectedTimeSlotText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  noSlotsText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    padding: 20,
  },
  modalCloseButton: {
    backgroundColor: '#666',
    padding: 15,
    borderRadius: 5,
    marginTop: 15,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bookButton: {
    backgroundColor: '#CB1E2A',
    margin: 15,
    padding: 18,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  bookButtonDisabled: {
    backgroundColor: '#999',
    elevation: 1,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disclaimer: {
    margin: 15,
    marginTop: 5,
    padding: 15,
    backgroundColor: '#fff8dc',
    borderRadius: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#ffa500',
  },
  disclaimerText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default TestDriveBookingScreen;