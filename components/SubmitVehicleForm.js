import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import styles from "../styles/AgentDashboardStyles";
import axios from "axios";

const processOptions = [
  "tinting", "carwash", "ceramic_coating", "accessories", "rust_proof"
];

export default function SubmitVehicleForm({ onSuccess }) {
  const [vin, setVin] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customer, setCustomer] = useState("");
  const [unitModel, setUnitModel] = useState("");
  const [processes, setProcesses] = useState([]);
  const [loading, setLoading] = useState(false);

  const toggleProcess = proc => {
    setProcesses(prev =>
      prev.includes(proc) ? prev.filter(p => p !== proc) : [...prev, proc]
    );
  };

  const handleSubmit = async () => {
    if (!vin || !customerName || !customer || !unitModel || processes.length === 0) {
      return Alert.alert("Missing fields", "Please complete all required fields.");
    }
    setLoading(true);
    try {
      await axios.put(`http://.../vehicles/${vin}/update-requested`, {
        requested_processes: processes,
        customer_name: customerName,
        model: unitModel,
      });
      await axios.post(`http://.../send-sms`, {
        to: customer,
        message: `Hi ${customerName}, your ${unitModel} (VIN ${vin}) is submitted for processing.`,
      });
      Alert.alert("Success", "Vehicle submitted and SMS sent");
      setVin(""); setCustomer(""); setCustomerName(""); setUnitModel(""); setProcesses([]);
      onSuccess();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || err.message);
    }
    setLoading(false);
  };

  return (
    <View style={styles.vehicleCard}>
      <Text style={styles.sectionLabel}>Submit Vehicle</Text>
      <TextInput placeholder="VIN" style={styles.input} value={vin} onChangeText={setVin} />
      <TextInput placeholder="Customer Name" style={styles.input} value={customerName} onChangeText={setCustomerName} />
      <TextInput placeholder="Customer Number" style={styles.input} value={customer} onChangeText={setCustomer} keyboardType="phone-pad" />
      <TextInput placeholder="Unit Model" style={styles.input} value={unitModel} onChangeText={setUnitModel} />

      <Text style={styles.sectionLabel}>Select Processes</Text>
      <View style={styles.processRow}>
        {processOptions.map(proc => (
          <TouchableOpacity
            key={proc}
            style={[
              styles.requestTag,
              processes.includes(proc) && { backgroundColor: "#CB1E2A" }
            ]}
            onPress={() => toggleProcess(proc)}
          >
            <Text style={[
              styles.requestTagText,
              processes.includes(proc) && { color: "#fff" }
            ]}>
              {proc.replace("_", " ")}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        onPress={handleSubmit}
        style={[styles.addButton, loading && { backgroundColor: "#ccc" }]}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.addButtonText}>Submit Vehicle</Text>}
      </TouchableOpacity>
    </View>
  );
}
