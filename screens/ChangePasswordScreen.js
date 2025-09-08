import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import Toast from 'react-native-toast-message';

export default function ChangePasswordScreen() {
  const [username, setUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleChangePassword = async () => {
    if (!username.trim() || !newPassword.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Missing Fields',
        text2: 'Username and password are required.',
      });
      return;
    }

    try {
      const res = await fetch('http://itrack-backend-1.onrender.com/admin/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, newPassword }),
      });

      const rawText = await res.text(); // Get raw response for safe parsing

      if (!res.ok) {
        console.error(`❌ HTTP ${res.status}`, rawText);
        Toast.show({
          type: 'error',
          text1: `Server Error (${res.status})`,
          text2: rawText.includes('<') ? 'Received unexpected HTML from server.' : rawText,
        });
        return;
      }

      // Check if content is actually JSON
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('❌ Non-JSON response:', rawText);
        Toast.show({
          type: 'error',
          text1: 'Invalid Response',
          text2: 'Expected JSON but got something else.',
        });
        return;
      }

      const data = JSON.parse(rawText);

      if (data.success) {
        Toast.show({
          type: 'success',
          text1: 'Password Changed',
          text2: 'Password updated successfully.',
        });
        setUsername('');
        setNewPassword('');
      } else {
        Toast.show({
          type: 'error',
          text1: 'Update Failed',
          text2: data.message || 'Could not change the password.',
        });
      }
    } catch (err) {
      console.error('❌ Fetch Error:', err.message);
      Toast.show({
        type: 'error',
        text1: 'Network Error',
        text2: err.message,
      });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Change Password</Text>
      <TextInput
        style={styles.input}
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={styles.input}
        placeholder="New Password"
        secureTextEntry
        value={newPassword}
        onChangeText={setNewPassword}
      />
      <Button title="Change Password" onPress={handleChangePassword} />
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
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#CB1E2A',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 12,
    borderRadius: 5,
    fontSize: 16,
  },
});
