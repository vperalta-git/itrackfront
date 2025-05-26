import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Button, TextInput, StyleSheet, FlatList, Alert, Picker } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function AdminDashboard() {
  const navigation = useNavigation();
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ username: '', accountName: '', role: 'salesAgent', assignedTo: '' });
  const [passwordChange, setPasswordChange] = useState({ username: '', newPassword: '' });
  const [managers, setManagers] = useState([]);

  // Fetch users from the database
  const fetchUsers = async () => {
    try {
      const res = await fetch('http://192.168.254.147:5000/admin/users');
      const data = await res.json();
      setUsers(data);
    } catch (error) {
      console.error(error);
    }
  };

  // Fetch all managers to assign sales agents
  const fetchManagers = async () => {
    try {
      const res = await fetch('http://192.168.254.147:5000/admin/managers');
      const data = await res.json();
      setManagers(data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchManagers();
  }, []);

  const handleCreateUser = async () => {
    try {
      const res = await fetch('http://192.168.254.147:5000/admin/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('User Created', 'New user has been created successfully');
        fetchUsers();  // Refresh the users list
      } else {
        Alert.alert('Error', 'Failed to create user');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Server error while creating user');
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      const res = await fetch(`http://192.168.254.147:5000/admin/users/${userId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('User Deleted', 'User has been deleted successfully');
        fetchUsers();  // Refresh the users list
      } else {
        Alert.alert('Error', 'Failed to delete user');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Server error while deleting user');
    }
  };

  const handleChangePassword = async () => {
    try {
      const res = await fetch('http://192.168.254.147:5000/admin/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passwordChange),
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('Password Updated', 'Password has been changed successfully');
      } else {
        Alert.alert('Error', 'Failed to change password');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Server error while updating password');
    }
  };

  // Function to group users by manager
  const groupByManager = (users) => {
    const grouped = {};
    users.forEach(user => {
      if (user.role === 'salesAgent') {
        if (!grouped[user.assignedTo]) {
          grouped[user.assignedTo] = [];
        }
        grouped[user.assignedTo].push(user);
      }
    });
    return grouped;
  };

  // Group sales agents by their manager
  const groupedSalesAgents = groupByManager(users);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Admin Dashboard</Text>
      <Text style={styles.subHeader}>Manage Users</Text>

      {/* Create User Form */}
      <TextInput
        style={styles.input}
        placeholder="Username"
        value={newUser.username}
        onChangeText={(text) => setNewUser({ ...newUser, username: text })}
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
        <Picker.Item label="Sales Agent" value="salesAgent" />
        <Picker.Item label="Manager" value="manager" />
        <Picker.Item label="Supervisor" value="supervisor" />
        <Picker.Item label="Admin" value="admin" />
      </Picker>

      <Text style={styles.label}>Assign to Manager</Text>
      <Picker
        selectedValue={newUser.assignedTo}
        onValueChange={(itemValue) => setNewUser({ ...newUser, assignedTo: itemValue })}
        style={styles.input}
      >
        {managers.map((manager) => (
          <Picker.Item key={manager._id} label={manager.accountName} value={manager._id} />
        ))}
      </Picker>

      <Button title="Create User" onPress={handleCreateUser} />

      {/* Change Password Form */}
      <TextInput
        style={styles.input}
        placeholder="Username for Password Change"
        value={passwordChange.username}
        onChangeText={(text) => setPasswordChange({ ...passwordChange, username: text })}
      />
      <TextInput
        style={styles.input}
        placeholder="New Password"
        secureTextEntry
        value={passwordChange.newPassword}
        onChangeText={(text) => setPasswordChange({ ...passwordChange, newPassword: text })}
      />
      <Button title="Change Password" onPress={handleChangePassword} />

      {/* Display List of Users */}
      <FlatList
        data={Object.keys(groupedSalesAgents)}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <View style={styles.userCard}>
            <Text style={styles.managerTitle}>{item}</Text>
            {groupedSalesAgents[item].map((user) => (
              <View key={user._id} style={styles.userItem}>
                <Text>{user.username} ({user.role})</Text>
                <Button title="Delete" color="red" onPress={() => handleDeleteUser(user._id)} />
              </View>
            ))}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  header: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#CB1E2A',
    marginBottom: 20,
  },
  subHeader: {
    fontSize: 20,
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
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
  },
  managerTitle: {
    fontWeight: 'bold',
    fontSize: 18,
  },
});
