import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator,
  FlatList
} from 'react-native';

export default function HistoryScreen() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await fetch('https://itrack-backend-1.onrender.com/vehicles/history');
      setHistory(await res.json());
    } catch (err) {
      console.error('Failed to load history', err);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item: v }) => (
    <View style={styles.card}>
      <Text style={styles.vin}>{v.vin} — {v.model}</Text>
      <Text>Driver: {v.driver}</Text>
      <Text style={styles.date}>Released on: {/* pwede lagyan ng timestamp para may exact time ng release*/}</Text>
    </View>
  );

  if (loading) {
    return <ActivityIndicator style={styles.loader} size="large" color="#CB1E2A" />;
  }

  return (
    <FlatList
      contentContainerStyle={styles.container}
      data={history}
      keyExtractor={v => v.vin}
      renderItem={renderItem}
      onRefresh={fetchHistory}
      refreshing={loading}
    />
  );
}

const styles = StyleSheet.create({
  container:{ padding: 20, backgroundColor: '#fff' },
  loader:   { flex: 1, justifyContent: 'center' },
  card:     { padding: 15, marginBottom: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 8 },
  vin:      { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  date:     { fontSize: 12, color: '#555', marginTop: 6 },
});
