import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

export default function LoginScreen() {
  const navigation = useNavigation();
  const [form, setForm] = useState({
    username: '',
    password: ''
  });

  const handleLogin = async () => {
    const { username, password } = form;

    if (!username || !password) {
      return Alert.alert('Error', 'Please enter both username and password');
    }

    try {
      const res = await fetch('http://192.168.254.147:5000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        console.error('❌ Non-JSON response:', text);
        throw new Error('Unexpected server response');
      }

      const data = await res.json();

      if (!res.ok || !data.success) {
        Alert.alert('Error', data.message || 'Login failed');
        return;
      }

      await AsyncStorage.setItem('accountName', data.name || '');
      await AsyncStorage.setItem('role', data.role);

      // ⛳ Navigate based on role
      switch (data.role) {
        case 'Admin':
          navigation.replace('AdminDrawer');
          break;
        case 'Sales Agent':
        case 'Agent':
          navigation.replace('AgentDashboard');
          break;
        case 'Dispatch':
          navigation.replace('DispatchDashboard');
          break;
        case 'Driver':
          navigation.replace('DriverDashboard');
          break;
        default:
          Alert.alert('Error', 'Unknown role received');
      }

    } catch (err) {
      console.error('❌ Login error:', err.message);
      Alert.alert('Error', 'Unable to login. Check your connection or credentials.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>I-Track Login</Text>

      <TextInput
        placeholder="Username"
        value={form.username}
        onChangeText={(text) => setForm({ ...form, username: text })}
        style={styles.input}
      />

      <TextInput
        placeholder="Password"
        secureTextEntry
        value={form.password}
        onChangeText={(text) => setForm({ ...form, password: text })}
        style={styles.input}
      />

      <TouchableOpacity onPress={handleLogin} style={styles.loginBtn}>
        <Text style={styles.loginText}>Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, padding: 20,
    justifyContent: 'center',
    backgroundColor: '#eee'
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 40,
    textAlign: 'center',
    color: '#CB1E2A'
  },
  input: {
    borderWidth: 1,
    borderColor: '#aaa',
    borderRadius: 6,
    padding: 12,
    marginBottom: 20,
    fontSize: 16,
    backgroundColor: '#fff'
  },
  loginBtn: {
    backgroundColor: '#CB1E2A',
    paddingVertical: 12,
    borderRadius: 6
  },
  loginText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center'
  }
});
