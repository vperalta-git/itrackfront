import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

export default function ForgotPasswordScreen({ navigation }) {
  const [username, setUsername] = useState('');

  const handleReset = () => {
    alert(`Password reset link sent to ${username}`);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Forgot Password</Text>
      <TextInput style={styles.input} placeholder="Enter your username" value={username} onChangeText={setUsername} />
      
      <TouchableOpacity onPress={handleReset} style={styles.btn}>
        <Text style={styles.btnText}>Send Reset Link</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.link}>Back to Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  input: { borderWidth: 1, padding: 10, marginBottom: 15 },
  btn: { backgroundColor: '#e50914', padding: 12, marginTop: 10 },
  btnText: { color: '#fff', textAlign: 'center' },
  link: { textAlign: 'center', marginTop: 15, color: '#007BFF' },
});
