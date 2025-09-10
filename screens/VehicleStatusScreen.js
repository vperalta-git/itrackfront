import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, ScrollView,
} from 'react-native';

export default function VehicleStatusScreen() {
  const [vehicles, setVehicles] = useState([]);

  const fetchVehicles = async () => {
    try {
      const res = await fetch('https://itrack-backend-1.onrender.com/vehicles');
      const data = await res.json();
      setVehicles(data);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Unable to fetch vehicles.');
    }
  };

  const updateStatus = async (vin, stage) => {
    try {
      const res = await fetch(`https://itrack-backend-1.onrender.com/vehicles/${vin}/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage }),
      });
      const data = await res.json();
      if (data.success) {
        fetchVehicles(); // Refresh data
      } else {
        Alert.alert('Error', 'Failed to update vehicle.');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Server error.');
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const renderVehicle = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.title}>{item.model} ({item.vin})</Text>
      <Text style={styles.status}>Current Status: {item.current_status || 'N/A'}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.buttonsRow}>
        {Object.keys(item.preparation_status).map((stage) => (
          <TouchableOpacity
            key={stage}
            style={[
              styles.stageButton,
              item.preparation_status[stage] ? styles.completed : styles.incomplete,
            ]}
            onPress={() => {
              if (!item.preparation_status[stage]) {
                updateStatus(item.vin, stage);
              }
            }}
          >
            <Text style={styles.buttonText}>{stage.replace('_', ' ')}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <FlatList
      data={vehicles}
      keyExtractor={(item) => item.vin}
      renderItem={renderVehicle}
      contentContainerStyle={styles.container}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    elevation: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  status: {
    fontSize: 14,
    marginBottom: 10,
    color: '#555',
  },
  buttonsRow: {
    flexDirection: 'row',
  },
  stageButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginRight: 8,
  },
  completed: {
    backgroundColor: '#4CAF50',
  },
  incomplete: {
    backgroundColor: '#CB1E2A',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
});
