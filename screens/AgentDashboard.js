import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { buildApiUrl } from "../constants/api";
import StocksOverview from "../components/StocksOverview";
import UniformLoading from "../components/UniformLoading";
import styles from "../styles/AgentDashboardStyles";

const theme = {
  card: "#ffffff",
  surface: "#f9fafb",
  text: "#111827",
  textSecondary: "#6b7280",
  textTertiary: "#9ca3af",
  border: "#e5e7eb",
  borderLight: "#f3f4f6",
};

const StatCard = ({ title, value, iconName, color, subtitle }) => (
  <View style={[styles.simpleStatCard, { backgroundColor: color }]}>
    <View style={styles.simpleStatHeader}>
      <MaterialIcons name={iconName} size={22} color="#ffffff" />
      <Text style={styles.simpleStatValue}>{value}</Text>
    </View>
    <Text style={styles.simpleStatTitle}>{title}</Text>
    {subtitle ? <Text style={styles.simpleStatSubtitle}>{subtitle}</Text> : null}
  </View>
);

export default function AgentDashboard() {
    const navigation = useNavigation();
    const [name, setName] = useState("Agent");
    const [role, setRole] = useState("");
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({
      totalStocks: 0,
      finishedVehiclePreps: 0,
      ongoingShipments: 0,
      ongoingVehiclePreps: 0,
    });
    const [vehicleStocks, setVehicleStocks] = useState([]);

    useEffect(() => {
      const load = async () => {
        const stored = await AsyncStorage.getItem("accountName");
        const storedRole = await AsyncStorage.getItem("userRole");
        setName(stored || "Agent");
        setRole(storedRole || "");
        await fetchAllData();
      };
      load();
    }, []);

    const safeFetchJSON = async (url) => {
      try {
        const res = await fetch(url);
        const text = await res.text();
        if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
        if (!text || text.trim() === "") return { success: false, data: null };
        return JSON.parse(text);
      } catch (err) {
        console.error(`Failed fetching ${url}:`, err);
        return { success: false, data: null };
      }
    };

    const fetchAllData = async () => {
      try {
        setLoading(true);
        const [statsRes, stocksRes] = await Promise.all([
          safeFetchJSON(buildApiUrl("/dashboard/stats")),
          safeFetchJSON(buildApiUrl("/getStock")),
        ]);

        let resolvedStocks = [];

        if (stocksRes?.success && Array.isArray(stocksRes.data)) {
          resolvedStocks = stocksRes.data;
          setVehicleStocks(stocksRes.data);
        } else if (Array.isArray(stocksRes?.data?.data)) {
          resolvedStocks = stocksRes.data.data;
          setVehicleStocks(stocksRes.data.data);
        }

        if (statsRes?.success && statsRes?.data) {
          const payload = statsRes.data;
          const totalStocks =
            payload.totalStocks ?? payload.totalStock ?? payload.total ?? 0;
          const finishedVehiclePreps =
            payload.finishedVehiclePreps ?? payload.completedPreps ?? payload.completedAllocations ?? 0;
          const ongoingShipments =
            payload.ongoingShipment ?? payload.activeAllocations ?? payload.inTransit ?? 0;
          const ongoingVehiclePreps =
            payload.ongoingVehiclePreparation ?? payload.activeProcesses ?? payload.prepInProgress ?? 0;

          setStats({
            totalStocks: totalStocks || resolvedStocks.length || 0,
            finishedVehiclePreps,
            ongoingShipments,
            ongoingVehiclePreps,
          });
        } else {
          // Fallback: at least show stock count if stats API fails
          setStats((prev) => ({
            ...prev,
            totalStocks: resolvedStocks.length || prev.totalStocks,
          }));
        }
      } catch (err) {
        console.error("Agent dashboard fetch error:", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

    const handleRefresh = async () => {
      setRefreshing(true);
      await fetchAllData();
    };

    if (loading) {
      return <UniformLoading message="Loading agent dashboard..." size="large" />;
    }

    return (
      <View style={styles.modernContainer}>
        <View style={styles.modernHeader}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>Agent Dashboard</Text>
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.tabContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          <View style={styles.dashboardTitleRow}>
            <Text style={styles.dashboardTitle}>{(role || "").toLowerCase() === 'manager' ? 'Manager Dashboard' : 'Vehicle Management'}</Text>
          </View>

          <View style={styles.simpleStatsGrid}>
            <StatCard
              title={"Total Stocks"}
              value={stats.totalStocks}
              iconName="inventory"
              color="#e50914"
              subtitle="All vehicles"
            />
            <StatCard
              title={"Finished Vehicle Preparation"}
              value={stats.finishedVehiclePreps}
              iconName="check-circle"
              color="#374151"
              subtitle="Ready units"
            />
            <StatCard
              title={"Ongoing Shipment"}
              value={stats.ongoingShipments}
              iconName="local-shipping"
              color="#e50914"
              subtitle="In transit"
            />
            <StatCard
              title={"Ongoing Vehicle Preparation"}
              value={stats.ongoingVehiclePreps}
              iconName="build"
              color="#e50914"
              subtitle="In progress"
            />
          </View>

          <View style={styles.overviewCard}>
            <StocksOverview inventory={vehicleStocks} theme={theme} />
          </View>
        </ScrollView>
      </View>
    );
  }
