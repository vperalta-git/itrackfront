import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, Alert, TouchableOpacity } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';

const INITIAL_REGION = {
  latitude: 14.5791,
  longitude: 121.0655,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

export default function TestMapScreen() {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [mapRegion, setMapRegion] = useState(INITIAL_REGION);

  useEffect(() => {
    async function requestLocationPermission() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Location permission is required for this app.');
          return;
        }
        setPermissionGranted(true);
        
        // Get current location
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High
        });
        
        const coords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        
        setCurrentLocation(coords);
        setMapRegion({
          ...coords,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
        
      } catch (error) {
        console.error('Location error:', error);
        Alert.alert('Location Error', 'Failed to get location: ' + error.message);
      }
    }
    
    requestLocationPermission();
  }, []);

  const handleGetLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      
      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      
      setCurrentLocation(coords);
      setMapRegion({
        ...coords,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      
      Alert.alert('Location Updated', `Lat: ${coords.latitude.toFixed(6)}, Lng: ${coords.longitude.toFixed(6)}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to get location: ' + error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Map Test Screen</Text>
      <Text style={styles.status}>
        Permission: {permissionGranted ? '✅ Granted' : '❌ Not Granted'}
      </Text>
      <Text style={styles.status}>
        Location: {currentLocation ? `${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}` : 'Not Available'}
      </Text>
      
      <TouchableOpacity style={styles.button} onPress={handleGetLocation}>
        <Text style={styles.buttonText}>Get Current Location</Text>
      </TouchableOpacity>
      
      <MapView
        provider="osm"
        style={styles.map}
        region={mapRegion}
        onMapReady={() => console.log('Map is ready!')}
        onRegionChangeComplete={(region) => {
          console.log('Region changed:', region);
          setMapRegion(region);
        }}
        showsUserLocation={true}
        showsMyLocationButton={true}
        mapType="standard"
      >
        <Marker
          coordinate={INITIAL_REGION}
          title="Isuzu Pasig"
          description="Test destination"
          pinColor="red"
        />
        {currentLocation && (
          <Marker
            coordinate={currentLocation}
            title="Current Location"
            description="Your current position"
            pinColor="blue"
          />
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  status: {
    fontSize: 16,
    marginBottom: 5,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginVertical: 10,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  map: {
    flex: 1,
    marginTop: 10,
  },
});
