import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Alert,
  Button,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';

const ALL_PROCESSES = [
  { key: 'tinting', label: 'Tinting' },
  { key: 'carwash', label: 'Carwash' },
  { key: 'ceramic_coating', label: 'Ceramic Coating' },
  { key: 'accessories', label: 'Accessories' },
  { key: 'rust_proof', label: 'Rust Proof' },
];

export default function DispatchVehicleDetail() {
  const { params } = useRoute();
  const navigation = useNavigation();
  const { vin } = params;
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVehicle();
  }, []);

  const fetchVehicle = async () => {
    try {
      setLoading(true);
      const res = await fetch(`http://192.168.254.147:5000/vehicles/${vin}`);
      const data = await res.json();
      setVehicle(data);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to load vehicle');
    } finally {
      setLoading(false);
    }
  };

  const toggleCompletion = async (stage) => {
    try {
      await fetch(
        `http://192.168.254.147:5000/vehicles/${vin}/update-status`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stage }),
        }
      );
      fetchVehicle();
    } catch (err) {
      console.error(err);
    }
  };

  const removeProcess = async (stage) => {
    const updated = (vehicle?.requested_processes || []).filter(p => p !== stage);
    try {
      const res = await fetch(
        `http://192.168.254.147:5000/vehicles/${vin}/update-requested`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requested_processes: updated }),
        }
      );
      const json = await res.json();
      if (json.success) setVehicle(json.vehicle);
    } catch (err) {
      console.error(err);
    }
  };

  const markReady = () => toggleCompletion('ready_for_release');

  if (loading || !vehicle) return <ActivityIndicator style={styles.loader} size="large" color="#CB1E2A" />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Button title="← Back" onPress={() => navigation.goBack()} />

      <Text style={styles.header}>{vehicle.vin} – {vehicle.model}</Text>
      <Text style={styles.sub}>Driver: {vehicle.driver}</Text>

      <Text style={styles.label}>Requested Processes:</Text>
      <View style={styles.row}>
        {(vehicle.requested_processes || []).map(stage => {
          const proc = ALL_PROCESSES.find(p => p.key === stage);
          return (
            <View key={stage} style={styles.tag}>
              <Text style={styles.tagText}>{proc?.label || stage}</Text>
              <TouchableOpacity onPress={() => removeProcess(stage)} style={styles.removeBtn}>
                <Text style={styles.removeText}>×</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      <Text style={styles.label}>Update Completion:</Text>
      <View style={styles.row}>
        {(vehicle.requested_processes || []).map(stage => {
          const proc = ALL_PROCESSES.find(p => p.key === stage);
          const done = vehicle.preparation_status?.[stage];
          return (
            <TouchableOpacity
              key={stage}
              style={[styles.stageBtn, done ? styles.stageDone : styles.stagePending]}
              onPress={() => toggleCompletion(stage)}
            >
              <Text style={done ? styles.stageTextDone : styles.stageText}>
                {done ? '✓ ' : ''}{proc?.label || stage}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity onPress={markReady} style={styles.readyBtn}>
        <Text style={styles.readyText}>Ready for Release</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: 'center' },
  container: { padding: 20, backgroundColor: '#fff' },
  header: { fontSize: 20, fontWeight: 'bold', marginVertical: 10, color: '#CB1E2A' },
  sub: { fontSize: 16, marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', marginTop: 10, marginBottom: 6 },
  row: { flexDirection: 'row', flexWrap: 'wrap' },
  tag: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    margin: 4,
    alignItems: 'center',
  },
  tagText: { marginRight: 6, fontSize: 12 },
  removeBtn: {
    backgroundColor: '#cb1e2a',
    borderRadius: 10,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: { color: '#fff', fontSize: 12, lineHeight: 12 },
  stageBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    margin: 4,
  },
  stageDone: { backgroundColor: '#CB1E2A' },
  stagePending: { backgroundColor: '#eee' },
  stageText: { color: '#333', fontSize: 12 },
  stageTextDone: { color: '#fff', fontSize: 12 },
  readyBtn: {
    backgroundColor: '#CB1E2A',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 20,
  },
  readyText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
