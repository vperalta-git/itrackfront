// MapBox Implementation for I-Track Vehicle Tracking
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import MapboxGL from '@rnmapbox/maps';

// Set your MapBox access token
MapboxGL.setAccessToken('YOUR_MAPBOX_ACCESS_TOKEN');

const MapBoxTracker = ({ vehicles = [], selectedVehicle, onVehicleSelect }) => {
  const [mapCenter, setMapCenter] = useState([121.0244, 14.5547]); // Default: Manila
  const [zoom, setZoom] = useState(10);

  useEffect(() => {
    // Center map on selected vehicle
    if (selectedVehicle && selectedVehicle.location) {
      setMapCenter([selectedVehicle.location.longitude, selectedVehicle.location.latitude]);
      setZoom(15);
    }
  }, [selectedVehicle]);

  const renderVehicleMarkers = () => {
    return vehicles.map((vehicle) => (
      <MapboxGL.PointAnnotation
        key={vehicle.id}
        id={`vehicle-${vehicle.id}`}
        coordinate={[vehicle.location.longitude, vehicle.location.latitude]}
        onSelected={() => onVehicleSelect(vehicle)}
      >
        <View style={[styles.vehicleMarker, { backgroundColor: getVehicleColor(vehicle.status) }]}>
          <Text style={styles.vehicleText}>{vehicle.unitName}</Text>
        </View>
      </MapboxGL.PointAnnotation>
    ));
  };

  const getVehicleColor = (status) => {
    switch (status) {
      case 'In Transit': return '#4CAF50'; // Green
      case 'Available': return '#2196F3';  // Blue
      case 'Maintenance': return '#FF9800'; // Orange
      case 'Out of Service': return '#F44336'; // Red
      default: return '#9E9E9E'; // Gray
    }
  };

  return (
    <View style={styles.container}>
      <MapboxGL.MapView
        style={styles.map}
        styleURL={MapboxGL.StyleURL.Street} // You can customize this
        zoomEnabled={true}
        scrollEnabled={true}
      >
        <MapboxGL.Camera
          centerCoordinate={mapCenter}
          zoomLevel={zoom}
          animationMode="flyTo"
          animationDuration={1000}
        />
        
        {/* Render vehicle markers */}
        {renderVehicleMarkers()}
        
        {/* Optional: Show route if selected vehicle has one */}
        {selectedVehicle && selectedVehicle.route && (
          <MapboxGL.ShapeSource id="route" shape={selectedVehicle.route}>
            <MapboxGL.LineLayer
              id="routeLine"
              style={{
                lineColor: '#4CAF50',
                lineWidth: 4,
                lineOpacity: 0.8,
              }}
            />
          </MapboxGL.ShapeSource>
        )}
      </MapboxGL.MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  vehicleMarker: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  vehicleText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default MapBoxTracker;
