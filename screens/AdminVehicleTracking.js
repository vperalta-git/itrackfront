import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';

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
      const res = await fetch(`${API_URL}/vehicles/${unitId}`);
      const vehicle = await res.json();
      return vehicle.location
        ? {
            ...vehicle,
            lat: vehicle.location.lat,
            lng: vehicle.location.lng,
          }
        : null;
    } catch {
      return null;
    }
  };

  const loadAllLocations = async () => {
    setLoading(true);
    const results = await Promise.all(
      allocations.map(async (a) => {
        const loc = await fetchVehicleLocation(a.unitId);
        return loc
          ? {
              ...a,
              location: { latitude: loc.lat, longitude: loc.lng },
            }
          : null;
      })
    );
    setAllocations(results.filter(Boolean));
    setLoading(false);
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
        <ActivityIndicator size="large" color="#CB1E2A" />
      ) : (
        <>
          <MapView
            provider="osm"
            style={styles.map}
            region={{
              latitude: selectedVehicle?.location?.latitude || 14.5791,
              longitude: selectedVehicle?.location?.longitude || 121.0655,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
          >
            {allocations.map((v, index) => (
              <Marker
                key={index}
                coordinate={v.location}
                title={`${v.unitName} (${v.variation})`}
                description={`Driver: ${v.assignedDriver}`}
                pinColor="blue"
              />
            ))}
          </MapView>

          <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh}>
            <Text style={styles.refreshText}>🔄 Refresh</Text>
          </TouchableOpacity>

          <ScrollView style={styles.list}>
            {allocations.map((item) => (
              <TouchableOpacity
                key={item._id}
                style={styles.vehicleItem}
                onPress={() => setSelectedVehicle(item)}
              >
                <Text style={styles.vehicleText}>
                  {item.unitName} ({item.variation}) — {item.assignedDriver}
                </Text>
              </TouchableOpacity>
            ))}
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
});
