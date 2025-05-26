import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

const ALL_PROCESSES = [
  { key: 'tinting', label: 'Tinting' },
  { key: 'carwash', label: 'Carwash' },
  { key: 'ceramic_coating', label: 'Ceramic Coating' },
  { key: 'accessories', label: 'Accessories' },
  { key: 'rust_proof', label: 'Rust Proof' },
  { key: 'ready_for_release', label: 'Ready for Release' },
];

export default function AgentDashboard() {
  const [name, setName] = useState('');
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    const load = async () => {
      const stored = await AsyncStorage.getItem('accountName');
      setName(stored || 'Agent');
      await fetchVehicles();
    };
    load();
  }, []);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://192.168.254.147:5000/vehicles');
      const data = await res.json();
      setVehicles(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.clear();
    navigation.replace('Login');
  };

  const renderVehicle = ({ item: v }) => (
    <View style={styles.card}>
      <Text style={styles.vin}>{v.vin} — {v.model}</Text>
      <Text style={styles.driver}>Driver: {v.driver}</Text>

      <Text style={styles.sectionLabel}>Requested:</Text>
      <View style={styles.processRow}>
        {(v.requested_processes || []).map(p => {
          const lbl = ALL_PROCESSES.find(x => x.key === p)?.label || p;
          return (
            <View key={p} style={styles.requestTag}>
              <Text style={styles.requestTagText}>{lbl}</Text>
            </View>
          );
        })}
      </View>

      <Text style={styles.sectionLabel}>Status:</Text>
      <View style={styles.processRow}>
        {(v.requested_processes || []).map(stage => {
          const proc = ALL_PROCESSES.find(x => x.key === stage);
          const done = v.preparation_status?.[stage];
          return (
            <View
              key={stage}
              style={[
                styles.statusBadge,
                done ? styles.statusDone : styles.statusPending,
              ]}
            >
              <Text style={[styles.statusText, done && styles.statusTextDone]}>
                {proc?.label || stage}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <Text style={styles.greeting}>Hi, {name} 👋</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#CB1E2A" />
      ) : (
        <FlatList
          data={vehicles}
          keyExtractor={v => v.vin}
          renderItem={renderVehicle}
          contentContainerStyle={styles.list}
          onRefresh={fetchVehicles}
          refreshing={loading}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#fff', flexGrow: 1 },
  logoutBtn: { alignSelf: 'flex-end', marginBottom: 10, padding: 8, backgroundColor: '#eee', borderRadius: 5 },
  logoutText: { color: '#CB1E2A', fontWeight: 'bold' },
  greeting: { fontSize: 28, fontWeight: 'bold', color: '#CB1E2A', marginBottom: 20 },
  list: { paddingBottom: 20 },
  card: { marginBottom: 15, padding: 15, borderWidth: 1, borderColor: '#ddd', borderRadius: 8 },
  vin: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  driver: { fontSize: 14, marginBottom: 8, color: '#555' },
  sectionLabel: { fontSize: 14, fontWeight: '600', marginTop: 8, marginBottom: 4, color: '#333' },
  processRow: { flexDirection: 'row', flexWrap: 'wrap' },
  requestTag: {
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 6,
    marginBottom: 6,
  },
  requestTagText: { fontSize: 12, color: '#333' },
  statusBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 6,
    marginBottom: 6,
  },
  statusDone: { backgroundColor: '#CB1E2A' },
  statusPending: { backgroundColor: '#eee' },
  statusText: { fontSize: 12, color: '#777' },
  statusTextDone: { color: '#fff' },
});
