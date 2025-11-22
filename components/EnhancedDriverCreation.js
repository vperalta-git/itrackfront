import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { buildApiUrl } from '../constants/api';

const EnhancedDriverCreation = ({ visible, onClose, onDriverCreated }) => {
  const [driverData, setDriverData] = useState({
    username: '',
    password: '',
    accountName: '',
    email: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);

  const handleCreateDriver = async () => {
    if (!driverData.username || !driverData.password || !driverData.accountName) {
      Alert.alert('Missing Fields', 'Username, password, and account name are required.');
      return;
    }

    if (driverData.password.length < 6) {
      Alert.alert('Invalid Password', 'Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      console.log('🚗 Creating driver account with data:', driverData);
      
      const response = await fetch(buildApiUrl('/admin/create-driver'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(driverData),
      });

      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to create driver account');
      }

      Alert.alert(
        'Success!',
        `Driver account '${driverData.accountName}' created successfully!\n\nUsername: ${driverData.username}\nRole: Driver`,
        [
          {
            text: 'OK',
            onPress: () => {
              setDriverData({
                username: '',
                password: '',
                accountName: '',
                email: '',
                phone: ''
              });
              onClose();
              if (onDriverCreated) onDriverCreated(result.data);
            }
          }
        ]
      );
    } catch (error) {
      console.error('❌ Create driver error:', error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const generateUsername = () => {
    if (driverData.accountName) {
      const username = driverData.accountName
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[^a-z0-9]/g, '') + Math.floor(Math.random() * 100);
      setDriverData(prev => ({ ...prev, username }));
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Create Driver Account</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Driver Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={styles.input}
                value={driverData.accountName}
                onChangeText={(text) => setDriverData(prev => ({ ...prev, accountName: text }))}
                placeholder="Enter driver's full name"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username *</Text>
              <View style={styles.usernameRow}>
                <TextInput
                  style={[styles.input, styles.usernameInput]}
                  value={driverData.username}
                  onChangeText={(text) => setDriverData(prev => ({ ...prev, username: text.toLowerCase() }))}
                  placeholder="Enter username"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={generateUsername} style={styles.generateButton}>
                  <Text style={styles.generateButtonText}>Auto</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password *</Text>
              <TextInput
                style={styles.input}
                value={driverData.password}
                onChangeText={(text) => setDriverData(prev => ({ ...prev, password: text }))}
                placeholder="Enter password (min 6 characters)"
                placeholderTextColor="#94a3b8"
                secureTextEntry
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Information (Optional)</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={driverData.email}
                onChangeText={(text) => setDriverData(prev => ({ ...prev, email: text }))}
                placeholder="Enter email address"
                placeholderTextColor="#94a3b8"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={driverData.phone}
                onChangeText={(text) => setDriverData(prev => ({ ...prev, phone: text }))}
                placeholder="Enter phone number"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.note}>
              📝 This will create a new driver account that can be assigned vehicles and receive delivery tasks.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={handleCreateDriver} 
            style={[styles.createButton, loading && styles.disabledButton]}
            disabled={loading}
          >
            <Text style={styles.createButtonText}>
              {loading ? 'Creating...' : 'Create Driver'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#2563eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  closeButton: {
    padding: 10,
  },
  closeButtonText: {
    fontSize: 20,
    color: 'white',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 15,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    backgroundColor: 'white',
    color: '#1f2937',
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  usernameInput: {
    flex: 1,
    marginRight: 10,
  },
  generateButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderRadius: 10,
  },
  generateButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 14,
  },
  note: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 40,
    gap: 15,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#6b7280',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  createButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
});

export default EnhancedDriverCreation;
