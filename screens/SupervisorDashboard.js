import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const SupervisorDashboard = () => {
  const [managers, setManagers] = useState([]);
  const navigation = useNavigation();

  const fetchManagers = async () => {
    try {
      const res = await fetch(`https://itrack-backend-1.onrender.com/supervisor/${userId}/managers`);
      const data = await res.json();
      setManagers(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchManagers();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Supervisor Dashboard</Text>
      <FlatList
        data={managers}
        keyExtractor={item => item._id}
        renderItem={({ item }) => (
          <View style={styles.managerCard}>
            <Text>{item.accountName} ({item.role})</Text>
            <Button
              title="Manage Sales Agents"
              onPress={() => navigation.navigate('ManageSalesAgents', { managerId: item._id })}
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
  managerCard: { padding: 10, marginVertical: 10, backgroundColor: '#f0f0f0', borderRadius: 8 }
});

export default SupervisorDashboard;
