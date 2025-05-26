import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkLoggedIn = async () => {
      const isLoggedIn = await AsyncStorage.getItem('isLoggedIn');
      const role = await AsyncStorage.getItem('userRole');
      if (isLoggedIn === 'true' && role) {
        // Navigate based on role
        if (role === 'admin') navigation.replace('AdminDrawer');
        else if (role === 'agent') navigation.replace('AgentDrawer');
        else if (role === 'dispatch') navigation.replace('DispatchDashboard');
        else if (role === 'driver') navigation.replace('DriverDashboard');
      }
    };
    checkLoggedIn();
  }, []);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Missing Fields', 'Please enter both username and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('http://192.168.254.147:5000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (data.success) {
        await AsyncStorage.setItem('isLoggedIn', 'true');
        await AsyncStorage.setItem('userRole', data.role);
        await AsyncStorage.setItem('accountName', data.name || username);

        if (data.role === 'admin') navigation.replace('AdminDrawer');
        else if (data.role === 'agent') navigation.replace('AgentDrawer');
        else if (data.role === 'dispatch') navigation.replace('DispatchDashboard');
        else if (data.role === 'driver') navigation.replace('DriverDashboard');
        else Alert.alert('Error', 'Unknown role received');
      } else {
        Alert.alert('Login Failed', data.message || 'Invalid credentials');
      }
    } catch (err) {
      Alert.alert('Error', 'Unable to connect to server.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#CB1E2A" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>I-Track Login</Text>
      <TextInput
        placeholder="Username"
        style={styles.input}
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      <TextInput
        placeholder="Password"
        style={styles.input}
        value={password}
        secureTextEntry
        onChangeText={setPassword}
      />
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex:1, justifyContent:'center', padding:30, backgroundColor:'#fff' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#CB1E2A', marginBottom: 30, alignSelf:'center' },
  input: {
    borderWidth:1, borderColor:'#ccc', borderRadius:8,
    paddingHorizontal:14, paddingVertical:12,
    marginBottom: 15, fontSize:16,
  },
  button: {
    backgroundColor:'#CB1E2A',
    paddingVertical:14,
    borderRadius:8,
    alignItems:'center',
  },
  buttonText: { color:'#fff', fontWeight:'bold', fontSize:16 },
  loadingContainer: { flex:1, justifyContent:'center', alignItems:'center' },
});
