import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, FlatList } from 'react-native';

const ManagerDashboard = () => {
  const [salesAgents, setSalesAgents] = useState([]);

  const fetchSalesAgents = async () => {
    try {
      const res = await fetch(`http://192.168.254.147:5000/manager/${userId}/salesAgents`);
      const data = await res.json();
      setSalesAgents(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSalesAgents();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Manager Dashboard</Text>
      <FlatList
        data={salesAgents}
        keyExtractor={item => item._id}
        renderItem={({ item }) => (
          <View style={styles.salesAgentCard}>
            <Text>{item.accountName} ({item.role})</Text>
            <Button
              title="Manage"
              onPress={() => navigation.navigate('ManageSalesAgent', { agentId: item._id })}
            />
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20 },
  heading: { fontSize: 24, fontWeight: 'bold', color: '#CB1E2A' },
  salesAgentCard: { padding: 10, marginVertical: 10, backgroundColor: '#f0f0f0', borderRadius: 8 }
});

export default ManagerDashboard;
