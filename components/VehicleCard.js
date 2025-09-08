import React from "react";
import { View, Text } from "react-native";
import styles from "../styles/AgentDashboardStyles";

export default function VehicleCard({ data }) {
  const {
    vin,
    model,
    customer_name,
    current_status,
    driver,
    requested_processes,
    preparation_status
  } = data;

  return (
    <View style={styles.vehicleCard}>
      <Text style={styles.vehicleTitle}>
        {model || "-"} ({vin})
      </Text>
      <Text style={styles.vehicleDriver}>
        Customer: {customer_name || "-"}
      </Text>
      <Text style={styles.vehicleDriver}>
        Driver: {driver || "-"}
      </Text>
      <Text style={styles.vehicleDriver}>
        Status: {current_status || "N/A"}
      </Text>
      <Text style={styles.vehicleDriver}>
        Processes: {requested_processes?.join(", ") || "-"}
      </Text>

      <View style={styles.processRow}>
        {preparation_status &&
          Object.entries(preparation_status).map(([k, v]) => (
            <View
              key={k}
              style={[
                styles.requestTag,
                { backgroundColor: v ? "#d4edda" : "#f8d7da" }
              ]}
            >
              <Text style={styles.requestTagText}>
                {k.replace(/_/g, " ")} {v ? "✅" : "❌"}
              </Text>
            </View>
          ))}
      </View>
    </View>
  );
};
