import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { buildApiUrl } from '../constants/api';
import { useTheme } from '../context/ThemeContext';

export default function UserManagementScreen() {
  const { theme, isDarkMode } = useTheme();
  const styles = createStyles(theme);
  const [users, setUsers] = useState([]);
  const [managers, setManagers] = useState([]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [currentTab, setCurrentTab] = useState('all'); // 'all', 'agents', 'others'
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    phoneNo: '',
    password: '',
    role: 'Sales Agent',
    assignedTo: '',
    picture: '',
  });
  const [editUser, setEditUser] = useState({
    _id: '',
    name: '',
    email: '',
    phoneNo: '',
    password: '',
    role: 'Sales Agent',
    assignedTo: '',
    picture: '',
  });

  const fetchUsers = async () => {
    try {
      const res = await fetch(buildApiUrl('/getUsers'));
      const data = await res.json();
      console.log('Users response:', data); // Debug log
      
      if (data.success && Array.isArray(data.data)) {
        setUsers(data.data);
      } else {
        console.error('Invalid users response format:', data);
        setUsers([]);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setUsers([]);
    }
  };

  const fetchManagers = async () => {
    try {
      const res = await fetch(buildApiUrl('/getUsers'));
      const data = await res.json();
      console.log('Managers response:', data); // Debug log
      
      if (data.success && Array.isArray(data.data)) {
        const managerList = data.data.filter(u => u.role && u.role.toLowerCase() === 'manager');
        setManagers(managerList);
      } else {
        console.error('Invalid managers response format:', data);
        setManagers([]);
      }
    } catch (err) {
      console.error('Error fetching managers:', err.message);
      setManagers([]);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchManagers();
  }, []);

  // map managers for grouping agents
  const managerMap = {};
  if (Array.isArray(managers)) {
    managers.forEach((m) => {
      managerMap[m._id] = m.accountName || m.name || 'Unnamed Manager';
    });
  }

  // group only agents, but keep other roles in another bucket
  const groupedAgents = {};
  const otherUsers = [];

  if (Array.isArray(users)) {
    users.forEach((user) => {
      const role = user.role?.toLowerCase() || '';
      if (role === 'sales agent' || role === 'agent') {
        const managerName = managerMap[user.assignedTo] || 'Unassigned';
        if (!groupedAgents[managerName]) groupedAgents[managerName] = [];
        groupedAgents[managerName].push(user);
      } else {
        otherUsers.push(user);
      }
    });
  }

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      Alert.alert('Missing Fields', 'Please fill in name, email, and password.');
      return;
    }
    
    try {
      // Generate username from name (lowercase, no spaces)
      const username = newUser.name.toLowerCase().replace(/\s+/g, '');
      
      // Prepare data for backend (backend expects username and accountName)
      const userData = {
        username: username,
        accountName: newUser.name,
        email: newUser.email,
        password: newUser.password,
        role: newUser.role,
        assignedTo: newUser.assignedTo,
      };

      const res = await fetch(buildApiUrl('/createUser'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to create user');
      
      Alert.alert('Success', 'User created successfully!');
      setNewUser({ name: '', email: '', phoneNo: '', password: '', role: 'Sales Agent', assignedTo: '', picture: '' });
      setShowAddUserModal(false);
      fetchUsers();
      fetchManagers();
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const handleEditUser = (user) => {
    setEditUser({
      _id: user._id,
      name: user.accountName || user.name || '',
      email: user.email || '',
      phoneNo: user.phoneNo || '',
      password: user.password || '',
      role: user.role || 'Sales Agent',
      assignedTo: user.assignedTo || '',
      picture: user.picture || '',
    });
    setShowEditUserModal(true);
  };

  const handleUpdateUser = async () => {
    if (!editUser.name || !editUser.email) {
      Alert.alert('Missing Fields', 'Please fill in name and email.');
      return;
    }
    
    try {
      // Backend expects accountName instead of name
      const updateData = {
        accountName: editUser.name,
        email: editUser.email,
        phoneNo: editUser.phoneNo,
        role: editUser.role,
        assignedTo: editUser.assignedTo,
        picture: editUser.picture,
      };

      // Note: Backend doesn't allow password updates through updateUser endpoint
      // Password field is removed by backend for security

      const res = await fetch(buildApiUrl(`/updateUser/${editUser._id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to update user');
      
      Alert.alert('Success', 'User updated successfully!');
      setEditUser({ _id: '', name: '', email: '', phoneNo: '', password: '', role: 'Sales Agent', assignedTo: '', picture: '' });
      setShowEditUserModal(false);
      fetchUsers();
      fetchManagers();
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const handleDeleteUser = async (id, name) => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete user "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(buildApiUrl(`/deleteUser/${id}`), {
                method: 'DELETE',
              });
              const data = await res.json();
              if (!data.success) throw new Error(data.message);
              Alert.alert('Success', 'User deleted successfully');
              fetchUsers();
              fetchManagers();
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  // Filter users based on search and tab
  const getFilteredUsers = () => {
    let filteredUsers = users.filter(user =>
      user.accountName?.toLowerCase().includes(userSearch.toLowerCase()) ||
      user.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      user.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
      user.phoneNo?.toLowerCase().includes(userSearch.toLowerCase()) ||
      user.role?.toLowerCase().includes(userSearch.toLowerCase())
    );

    switch (currentTab) {
      case 'agents':
        return filteredUsers.filter(user => 
          user.role?.toLowerCase().includes('agent')
        );
      case 'managers':
        return filteredUsers.filter(user => 
          user.role?.toLowerCase() === 'manager'
        );
      case 'drivers':
        return filteredUsers.filter(user => 
          user.role?.toLowerCase() === 'driver'
        );
      default:
        return filteredUsers;
    }
  };

  const getRoleColor = (role) => {
    // Use uniform primary color for all roles
    return { backgroundColor: theme.primary, color: theme.buttonText };
  };

  const renderUserCard = ({ item }) => {
    const roleStyle = getRoleColor(item.role);
    const assignedManager = managers.find(m => m._id === item.assignedTo);

    return (
      <View style={styles.userCard}>
        <View style={styles.userCardHeader}>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.accountName || item.name || 'No Name'}</Text>
            <Text style={styles.userUsername}>{item.email || 'no-email'}</Text>
          </View>
          <View style={[styles.roleBadge, roleStyle]}>
            <Text style={[styles.roleBadgeText, { color: roleStyle.color }]}>
              {item.role || 'No Role'}
            </Text>
          </View>
        </View>

        <View style={styles.userCardContent}>
          {item.phoneNo && (
            <View style={styles.userDetailRow}>
              <Text style={styles.userDetailLabel}>Phone:</Text>
              <Text style={styles.userDetailValue}>{item.phoneNo}</Text>
            </View>
          )}

          {assignedManager && (
            <View style={styles.userDetailRow}>
              <Text style={styles.userDetailLabel}>Manager:</Text>
              <Text style={styles.userDetailValue}>
                {assignedManager.accountName || assignedManager.name || 'Unnamed Manager'}
              </Text>
            </View>
          )}
          
          <View style={styles.userDetailRow}>
            <Text style={styles.userDetailLabel}>Created:</Text>
            <Text style={styles.userDetailValue}>
              {new Date(item.createdAt || Date.now()).toLocaleDateString()}
            </Text>
          </View>
        </View>

        <View style={styles.userCardActions}>
          <TouchableOpacity 
            style={styles.editUserBtn}
            onPress={() => handleEditUser(item)}
          >
            <Text style={styles.userActionBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.deleteUserBtn}
            onPress={() => handleDeleteUser(item._id, item.name)}
          >
            <Text style={styles.userActionBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.header}>User Management</Text>
          <TouchableOpacity
            style={styles.addUserButton}
            onPress={() => setShowAddUserModal(true)}
          >
            <Text style={styles.addUserButtonText}>+ Add User</Text>
          </TouchableOpacity>
        </View>

        {/* Search Section */}
        <View style={styles.searchSection}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, username, or role..."
            value={userSearch}
            onChangeText={setUserSearch}
            placeholderTextColor={theme.textTertiary}
          />
        </View>

        {/* Stats Cards - Now Pressable for Filtering */}
        <View style={styles.statsContainer}>
          <TouchableOpacity 
            style={[styles.statCard, { backgroundColor: theme.primary }, currentTab === 'all' && styles.activeStatCard]}
            onPress={() => setCurrentTab('all')}
          >
            <Text style={styles.statNumber}>{users.length}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.statCard, { backgroundColor: theme.primary }, currentTab === 'agents' && styles.activeStatCard]}
            onPress={() => setCurrentTab('agents')}
          >
            <Text style={styles.statNumber}>
              {users.filter(u => u.role?.toLowerCase().includes('agent')).length}
            </Text>
            <Text style={styles.statLabel}>Sales Agents</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.statCard, { backgroundColor: theme.primary }, currentTab === 'managers' && styles.activeStatCard]}
            onPress={() => setCurrentTab('managers')}
          >
            <Text style={styles.statNumber}>
              {users.filter(u => u.role?.toLowerCase() === 'manager').length}
            </Text>
            <Text style={styles.statLabel}>Managers</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.statCard, { backgroundColor: theme.primary }, currentTab === 'drivers' && styles.activeStatCard]}
            onPress={() => setCurrentTab('drivers')}
          >
            <Text style={styles.statNumber}>
              {users.filter(u => u.role?.toLowerCase() === 'driver').length}
            </Text>
            <Text style={styles.statLabel}>Drivers</Text>
          </TouchableOpacity>
        </View>

        {/* Users List */}
        {getFilteredUsers().length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No users found</Text>
            <Text style={styles.emptySubtext}>
              {userSearch ? 'Try adjusting your search terms' : 'Add your first user to get started'}
            </Text>
          </View>
        ) : (
          <View style={{ paddingBottom: 20 }}>
            {getFilteredUsers().map((item) => (
              <View key={item._id}>
                {renderUserCard({ item })}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add User Modal */}
      <Modal visible={showAddUserModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalKeyboardView}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Add New User</Text>

              <TextInput
                style={styles.modalInput}
                placeholder="Name"
                value={newUser.name}
                onChangeText={(text) => setNewUser({ ...newUser, name: text })}
                placeholderTextColor={theme.textTertiary}
              />

              <TextInput
                style={styles.modalInput}
                placeholder="Email"
                value={newUser.email}
                onChangeText={(text) => setNewUser({ ...newUser, email: text })}
                placeholderTextColor={theme.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <TextInput
                style={styles.modalInput}
                placeholder="Phone Number"
                value={newUser.phoneNo}
                onChangeText={(text) => setNewUser({ ...newUser, phoneNo: text })}
                placeholderTextColor={theme.textTertiary}
                keyboardType="phone-pad"
              />

              <TextInput
                style={styles.modalInput}
                placeholder="Password"
                secureTextEntry
                value={newUser.password}
                onChangeText={(text) => setNewUser({ ...newUser, password: text })}
                placeholderTextColor={theme.textTertiary}
              />

              <Text style={styles.modalLabel}>Role</Text>
              <View style={styles.modalPickerContainer}>
                <Picker
                  selectedValue={newUser.role}
                  onValueChange={(val) => setNewUser({ ...newUser, role: val })}
                  style={styles.modalPicker}
                >
                  <Picker.Item label="Sales Agent" value="Sales Agent" />
                  <Picker.Item label="Manager" value="Manager" />
                  <Picker.Item label="Supervisor" value="Supervisor" />
                  <Picker.Item label="Admin" value="Admin" />
                  <Picker.Item label="Driver" value="Driver" />
                  <Picker.Item label="Dispatch" value="Dispatch" />
                </Picker>
              </View>

              {/* Only show "Assign to Manager" for Sales Agent role */}
              {newUser.role === 'Sales Agent' && (
                <>
                  <Text style={styles.modalLabel}>Assign to Manager</Text>
                  <View style={styles.modalPickerContainer}>
                    <Picker
                      selectedValue={newUser.assignedTo}
                      onValueChange={(val) => setNewUser({ ...newUser, assignedTo: val })}
                      style={styles.modalPicker}
                    >
                      <Picker.Item label="None" value="" />
                      {managers.map((manager) => (
                        <Picker.Item 
                          key={manager._id} 
                          label={manager.accountName || manager.name || 'Unnamed Manager'} 
                          value={manager._id} 
                        />
                      ))}
                    </Picker>
                  </View>
                </>
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.modalButtonPrimary]} 
                  onPress={handleCreateUser}
                >
                  <Text style={styles.modalButtonText}>Create User</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => {
                    setShowAddUserModal(false);
                    setNewUser({ name: '', email: '', phoneNo: '', password: '', role: 'Sales Agent', assignedTo: '', picture: '' });
                  }}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        visible={showEditUserModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditUserModal(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalKeyboardView}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit User</Text>

              <Text style={styles.modalLabel}>Name</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter name"
                value={editUser.name}
                onChangeText={(text) => setEditUser({ ...editUser, name: text })}
                placeholderTextColor={theme.textTertiary}
              />

              <Text style={styles.modalLabel}>Email</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter email"
                value={editUser.email}
                onChangeText={(text) => setEditUser({ ...editUser, email: text })}
                placeholderTextColor={theme.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.modalLabel}>Phone Number</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter phone number"
                value={editUser.phoneNo}
                onChangeText={(text) => setEditUser({ ...editUser, phoneNo: text })}
                placeholderTextColor={theme.textTertiary}
                keyboardType="phone-pad"
              />

              <Text style={styles.modalLabel}>Password</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter password (leave blank to keep current)"
                value={editUser.password}
                onChangeText={(text) => setEditUser({ ...editUser, password: text })}
                placeholderTextColor={theme.textTertiary}
                secureTextEntry
              />

              <Text style={styles.modalLabel}>Role</Text>
              <View style={styles.modalPickerContainer}>
                <Picker
                  selectedValue={editUser.role}
                  style={styles.modalPicker}
                  onValueChange={(itemValue) => setEditUser({ ...editUser, role: itemValue })}
                >
                  <Picker.Item label="Sales Agent" value="Sales Agent" />
                  <Picker.Item label="Manager" value="Manager" />
                  <Picker.Item label="Admin" value="Admin" />
                  <Picker.Item label="Driver" value="Driver" />
                </Picker>
              </View>

              {editUser.role === 'Sales Agent' && (
                <>
                  <Text style={styles.modalLabel}>Assign to Manager</Text>
                  <View style={styles.modalPickerContainer}>
                    <Picker
                      selectedValue={editUser.assignedTo}
                      style={styles.modalPicker}
                      onValueChange={(itemValue) => setEditUser({ ...editUser, assignedTo: itemValue })}
                    >
                      <Picker.Item label="Select Manager" value="" />
                      {managers.map((manager) => (
                        <Picker.Item
                          key={manager._id}
                          label={manager.accountName || manager.name || 'Unnamed Manager'}
                          value={manager._id}
                        />
                      ))}
                    </Picker>
                  </View>
                </>
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => {
                    setShowEditUserModal(false);
                    setEditUser({ _id: '', name: '', email: '', phoneNo: '', password: '', role: 'Sales Agent', assignedTo: '', picture: '' });
                  }}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonPrimary]}
                  onPress={handleUpdateUser}
                >
                  <Text style={styles.modalButtonText}>Update User</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.surface,
  },
  
  scrollView: {
    flex: 1,
  },

  // Header Styles
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    margin: 16,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: theme.primary,
  },

  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.primary,
    flex: 1,
  },

  addUserButton: {
    backgroundColor: theme.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },

  addUserButtonText: {
    color: theme.buttonText,
    fontWeight: '600',
    fontSize: 14,
  },

  // Search Styles
  searchSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },

  searchInput: {
    backgroundColor: theme.inputBackground,
    borderWidth: 1.5,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: theme.text,
    minHeight: 52,
    fontWeight: '500',
  },

  // Tab Styles
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: theme.card,
    borderRadius: 12,
    padding: 4,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
  },

  activeTab: {
    backgroundColor: theme.primary,
  },

  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textSecondary,
    textAlign: 'center',
  },

  activeTabText: {
    color: theme.buttonText,
  },

  // Stats Styles
  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },

  statCard: {
    flex: 1,
    backgroundColor: theme.secondary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  activeStatCard: {
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    transform: [{ scale: 1.05 }],
  },

  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },

  statLabel: {
    fontSize: 12,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.9,
  },

  // User Card Styles
  userCard: {
    backgroundColor: theme.card,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: theme.border,
  },

  userCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },

  userInfo: {
    flex: 1,
  },

  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 4,
  },

  userUsername: {
    fontSize: 14,
    color: theme.textSecondary,
  },

  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 12,
  },

  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  userCardContent: {
    gap: 8,
    marginBottom: 16,
  },

  userDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  userDetailLabel: {
    fontSize: 14,
    color: theme.textSecondary,
    fontWeight: '500',
  },

  userDetailValue: {
    fontSize: 14,
    color: theme.text,
    fontWeight: '600',
  },

  userCardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },

  editUserBtn: {
    backgroundColor: theme.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },

  deleteUserBtn: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },

  userActionBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },

  // Empty State Styles
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginHorizontal: 16,
  },

  emptyText: {
    fontSize: 18,
    color: theme.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },

  emptySubtext: {
    fontSize: 14,
    color: theme.textSecondary,
    textAlign: 'center',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.modalOverlay,
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalKeyboardView: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },

  modalContent: {
    backgroundColor: theme.background,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },

  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 24,
    textAlign: 'center',
  },

  modalInput: {
    backgroundColor: theme.inputBackground,
    borderWidth: 1.5,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: theme.text,
    marginBottom: 16,
    minHeight: 52,
    fontWeight: '500',
  },

  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 8,
  },

  modalPickerContainer: {
    backgroundColor: theme.inputBackground,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    marginBottom: 16,
  },

  modalPicker: {
    height: 50,
  },

  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },

  modalButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },

  modalButtonCancel: {
    backgroundColor: theme.buttonSecondary,
  },

  modalButtonPrimary: {
    backgroundColor: theme.primary,
  },

  modalButtonText: {
    color: theme.buttonText,
    fontWeight: '700',
    fontSize: 16,
  },
});
