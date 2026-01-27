import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
  FlatList,
  RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'https://itrack-web-backend.onrender.com/api';

const UNITS = [
  'Isuzu D-Max',
  'Isuzu MU-X',
  'Isuzu Traviz',
  'Isuzu QLR Series',
  'Isuzu NLR Series',
  'Isuzu NMR Series',
  'Isuzu NPR Series',
  'Isuzu NPS Series',
  'Isuzu NQR Series',
  'Isuzu FRR Series',
  'Isuzu FTR Series',
  'Isuzu FVR Series',
  'Isuzu FTS Series',
  'Isuzu FVM Series',
  'Isuzu FXM Series',
  'Isuzu GXZ Series',
  'Isuzu EXR Series',
];

const COLORS = ['White', 'Black', 'Gray', 'Blue', 'Orange', 'Red', 'Silver'];

const UNIT_VARIATIONS = {
  'Isuzu D-Max': ['Cab and Chassis', 'CC Utility Van Dual AC', '4x2 LT MT', '4x4 LT MT', '4x2 LS-A MT', '4x2 LS-A MT Plus', '4x2 LS-A AT', '4x2 LS-A AT Plus', '4x4 LS-A MT', '4x4 LS-A MT Plus', '4x2 LS-E AT', '4x4 LS-E AT', '4x4 Single Cab MT'],
  'Isuzu MU-X': ['1.9L MU-X 4x2 LS AT', '3.0L MU-X 4x2 LS-A AT', '3.0L MU-X 4x2 LS-E AT', '3.0L MU-X 4x4 LS-E AT'],
  'Isuzu Traviz': ['SWB 2.5L 4W 9FT Cab & Chassis', 'SWB 2.5L 4W 9FT Utility Van Dual AC', 'LWB 2.5L 4W 10FT Cab & Chassis', 'LWB 2.5L 4W 10FT Utility Van Dual AC', 'LWB 2.5L 4W 10FT Aluminum Van', 'LWB 2.5L 4W 10FT Aluminum Van w/ Single AC', 'LWB 2.5L 4W 10FT Dropside Body', 'LWB 2.5L 4W 10FT Dropside Body w/ Single AC'],
  'Isuzu QLR Series': ['QLR77 E Tilt 3.0L 4W 10ft 60A Cab & Chassis', 'QLR77 E Tilt Utility Van w/o AC', 'QLR77 E Non-Tilt 3.0L 4W 10ft 60A Cab & Chassis', 'QLR77 E Non-Tilt Utility Van w/o AC', 'QLR77 E Non-Tilt Utility Van Dual AC'],
  'Isuzu NLR Series': ['NLR77 H Tilt 3.0L 4W 14ft 60A', 'NLR77 H Jeepney Chassis (135A)', 'NLR85 Tilt 3.0L 4W 10ft 90A', 'NLR85E Smoother'],
  'Isuzu NMR Series': ['NMR85H Smoother', 'NMR85 H Tilt 3.0L 6W 14ft 80A Non-AC'],
  'Isuzu NPR Series': ['NPR85 Tilt 3.0L 6W 16ft 90A', 'NPR85 Cabless for Armored'],
  'Isuzu NPS Series': ['NPS75 H 3.0L 6W 16ft 90A'],
  'Isuzu NQR Series': ['NQR75L Smoother', 'NQR75 Tilt 5.2L 6W 18ft 90A'],
  'Isuzu FRR Series': ['FRR90M 6W 20ft 5.2L', 'FRR90M Smoother'],
  'Isuzu FTR Series': ['FTR90M 6W 19ft 5.2L'],
  'Isuzu FVR Series': ['FVR34Q Smoother', 'FVR 34Q 6W 24ft 7.8L w/ ABS'],
  'Isuzu FTS Series': ['FTS34 J', 'FTS34L'],
  'Isuzu FVM Series': ['FVM34T 10W 26ft 7.8L w/ ABS', 'FVM34W 10W 32ft 7.8L w/ ABS'],
  'Isuzu FXM Series': ['FXM60W'],
  'Isuzu GXZ Series': ['GXZ60N'],
  'Isuzu EXR Series': ['EXR77H 380PS 6W Tractor Head'],
};

export default function TestDriveScreen() {
  const [userRole, setUserRole] = useState('');
  const [userName, setUserName] = useState('');

  const [inventory, setInventory] = useState([]);
  const [testDrives, setTestDrives] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Add inventory modal
  const [showAddInventory, setShowAddInventory] = useState(false);
  const [addInvForm, setAddInvForm] = useState({ unitName: '', unitId: '', color: '', variation: '' });
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);
  const [showVariationDropdown, setShowVariationDropdown] = useState(false);
  const [showColorDropdown, setShowColorDropdown] = useState(false);

  // Schedule modal
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    vehicleId: '',
    date: new Date().toISOString().split('T')[0],
    time: '09:00',
    customerName: '',
    customerContact: '',
  });

  // Auth token
  const [authToken, setAuthToken] = useState(null);

  useEffect(() => {
    // Load user info first to retrieve JWT token
    loadUserInfo();
  }, []);

  // Once the auth token is available, run protected fetches
  useEffect(() => {
    if (authToken) {
      console.log('🔑 Token ready — fetching protected resources');
      fetchInventory();
      fetchTestDrives();
    } else {
      console.log('⏳ Waiting for auth token before protected fetches');
    }
  }, [authToken]);

  const loadUserInfo = async () => {
    const role = (await AsyncStorage.getItem('role')) || 'agent';
    const name = (await AsyncStorage.getItem('accountName')) || 'User';
    const token = (await AsyncStorage.getItem('token')) || null;
    setUserRole(role.toLowerCase());
    setUserName(name);
    setAuthToken(token);
    console.log('🔐 Auth token loaded:', token ? 'Present' : 'Missing');
  };

  // Helper to build fetch headers with auth
  const getHeaders = (additionalHeaders = {}) => {
    const headers = { 'Content-Type': 'application/json', ...additionalHeaders };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    return headers;
  };

  const fetchInventory = async () => {
    try {
      if (!authToken) {
        throw new Error('No authentication token available');
      }
      console.log('🔄 Fetching inventory from:', `${API_BASE}/getTestDriveInv`);
      const res = await fetch(`${API_BASE}/getTestDriveInv`, {
        headers: getHeaders(),
      });
      console.log('Response status:', res.status);
      if (res.status === 401) {
        throw new Error('Authentication failed - please log in again');
      }
      const data = await res.json();
      console.log('Inventory data received:', data);
      const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
      console.log('Parsed inventory list:', list);
      setInventory(list);
    } catch (err) {
      console.error('❌ Fetch inventory error:', err);
      Alert.alert('Error', `Failed to load inventory: ${err.message}`);
    }
  };

  const fetchTestDrives = async () => {
    setLoading(true);
    try {
      console.log('🔄 Fetching test drives from:', `${API_BASE}/getAllTestDrives`);
      const res = await fetch(`${API_BASE}/getAllTestDrives`, {
        headers: getHeaders(),
      });
      console.log('Response status:', res.status);
      if (res.status === 401) {
        throw new Error('Authentication failed - please log in again');
      }
      const data = await res.json();
      console.log('Test drives data received:', data);
      const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
      console.log('Parsed test drives list:', list);
      setTestDrives(list);
    } catch (err) {
      console.error('❌ Fetch test drives error:', err);
      Alert.alert('Error', `Failed to load test drives: ${err.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAddInventory = async () => {
    const { unitName, unitId, color, variation } = addInvForm;
    if (!unitName || !unitId || !color || !variation) {
      Alert.alert('Missing fields', 'Please fill all required fields.');
      return;
    }

    try {
      const payload = {
        unitName2: unitName,
        unitId2: unitId,
        bodyColor2: color,
        variation2: variation,
      };
      console.log('📤 Adding inventory with payload:', payload);
      const res = await fetch(`${API_BASE}/createTestDriveInv`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      console.log('Response status:', res.status);
      const result = await res.json();
      console.log('Response data:', result);

      if (res.status === 401) throw new Error('Authentication failed - please log in again');
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${result.error || 'Unknown error'}`);

      Alert.alert('Success', 'Unit added to inventory');
      setAddInvForm({ unitName: '', unitId: '', color: '', variation: '' });
      setShowAddInventory(false);
      fetchInventory();
    } catch (err) {
      console.error('❌ Add inventory error:', err);
      Alert.alert('Error', `Failed to add unit: ${err.message}`);
    }
  };

  const handleDeleteInventory = (id, name) => {
    Alert.alert('Delete Unit', `Remove "${name}" from inventory?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await fetch(`${API_BASE}/deleteTestDriveInv/${id}`, {
              method: 'DELETE',
              headers: getHeaders(),
            });
            if (res.status === 401) throw new Error('Authentication failed - please log in again');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            fetchInventory();
          } catch (err) {
            Alert.alert('Error', 'Failed to delete unit');
          }
        },
      },
    ]);
  };

  const handleScheduleTestDrive = async () => {
    const { vehicleId, date, time, customerName, customerContact } = scheduleForm;
    if (!vehicleId || !date || !time || !customerName || !customerContact) {
      Alert.alert('Missing fields', 'Please fill all required fields.');
      return;
    }

    try {
      const payload = {
        vehicleId,
        date,
        time,
        name: customerName,
        contact: customerContact,
        createdBy: userName,
      };
      console.log('📅 Scheduling test drive:', payload);
      const res = await fetch(`${API_BASE}/createTestDrive`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });
      console.log('Response status:', res.status);
      const result = await res.json();
      console.log('Response data:', result);
      if (res.status === 401) throw new Error('Authentication failed - please log in again');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      Alert.alert('Success', 'Test drive scheduled');
      setScheduleForm({
        vehicleId: '',
        date: new Date().toISOString().split('T')[0],
        time: '09:00',
        customerName: '',
        customerContact: '',
      });
      setShowScheduleModal(false);
      fetchTestDrives();
    } catch (err) {
      Alert.alert('Error', `Failed to schedule: ${err.message}`);
    }
  };

  const handleDeleteTestDrive = (id) => {
    Alert.alert('Delete Test Drive', 'Remove this scheduled test drive?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await fetch(`${API_BASE}/deleteTestDrive/${id}`, {
              method: 'DELETE',
              headers: getHeaders(),
            });
            if (res.status === 401) throw new Error('Authentication failed - please log in again');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            fetchTestDrives();
          } catch (err) {
            Alert.alert('Error', 'Failed to delete test drive');
          }
        },
      },
    ]);
  };

  const renderInventoryCard = (item) => (
    <View key={item._id} style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{item.unitName2 || 'Unit'}</Text>
        <View style={styles.badgeContainer}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.variation2 || 'N/A'}</Text>
          </View>
          <View style={styles.badgeSecondary}>
            <Text style={styles.badgeSecondaryText}>{item.bodyColor2 || 'N/A'}</Text>
          </View>
        </View>
        <Text style={styles.cardSub}>ID: {item.unitId2}</Text>
      </View>
      {userRole === 'admin' && (
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => handleDeleteInventory(item._id, item.unitName2)}
        >
          <MaterialIcons name="delete" size={18} color="#dc2626" />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderTestDriveCard = (item) => {
    const invItem = inventory.find((i) => i._id === item.vehicleId);
    const canDelete = userRole === 'admin' || userRole === 'agent';

    return (
      <View key={item._id} style={styles.card}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{invItem?.unitName2 || 'Unit Not Found'}</Text>
          <View style={styles.badgeContainer}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{invItem?.variation2 || 'N/A'}</Text>
            </View>
            <View style={styles.badgeSecondary}>
              <Text style={styles.badgeSecondaryText}>{invItem?.bodyColor2 || 'N/A'}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <MaterialIcons name="event" size={14} color="#666" />
              <Text style={styles.metaText}>{item.date}</Text>
            </View>
            <View style={styles.metaItem}>
              <MaterialIcons name="schedule" size={14} color="#666" />
              <Text style={styles.metaText}>{item.time}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <MaterialIcons name="person" size={14} color="#666" />
              <Text style={styles.metaText}>{item.name}</Text>
            </View>
            <View style={styles.metaItem}>
              <MaterialIcons name="call" size={14} color="#666" />
              <Text style={styles.metaText}>{item.contact}</Text>
            </View>
          </View>
        </View>
        {canDelete && (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDeleteTestDrive(item._id)}
          >
            <MaterialIcons name="delete" size={18} color="#dc2626" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const Dropdown = ({ title, selected, options, onSelect, visible, onToggle }) => (
    <View>
      <Text style={styles.label}>{title}</Text>
      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={onToggle}
      >
        <Text style={styles.dropdownButtonText}>{selected || `Select ${title}`}</Text>
        <MaterialIcons name={visible ? 'expand-less' : 'expand-more'} size={20} color="#666" />
      </TouchableOpacity>
      {visible && (
        <ScrollView style={styles.dropdownList} nestedScrollEnabled>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={styles.dropdownItem}
              onPress={() => {
                onSelect(opt);
                onToggle();
              }}
            >
              <Text style={styles.dropdownItemText}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={[]}
        renderItem={null}
        keyExtractor={() => 'key'}
        ListHeaderComponent={
          <View>
            {/* INVENTORY SECTION */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Test Drive Inventory</Text>
                {userRole === 'admin' && (
                  <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => setShowAddInventory(true)}
                  >
                    <MaterialIcons name="add" size={18} color="#fff" />
                    <Text style={styles.addBtnText}>Add</Text>
                  </TouchableOpacity>
                )}
              </View>
              {inventory.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>No units in inventory</Text>
                </View>
              ) : (
                inventory.map((item) => renderInventoryCard(item))
              )}
            </View>

            {/* TEST DRIVES SECTION */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Scheduled Test Drives</Text>
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={() => setShowScheduleModal(true)}
                >
                  <MaterialIcons name="add" size={18} color="#fff" />
                  <Text style={styles.addBtnText}>Schedule</Text>
                </TouchableOpacity>
              </View>
              {loading ? (
                <ActivityIndicator size="large" color="#dc2626" style={{ marginVertical: 20 }} />
              ) : testDrives.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>No test drives scheduled</Text>
                </View>
              ) : (
                testDrives.map((item) => renderTestDriveCard(item))
              )}
            </View>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              if (authToken) {
                fetchInventory();
                fetchTestDrives();
              } else {
                // Reload user info to get token; effect will trigger fetches
                loadUserInfo();
              }
            }}
          />
        }
      />

      {/* ADD INVENTORY MODAL */}
      <Modal visible={showAddInventory} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Test Drive Unit</Text>
              <TouchableOpacity onPress={() => setShowAddInventory(false)}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Dropdown
                title="Unit Name *"
                selected={addInvForm.unitName}
                options={UNITS}
                onSelect={(unit) => {
                  setAddInvForm({ ...addInvForm, unitName: unit, variation: '' });
                  setShowUnitDropdown(false);
                }}
                visible={showUnitDropdown}
                onToggle={() => setShowUnitDropdown(!showUnitDropdown)}
              />

              <Dropdown
                title="Variation *"
                selected={addInvForm.variation}
                options={UNIT_VARIATIONS[addInvForm.unitName] || []}
                onSelect={(v) => {
                  setAddInvForm({ ...addInvForm, variation: v });
                  setShowVariationDropdown(false);
                }}
                visible={showVariationDropdown}
                onToggle={() => setShowVariationDropdown(!showVariationDropdown)}
              />

              <Dropdown
                title="Color *"
                selected={addInvForm.color}
                options={COLORS}
                onSelect={(c) => {
                  setAddInvForm({ ...addInvForm, color: c });
                  setShowColorDropdown(false);
                }}
                visible={showColorDropdown}
                onToggle={() => setShowColorDropdown(!showColorDropdown)}
              />

              <Text style={styles.label}>Conduction Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., HF3790"
                value={addInvForm.unitId}
                onChangeText={(text) => setAddInvForm({ ...addInvForm, unitId: text })}
              />
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setShowAddInventory(false);
                  setAddInvForm({ unitName: '', unitId: '', color: '', variation: '' });
                  setShowUnitDropdown(false);
                  setShowVariationDropdown(false);
                  setShowColorDropdown(false);
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAddInventory}>
                <Text style={styles.saveBtnText}>Add Unit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* SCHEDULE TEST DRIVE MODAL */}
      <Modal visible={showScheduleModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Schedule Test Drive</Text>
              <TouchableOpacity onPress={() => setShowScheduleModal(false)}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>Vehicle *</Text>
              <ScrollView style={styles.vehicleList}>
                {inventory.length === 0 ? (
                  <Text style={styles.emptyText}>No units available</Text>
                ) : (
                  inventory.map((unit) => (
                    <TouchableOpacity
                      key={unit._id}
                      style={[
                        styles.vehicleItem,
                        scheduleForm.vehicleId === unit._id && styles.vehicleItemSelected,
                      ]}
                      onPress={() =>
                        setScheduleForm({ ...scheduleForm, vehicleId: unit._id })
                      }
                    >
                      <View>
                        <Text style={styles.vehicleItemTitle}>{unit.unitName2}</Text>
                        <Text style={styles.vehicleItemSub}>
                          {unit.variation2} • {unit.bodyColor2}
                        </Text>
                      </View>
                      {scheduleForm.vehicleId === unit._id && (
                        <MaterialIcons name="check-circle" size={20} color="#dc2626" />
                      )}
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>

              <Text style={styles.label}>Date *</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={scheduleForm.date}
                onChangeText={(text) => setScheduleForm({ ...scheduleForm, date: text })}
              />

              <Text style={styles.label}>Time *</Text>
              <TextInput
                style={styles.input}
                placeholder="HH:MM"
                value={scheduleForm.time}
                onChangeText={(text) => setScheduleForm({ ...scheduleForm, time: text })}
              />

              <Text style={styles.label}>Customer Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Full name"
                value={scheduleForm.customerName}
                onChangeText={(text) => setScheduleForm({ ...scheduleForm, customerName: text })}
              />

              <Text style={styles.label}>Contact Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="09xxxxxxxxx"
                keyboardType="phone-pad"
                value={scheduleForm.customerContact}
                onChangeText={(text) => setScheduleForm({ ...scheduleForm, customerContact: text })}
              />
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setShowScheduleModal(false);
                  setScheduleForm({
                    vehicleId: '',
                    date: new Date().toISOString().split('T')[0],
                    time: '09:00',
                    customerName: '',
                    customerContact: '',
                  });
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleScheduleTestDrive}>
                <Text style={styles.saveBtnText}>Schedule</Text>
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
    backgroundColor: '#f8f9fa',
  },
  section: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dc2626',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
  cardSub: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  badge: {
    backgroundColor: '#eef2ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#4338ca',
    fontWeight: '600',
    fontSize: 12,
  },
  badgeSecondary: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeSecondaryText: {
    color: '#0f172a',
    fontWeight: '600',
    fontSize: 12,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#666',
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
  modalBody: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
    marginBottom: 6,
    marginTop: 12,
  },
  dropdownButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownButtonText: {
    fontSize: 14,
    color: '#111',
    fontWeight: '500',
  },
  dropdownList: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginTop: 4,
    maxHeight: 200,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dropdownItemText: {
    fontSize: 13,
    color: '#111',
  },
  input: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111',
  },
  vehicleList: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    maxHeight: 200,
  },
  vehicleItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vehicleItemSelected: {
    backgroundColor: '#fee2e2',
  },
  vehicleItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
  },
  vehicleItemSub: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  cancelBtn: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  cancelBtnText: {
    color: '#374151',
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
});
