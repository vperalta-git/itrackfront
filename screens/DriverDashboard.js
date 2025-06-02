import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  Button,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import MapView, { Marker, Polyline } from "react-native-maps";

export default function DriverDashboard() {
  const navigation = useNavigation();

  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedShipment, setSelectedShipment] = useState(null);

  const [vehicleLocation, setVehicleLocation] = useState({
    latitude: 14.6,
    longitude: 121.0,
  });

  // Mock: Live location update interval ref
  const locationIntervalRef = useRef(null);

  // Fetch shipment data
  const fetchShipments = async () => {
    setLoading(true);
    setError(null);
    try {
      // Simulate fetch call delay
      await new Promise((r) => setTimeout(r, 1000));

      // TODO: Replace with your actual API call here
      const fetchedShipments = [
        {
          id: "1",
          name: "Isuzu D-MAX Blue",
          status: "Pending",
          route: [
            { latitude: 14.6, longitude: 121.0 },
            { latitude: 14.62, longitude: 121.02 },
            { latitude: 14.65, longitude: 121.05 },
          ],
          destination: "Isuzu Dealership Pasig",
          details: "VIN: 1234567890ABC",
        },
        {
          id: "2",
          name: "Toyota Hilux Red",
          status: "Out for Delivery",
          route: [
            { latitude: 14.59, longitude: 121.01 },
            { latitude: 14.615, longitude: 121.03 },
            { latitude: 14.64, longitude: 121.04 },
          ],
          destination: "Toyota Dealership Mandaluyong",
          details: "VIN: ZXCV123456789",
        },
      ];
      setShipments(fetchedShipments);
      // Auto-select first shipment
      if (!selectedShipment && fetchedShipments.length > 0) {
        setSelectedShipment(fetchedShipments[0]);
      }
    } catch (err) {
      setError("Failed to fetch shipments.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchShipments();
  }, []);

  // Simulate live vehicle location moving along route every 5 seconds
  useEffect(() => {
    if (!selectedShipment) return;

    let index = 0;
    if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);

    locationIntervalRef.current = setInterval(() => {
      if (
        selectedShipment.route &&
        index < selectedShipment.route.length
      ) {
        setVehicleLocation(selectedShipment.route[index]);
        index++;
      } else {
        // Stop at end of route
        clearInterval(locationIntervalRef.current);
      }
    }, 5000);

    return () => clearInterval(locationIntervalRef.current);
  }, [selectedShipment]);

  const confirmStatusChange = (shipmentId, newStatus) => {
    Alert.alert(
      `Confirm ${newStatus}?`,
      `Are you sure you want to mark this shipment as "${newStatus}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes",
          onPress: () => updateStatus(shipmentId, newStatus),
        },
      ]
    );
  };

  const acceptShipment = (id) => {
    confirmStatusChange(id, "Out for Delivery");
  };

  const updateStatus = (id, newStatus) => {
    setShipments((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: newStatus } : s))
    );
    if (selectedShipment?.id === id) {
      setSelectedShipment({ ...selectedShipment, status: newStatus });
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchShipments();
  };

  const handleLogout = async () => {
    await AsyncStorage.clear();
    navigation.replace("Login");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Driver Dashboard</Text>

      {/* Logout Button */}
      <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      {loading && <ActivityIndicator size="large" color="#CB1E2A" />}

      {error && (
        <Text style={{ color: "red", textAlign: "center" }}>{error}</Text>
      )}

      <View style={styles.contentContainer}>
        {/* Shipments List */}
        <View style={styles.shipmentList}>
          <Text style={styles.subHeading}>Shipments</Text>
          <FlatList
            data={shipments}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.shipmentItem,
                  item.id === selectedShipment?.id && styles.selectedShipment,
                ]}
                onPress={() => setSelectedShipment(item)}
              >
                <Text style={styles.shipmentName}>{item.name}</Text>
                <Text>Status: {item.status}</Text>

                {item.status === "Pending" && (
                  <Button
                    title="Accept"
                    onPress={() => acceptShipment(item.id)}
                    color="#4CAF50"
                  />
                )}
                {item.status === "Out for Delivery" && (
                  <Button
                    title="Mark Delivered"
                    onPress={() =>
                      confirmStatusChange(item.id, "Delivered")
                    }
                    color="#2196F3"
                  />
                )}
                {item.status === "Delivered" && (
                  <Text style={{ color: "green", marginTop: 5 }}>
                    Delivered ✅
                  </Text>
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              !loading && (
                <Text style={{ textAlign: "center", marginTop: 20 }}>
                  No shipments available.
                </Text>
              )
            }
          />
        </View>

        {/* Map and Shipment Details */}
        <View style={styles.mapAndStatus}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: vehicleLocation.latitude,
              longitude: vehicleLocation.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
            region={{
              latitude: vehicleLocation.latitude,
              longitude: vehicleLocation.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
          >
            <Marker coordinate={vehicleLocation} title="Your Vehicle" />
            {selectedShipment?.route && (
              <Polyline
                coordinates={selectedShipment.route}
                strokeColor="#CB1E2A"
                strokeWidth={4}
              />
            )}
          </MapView>

          <ScrollView style={styles.statusTimeline}>
            {selectedShipment ? (
              <>
                <Text style={styles.subHeading}>
                  Shipment Details for {selectedShipment.name}
                </Text>
                <Text style={{ marginTop: 8 }}>
                  Status: {selectedShipment.status}
                </Text>
                <Text>Destination: {selectedShipment.destination}</Text>
                <Text>Details: {selectedShipment.details}</Text>

                {(selectedShipment.status === "Pending" ||
                  selectedShipment.status === "Out for Delivery") && (
                  <View style={{ marginTop: 15 }}>
                    {selectedShipment.status === "Pending" && (
                      <Button
                        title="Accept Shipment"
                        onPress={() => acceptShipment(selectedShipment.id)}
                        color="#4CAF50"
                      />
                    )}
                    {selectedShipment.status === "Out for Delivery" && (
                      <Button
                        title="Mark Delivered"
                        onPress={() =>
                          confirmStatusChange(selectedShipment.id, "Delivered")
                        }
                        color="#2196F3"
                      />
                    )}
                  </View>
                )}
              </>
            ) : (
              <Text>Select a shipment to view details</Text>
            )}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  heading: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#CB1E2A",
    marginBottom: 10,
    textAlign: "center",
  },
  logoutBtn: {
    backgroundColor: "#CB1E2A",
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
    alignSelf: "center",
  },
  logoutText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  contentContainer: { flex: 1, flexDirection: "row" },
  shipmentList: {
    width: "35%",
    backgroundColor: "#f2f2f2",
    padding: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  subHeading: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  shipmentItem: {
    backgroundColor: "#fff",
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
  },
  selectedShipment: { backgroundColor: "#e6e6e6" },
  shipmentName: { fontWeight: "bold", marginBottom: 5 },
  mapAndStatus: { flex: 1, justifyContent: "space-between" },
  map: { flex: 0.7, borderRadius: 10 },
  statusTimeline: {
    flex: 0.3,
    backgroundColor: "#f0f0f0",
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
});
