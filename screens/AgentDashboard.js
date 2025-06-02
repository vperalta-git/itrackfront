import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
  TextInput,
  ScrollView,
  Modal,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { Picker } from "@react-native-picker/picker";

import styles from "../styles/AgentDashboardStyles";

const TAB_DASHBOARD = "Dashboard";
const TAB_REPORTS = "Reports";
const TAB_VEHICLE_STOCKS = "Vehicle Stocks";
const TAB_VEHICLE_PREP = "Vehicle Preparation";
const TAB_DRIVER_ALLOC = "Driver Allocation";

const STATUS_COLORS = {
  "In Progress": "#FDD835",
  Completed: "#66BB6A",
  Pending: "#FFA726",
  "In Transit": "#1976D2",
};

export default function AgentDashboard() {
  const navigation = useNavigation();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    totalStocks: 0,
    finishedVehiclePreps: 0,
    ongoingShipments: 0,
    ongoingVehiclePreps: 0,
    recentVehiclePreps: 0,
  });

  const [activeTab, setActiveTab] = useState(TAB_DASHBOARD);

  const [vehicles, setVehicles] = useState([]);
  const [reports, setReports] = useState([]);
  const [vehicleStocks, setVehicleStocks] = useState([]);
  const [vehiclePreps, setVehiclePreps] = useState([]);
  const [driverAllocations, setDriverAllocations] = useState([]);
  const [search, setSearch] = useState("");

  // Modal visibility states
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [showAllocateDriverModal, setShowAllocateDriverModal] = useState(false);

  // Add Stock form state
  const [newStock, setNewStock] = useState({
    unitName: "",
    conductionNumber: "",
    bodyColor: "",
    variation: "",
  });

  // Allocate Driver form state
  const [newAllocation, setNewAllocation] = useState({
    unitName: "",
    conductionNumber: "",
    bodyColor: "",
    variation: "",
    assignedDriver: "",
    status: "Pending",
  });

  // Driver options (could be fetched from backend if needed)
  const driverOptions = ["Driver A", "Driver B", "Driver C"];

  useEffect(() => {
    const load = async () => {
      const stored = await AsyncStorage.getItem("accountName");
      setName(stored || "Agent");
      await fetchAllData();
    };
    load();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);

      // Helper to fetch and parse JSON safely
      async function safeFetchJSON(url) {
        const res = await fetch(url);
        const text = await res.text();
        try {
          return JSON.parse(text);
        } catch {
          console.error(`Failed to parse JSON from ${url}. Response text:`, text);
          Alert.alert("Error", `Server returned invalid data from ${url}`);
          return null;
        }
      }

      const statsJson = await safeFetchJSON("http://192.168.254.147:5000/dashboard/stats");
      if (statsJson) {
        console.log("Stats fetched:", statsJson);
        setStats(statsJson);
      }

      const vehiclesJson = await safeFetchJSON("http://192.168.254.147:5000/vehicles");
      if (vehiclesJson) {
        console.log("Vehicles fetched:", vehiclesJson);
        setVehicles(vehiclesJson);
      }

      const reportsJson = await safeFetchJSON("http://192.168.254.147:5000/vehicle-preparations");
      if (reportsJson) {
        console.log("Reports fetched:", reportsJson);
        setReports(reportsJson);
      }

      const stocksJson = await safeFetchJSON("http://192.168.254.147:5000/vehicle-stocks");
      if (stocksJson) {
        console.log("Vehicle Stocks fetched:", stocksJson);
        setVehicleStocks(stocksJson);
      }

      const prepJson = await safeFetchJSON("http://192.168.254.147:5000/vehicle-preparations");
      if (prepJson) {
        console.log("Vehicle Preparations fetched:", prepJson);
        setVehiclePreps(prepJson);
      }

      const driversJson = await safeFetchJSON("http://192.168.254.147:5000/driver-allocations");
      if (driversJson) {
        console.log("Driver Allocations fetched:", driversJson);
        setDriverAllocations(driversJson);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  const StatusBadge = ({ status }) => (
    <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[status] || "#ccc" }]}>
      <Text style={styles.statusBadgeText}>{status}</Text>
    </View>
  );

  const filterBySearch = (list, fields) =>
    list.filter((item) =>
      fields.some((f) => String(item[f] || "").toLowerCase().includes(search.toLowerCase()))
    );

  const handleAddStock = async () => {
    const { unitName, conductionNumber, bodyColor, variation } = newStock;
    if (!unitName || !conductionNumber || !bodyColor || !variation) {
      Alert.alert("Error", "Please fill in all fields for adding stock.");
      return;
    }
    try {
      const res = await fetch("http://192.168.254.147:5000/vehicle-stocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newStock),
      });
      if (!res.ok) throw new Error("Failed to add stock.");
      setNewStock({ unitName: "", conductionNumber: "", bodyColor: "", variation: "" });
      setShowAddStockModal(false);
      fetchAllData();
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  const handleAllocateDriver = async () => {
    const { unitName, conductionNumber, bodyColor, variation, assignedDriver, status } = newAllocation;
    if (!unitName || !conductionNumber || !bodyColor || !variation || !assignedDriver || !status) {
      Alert.alert("Error", "Please fill in all fields for driver allocation.");
      return;
    }
    try {
      const res = await fetch("http://192.168.254.147:5000/driver-allocations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAllocation),
      });
      if (!res.ok) throw new Error("Failed to allocate driver.");
      setNewAllocation({
        unitName: "",
        conductionNumber: "",
        bodyColor: "",
        variation: "",
        assignedDriver: "",
        status: "Pending",
      });
      setShowAllocateDriverModal(false);
      fetchAllData();
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  const renderTabs = () => {
    const tabs = [
      TAB_DASHBOARD,
      TAB_REPORTS,
      TAB_VEHICLE_STOCKS,
      TAB_VEHICLE_PREP,
      TAB_DRIVER_ALLOC,
    ];
    return (
      <View style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
          >
            <Text style={[styles.tabBtnText, activeTab === tab && styles.tabBtnTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderTabContent = () => {
    if (loading) return <ActivityIndicator size="large" color="#CB1E2A" />;

    switch (activeTab) {
      case TAB_DASHBOARD:
        return (
          <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            <Text style={styles.greeting}>Hi, {name} 👋</Text>
          </ScrollView>
        );

      case TAB_VEHICLE_STOCKS: {
        const filteredStocks = filterBySearch(vehicleStocks, [
          "unitName",
          "conductionNumber",
          "bodyColor",
          "variation",
        ]);
        return (
          <View style={{ flex: 1 }}>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddStockModal(true)}
            >
              <Text style={styles.addButtonText}>+ Add Stock</Text>
            </TouchableOpacity>

            <ScrollView horizontal style={{ marginBottom: 10 }}>
              <View>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderCell, { width: 140 }]}>Unit Name</Text>
                  <Text style={[styles.tableHeaderCell, { width: 160 }]}>Conduction Number</Text>
                  <Text style={[styles.tableHeaderCell, { width: 140 }]}>Body Color</Text>
                  <Text style={[styles.tableHeaderCell, { width: 140 }]}>Variation</Text>
                </View>
                <FlatList
                  data={filteredStocks}
                  keyExtractor={(item) => item._id || item.id}
                  renderItem={({ item }) => (
                    <View style={styles.tableRow}>
                      <Text style={[styles.tableCell, { width: 140 }]}>{item.unitName}</Text>
                      <Text style={[styles.tableCell, { width: 160 }]}>
                        {item.conductionNumber || item.unitId}
                      </Text>
                      <Text style={[styles.tableCell, { width: 140 }]}>{item.bodyColor}</Text>
                      <Text style={[styles.tableCell, { width: 140 }]}>{item.variation}</Text>
                    </View>
                  )}
                />
              </View>
            </ScrollView>
          </View>
        );
      }

      case TAB_DRIVER_ALLOC: {
        const filteredAllocations = filterBySearch(driverAllocations, [
          "unitName",
          "unitId",
          "assignedDriver",
          "status",
        ]);
        return (
          <View style={{ flex: 1 }}>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAllocateDriverModal(true)}
            >
              <Text style={styles.addButtonText}>+ Allocate Driver</Text>
            </TouchableOpacity>

            <ScrollView horizontal style={{ marginBottom: 10 }}>
              <View>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderCell, { width: 120 }]}>Unit Name</Text>
                  <Text style={[styles.tableHeaderCell, { width: 140 }]}>Unit ID</Text>
                  <Text style={[styles.tableHeaderCell, { width: 120 }]}>Body Color</Text>
                  <Text style={[styles.tableHeaderCell, { width: 120 }]}>Variation</Text>
                  <Text style={[styles.tableHeaderCell, { width: 140 }]}>Assigned Driver</Text>
                  <Text style={[styles.tableHeaderCell, { width: 100 }]}>Status</Text>
                </View>
                <FlatList
                  data={filteredAllocations}
                  keyExtractor={(item) => item._id || item.id}
                  renderItem={({ item }) => (
                    <View style={styles.tableRow}>
                      <Text style={[styles.tableCell, { width: 120 }]}>{item.unitName}</Text>
                      <Text style={[styles.tableCell, { width: 140 }]}>{item.unitId}</Text>
                      <Text style={[styles.tableCell, { width: 120 }]}>{item.bodyColor}</Text>
                      <Text style={[styles.tableCell, { width: 120 }]}>{item.variation}</Text>
                      <Text style={[styles.tableCell, { width: 140 }]}>{item.assignedDriver}</Text>
                      <View style={[styles.tableCell, { width: 100 }]}>
                        <StatusBadge status={item.status} />
                      </View>
                    </View>
                  )}
                />
              </View>
            </ScrollView>
          </View>
        );
      }

      case TAB_VEHICLE_PREP:
        return (
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <Text>Vehicle Preparation tab content coming soon.</Text>
          </ScrollView>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hi, {name} 👋</Text>
        <TouchableOpacity
          onPress={async () => {
            await AsyncStorage.clear();
            navigation.reset({ index: 0, routes: [{ name: "Login" }] });
          }}
          style={styles.logoutBtn}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {renderTabs()}

      <View style={styles.content}>{renderTabContent()}</View>

      {/* Add Stock Modal */}
      <Modal visible={showAddStockModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Stock</Text>

            <TextInput
              style={styles.input}
              placeholder="Unit Name"
              value={newStock.unitName}
              onChangeText={(text) => setNewStock({ ...newStock, unitName: text })}
              multiline
            />
            <TextInput
              style={styles.input}
              placeholder="Conduction Number"
              value={newStock.conductionNumber}
              onChangeText={(text) => setNewStock({ ...newStock, conductionNumber: text })}
              multiline
            />
            <TextInput
              style={styles.input}
              placeholder="Body Color"
              value={newStock.bodyColor}
              onChangeText={(text) => setNewStock({ ...newStock, bodyColor: text })}
              multiline
            />
            <Picker
              selectedValue={newStock.variation}
              onValueChange={(value) => setNewStock({ ...newStock, variation: value })}
              style={styles.picker}
            >
              <Picker.Item label="Select Variation" value="" />
              <Picker.Item label="4x2 LSA" value="4x2 LSA" />
              <Picker.Item label="4x4" value="4x4" />
              <Picker.Item label="LS-E" value="LS-E" />
              <Picker.Item label="LS" value="LS" />
            </Picker>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.createBtn} onPress={handleAddStock}>
                <Text style={styles.createBtnText}>Add</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowAddStockModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Allocate Driver Modal */}
      <Modal visible={showAllocateDriverModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Allocate Driver</Text>

            <TextInput
              style={styles.input}
              placeholder="Unit Name"
              value={newAllocation.unitName}
              onChangeText={(text) => setNewAllocation({ ...newAllocation, unitName: text })}
              multiline
            />
            <TextInput
              style={styles.input}
              placeholder="Conduction Number"
              value={newAllocation.conductionNumber}
              onChangeText={(text) =>
                setNewAllocation({ ...newAllocation, conductionNumber: text })
              }
              multiline
            />
            <TextInput
              style={styles.input}
              placeholder="Body Color"
              value={newAllocation.bodyColor}
              onChangeText={(text) => setNewAllocation({ ...newAllocation, bodyColor: text })}
              multiline
            />
            <Picker
              selectedValue={newAllocation.variation}
              onValueChange={(value) => setNewAllocation({ ...newAllocation, variation: value })}
              style={styles.picker}
            >
              <Picker.Item label="Select Variation" value="" />
              <Picker.Item label="4x2 LSA" value="4x2 LSA" />
              <Picker.Item label="4x4" value="4x4" />
              <Picker.Item label="LS-E" value="LS-E" />
              <Picker.Item label="LS" value="LS" />
            </Picker>

            <Picker
              selectedValue={newAllocation.assignedDriver}
              onValueChange={(value) =>
                setNewAllocation({ ...newAllocation, assignedDriver: value })
              }
              style={styles.picker}
            >
              <Picker.Item label="Select Driver" value="" />
              {driverOptions.map((driver) => (
                <Picker.Item key={driver} label={driver} value={driver} />
              ))}
            </Picker>

            <Picker
              selectedValue={newAllocation.status}
              onValueChange={(value) => setNewAllocation({ ...newAllocation, status: value })}
              style={styles.picker}
            >
              <Picker.Item label="Pending" value="Pending" />
              <Picker.Item label="In Progress" value="In Progress" />
              <Picker.Item label="Completed" value="Completed" />
              <Picker.Item label="In Transit" value="In Transit" />
            </Picker>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.createBtn} onPress={handleAllocateDriver}>
                <Text style={styles.createBtnText}>Submit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowAllocateDriverModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
