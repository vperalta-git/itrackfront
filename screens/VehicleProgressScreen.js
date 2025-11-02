import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ScrollView } from 'react-native';

export default function VehicleProgressScreen() {
  const [vehicles, setVehicles] = useState([]);

  const fetchVehicles = async () => {
    try {
      const res = await fetch('https://itrack-backend-1.onrender.com/vehicles');
      const data = await res.json();
      setVehicles(data);
    } catch (err) {
      console.error('Failed to fetch vehicles:', err);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const renderStatus = (status) => {
    return Object.entries(status).map(([key, value]) => (
      <View key={key} style={[styles.statusItem, value ? styles.done : styles.pending]}>
        <Text style={styles.statusText}>{key.replace(/_/g, ' ')} - {value ? '✅' : '❌'}</Text>
      </View>
    ));
  };

  const renderVehicle = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.vehicleTitle}>{item.model} ({item.vin})</Text>
      <Text style={styles.subtitle}>Current: {item.current_status || 'N/A'}</Text>
      {renderStatus(item.preparation_status)}
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Vehicle Progress Tracker</Text>
      <FlatList
        data={vehicles}
        keyExtractor={(item) => item.vin}
        renderItem={renderVehicle}
        scrollEnabled={false}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  card: { marginBottom: 20, padding: 16, backgroundColor: '#f9f9f9', borderRadius: 8, elevation: 2 },
  vehicleTitle: { fontSize: 18, fontWeight: 'bold' },
  subtitle: { fontSize: 14, color: '#555', marginBottom: 8 },
  statusItem: { paddingVertical: 4 },
  done: { backgroundColor: '#d4edda' },
  pending: { backgroundColor: '#f8d7da' },
  statusText: { paddingLeft: 10, fontSize: 14 },
});
