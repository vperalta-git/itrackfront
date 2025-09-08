import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView,
  Platform, ScrollView, SafeAreaView,
} from 'react-native';

export default function SignUpScreen({ navigation }) {
  const [accountName, setAccountName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('driver');

  const handleSignUp = async () => {
    console.log({ accountName, username, password, role });

    try {
      const res = await fetch('http://itrack-backend-1.onrender.com/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role, accountName }),
      });
      const data = await res.json();

      if (data.success) {
        Alert.alert('Account Created', 'You can now log in.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Signup Error', data.message || 'Unknown error');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Unable to connect to the server.');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 60}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Create Account</Text>

          <View style={styles.roleSwitchContainer}>
            {['driver', 'agent', 'dispatch'].map(r => (
              <TouchableOpacity
                key={r}
                style={[styles.roleOption, role === r && styles.selectedRole]}
                onPress={() => setRole(r)}
              >
                <Text style={styles.roleText}>
                  {r === 'agent' ? 'Sales Agent' : r.charAt(0).toUpperCase() + r.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.input}
            placeholder="Account Name"
            placeholderTextColor="#999"
            value={accountName}
            onChangeText={setAccountName}
          />
          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor="#999"
            value={username}
            onChangeText={setUsername}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#999"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity onPress={handleSignUp} style={styles.button}>
            <Text style={styles.buttonText}>Sign Up</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.link}>Already have an account? Login</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 30,
    paddingTop: 40,
    justifyContent: 'flex-start',
  },
  title: {
    fontSize: 28, fontWeight: 'bold', color: '#CB1E2A',
    alignSelf: 'center', marginBottom: 30,
  },
  roleSwitchContainer: {
    flexDirection: 'row', justifyContent: 'center', marginBottom: 20,
  },
  roleOption: {
    flex: 1, marginHorizontal: 5, paddingVertical: 10,
    borderRadius: 8, borderWidth: 1, borderColor: '#CB1E2A',
    alignItems: 'center',
  },
  selectedRole: { backgroundColor: '#CB1E2A' },
  roleText: { color: '#000', fontWeight: 'bold' },
  input: {
    borderWidth: 1, borderColor: '#ccc', backgroundColor: '#f9f9f9',
    borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 16, marginBottom: 15,
  },
  button: {
    backgroundColor: '#CB1E2A', paddingVertical: 14,
    borderRadius: 8, alignItems: 'center', marginTop: 10,
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  link: {
    marginTop: 20, textAlign: 'center', color: '#CB1E2A', fontWeight: 'bold',
  },
});
