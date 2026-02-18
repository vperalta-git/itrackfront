import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function IconTest() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Icon Test</Text>
      
      {/* Test different icon approaches */}
      <View style={styles.testRow}>
        <Text>Ionicons person: </Text>
        <Ionicons name="person" size={24} color="black" />
        <Text> | home: </Text>
        <Ionicons name="home" size={24} color="red" />
      </View>
      
      <View style={styles.testRow}>
        <Text>Text emoji: 👤 🏠</Text>
      </View>
      
      <View style={styles.testRow}>
        <Text>Unicode: &#9733; &#9650;</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: 'red',
    margin: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  testRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
    backgroundColor: '#f0f0f0',
    padding: 5,
  },
});