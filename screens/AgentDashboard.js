import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  Alert,
  RefreshControl,
  Animated,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { Picker } from "@react-native-picker/picker";
import axios from 'axios';
import { buildApiUrl } from '../constants/api';
import AgentMapsView from '../components/AgentMapsView';
import ImprovedMapsView from '../components/ImprovedMapsView';
import UniformLoading from '../components/UniformLoading';

import styles from "../styles/AgentDashboardStyles";

const TAB_DASHBOARD = "Dashboard";
const TAB_REPORTS = "Reports";
const TAB_VEHICLE_STOCKS = "Vehicle Stocks";
const TAB_VEHICLE_PREP = "Vehicle Preparation";
const TAB_VEHICLE_TRACKING = "Vehicle Tracking";
const TAB_HISTORY = "History";

const STATUS_COLORS = {
  "In Progress": "#e50914", // Red
  Completed: "#2D2D2D", // Dark Gray
  Pending: "#8B0000", // Dark Red
  "In Transit": "#e50914", // Red
  Available: "#2D2D2D", // Dark Gray
  "In Use": "#e50914", // Red
  "In Dispatch": "#e50914", // Red
};

export default function AgentDashboard() {
  const navigation = useNavigation();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState({
    totalStocks: 0,
    finishedVehiclePreps: 0,
    ongoingShipments: 0,
    ongoingVehiclePreps: 0,
    recentVehiclePreps: 0,
  });

  const [activeTab, setActiveTab] = useState(TAB_DASHBOARD);
  const [tabAnimation] = useState(new Animated.Value(0));

  const [vehicles, setVehicles] = useState([]);
  const [reports, setReports] = useState([]);
  const [vehicleStocks, setVehicleStocks] = useState([]);
  const [vehiclePreps, setVehiclePreps] = useState([]);
  const [agentAllocations, setAgentAllocations] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [search, setSearch] = useState("");

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
        try {
          console.log('🔄 Agent Dashboard fetching from:', url);
          const res = await fetch(url);
          
          // Get response text first, then try to parse as JSON
          const responseText = await res.text();
          console.log('📋 Agent response status:', res.status, 'for', url);
          console.log('📋 Agent raw response:', responseText.substring(0, 200) + '...');
          
          if (!res.ok) {
            console.error('❌ Agent fetch failed:', responseText);
            throw new Error(`HTTP ${res.status}: ${responseText}`);
          }
          
          if (!responseText || responseText.trim() === '') {
            console.warn(`Empty response from ${url}`);
            return { success: false, data: null };
          }
          
          let data;
          try {
            data = JSON.parse(responseText);
            console.log('✅ Agent parsed successfully:', data.data?.length || 'N/A', 'items from', url);
          } catch (jsonError) {
            console.error('❌ Agent JSON parse error:', jsonError);
            console.error('❌ Agent response was:', responseText);
            throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}`);
          }
          
          return data;
        } catch (error) {
          console.error(`Failed to fetch/parse JSON from ${url}:`, error);
          Alert.alert("Network Error", `Unable to connect to server: ${error.message}`);
          return { success: false, data: null };
        }
      }

      // Fetch dashboard stats
      const statsResponse = await safeFetchJSON(buildApiUrl('/dashboard/stats'));
      if (statsResponse?.success && statsResponse?.data) {
        console.log("Stats fetched:", statsResponse.data);
        setStats({
          totalStocks: statsResponse.data.totalStock || 0,
          finishedVehiclePreps: 0,
          ongoingShipments: statsResponse.data.activeAllocations || 0,
          ongoingVehiclePreps: 0,
          recentVehiclePreps: 0
        });
      }

      // Fetch all data in parallel for better performance
      const [vehiclesResponse, reportsResponse, stocksResponse, prepResponse, allocationsResponse] = await Promise.all([
        safeFetchJSON(buildApiUrl('/api/dispatch/assignments')),
        safeFetchJSON(buildApiUrl('/getRequest')),
        safeFetchJSON(buildApiUrl('/getStock')),
        safeFetchJSON(buildApiUrl('/getCompletedRequests')),
        safeFetchJSON(buildApiUrl('/getAllocation'))
      ]);

      if (vehiclesResponse?.success && vehiclesResponse?.data) {
        setVehicles(vehiclesResponse.data);
      }

      if (reportsResponse?.success && reportsResponse?.data) {
        setReports(reportsResponse.data);
      }

      if (stocksResponse?.success && stocksResponse?.data) {
        setVehicleStocks(stocksResponse.data);
      }

      if (prepResponse?.success && prepResponse?.data) {
        setVehiclePreps(prepResponse.data);
        setStats(prevStats => ({
          ...prevStats,
          finishedVehiclePreps: prepResponse.data.length,
          recentVehiclePreps: prepResponse.data.slice(0, 5).length
        }));
      }

      // Filter allocations for this agent
      if (allocationsResponse?.success && allocationsResponse?.data) {
        const currentAgentName = await AsyncStorage.getItem("accountName");
        const agentSpecificAllocations = allocationsResponse.data.filter(allocation => 
          allocation.allocatedBy === currentAgentName || 
          allocation.assignedTo === currentAgentName ||
          allocation.assignedDriver === currentAgentName
        );
        setAgentAllocations(agentSpecificAllocations);
        
        // Load vehicle locations for agent's vehicles
        if (agentSpecificAllocations.length > 0) {
          await loadAgentVehicleLocations(agentSpecificAllocations);
        }
      }

    } catch (err) {
      console.error("Error fetching data:", err);
      Alert.alert("Error", "Failed to load dashboard data. Please check your connection and try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load vehicle locations for agent's assigned vehicles
  const loadAgentVehicleLocations = async (allocations) => {
    try {
      const allocationsWithLocations = await Promise.all(
        allocations.map(async (allocation) => {
          try {
            const response = await fetch(buildApiUrl(`/vehicles/${allocation.unitId || allocation._id}`));
            if (response.ok) {
              const vehicle = await response.json();
              if (vehicle.location) {
                return {
                  ...allocation,
                  location: {
                    latitude: vehicle.location.lat,
                    longitude: vehicle.location.lng,
                  }
                };
              }
            }
          } catch (error) {
            console.warn('Failed to load location for vehicle:', allocation.unitName);
          }
          return allocation;
        })
      );
      
      setAgentAllocations(allocationsWithLocations);
      if (allocationsWithLocations.length > 0) {
        setSelectedVehicle(allocationsWithLocations[0]);
      }
    } catch (error) {
      console.error('Error loading vehicle locations:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
  };

  // Logout handler with confirmation dialog
  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear all session-related AsyncStorage keys
              await AsyncStorage.removeItem('userToken');
              await AsyncStorage.removeItem('userName');
              await AsyncStorage.removeItem('userRole');
              await AsyncStorage.removeItem('accountName');
              navigation.reset({
                index: 0,
                routes: [{ name: 'LoginScreen' }],
              });
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout properly. Please try again.');
            }
          },
        },
      ]
    );
  };

  const StatusBadge = ({ status }) => (
    <View style={[
      styles.modernStatusBadge, 
      { backgroundColor: STATUS_COLORS[status] || "#6B7280" }
    ]}>
      <Text style={styles.modernStatusText}>{status}</Text>
    </View>
  );

  const StatCard = ({ title, value, icon, color, subtitle }) => (
    <View style={[styles.modernStatCard, { borderLeftColor: color }]}>
      <View style={styles.statCardContent}>
        <View style={styles.statCardHeader}>
          <Text style={styles.statCardIcon}>{icon}</Text>
          <Text style={[styles.statCardValue, { color }]}>{value}</Text>
        </View>
        <Text style={styles.statCardTitle}>{title}</Text>
        {subtitle && <Text style={styles.statCardSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );

  const filterBySearch = (list, fields) =>
    list.filter((item) =>
      fields.some((f) => String(item[f] || "").toLowerCase().includes(search.toLowerCase()))
    );

  const renderTabs = () => {
    const tabs = [
      { key: TAB_DASHBOARD, label: "Overview", icon: "📊" },
      { key: TAB_REPORTS, label: "Reports", icon: "📈" },
      { key: TAB_VEHICLE_STOCKS, label: "Inventory", icon: "🚗" },
      { key: TAB_VEHICLE_PREP, label: "Preparation", icon: "🔧" },
      { key: TAB_VEHICLE_TRACKING, label: "My Vehicles", icon: "📍" },
      { key: TAB_HISTORY, label: "History", icon: "📝" },
    ];

    return (
      <View style={styles.modernTabsContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScrollContent}
        >
          {tabs.map((tab, index) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => {
                setActiveTab(tab.key);
                // Animate tab indicator
                Animated.spring(tabAnimation, {
                  toValue: index,
                  useNativeDriver: false,
                }).start();
              }}
              style={[
                styles.modernTabBtn, 
                activeTab === tab.key && styles.modernTabBtnActive
              ]}
            >
              <Text style={styles.tabIcon}>{tab.icon}</Text>
              <Text style={[
                styles.modernTabBtnText, 
                activeTab === tab.key && styles.modernTabBtnTextActive
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderTabContent = () => {
    if (loading) return <UniformLoading message="Loading agent dashboard..." size="large" />;

    switch (activeTab) {
      case TAB_DASHBOARD:
        return (
          <ScrollView 
            style={styles.tabContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
          >
            {/* Welcome Section */}
            <View style={styles.welcomeSection}>
              <View style={styles.welcomeContent}>
                <Text style={styles.welcomeTitle}>Welcome back, {name}!</Text>
                <Text style={styles.welcomeSubtitle}>
                  Here's what's happening with your vehicles today
                </Text>
              </View>
              <Text style={styles.welcomeEmoji}>👋</Text>
            </View>
            
            {/* Enhanced Statistics Cards */}
            <View style={styles.modernStatsContainer}>
              <StatCard
                title="Total Inventory"
                value={stats.totalStocks}
                icon="📦"
                color="#e50914"
                subtitle={`${vehicleStocks.filter(v => v.status === 'Available').length} available`}
              />
              
              <StatCard
                title="Completed Preps"
                value={stats.finishedVehiclePreps}
                icon="✅"
                color="#2D2D2D"
                subtitle="This month"
              />
              
              <StatCard
                title="Active Shipments"
                value={stats.ongoingShipments}
                icon="🚛"
                color="#e50914"
                subtitle="In transit"
              />
              
              <StatCard
                title="In Preparation"
                value={vehicles.filter(v => {
                  // Support both 'processes' (from /api/dispatch/assignments) and 'requestedProcesses' (legacy)
                  const processes = v.processes || v.requestedProcesses;
                  return processes && processes.length > 0;
                }).length}
                icon="🔧"
                color="#8B0000"
                subtitle="Active processes"
              />
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActionsSection}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <View style={styles.quickActionsGrid}>
                <TouchableOpacity 
                  style={styles.quickActionCard}
                  onPress={() => setActiveTab(TAB_VEHICLE_STOCKS)}
                >
                  <Text style={styles.quickActionIcon}>📋</Text>
                  <Text style={styles.quickActionTitle}>View Inventory</Text>
                  <Text style={styles.quickActionSubtitle}>Check stock levels</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.quickActionCard}
                  onPress={() => setActiveTab(TAB_VEHICLE_PREP)}
                >
                  <Text style={styles.quickActionIcon}>⚙️</Text>
                  <Text style={styles.quickActionTitle}>Vehicle Prep</Text>
                  <Text style={styles.quickActionSubtitle}>Track progress</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.quickActionCard}
                  onPress={() => setActiveTab(TAB_REPORTS)}
                >
                  <Text style={styles.quickActionIcon}>📊</Text>
                  <Text style={styles.quickActionTitle}>View Reports</Text>
                  <Text style={styles.quickActionSubtitle}>Analytics</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.quickActionCard}
                  onPress={handleRefresh}
                >
                  <Text style={styles.quickActionIcon}>🔄</Text>
                  <Text style={styles.quickActionTitle}>Refresh Data</Text>
                  <Text style={styles.quickActionSubtitle}>Update now</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Recent Activity */}
            <View style={styles.recentActivitySection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Activity</Text>
                <TouchableOpacity onPress={() => setActiveTab(TAB_VEHICLE_PREP)}>
                  <Text style={styles.sectionAction}>View All</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.activityList}>
                {vehiclePreps.slice(0, 3).map((item, index) => (
                  <View key={index} style={styles.activityItem}>
                    <View style={styles.activityIcon}>
                      <Text>🔧</Text>
                    </View>
                    <View style={styles.activityContent}>
                      <Text style={styles.activityTitle}>
                        Vehicle Preparation {item.status === 'Completed' ? 'Completed' : 'In Progress'}
                      </Text>
                      <Text style={styles.activitySubtitle}>
                        {item.unitId || `Unit ${index + 1}`} • {item.prepType || 'General Service'}
                      </Text>
                      <Text style={styles.activityTime}>
                        {new Date().toLocaleDateString()}
                      </Text>
                    </View>
                    <StatusBadge status={item.status === 'Completed' ? 'Completed' : 'In Progress'} />
                  </View>
                ))}
                
                {vehiclePreps.length === 0 && (
                  <View style={styles.emptyActivityState}>
                    <Text style={styles.emptyActivityText}>No recent activity</Text>
                    <Text style={styles.emptyActivitySubtext}>
                      Recent vehicle preparations will appear here
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>
        );

      case TAB_VEHICLE_STOCKS: {
        const filteredStocks = filterBySearch(vehicleStocks, [
          "unitName",
          "conductionNumber",
          "bodyColor",
          "variation",
        ]);

        const renderStockCard = ({ item }) => {
          const getStatusStyle = (status) => {
            switch (status?.toLowerCase()) {
              case 'available':
                return { container: { backgroundColor: '#2D2D2D' }, text: { color: '#FFFFFF' } };
              case 'in use':
              case 'allocated':
                return { container: { backgroundColor: '#e50914' }, text: { color: '#FFFFFF' } };
              case 'in dispatch':
                return statusColors["In Dispatch"];
              case 'maintenance':
                return { container: { backgroundColor: '#8B0000' }, text: { color: '#FFFFFF' } };
              default:
                return { container: { backgroundColor: '#6B7280' }, text: { color: '#FFFFFF' } };
            }
          };

          const statusStyle = getStatusStyle(item.status || 'Available');

          return (
            <View style={styles.stockCard}>
              <View style={styles.stockCardHeader}>
                <Text style={styles.stockUnitName}>{item.unitName || 'Unknown Unit'}</Text>
                <View style={[styles.stockStatusBadge, statusStyle.container]}>
                  <Text style={[styles.stockStatusText, statusStyle.text]}>
                    {item.status || 'Available'}
                  </Text>
                </View>
              </View>

              <View style={styles.stockCardContent}>
                <View style={styles.stockInfoRow}>
                  <Text style={styles.stockInfoLabel}>Conduction #</Text>
                  <Text style={styles.stockInfoValue}>
                    {item.conductionNumber || item.unitId || 'N/A'}
                  </Text>
                </View>

                <View style={styles.stockInfoRow}>
                  <Text style={styles.stockInfoLabel}>Body Color</Text>
                  <Text style={styles.stockInfoValue}>{item.bodyColor || 'N/A'}</Text>
                </View>

                <View style={styles.stockInfoRow}>
                  <Text style={styles.stockInfoLabel}>Variation</Text>
                  <Text style={styles.stockInfoValue}>{item.variation || 'N/A'}</Text>
                </View>

                <View style={styles.stockDivider} />

                <View style={styles.stockInfoRow}>
                  <Text style={styles.stockInfoLabel}>Date Added</Text>
                  <Text style={styles.stockInfoValue}>
                    {new Date(item.createdAt || Date.now()).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </Text>
                </View>

                <View style={styles.stockInfoRow}>
                  <Text style={styles.stockInfoLabel}>Quantity</Text>
                  <Text style={styles.stockInfoValue}>{item.quantity || 1}</Text>
                </View>
              </View>
            </View>
          );
        };

        return (
          <View style={styles.stocksContainer}>
            {/* Header Section */}
            <View style={styles.stocksHeader}>
              <Text style={styles.stocksTitle}>Vehicle Inventory</Text>
            </View>

            {/* Search Section */}
            <View style={styles.stocksSearchSection}>
              <TextInput
                style={styles.stocksSearchInput}
                placeholder="Search by unit name, color, or variation..."
                value={search}
                onChangeText={setSearch}
                placeholderTextColor="#6B7280"
              />
            </View>

            {/* Stats Cards */}
            <View style={styles.stocksStatsContainer}>
              <View style={[styles.stocksStatCard, { backgroundColor: '#e50914' }]}>
                <Text style={styles.stocksStatNumber}>{vehicleStocks.length}</Text>
                <Text style={styles.stocksStatLabel}>Total Stock</Text>
              </View>
              
              <View style={[styles.stocksStatCard, { backgroundColor: '#2D2D2D' }]}>
                <Text style={styles.stocksStatNumber}>
                  {vehicleStocks.filter(v => (v.status || 'Available') === 'Available').length}
                </Text>
                <Text style={styles.stocksStatLabel}>Available</Text>
              </View>
              
              <View style={[styles.stocksStatCard, { backgroundColor: '#8B0000' }]}>
                <Text style={styles.stocksStatNumber}>
                  {vehicleStocks.filter(v => v.status === 'In Use' || v.status === 'Allocated').length}
                </Text>
                <Text style={styles.stocksStatLabel}>In Use</Text>
              </View>
            </View>

            {/* Stocks List */}
            {filteredStocks.length === 0 ? (
              <View style={styles.stocksEmptyContainer}>
                <Text style={styles.stocksEmptyText}>No vehicle stocks found</Text>
                <Text style={styles.stocksEmptySubtext}>
                  {search ? 'Try adjusting your search terms' : 'Add your first stock to get started'}
                </Text>
              </View>
            ) : (
              <View style={[styles.stocksList, { paddingBottom: 20 }]}>
                {filteredStocks.map((item, index) => {
                  return (
                    <View key={item._id || item.id || `stock-${index}`}>
                      {renderStockCard({ item })}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        );
      }

      case TAB_REPORTS:
        return (
          <ScrollView style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Reports & Analytics</Text>
            
            {/* Summary Cards */}
            <View style={styles.statsContainer}>
              <View style={[styles.statCard, { backgroundColor: '#e50914' }]}>
                <Text style={styles.statNumber}>{vehicleStocks.length}</Text>
                <Text style={styles.statLabel}>Total Vehicles</Text>
              </View>
              
              <View style={[styles.statCard, { backgroundColor: '#2D2D2D' }]}>
                <Text style={styles.statNumber}>
                  {vehicleStocks.filter(v => v.status === 'Available').length}
                </Text>
                <Text style={styles.statLabel}>Available</Text>
              </View>
              
              <View style={[styles.statCard, { backgroundColor: '#8B0000' }]}>
                <Text style={styles.statNumber}>
                  {vehiclePreps.filter(v => v.status === 'In Progress').length}
                </Text>
                <Text style={styles.statLabel}>In Preparation</Text>
              </View>
              
              <View style={[styles.statCard, { backgroundColor: '#6B7280' }]}>
                <Text style={styles.statNumber}>
                  {vehiclePreps.filter(v => v.status === 'Completed').length}
                </Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>
            </View>

            {/* Export Options */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Export Reports</Text>
              <TouchableOpacity style={[styles.addButton, { backgroundColor: '#6B7280' }]}>
                <Text style={styles.addButtonText}>📊 Export Summary Report</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.addButton, { backgroundColor: '#2D2D2D', marginTop: 10 }]}>
                <Text style={styles.addButtonText}>📋 Export Activity Log</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        );

      case TAB_VEHICLE_PREP:
        return (
          <ScrollView style={styles.tabContent}>
            {/* Header */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Vehicle Preparation Status</Text>
              <Text style={styles.sectionSubtitle}>
                Track dispatch process updates for your assigned vehicles
              </Text>
            </View>

            {/* Search */}
            <TextInput
              style={styles.searchInput}
              placeholder="Search by Unit ID, Model, or Driver..."
              value={search}
              onChangeText={setSearch}
              placeholderTextColor="#6B7280"
            />

            {/* Vehicle Preparation Cards */}
            <View style={styles.section}>
              {loading ? (
                <ActivityIndicator size="large" color="#e50914" />
              ) : (
                filterBySearch(vehicles, ["unitId", "unitName", "assignedDriver"])
                  .filter(vehicle => {
                    // Support both 'processes' (from /api/dispatch/assignments) and 'requestedProcesses' (legacy)
                    const processes = vehicle.processes || vehicle.requestedProcesses;
                    return processes && processes.length > 0;
                  })
                  .map((vehicle, index) => {
                    const completedProcesses = Object.keys(vehicle.processStatus || {}).filter(
                      key => vehicle.processStatus[key] === true
                    ).length;
                    // Support both 'processes' (from /api/dispatch/assignments) and 'requestedProcesses' (legacy)
                    const totalProcesses = vehicle.processes?.length || vehicle.requestedProcesses?.length || 0;
                    const completionPercentage = totalProcesses > 0 ? 
                      Math.round((completedProcesses / totalProcesses) * 100) : 0;
                    
                    return (
                      <View key={index} style={styles.vehiclePrepCard}>
                        {/* Card Header */}
                        <View style={styles.cardHeader}>
                          <View style={styles.vehicleInfo}>
                            <Text style={styles.vehicleTitle}>
                              {vehicle.unitName || 'Unknown Model'}
                            </Text>
                            <Text style={styles.vehicleSubtitle}>
                              Unit ID: {vehicle.unitId}
                            </Text>
                          </View>
                          <View style={[
                            styles.completionBadge,
                            { backgroundColor: completionPercentage === 100 ? '#2D2D2D' : '#e50914' }
                          ]}>
                            <Text style={styles.completionText}>
                              {completionPercentage}%
                            </Text>
                          </View>
                        </View>

                        {/* Driver Info */}
                        <View style={styles.driverSection}>
                          <Text style={styles.infoLabel}>Driver:</Text>
                          <Text style={styles.infoValue}>
                            {vehicle.assignedDriver || 'Not Assigned'}
                          </Text>
                        </View>

                        {/* Agent Info */}
                        <View style={styles.driverSection}>
                          <Text style={styles.infoLabel}>Agent:</Text>
                          <Text style={styles.infoValue}>
                            {vehicle.assignedAgent || 'Not Assigned'}
                          </Text>
                        </View>

                        {/* Progress Bar */}
                        <View style={styles.progressSection}>
                          <View style={styles.progressHeader}>
                            <Text style={styles.progressLabel}>
                              Process Completion ({completedProcesses}/{totalProcesses})
                            </Text>
                          </View>
                          <View style={styles.progressBar}>
                            <View 
                              style={[
                                styles.progressFill,
                                { 
                                  width: `${completionPercentage}%`,
                                  backgroundColor: completionPercentage === 100 ? '#2D2D2D' : '#e50914'
                                }
                              ]}
                            />
                          </View>
                        </View>

                        {/* Process List */}
                        <View style={styles.processListSection}>
                          <Text style={styles.processListTitle}>Required Processes:</Text>
                          {((vehicle.processes || vehicle.requestedProcesses) || []).map(processId => {
                            const isCompleted = vehicle.processStatus?.[processId] === true;
                            const completedBy = vehicle.processCompletedBy?.[processId];
                            const completedAt = vehicle.processCompletedAt?.[processId];
                            
                            return (
                              <View key={processId} style={styles.processItem}>
                                <View style={styles.processInfo}>
                                  <View style={styles.processHeader}>
                                    <Text style={[
                                      styles.processName,
                                      isCompleted && styles.processNameCompleted
                                    ]}>
                                      {isCompleted ? '✅' : '⏳'} {processId.replace('_', ' ').toUpperCase()}
                                    </Text>
                                    <View style={[
                                      styles.processStatusBadge,
                                      isCompleted ? styles.processStatusCompleted : styles.processStatusPending
                                    ]}>
                                      <Text style={[
                                        styles.processStatusText,
                                        isCompleted ? styles.processStatusTextCompleted : styles.processStatusTextPending
                                      ]}>
                                        {isCompleted ? 'COMPLETED' : 'PENDING'}
                                      </Text>
                                    </View>
                                  </View>
                                  
                                  {isCompleted && (completedBy || completedAt) && (
                                    <View style={styles.completionDetails}>
                                      {completedBy && (
                                        <Text style={styles.completionInfo}>
                                          ✓ Completed by: {completedBy}
                                        </Text>
                                      )}
                                      {completedAt && (
                                        <Text style={styles.completionInfo}>
                                          📅 {new Date(completedAt).toLocaleDateString()} at {new Date(completedAt).toLocaleTimeString()}
                                        </Text>
                                      )}
                                    </View>
                                  )}
                                </View>
                              </View>
                            );
                          })}
                        </View>

                        {/* Overall Status */}
                        <View style={styles.overallStatusSection}>
                          {completionPercentage === 100 ? (
                            <View style={styles.readyStatusContainer}>
                              <Text style={styles.readyStatusText}>
                                🎉 All processes completed - Vehicle ready for release!
                              </Text>
                              {vehicle.readyBy && vehicle.readyAt && (
                                <Text style={styles.readyDetails}>
                                  Marked ready by {vehicle.readyBy} on {new Date(vehicle.readyAt).toLocaleDateString()}
                                </Text>
                              )}
                            </View>
                          ) : (
                            <View style={styles.pendingStatusContainer}>
                              <Text style={styles.pendingStatusText}>
                                ⏳ {totalProcesses - completedProcesses} process(es) remaining
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  })
              )}

              {/* Empty State */}
              {!loading && filterBySearch(vehicles, ["unitId", "unitName", "assignedDriver"])
                .filter(vehicle => {
                  // Support both 'processes' (from /api/dispatch/assignments) and 'requestedProcesses' (legacy)
                  const processes = vehicle.processes || vehicle.requestedProcesses;
                  return processes && processes.length > 0;
                }).length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateTitle}>No vehicles in preparation</Text>
                  <Text style={styles.emptyStateText}>
                    Vehicles with assigned processes will appear here once they enter the preparation phase.
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        );

      case TAB_VEHICLE_TRACKING:
        return (
          <View style={styles.tabContent}>
            {/* Header */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>My Vehicle Tracking</Text>
              <Text style={styles.sectionSubtitle}>
                Track real-time locations of vehicles assigned to you
              </Text>
            </View>

            {/* Improved Maps Component */}
            <ImprovedMapsView 
              style={{ flex: 1, minHeight: 400 }} 
              userRole="agent"
              agentFilter={accountName}
            />

            {/* Vehicle List */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>My Assigned Vehicles</Text>
              
              {agentAllocations.length > 0 ? (
                agentAllocations.map((allocation, index) => (
                  <TouchableOpacity
                    key={allocation._id || index}
                    style={[
                      styles.vehicleTrackingCard,
                      selectedVehicle?._id === allocation._id && styles.selectedVehicleCard
                    ]}
                    onPress={() => setSelectedVehicle(allocation)}
                  >
                    <View style={styles.vehicleCardHeader}>
                      <Text style={styles.vehicleTrackingName}>
                        {allocation.unitName || 'Unknown Vehicle'}
                      </Text>
                      <View style={[
                        styles.trackingStatusBadge,
                        { backgroundColor: allocation.location ? '#22C55E' : '#6B7280' }
                      ]}>
                        <Text style={styles.trackingStatusText}>
                          {allocation.location ? '📍 GPS Active' : '📍 No GPS'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.vehicleCardContent}>
                      <View style={styles.vehicleInfoRow}>
                        <Text style={styles.vehicleInfoLabel}>Unit ID:</Text>
                        <Text style={styles.vehicleInfoValue}>
                          {allocation.unitId || 'N/A'}
                        </Text>
                      </View>

                      <View style={styles.vehicleInfoRow}>
                        <Text style={styles.vehicleInfoLabel}>Driver:</Text>
                        <Text style={styles.vehicleInfoValue}>
                          {allocation.assignedDriver || 'Not assigned'}
                        </Text>
                      </View>

                      <View style={styles.vehicleInfoRow}>
                        <Text style={styles.vehicleInfoLabel}>Status:</Text>
                        <Text style={styles.vehicleInfoValue}>
                          {allocation.status || 'Unknown'}
                        </Text>
                      </View>

                      {allocation.location && (
                        <View style={styles.vehicleInfoRow}>
                          <Text style={styles.vehicleInfoLabel}>Location:</Text>
                          <Text style={styles.vehicleInfoValue}>
                            {allocation.location.latitude.toFixed(4)}, {allocation.location.longitude.toFixed(4)}
                          </Text>
                        </View>
                      )}

                      <View style={styles.vehicleInfoRow}>
                        <Text style={styles.vehicleInfoLabel}>Date Assigned:</Text>
                        <Text style={styles.vehicleInfoValue}>
                          {new Date(allocation.date || allocation.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateTitle}>No vehicles assigned</Text>
                  <Text style={styles.emptyStateText}>
                    When vehicles are assigned to you, they will appear here for tracking.
                  </Text>
                </View>
              )}
            </View>

            {/* Refresh Button */}
            <TouchableOpacity 
              style={styles.refreshTrackingButton} 
              onPress={() => {
                console.log('Refreshing agent vehicle tracking...');
                fetchAllData();
              }}
            >
              <Text style={styles.refreshTrackingText}>🔄 Refresh Tracking</Text>
            </TouchableOpacity>
          </View>
        );

      case TAB_HISTORY:
        return (
          <View style={styles.tabContent}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>My Activity History</Text>
              <Text style={styles.sectionSubtitle}>
                View your vehicle allocations and activities
              </Text>
              
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => navigation.navigate('HistoryScreen')}
              >
                <Text style={styles.addButtonText}>📝 View Full History</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.modernContainer}>
      {/* Modern Header */}
      <View style={styles.modernHeader}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>I-Track Agent</Text>
            <Text style={styles.headerSubtitle}>Vehicle Management</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => navigation.navigate('UserProfile')}
              style={styles.profileButton}
            >
              <Text style={styles.profileButtonText}>👤</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleLogout}
              style={styles.modernLogoutBtn}
            >
              <Text style={styles.modernLogoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Modern Navigation Tabs */}
      {renderTabs()}

      {/* Content Area */}
      <View style={styles.contentContainer}>
        {renderTabContent()}
      </View>
    </View>
  );
}
