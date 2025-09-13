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

export default function UserManagementScreen() {
  const [users, setUsers] = useState([]);
  const [managers, setManagers] = useState([]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [currentTab, setCurrentTab] = useState('all'); // 'all', 'agents', 'others'
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    role: 'Sales Agent',
    assignedTo: '',
    accountName: '',
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
      managerMap[m._id] = m.accountName || m.username;
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
    if (!newUser.username || !newUser.password || !newUser.accountName) {
      Alert.alert('Missing Fields', 'Please fill in all required fields.');
      return;
    }
    
    try {
      const res = await fetch(buildApiUrl('/createUser'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to create user');
      
      Alert.alert('Success', 'User created successfully!');
      setNewUser({ username: '', password: '', role: 'Sales Agent', assignedTo: '', accountName: '' });
      setShowAddUserModal(false);
      fetchUsers();
      fetchManagers();
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const handleDeleteUser = async (id, username) => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete user "${username}"?`,
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
      user.username?.toLowerCase().includes(userSearch.toLowerCase()) ||
      user.accountName?.toLowerCase().includes(userSearch.toLowerCase()) ||
      user.role?.toLowerCase().includes(userSearch.toLowerCase())
    );

    switch (currentTab) {
      case 'agents':
        return filteredUsers.filter(user => 
          user.role?.toLowerCase().includes('agent')
        );
      case 'others':
        return filteredUsers.filter(user => 
          !user.role?.toLowerCase().includes('agent')
        );
      default:
        return filteredUsers;
    }
  };

  const getRoleColor = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return { backgroundColor: '#CB1E2A', color: '#fff' };
      case 'manager':
        return { backgroundColor: '#8B0000', color: '#fff' };
      case 'sales agent':
        return { backgroundColor: '#2D2D2D', color: '#fff' };
      case 'driver':
        return { backgroundColor: '#000000', color: '#fff' };
      case 'supervisor':
        return { backgroundColor: '#CB1E2A', color: '#fff' };
      case 'dispatch':
        return { backgroundColor: '#8B0000', color: '#fff' };
      default:
        return { backgroundColor: '#6B7280', color: '#fff' };
    }
  };

  const renderUserCard = ({ item }) => {
    const roleStyle = getRoleColor(item.role);
    const assignedManager = managers.find(m => m._id === item.assignedTo);

    return (
      <View style={styles.userCard}>
        <View style={styles.userCardHeader}>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.accountName || item.username}</Text>
            <Text style={styles.userUsername}>@{item.username}</Text>
          </View>
          <View style={[styles.roleBadge, roleStyle]}>
            <Text style={[styles.roleBadgeText, { color: roleStyle.color }]}>
              {item.role}
            </Text>
          </View>
        </View>

        <View style={styles.userCardContent}>
          {assignedManager && (
            <View style={styles.userDetailRow}>
              <Text style={styles.userDetailLabel}>Manager:</Text>
              <Text style={styles.userDetailValue}>
                {assignedManager.accountName || assignedManager.username}
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
            onPress={() => {
              Alert.alert('Info', 'Edit functionality coming soon');
            }}
          >
            <Text style={styles.userActionBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.deleteUserBtn}
            onPress={() => handleDeleteUser(item._id, item.username)}
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
            placeholder="Search users by name, username, or role..."
            value={userSearch}
            onChangeText={setUserSearch}
            placeholderTextColor="#94a3b8"
          />
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, currentTab === 'all' && styles.activeTab]}
            onPress={() => setCurrentTab('all')}
          >
            <Text style={[styles.tabText, currentTab === 'all' && styles.activeTabText]}>
              All Users ({users.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, currentTab === 'agents' && styles.activeTab]}
            onPress={() => setCurrentTab('agents')}
          >
            <Text style={[styles.tabText, currentTab === 'agents' && styles.activeTabText]}>
              Agents ({users.filter(u => u.role?.toLowerCase().includes('agent')).length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, currentTab === 'others' && styles.activeTab]}
            onPress={() => setCurrentTab('others')}
          >
            <Text style={[styles.tabText, currentTab === 'others' && styles.activeTabText]}>
              Others ({users.filter(u => !u.role?.toLowerCase().includes('agent')).length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: '#CB1E2A' }]}>
            <Text style={styles.statNumber}>{users.length}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: '#8B0000' }]}>
            <Text style={styles.statNumber}>
              {users.filter(u => u.role?.toLowerCase().includes('agent')).length}
            </Text>
            <Text style={styles.statLabel}>Sales Agents</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: '#2D2D2D' }]}>
            <Text style={styles.statNumber}>
              {users.filter(u => u.role?.toLowerCase() === 'manager').length}
            </Text>
            <Text style={styles.statLabel}>Managers</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: '#000000' }]}>
            <Text style={styles.statNumber}>
              {users.filter(u => u.role?.toLowerCase() === 'driver').length}
            </Text>
            <Text style={styles.statLabel}>Drivers</Text>
          </View>
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
          <FlatList
            data={getFilteredUsers()}
            renderItem={renderUserCard}
            keyExtractor={(item) => item._id}
            showsVerticalScrollIndicator={false}
            scrollEnabled={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
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
                placeholder="Account Name"
                value={newUser.accountName}
                onChangeText={(text) => setNewUser({ ...newUser, accountName: text })}
                placeholderTextColor="#94a3b8"
              />

              <TextInput
                style={styles.modalInput}
                placeholder="Username"
                value={newUser.username}
                onChangeText={(text) => setNewUser({ ...newUser, username: text })}
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
              />

              <TextInput
                style={styles.modalInput}
                placeholder="Password"
                secureTextEntry
                value={newUser.password}
                onChangeText={(text) => setNewUser({ ...newUser, password: text })}
                placeholderTextColor="#94a3b8"
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
                          label={manager.accountName || manager.username} 
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
                    setNewUser({ username: '', password: '', role: 'Sales Agent', assignedTo: '', accountName: '' });
                  }}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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
    borderBottomColor: '#CB1E2A',
  },

  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#CB1E2A',
    flex: 1,
  },

  addUserButton: {
    backgroundColor: '#CB1E2A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },

  addUserButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },

  // Search Styles
  searchSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },

  searchInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#6B7280',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#2D2D2D',
  },

  // Tab Styles
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
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
    backgroundColor: '#CB1E2A',
  },

  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },

  activeTabText: {
    color: '#FFFFFF',
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
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F5F5F5',
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
    color: '#000000',
    marginBottom: 4,
  },

  userUsername: {
    fontSize: 14,
    color: '#6B7280',
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
    color: '#6B7280',
    fontWeight: '500',
  },

  userDetailValue: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '600',
  },

  userCardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },

  editUserBtn: {
    backgroundColor: '#CB1E2A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },

  deleteUserBtn: {
    backgroundColor: '#8B0000',
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
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },

  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },

  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 24,
    textAlign: 'center',
  },

  modalInput: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#6B7280',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#2D2D2D',
    marginBottom: 16,
  },

  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D2D2D',
    marginBottom: 8,
  },

  modalPickerContainer: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#6B7280',
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
    backgroundColor: '#6B7280',
  },

  modalButtonPrimary: {
    backgroundColor: '#CB1E2A',
  },

  modalButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
