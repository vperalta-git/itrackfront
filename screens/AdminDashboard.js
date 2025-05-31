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
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';

export default function AdminDashboard() {
  const navigation = useNavigation();
  const [users, setUsers] = useState([]);
  const [managers, setManagers] = useState([]);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    role: 'agent',
    assignedTo: '',
    accountName: '',
  });

  const fetchUsers = async () => {
    try {
      const res = await fetch('http://192.168.254.147:5000/admin/users');
      const data = await res.json();
      setUsers(data);
    } catch (error) {
      console.error(error);
    }
  };

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
    if (!newUser.username || !newUser.password || !newUser.accountName) {
      Alert.alert('Validation Error', 'Please fill in all required fields.');
      return;
    }

    try {
      const res = await fetch('http://192.168.254.147:5000/admin/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });

      const rawText = await res.text();
      const contentType = res.headers.get('content-type');
      const data = contentType?.includes('application/json') ? JSON.parse(rawText) : null;

      if (!res.ok) {
        const msg = data?.message || rawText;
        console.error('❌ Error creating user:', msg);
        Alert.alert('Error', msg);
        return;
      }

      if (data?.success) {
        Alert.alert('User Created', 'New user has been created successfully');
        setNewUser({ username: '', password: '', role: 'agent', assignedTo: '', accountName: '' });
        fetchUsers();
      } else {
        Alert.alert('Error', data?.message || 'Failed to create user');
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
        fetchUsers();
      } else {
        Alert.alert('Error', 'Failed to delete user');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Server error while deleting user');
    }
  };

  const groupByManager = (users) => {
    const grouped = {};
    users.forEach(user => {
      if (user.role === 'agent') {
        if (!grouped[user.assignedTo]) {
          grouped[user.assignedTo] = [];
        }
        grouped[user.assignedTo].push(user);
      }
    });
    return grouped;
  };

  const groupedAgents = groupByManager(users);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Admin Dashboard</Text>
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

      <Button title="Create User" onPress={handleCreateUser} />

      <FlatList
        data={Object.keys(groupedAgents)}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <View style={styles.userCard}>
            <Text style={styles.managerTitle}>{item || 'Unassigned'}</Text>
            {groupedAgents[item].map((user) => (
              <View key={user._id} style={styles.userItem}>
                <Text>{user.username} ({user.role})</Text>
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
  header: { fontSize: 32, fontWeight: 'bold', color: '#CB1E2A', marginBottom: 20 },
  subHeader: { fontSize: 20, marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#ccc', padding: 10,
    marginBottom: 10, borderRadius: 5, fontSize: 16
  },
  userCard: {
    marginBottom: 15, padding: 10, borderWidth: 1,
    borderColor: '#ddd', borderRadius: 5,
  },
  userItem: { marginTop: 10 },
  managerTitle: { fontWeight: 'bold', fontSize: 18 },
});
