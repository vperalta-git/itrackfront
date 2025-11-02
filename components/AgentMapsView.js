// AgentMapsView.js - Direct Maps API for Agent Dashboard
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildApiUrl } from '../constants/api';

const AgentMapsView = ({ style }) => {
  const [allocations, setAllocations] = useState([]);
  const [agentAllocations, setAgentAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [agentName, setAgentName] = useState('');

  // Get agent name
  useEffect(() => {
    const getAgentName = async () => {
      try {
        const name = await AsyncStorage.getItem('userName') || await AsyncStorage.getItem('accountName');
        setAgentName(name || 'Unknown Agent');
      } catch (error) {
        console.error('❌ Agent Maps: Error getting agent name:', error);
        setAgentName('Unknown Agent');
      }
    };
    getAgentName();
  }, []);

  // Fetch agent allocations with proper error handling
  const fetchAgentAllocations = async () => {
    if (!agentName || agentName === 'Unknown Agent') return;

    try {
      console.log('🗺️ Agent Maps: Fetching allocations for agent:', agentName);
      
      const response = await fetch(buildApiUrl('/getAllocation'));
      if (response.ok) {
        const responseText = await response.text();
        if (responseText && responseText.trim()) {
          try {
            const data = JSON.parse(responseText);
            const allocationsArray = data.data || data.allocation || data || [];
            
            // Filter for current agent
            const agentAllocations = allocationsArray.filter(allocation => 
              allocation.assignedAgent === agentName || allocation.agent === agentName
            );
            
            setAllocations(allocationsArray);
            setAgentAllocations(agentAllocations);
            console.log(`✅ Agent Maps: Found ${agentAllocations.length} allocations for ${agentName}`);
          } catch (parseError) {
            console.warn('⚠️ Agent Maps: JSON parse issue, using empty array');
            setAllocations([]);
            setAgentAllocations([]);
          }
        }
      }
    } catch (error) {
      console.error('❌ Agent Maps: Fetch error:', error);
      setAllocations([]);
      setAgentAllocations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (agentName && agentName !== 'Unknown Agent') {
      fetchAgentAllocations();
      // Refresh every 30 seconds
      const interval = setInterval(fetchAgentAllocations, 30000);
      return () => clearInterval(interval);
    }
  }, [agentName]);

  const handleMapReady = () => {
    console.log('✅ Agent Maps: MapView ready');
    setMapReady(true);
  };

  const handleMapError = (error) => {
    console.error('❌ Agent Maps: MapView error:', error);
    // Don't crash the app
  };

  // Default location (Isuzu Pasig)
  const defaultRegion = {
    latitude: 14.5791,
    longitude: 121.0655,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'assigned': return 'orange';
      case 'out for delivery': return 'blue';
      case 'delivered': return 'green';
      case 'ready for release': return 'purple';
      default: return 'gray';
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator size="large" color="#ff1e1e" />
        <Text style={styles.loadingText}>Loading Agent Maps...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.title}>📊 Agent Overview</Text>
        <Text style={styles.subtitle}>
          Agent: {agentName} • {agentAllocations.length} Assigned
        </Text>
        <Text style={styles.totalText}>
          Total System: {allocations.length} Vehicles
        </Text>
      </View>
      
      <MapView
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        initialRegion={defaultRegion}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={true}
        mapType="standard"
        onMapReady={handleMapReady}
        onError={handleMapError}
      >
        {/* Dealership Marker */}
        <Marker
          coordinate={defaultRegion}
          title="Isuzu Pasig Dealership"
          description="Main dealership location"
          pinColor="red"
        />
        
        {/* Agent's Assigned Vehicles */}
        {agentAllocations.map((allocation, index) => {
          // Use real coordinates from backend or fallback to demo coordinates
          let lat, lng;
          
          if (allocation.location?.latitude && allocation.location?.longitude) {
            // Use real coordinates from database
            lat = allocation.location.latitude;
            lng = allocation.location.longitude;
          } else {
            // Fallback: Generate mock coordinates around dealership for demo
            lat = defaultRegion.latitude + (Math.random() - 0.5) * 0.03;
            lng = defaultRegion.longitude + (Math.random() - 0.5) * 0.03;
          }
          
          return (
            <Marker
              key={`agent-allocation-${index}`}
              coordinate={{ latitude: lat, longitude: lng }}
              title={`🎯 ${allocation.unitName || 'Vehicle'} (${allocation.unitId || 'N/A'})`}
              description={`Status: ${allocation.status || 'Assigned'} • Driver: ${allocation.assignedDriver || 'Unassigned'}`}
              pinColor={getStatusColor(allocation.status)}
            />
          );
        })}
        
        {/* Other Vehicles (in gray) */}
        {allocations.filter(allocation => 
          allocation.assignedAgent !== agentName && allocation.agent !== agentName
        ).slice(0, 5).map((allocation, index) => {
          // Use real coordinates from backend or fallback to demo coordinates
          let lat, lng;
          
          if (allocation.location?.latitude && allocation.location?.longitude) {
            // Use real coordinates from database
            lat = allocation.location.latitude;
            lng = allocation.location.longitude;
          } else {
            // Fallback: Generate mock coordinates around dealership for demo
            lat = defaultRegion.latitude + (Math.random() - 0.5) * 0.04;
            lng = defaultRegion.longitude + (Math.random() - 0.5) * 0.04;
          }
          
          return (
            <Marker
              key={`other-vehicle-${index}`}
              coordinate={{ latitude: lat, longitude: lng }}
              title={`${allocation.unitName || 'Vehicle'} (${allocation.unitId || 'N/A'})`}
              description={`Agent: ${allocation.assignedAgent || 'Unassigned'} • Status: ${allocation.status || 'Unknown'}`}
              pinColor="gray"
            />
          );
        })}
      </MapView>

      {!mapReady && (
        <View style={styles.mapLoadingOverlay}>
          <Text style={styles.mapLoadingText}>Loading map...</Text>
        </View>
      )}

      {/* Status Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Status Legend:</Text>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: 'orange' }]} />
          <Text style={styles.legendText}>Assigned</Text>
          <View style={[styles.legendDot, { backgroundColor: 'blue' }]} />
          <Text style={styles.legendText}>Out for Delivery</Text>
          <View style={[styles.legendDot, { backgroundColor: 'green' }]} />
          <Text style={styles.legendText}>Delivered</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  totalText: {
    fontSize: 12,
    color: '#999',
  },
  map: {
    flex: 1,
    minHeight: 300,
  },
  customMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ff1e1e',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  markerText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  mapLoadingOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -25 }],
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 10,
    borderRadius: 8,
  },
  mapLoadingText: {
    fontSize: 14,
    color: '#666',
  },
  legend: {
    position: 'absolute',
    bottom: 20,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
    marginLeft: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
    marginRight: 12,
  },
});

export default AgentMapsView;
