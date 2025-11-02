import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

const RealTimeStats = ({ stats }) => {
  const [pulseAnimation] = useState(new Animated.Value(1));

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔴 Live System Status</Text>
      
      <View style={styles.statsGrid}>
        <Animated.View style={[styles.statItem, { transform: [{ scale: pulseAnimation }] }]}>
          <Text style={styles.statValue}>{stats.activeUsers || 24}</Text>
          <Text style={styles.statLabel}>Users Online</Text>
        </Animated.View>
        
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.vehiclesInPrep || 12}</Text>
          <Text style={styles.statLabel}>In Preparation</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.activeShipments || 8}</Text>
          <Text style={styles.statLabel}>In Transit</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.completedToday || 15}</Text>
          <Text style={styles.statLabel}>Completed Today</Text>
        </View>
      </View>
      
      <Text style={styles.timestamp}>
        Last updated: {new Date().toLocaleTimeString()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    borderWidth: 1,
    borderColor: '#ff1e1e',
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
  statValue: {
    color: '#ff1e1e',
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#ccc',
    fontSize: 12,
    marginTop: 4,
  },
  timestamp: {
    color: '#888',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 8,
  },
});

export default RealTimeStats;
