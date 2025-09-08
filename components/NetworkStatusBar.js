import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

const NetworkStatusBar = () => {
  const [isConnected, setIsConnected] = useState(true);
  const [showBar, setShowBar] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const connected = state.isConnected && state.isInternetReachable;
      setIsConnected(connected);
      
      if (!connected) {
        setShowBar(true);
      } else {
        // Hide after a delay when connection is restored
        setTimeout(() => setShowBar(false), 2000);
      }
    });

    return () => unsubscribe();
  }, []);

  if (!showBar) return null;

  return (
    <View style={[styles.container, isConnected ? styles.connected : styles.disconnected]}>
      <Text style={styles.text}>
        {isConnected ? '✓ Connection restored' : '⚠️ No internet connection'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  connected: {
    backgroundColor: '#4CAF50',
  },
  disconnected: {
    backgroundColor: '#f44336',
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default NetworkStatusBar;
