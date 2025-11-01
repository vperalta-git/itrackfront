import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import UniformLoading from '../components/UniformLoading';

const API_URL = 'https://itrack-backend-1.onrender.com';

export default function AdminVehicleTracking() {
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  const fetchAllocations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/driver-allocations`);
      const data = await res.json();
      if (data.success) {
        const withLocation = data.data.filter((item) => item.unitId); // only units with VIN
        setAllocations(withLocation);
        if (withLocation.length > 0) setSelectedVehicle(withLocation[0]);
      }
    } catch (err) {
      console.error('Error fetching driver allocations:', err);
    }
    setLoading(false);
  };

  const fetchVehicleLocation = async (unitId) => {
    try {
      console.log('📍 Fetching location for vehicle:', unitId);
      const res = await fetch(`${API_URL}/vehicles/${unitId}`);
      
      if (!res.ok) {
        console.warn('⚠️ Vehicle location not found for:', unitId);
        return null;
      }
      
      const vehicle = await res.json();
      
      if (vehicle.location && vehicle.location.lat && vehicle.location.lng) {
        return {
          ...vehicle,
          lat: vehicle.location.lat,
          lng: vehicle.location.lng,
        };
      } else {
        console.warn('⚠️ Invalid location data for vehicle:', unitId);
        return null;
      }
    } catch (error) {
      console.error('❌ Error fetching vehicle location:', error);
      return null;
    }
  };

  const loadAllLocations = async () => {
    if (allocations.length === 0) {
      console.log('📍 No allocations to load locations for');
      return;
    }
    
    setLoading(true);
    console.log('📍 Loading locations for', allocations.length, 'vehicles');
    
    try {
      const results = await Promise.all(
        allocations.map(async (a) => {
          if (!a.unitId) {
            console.warn('⚠️ Vehicle missing unitId:', a.unitName);
            return null;
          }
          
          const loc = await fetchVehicleLocation(a.unitId);
          if (loc && loc.lat && loc.lng) {
            return {
              ...a,
              location: { latitude: loc.lat, longitude: loc.lng },
            };
          } else {
            console.warn('⚠️ No valid location for vehicle:', a.unitName);
            return null;
          }
        })
      );
      
      const validResults = results.filter(Boolean);
      console.log('📍 Successfully loaded', validResults.length, 'vehicle locations');
      setAllocations(validResults);
      
      if (validResults.length > 0 && !selectedVehicle) {
        setSelectedVehicle(validResults[0]);
      }
    } catch (error) {
      console.error('❌ Error loading vehicle locations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllocations();
  }, []);

  useEffect(() => {
    if (allocations.length > 0) loadAllLocations();
  }, [allocations]);

  const handleRefresh = () => {
    fetchAllocations();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Vehicle Tracking</Text>

      {loading ? (
        <UniformLoading 
          message="Loading vehicle tracking..." 
          size="large"
          style={{ flex: 1 }}
        />
      ) : (
        <>
          <MapView
            provider={PROVIDER_DEFAULT}
            style={styles.map}
            region={{
              latitude: selectedVehicle?.location?.latitude || 14.5791,
              longitude: selectedVehicle?.location?.longitude || 121.0655,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
            onMapReady={() => console.log('✅ Map loaded successfully')}
            onError={(error) => console.error('❌ Map error:', error)}
          >
            {allocations
              .filter(v => v.location && v.location.latitude && v.location.longitude)
              .map((v, index) => (
                <Marker
                  key={v._id || index}
                  coordinate={{
                    latitude: v.location.latitude,
                    longitude: v.location.longitude
                  }}
                  title={`${v.unitName || 'Unknown'} (${v.variation || 'N/A'})`}
                  description={`Driver: ${v.assignedDriver || 'Unassigned'}`}
                  pinColor="blue"
                />
              ))}
          </MapView>

          <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh}>
            <Text style={styles.refreshText}>🔄 Refresh</Text>
          </TouchableOpacity>

          <ScrollView style={styles.list}>
            {allocations.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No vehicles currently tracked</Text>
                <Text style={styles.emptySubtext}>Vehicles assigned to dispatch will appear here</Text>
              </View>
            ) : (
              allocations.map((item) => (
                <TouchableOpacity
                  key={item._id}
                  style={styles.vehicleItem}
                  onPress={() => setSelectedVehicle(item)}
                >
                  <Text style={styles.vehicleText}>
                    {item.unitName} ({item.variation}) — {item.assignedDriver}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, backgroundColor: '#fff' },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#CB1E2A',
    marginBottom: 10,
    textAlign: 'center',
  },
  map: {
    height: 300,
    borderRadius: 10,
    marginBottom: 10,
  },
  refreshBtn: {
    backgroundColor: '#CB1E2A',
    paddingVertical: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
  },
  refreshText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  list: {
    maxHeight: 200,
    marginTop: 10,
  },
  vehicleItem: {
    padding: 12,
    backgroundColor: '#f2f2f2',
    borderRadius: 6,
    marginBottom: 6,
  },
  vehicleText: {
    fontSize: 14,
    color: '#333',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
});
