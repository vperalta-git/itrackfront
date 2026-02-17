import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildApiUrl } from '../constants/api';
import NotificationService from '../utils/notificationService';

const { width } = Dimensions.get('window');

export default function AgentSMSInfoScreen() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [testMessageModal, setTestMessageModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    vehicleId: '',
    vehicleName: '',
    notes: '',
  });

  // Test message state
  const [testMessage, setTestMessage] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setRefreshing(true);
      // Load from unit allocations
      const response = await fetch(buildApiUrl('/api/getUnitAllocation'));
      const text = await response.text();
      let data = text ? JSON.parse(text) : {};
      const allocations = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);

      // Build unique customer list
      const customerMap = {};
      allocations.forEach(alloc => {
        const key = (alloc.customerEmail || alloc.customerPhone || '').toLowerCase();
        if (!key) return;

        if (!customerMap[key]) {
          customerMap[key] = {
            id: alloc._id,
            name: alloc.customerName || 'Customer',
            email: alloc.customerEmail || '',
            phone: alloc.customerPhone || alloc.customerContact || '',
            vehicles: [],
            notes: alloc.notes || '',
          };
        }

        if (alloc.unitId && !customerMap[key].vehicles.some(v => v.id === alloc.unitId)) {
          customerMap[key].vehicles.push({
            id: alloc.unitId,
            name: alloc.unitName || alloc.unitId,
          });
        }
      });

      setCustomers(Object.values(customerMap));
    } catch (error) {
      console.error('Error loading customers:', error);
      Alert.alert('Error', 'Failed to load customers');
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  const handleAddCustomer = async () => {
    if (!form.name.trim() || (!form.email.trim() && !form.phone.trim())) {
      Alert.alert('Validation', 'Name and at least email or phone are required');
      return;
    }

    if (!form.vehicleId.trim()) {
      Alert.alert('Validation', 'Vehicle ID/Unit ID is required to link customer information');
      return;
    }

    try {
      setSaving(true);
      const newCustomer = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        vehicleId: form.vehicleId.trim(),
        vehicleName: form.vehicleName.trim(),
        notes: form.notes.trim(),
      };

      // Update unit allocation with customer contact info
      try {
        const response = await fetch(buildApiUrl('/api/updateUnitCustomerInfo'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            unitId: form.vehicleId.trim(),
            customerName: form.name.trim(),
            customerEmail: form.email.trim(),
            customerPhone: form.phone.trim(),
          })
        });
        
        const result = await response.json();
        if (!result.success) {
          console.warn('Warning: Could not update unit allocation:', result.message);
        }
      } catch (error) {
        console.error('Error updating unit allocation:', error);
      }

      // Store in local list
      const updatedCustomers = [...customers, newCustomer];
      setCustomers(updatedCustomers);

      // Clear form
      setForm({
        name: '',
        email: '',
        phone: '',
        vehicleId: '',
        vehicleName: '',
        notes: '',
      });

      setShowAddModal(false);
      Alert.alert('Success', 'Customer SMS information saved successfully');
    } catch (error) {
      console.error('Error saving customer:', error);
      Alert.alert('Error', 'Failed to save customer information');
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestMessage = async () => {
    if (!selectedCustomer?.phone) {
      Alert.alert('Error', 'Customer phone number is required to send SMS');
      return;
    }

    if (!testMessage.trim()) {
      Alert.alert('Validation', 'Please enter a test message');
      return;
    }

    try {
      setSendingTest(true);
      const result = await NotificationService.sendStatusNotification(
        {
          name: selectedCustomer.name,
          email: selectedCustomer.email,
          phone: selectedCustomer.phone,
        },
        {
          unitName: selectedCustomer.vehicles?.[0]?.name || 'Vehicle',
          unitId: selectedCustomer.vehicles?.[0]?.id || '',
        },
        'Test Notification',
        testMessage
      );

      if (result.success) {
        Alert.alert('Success', 'Test SMS sent successfully!\n\nEmail Sent: ' + (result.emailSent ? 'Yes' : 'No') + '\nSMS Sent: ' + (result.smsSent ? 'Yes' : 'No'));
        setTestMessage('');
        setTestMessageModal(false);
      } else {
        Alert.alert('Error', result.message || 'Failed to send test SMS');
      }
    } catch (error) {
      console.error('Error sending test message:', error);
      Alert.alert('Error', error.message || 'Failed to send test SMS');
    } finally {
      setSendingTest(false);
    }
  };

  const handleDeleteCustomer = (index) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this customer SMS information?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updated = customers.filter((_, i) => i !== index);
            setCustomers(updated);
            if (selectedCustomer === customers[index]) {
              setShowDetailModal(false);
              setSelectedCustomer(null);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#e50914" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <MaterialIcons name="sms" size={28} color="#fff" />
        <Text style={styles.headerTitle}>Customer SMS Info</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)}>
          <MaterialIcons name="add-circle" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Customer List */}
      <ScrollView 
        style={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={loadCustomers}
            tintColor="#e50914"
          />
        }
      >
        {customers.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="contacts" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No customer SMS information added yet</Text>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => setShowAddModal(true)}
            >
              <MaterialIcons name="add" size={20} color="#fff" />
              <Text style={styles.addBtnText}>Add Customer</Text>
            </TouchableOpacity>
          </View>
        ) : (
          customers.map((customer, index) => (
            <TouchableOpacity
              key={index}
              style={styles.card}
              onPress={() => {
                setSelectedCustomer({ ...customer, index });
                setShowDetailModal(true);
              }}
            >
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{customer.name}</Text>
                {customer.email && <Text style={styles.cardSubtitle}>📧 {customer.email}</Text>}
                {customer.phone && <Text style={styles.cardSubtitle}>📱 {customer.phone}</Text>}
                {customer.vehicles?.length > 0 && (
                  <Text style={styles.cardSubtitle}>
                    🚗 {customer.vehicles.map(v => v.name).join(', ')}
                  </Text>
                )}
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#999" />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Add Customer Modal */}
      <Modal visible={showAddModal} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <MaterialIcons name="close" size={28} color="#666" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Customer SMS Info</Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Customer Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter customer name"
                value={form.name}
                onChangeText={(text) => setForm({ ...form, name: text })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="customer@example.com"
                value={form.email}
                onChangeText={(text) => setForm({ ...form, email: text })}
                keyboardType="email-address"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Phone Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="+63XXXXXXXXXX or 09XXXXXXXXX"
                value={form.phone}
                onChangeText={(text) => setForm({ ...form, phone: text })}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Vehicle ID / Unit ID *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter Unit ID (e.g., V001, ISUZU-001)"
                value={form.vehicleId}
                onChangeText={(text) => setForm({ ...form, vehicleId: text })}
              />
              <Text style={styles.helperText}>
                Required: This links customer info to the vehicle for SMS notifications
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Vehicle Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Isuzu D-Max"
                value={form.vehicleName}
                onChangeText={(text) => setForm({ ...form, vehicleName: text })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Any additional notes or preferences"
                value={form.notes}
                onChangeText={(text) => setForm({ ...form, notes: text })}
                multiline
                numberOfLines={4}
              />
            </View>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleAddCustomer}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="save" size={20} color="#fff" />
                  <Text style={styles.submitBtnText}>Save Customer Info</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Customer Detail Modal */}
      <Modal visible={showDetailModal} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowDetailModal(false)}>
              <MaterialIcons name="close" size={28} color="#666" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Customer Details</Text>
            <TouchableOpacity
              onPress={() => handleDeleteCustomer(selectedCustomer?.index)}
            >
              <MaterialIcons name="delete" size={28} color="#e74c3c" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedCustomer && (
              <>
                <View style={styles.detailSection}>
                  <View style={styles.detailRow}>
                    <MaterialIcons name="person" size={20} color="#e50914" />
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Name</Text>
                      <Text style={styles.detailValue}>{selectedCustomer.name}</Text>
                    </View>
                  </View>

                  {selectedCustomer.email && (
                    <View style={styles.detailRow}>
                      <MaterialIcons name="email" size={20} color="#e50914" />
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Email</Text>
                        <Text style={styles.detailValue}>{selectedCustomer.email}</Text>
                      </View>
                    </View>
                  )}

                  {selectedCustomer.phone && (
                    <View style={styles.detailRow}>
                      <MaterialIcons name="phone" size={20} color="#e50914" />
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Phone</Text>
                        <Text style={styles.detailValue}>{selectedCustomer.phone}</Text>
                      </View>
                    </View>
                  )}

                  {selectedCustomer.vehicles?.length > 0 && (
                    <View style={styles.detailRow}>
                      <MaterialIcons name="directions-car" size={20} color="#e50914" />
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Vehicles</Text>
                        {selectedCustomer.vehicles.map((v, i) => (
                          <Text key={i} style={styles.detailValue}>
                            • {v.name} ({v.id})
                          </Text>
                        ))}
                      </View>
                    </View>
                  )}

                  {selectedCustomer.notes && (
                    <View style={styles.detailRow}>
                      <MaterialIcons name="notes" size={20} color="#e50914" />
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Notes</Text>
                        <Text style={styles.detailValue}>{selectedCustomer.notes}</Text>
                      </View>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.testSMSBtn}
                  onPress={() => setTestMessageModal(true)}
                >
                  <MaterialIcons name="sms" size={20} color="#fff" />
                  <Text style={styles.testSMSBtnText}>Send Test SMS</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Test Message Modal */}
      <Modal visible={testMessageModal} animationType="fade" transparent={true}>
        <View style={styles.overlay}>
          <View style={styles.testMessageBox}>
            <Text style={styles.testMessageTitle}>Send Test SMS</Text>
            <Text style={styles.testMessageSubtitle}>
              To: {selectedCustomer?.name} ({selectedCustomer?.phone})
            </Text>

            <TextInput
              style={[styles.input, styles.textArea, { marginVertical: 16 }]}
              placeholder="Enter test message"
              value={testMessage}
              onChangeText={setTestMessage}
              multiline
              numberOfLines={4}
            />

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => {
                  setTestMessage('');
                  setTestMessageModal(false);
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.sendBtn]}
                onPress={handleSendTestMessage}
                disabled={sendingTest}
              >
                {sendingTest ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.sendBtnText}>Send SMS</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#e50914',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    marginLeft: 12,
  },
  listContainer: {
    flex: 1,
    padding: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
    textAlign: 'center',
  },
  addBtn: {
    marginTop: 20,
    backgroundColor: '#e50914',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    backgroundColor: '#e50914',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
  },
  textArea: {
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  submitBtn: {
    backgroundColor: '#e50914',
    paddingVertical: 14,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 30,
    gap: 8,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  detailSection: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  testSMSBtn: {
    backgroundColor: '#27ae60',
    paddingVertical: 14,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 30,
    gap: 8,
  },
  testSMSBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  testMessageBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 500,
  },
  testMessageTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  testMessageSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#ddd',
  },
  cancelBtnText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
  },
  sendBtn: {
    backgroundColor: '#27ae60',
  },
  sendBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
