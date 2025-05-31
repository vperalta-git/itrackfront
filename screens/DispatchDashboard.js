import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, Button,
  ScrollView, TouchableOpacity,
  StyleSheet, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

const ALL_PROCESSES = [
  { key: 'tinting', label: 'Tinting' },
  { key: 'carwash', label: 'Carwash' },
  { key: 'ceramic_coating', label: 'Ceramic Coating' },
  { key: 'accessories', label: 'Accessories' },
  { key: 'rust_proof', label: 'Rust Proof' },
];

export default function DispatchDashboard() {
  const navigation = useNavigation();
  const [vehicles, setVehicles] = useState([]);
  const [form, setForm] = useState({ vin: '', model: '', driver: '' });
  const [requested, setRequested] = useState({});

  useEffect(() => {
    const init = {};
    ALL_PROCESSES.forEach(p => init[p.key] = false);
    setRequested(init);
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const res = await fetch('http://192.168.254.147:5000/vehicles');
      const data = await res.json();
      setVehicles(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdd = async () => {
    const reqs = Object.keys(requested).filter(k => requested[k]);
    if (!form.vin || !form.model || !form.driver || reqs.length === 0) {
      return Alert.alert('Error', 'Please fill all fields & select at least one process.');
    }
    try {
      const res = await fetch('http://192.168.254.147:5000/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, requested_processes: reqs })
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('Added successfully');
        setForm({ vin: '', model: '', driver: '' });
        const reset = {}; ALL_PROCESSES.forEach(p => reset[p.key] = false);
        setRequested(reset);
        fetchVehicles();
      } else {
        Alert.alert('Error', data.error || 'Add failed');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Server error occurred while adding vehicle.');
    }
  };

  const toggleProcess = key => {
    setRequested(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleToggleStage = async (vin, stage) => {
    try {
      await fetch(`http://192.168.254.147:5000/vehicles/${vin}/update-status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage }),
      });
      fetchVehicles();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async vin => {
    try {
      await fetch(`http://192.168.254.147:5000/vehicles/${vin}/delete`, {
        method: 'DELETE'
      });
      fetchVehicles();
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.clear();
    navigation.replace('Login');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <Text style={styles.heading}>Dispatch Dashboard</Text>

      <TextInput
        placeholder="VIN"
        value={form.vin}
        onChangeText={vin => setForm(f => ({ ...f, vin }))}
        style={styles.input}
      />
      <TextInput
        placeholder="Model"
        value={form.model}
        onChangeText={model => setForm(f => ({ ...f, model }))}
        style={styles.input}
      />
      <TextInput
        placeholder="Driver"
        value={form.driver}
        onChangeText={driver => setForm(f => ({ ...f, driver }))}
        style={styles.input}
      />

      <Text style={styles.subheading}>Requested Processes</Text>
      <View style={styles.processRow}>
        {ALL_PROCESSES.map(p => (
          <TouchableOpacity
            key={p.key}
            onPress={() => toggleProcess(p.key)}
            style={[styles.processBtn, requested[p.key] && styles.processSelected]}
          >
            <Text style={styles.processText}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Button title="Add Vehicle" onPress={handleAdd} />

      <Text style={styles.subheading}>Current Vehicles</Text>
      {vehicles.map(v => (
        <TouchableOpacity
          key={v.vin}
          style={styles.vehicleCard}
          onPress={() => navigation.navigate('DispatchDetail', { vin: v.vin })}
        >
          <Text style={styles.vin}>VIN: {v.vin}</Text>
          <Text>Model: {v.model}</Text>
          <Text>Driver: {v.driver}</Text>

          <Text style={styles.subheading}>Requested:</Text>
          <View style={styles.processRow}>
            {(v.requested_processes || []).map(p => {
              const label = ALL_PROCESSES.find(x => x.key === p)?.label || p;
              return <Text key={p} style={styles.requestTag}>{label}</Text>;
            })}
          </View>

          <Text style={styles.subheading}>Progress:</Text>
          <View style={styles.processRow}>
            {(v.requested_processes || []).map(stage => (
              <TouchableOpacity
                key={stage}
                onPress={() => handleToggleStage(v.vin, stage)}
                style={[styles.stageBtn, v.preparation_status?.[stage] && styles.stageDone]}
              >
                <Text style={styles.stageText}>{stage}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity onPress={() => handleDelete(v.vin)} style={styles.deleteBtn}>
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  logoutBtn: {
    alignSelf: 'flex-end', padding: 8,
    backgroundColor: '#eee', borderRadius: 5,
    marginBottom: 10,
  },
  logoutText: { color: '#CB1E2A', fontWeight: 'bold' },
  heading: { fontSize: 26, fontWeight: 'bold', color: '#CB1E2A', marginBottom: 10 },
  input: {
    borderWidth: 1, borderColor: '#ccc', padding: 10,
    marginBottom: 10, borderRadius: 5
  },
  subheading: { fontSize: 18, marginTop: 20, marginBottom: 10 },
  processRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  processBtn: {
    backgroundColor: '#eee', padding: 5, borderRadius: 5, margin: 3
  },
  processSelected: { backgroundColor: '#CB1E2A' },
  processText: { color: '#000', fontSize: 12 },
  requestTag: {
    backgroundColor: '#f0f0f0', padding: 4, borderRadius: 4, margin: 2, fontSize: 12
  },
  vehicleCard: {
    borderWidth: 1, borderColor: '#ccc', borderRadius: 8,
    padding: 10, marginBottom: 10
  },
  vin: { fontWeight: 'bold', marginBottom: 4 },
  stageBtn: {
    backgroundColor: '#eee', padding: 6, borderRadius: 5, margin: 3
  },
  stageDone: { backgroundColor: '#CB1E2A' },
  stageText: { color: '#fff', fontSize: 12 },
  deleteBtn: {
    marginTop: 8, alignSelf: 'flex-end',
    backgroundColor: '#444', padding: 6, borderRadius: 5
  },
  deleteText: { color: '#fff', fontSize: 12 }
});
