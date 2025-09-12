import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Button,
  TextInput,
  StyleSheet,
  FlatList,
  Alert,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SupervisorDashboard() {
  const navigation = useNavigation();
  const [users, setUsers] = useState([]);
  const [managers, setManagers] = useState([]);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    role: 'Sales Agent', // Match backend roles exactly
    assignedTo: '',
    accountName: '',
  });

  // Fetch users from API
  const fetchUsers = async () => {
    try {
      const res = await fetch('https://itrack-backend-1.onrender.com/admin/users');
      const data = await res.json();
      setUsers(data);
    } catch (error) {
      console.error('Fetch users error:', error);
    }
  };

  // Fetch managers from API
  const fetchManagers = async () => {
    try {
      const res = await fetch('https://itrack-backend-1.onrender.com/admin/managers');
      const data = await res.json();
      setManagers(data);
    } catch (error) {
      console.error('Fetch managers error:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchManagers();
  }, []);

  // Create a map of manager IDs to names for easier grouping
  const managerMap = {};
  managers.forEach(m => {
    managerMap[m._id] = m.accountName;
  });

  // Group sales agents by manager name (or "Unassigned")
  const groupByManager = (users) => {
    const grouped = {};
    users.forEach(user => {
      if (
        user.role.toLowerCase() === 'sales agent' ||
        user.role.toLowerCase() === 'agent'
      ) {
        const managerName = managerMap[user.assignedTo] || 'Unassigned';
        if (!grouped[managerName]) {
          grouped[managerName] = [];
        }
        grouped[managerName].push(user);
      }
    });
    return grouped;
  };

  const groupedAgents = groupByManager(users);

  // Handle new user creation
  const handleCreateUser = async () => {
    if (!newUser.username || !newUser.password || !newUser.accountName) {
      Alert.alert('Validation Error', 'Please fill in all required fields.');
      return;
    }

    try {
      const res = await fetch('https://itrack-backend-1.onrender.com/admin/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error('❌ Error creating user:', data.message || 'Unknown error');
        Alert.alert('Error', data.message || 'Failed to create user');
        return;
      }

      if (data.success) {
        Alert.alert('User Created', 'New user has been created successfully');
        setNewUser({
          username: '',
          password: '',
          role: 'Sales Agent',
          assignedTo: '',
          accountName: '',
        });
        fetchUsers();
      } else {
        Alert.alert('Error', data.message || 'Failed to create user');
      }
    } catch (err) {
      console.error('Create user fetch error:', err);
      Alert.alert('Error', 'Server error while creating user');
    }
  };

  // Handle user deletion
  const handleDeleteUser = async (userId) => {
    try {
      const res = await fetch(`https://itrack-backend-1.onrender.com/admin/users/${userId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('User Deleted', 'User has been deleted successfully');
        fetchUsers();
      } else {
        Alert.alert('Error', data.message || 'Failed to delete user');
      }
    } catch (err) {
      console.error('Delete user error:', err);
      Alert.alert('Error', 'Server error while deleting user');
    }
  };

  // Logout handler: clears storage and navigates to Login
  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('role');
      await AsyncStorage.removeItem('accountName');
      // Add any other keys to clear here

      // Use the exact screen name you have in your navigator for login
      navigation.replace('Login'); 
    } catch (error) {
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header with Profile and Logout */}
      <View style={styles.headerContainer}>
        <TouchableOpacity
          onPress={() => navigation.navigate('UserProfile')}
          style={styles.profileButton}
        >
          <Text style={styles.profileButtonText}>👤 Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate('HistoryScreen')}
          style={styles.historyButton}
        >
          <Text style={styles.historyButtonText}>📚 History</Text>
        </TouchableOpacity>
        <Button title="Logout" color="#CB1E2A" onPress={handleLogout} />
      </View>

      <Text style={styles.header}>Supervisor Dashboard</Text>
      <Text style={styles.subHeader}>Manage Users</Text>

      <TextInput
        style={styles.input}
        placeholder="Username"
        value={newUser.username}
        onChangeText={(text) => setNewUser({ ...newUser, username: text })}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={newUser.password}
        onChangeText={(text) => setNewUser({ ...newUser, password: text })}
      />
      <TextInput
        style={styles.input}
        placeholder="Account Name"
        value={newUser.accountName}
        onChangeText={(text) => setNewUser({ ...newUser, accountName: text })}
      />

      <Text style={styles.label}>Role</Text>
      <Picker
        selectedValue={newUser.role}
        onValueChange={(itemValue) => setNewUser({ ...newUser, role: itemValue })}
        style={styles.input}
      >
        <Picker.Item label="Agent" value="Sales Agent" />
        <Picker.Item label="Manager" value="Manager" />
        <Picker.Item label="Supervisor" value="Supervisor" />
        <Picker.Item label="Admin" value="Admin" />
        <Picker.Item label="Driver" value="Driver" />
        <Picker.Item label="Dispatch" value="Dispatch" />
      </Picker>

      {/* Only show "Assign to Manager" for Sales Agent role */}
      {newUser.role === 'Sales Agent' && (
        <>
          <Text style={styles.label}>Assign to Manager</Text>
          <Picker
            selectedValue={newUser.assignedTo}
            onValueChange={(itemValue) => setNewUser({ ...newUser, assignedTo: itemValue })}
            style={styles.input}
          >
            <Picker.Item label="None" value="" />
            {managers.map((manager) => (
              <Picker.Item key={manager._id} label={manager.accountName} value={manager._id} />
            ))}
          </Picker>
        </>
      )}

      <Button title="Create User" onPress={handleCreateUser} />

      <FlatList
        data={Object.keys(groupedAgents)}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <View style={styles.userCard}>
            <Text style={styles.managerTitle}>{item}</Text>
            {groupedAgents[item].map((user) => (
              <View key={user._id} style={styles.userItem}>
                <View style={styles.userItemContent}>
                  <View style={styles.userAvatar}>
                    {user.profilePicture ? (
                      <Image 
                        source={{ uri: user.profilePicture }} 
                        style={styles.userAvatarImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.userAvatarPlaceholder}>
                        <Text style={styles.userAvatarText}>
                          {(user.accountName || user.username || 'U').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{user.username} ({user.role})</Text>
                    <Text style={styles.userAccount}>{user.accountName}</Text>
                    {user.email && <Text style={styles.userEmail}>{user.email}</Text>}
                  </View>
                </View>
                <Button title="Delete" color="red" onPress={() => handleDeleteUser(user._id)} />
              </View>
            ))}
          </View>
        )}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: '#fff' },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  profileButton: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6B7280',
  },
  profileButtonText: {
    color: '#CB1E2A',
    fontSize: 14,
    fontWeight: '600',
  },
  historyButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  historyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  header: { fontSize: 32, fontWeight: 'bold', color: '#CB1E2A', marginBottom: 20 },
  subHeader: { fontSize: 20, marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
    fontSize: 16,
  },
  userCard: {
    marginBottom: 15,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
  },
  userItem: { 
    marginTop: 10, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingVertical: 8,
  },
  userItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  userAvatar: {
    marginRight: 12,
  },
  userAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  userAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#CB1E2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D2D2D',
    marginBottom: 2,
  },
  userAccount: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 1,
  },
  userEmail: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  managerTitle: { fontWeight: 'bold', fontSize: 18 },
});
