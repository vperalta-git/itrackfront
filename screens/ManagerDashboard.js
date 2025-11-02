import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  ScrollView,
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

export default function ManagerDashboard() {
  const navigation = useNavigation();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myAgents, setMyAgents] = useState([]);
  
  // NEW: Agent filtering functionality
  const [selectedAgent, setSelectedAgent] = useState('all'); // 'all' or specific agent ID
  const [showAgentFilter, setShowAgentFilter] = useState(false);

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
  const [managerAllocations, setManagerAllocations] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      const stored = await AsyncStorage.getItem("accountName");
      setName(stored || "Manager");
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
          console.log('🔄 Manager Dashboard fetching from:', url);
          const res = await fetch(url);
          
          // Get response text first, then try to parse as JSON
          const responseText = await res.text();
          console.log('📋 Manager response status:', res.status, 'for', url);
          console.log('📋 Manager raw response:', responseText.substring(0, 200) + '...');
          
          if (!res.ok) {
            console.error('❌ Manager fetch failed:', responseText);
            throw new Error(`HTTP ${res.status}: ${responseText}`);
          }
          
          if (!responseText || responseText.trim() === '') {
            console.warn(`Empty response from ${url}`);
            return { success: false, data: null };
          }
          
          let data;
          try {
            data = JSON.parse(responseText);
            console.log('✅ Manager parsed successfully:', data.data?.length || 'N/A', 'items from', url);
          } catch (jsonError) {
            console.error('❌ Manager JSON parse error:', jsonError);
            console.error('❌ Manager response was:', responseText);
            throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}`);
          }
          
          return data;
        } catch (error) {
          console.error(`Failed to fetch/parse JSON from ${url}:`, error);
          Alert.alert("Network Error", `Unable to connect to server: ${error.message}`);
          return { success: false, data: null };
        }
      }

      // Get current manager's name
      const currentManagerName = await AsyncStorage.getItem("accountName");
      
      // Fetch users to get agents assigned to this manager
      const usersResponse = await safeFetchJSON('https://itrack-backend-1.onrender.com/admin/users');
      if (usersResponse?.success !== false && usersResponse) {
        const users = Array.isArray(usersResponse) ? usersResponse : usersResponse.data || [];
        
        // Get manager ID first by finding current manager in the users list
        const currentManager = users.find(user => 
          user.accountName === currentManagerName && 
          (user.role === 'Manager' || user.role === 'manager')
        );
        
        if (currentManager) {
          // Filter agents assigned to this manager
          const assignedAgents = users.filter(user => 
            (user.role.toLowerCase() === 'sales agent' || user.role.toLowerCase() === 'agent') && 
            user.assignedTo === currentManager._id
          );
          setMyAgents(assignedAgents);
          console.log('✅ Found', assignedAgents.length, 'agents assigned to manager:', currentManagerName);
        } else {
          console.warn('⚠️ Could not find current manager in users list');
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

      // Filter allocations for this manager's agents
      if (allocationsResponse?.success && allocationsResponse?.data) {
        const agentNames = myAgents.map(agent => agent.accountName);
        const managerSpecificAllocations = allocationsResponse.data.filter(allocation => 
          agentNames.includes(allocation.allocatedBy) || 
          agentNames.includes(allocation.assignedTo) ||
          agentNames.includes(allocation.assignedDriver) ||
          allocation.allocatedBy === currentManagerName // Also include manager's own allocations
        );
        setManagerAllocations(managerSpecificAllocations);
        
        // Load vehicle locations for manager's vehicles
        if (managerSpecificAllocations.length > 0) {
          await loadManagerVehicleLocations(managerSpecificAllocations);
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

  // Load vehicle locations for manager's team vehicles
  const loadManagerVehicleLocations = async (allocations) => {
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
      
      setManagerAllocations(allocationsWithLocations);
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

  // NEW: Filter data by selected agent
  const filterByAgent = (list, agentField = 'allocatedBy') => {
    if (selectedAgent === 'all') return list;
    
    const selectedAgentData = myAgents.find(agent => agent._id === selectedAgent);
    if (!selectedAgentData) return list;
    
    return list.filter(item => 
      item[agentField] === selectedAgentData.accountName ||
      item.assignedTo === selectedAgentData.accountName ||
      item.assignedAgent === selectedAgentData.accountName
    );
  };

  // NEW: Get filtered data for current agent selection
  const getFilteredData = (list, fields, agentField = 'allocatedBy') => {
    return filterByAgent(filterBySearch(list, fields), agentField);
  };

  // NEW: Agent Filter Component
  const renderAgentFilter = () => (
    <View style={styles.agentFilterSection}>
      <Text style={styles.filterLabel}>Filter by Agent:</Text>
      <View style={styles.agentFilterContainer}>
        <TouchableOpacity 
          style={[styles.agentFilterButton, selectedAgent === 'all' && styles.agentFilterButtonActive]}
          onPress={() => setSelectedAgent('all')}
        >
          <Text style={[styles.agentFilterText, selectedAgent === 'all' && styles.agentFilterTextActive]}>
            All Agents ({myAgents.length})
          </Text>
        </TouchableOpacity>
        
        {myAgents.map(agent => (
          <TouchableOpacity 
            key={agent._id}
            style={[styles.agentFilterButton, selectedAgent === agent._id && styles.agentFilterButtonActive]}
            onPress={() => setSelectedAgent(agent._id)}
          >
            <Text style={[styles.agentFilterText, selectedAgent === agent._id && styles.agentFilterTextActive]}>
              {agent.accountName}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderTabs = () => {
    const tabs = [
      { key: TAB_DASHBOARD, label: "Team Overview", icon: "📊" },
      { key: TAB_REPORTS, label: "Team Reports", icon: "📈" },
      { key: TAB_VEHICLE_STOCKS, label: "Inventory", icon: "🚗" },
      { key: TAB_VEHICLE_PREP, label: "Team Progress", icon: "🔧" },
      { key: TAB_VEHICLE_TRACKING, label: "Team Vehicles", icon: "📍" },
      { key: TAB_HISTORY, label: "Team History", icon: "📝" },
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
        
        {/* Agent Filter - Show on relevant tabs */}
        {(activeTab !== TAB_DASHBOARD) && myAgents.length > 0 && renderAgentFilter()}
      </View>
    );
  };

  const renderTabContent = () => {
    if (loading) return <ActivityIndicator size="large" color="#e50914" />;

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
                  Managing {myAgents.length} sales agents and their operations
                </Text>
              </View>
              <Text style={styles.welcomeEmoji}>👨‍💼</Text>
            </View>
            
            {/* Enhanced Statistics Cards */}
            <View style={styles.modernStatsContainer}>
              <StatCard
                title="My Team Size"
                value={myAgents.length}
                icon="👥"
                color="#e50914"
                subtitle="Assigned agents"
              />
              
              <StatCard
                title="Total Inventory"
                value={stats.totalStocks}
                icon="📦"
                color="#2D2D2D"
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
                title="Team Allocations"
                value={managerAllocations.length}
                icon="🚛"
                color="#e50914"
                subtitle="Active"
              />
            </View>

            {/* My Team Section */}
            <View style={styles.quickActionsSection}>
              <Text style={styles.sectionTitle}>My Sales Team</Text>
              <View style={styles.teamGrid}>
                {myAgents.slice(0, 4).map((agent, index) => (
                  <View key={agent._id} style={styles.teamMemberCard}>
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarText}>
                        {agent.accountName?.charAt(0)?.toUpperCase() || 'A'}
                      </Text>
                    </View>
                    <Text style={styles.teamMemberName}>{agent.accountName}</Text>
                    <Text style={styles.teamMemberRole}>{agent.role}</Text>
                  </View>
                ))}
                {myAgents.length > 4 && (
                  <View style={styles.teamMemberCard}>
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarText}>+{myAgents.length - 4}</Text>
                    </View>
                    <Text style={styles.teamMemberName}>More</Text>
                    <Text style={styles.teamMemberRole}>Agents</Text>
                  </View>
                )}
              </View>
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
                  <Text style={styles.quickActionTitle}>Team Progress</Text>
                  <Text style={styles.quickActionSubtitle}>Track vehicles</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.quickActionCard}
                  onPress={() => setActiveTab(TAB_REPORTS)}
                >
                  <Text style={styles.quickActionIcon}>📊</Text>
                  <Text style={styles.quickActionTitle}>Team Reports</Text>
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

            {/* Recent Team Activity */}
            <View style={styles.recentActivitySection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Team Activity</Text>
                <TouchableOpacity onPress={() => setActiveTab(TAB_VEHICLE_PREP)}>
                  <Text style={styles.sectionAction}>View All</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.activityList}>
                {managerAllocations.slice(0, 3).map((item, index) => (
                  <View key={index} style={styles.activityItem}>
                    <View style={styles.activityIcon}>
                      <Text>🚗</Text>
                    </View>
                    <View style={styles.activityContent}>
                      <Text style={styles.activityTitle}>
                        Vehicle Allocated: {item.unitName || `Unit ${index + 1}`}
                      </Text>
                      <Text style={styles.activitySubtitle}>
                        By: {item.allocatedBy || 'Unknown'} • To: {item.assignedTo || 'Unknown'}
                      </Text>
                      <Text style={styles.activityTime}>
                        {new Date(item.date || Date.now()).toLocaleDateString()}
                      </Text>
                    </View>
                    <StatusBadge status={item.status || 'Active'} />
                  </View>
                ))}
                
                {managerAllocations.length === 0 && (
                  <View style={styles.emptyActivityState}>
                    <Text style={styles.emptyActivityText}>No recent team activity</Text>
                    <Text style={styles.emptyActivitySubtext}>
                      Your team's vehicle allocations will appear here
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>
        );

      case TAB_VEHICLE_STOCKS: {
        // Apply both search and agent filtering
        const filteredStocks = getFilteredData(vehicleStocks, [
          "unitName",
          "conductionNumber", 
          "bodyColor",
          "variation",
        ], 'assignedTo');

        const selectedAgentData = selectedAgent === 'all' ? null : myAgents.find(a => a._id === selectedAgent);

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
                
                {/* Show assigned agent if viewing all agents */}
                {selectedAgent === 'all' && item.assignedTo && (
                  <View style={styles.stockInfoRow}>
                    <Text style={styles.stockInfoLabel}>Agent</Text>
                    <Text style={styles.stockInfoValue}>{item.assignedTo}</Text>
                  </View>
                )}
              </View>
            </View>
          );
        };

        return (
          <View style={styles.stocksContainer}>
            {/* Header Section */}
            <View style={styles.stocksHeader}>
              <Text style={styles.stocksTitle}>
                {selectedAgentData 
                  ? `${selectedAgentData.accountName}'s Inventory` 
                  : 'Team Vehicle Inventory'
                }
              </Text>
              <Text style={styles.stocksSubtitle}>
                {selectedAgent === 'all' 
                  ? `Managing ${myAgents.length} agents' inventory`
                  : `Vehicles assigned to ${selectedAgentData?.accountName}`
                }
              </Text>
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
                <Text style={styles.stocksStatNumber}>{filteredStocks.length}</Text>
                <Text style={styles.stocksStatLabel}>
                  {selectedAgent === 'all' ? 'Total Stock' : 'Agent Stock'}
                </Text>
              </View>
              
              <View style={[styles.stocksStatCard, { backgroundColor: '#2D2D2D' }]}>
                <Text style={styles.stocksStatNumber}>
                  {filteredStocks.filter(v => (v.status || 'Available') === 'Available').length}
                </Text>
                <Text style={styles.stocksStatLabel}>Available</Text>
              </View>
              
              <View style={[styles.stocksStatCard, { backgroundColor: '#8B0000' }]}>
                <Text style={styles.stocksStatNumber}>
                  {filteredStocks.filter(v => v.status === 'In Use' || v.status === 'Allocated').length}
                </Text>
                <Text style={styles.stocksStatLabel}>In Use</Text>
              </View>
            </View>

            {/* Stocks List */}
            {filteredStocks.length === 0 ? (
              <View style={styles.stocksEmptyContainer}>
                <Text style={styles.stocksEmptyText}>
                  {selectedAgent === 'all' ? 'No vehicle stocks found' : 'No stocks for this agent'}
                </Text>
                <Text style={styles.stocksEmptySubtext}>
                  {search ? 'Try adjusting your search terms' : 
                   selectedAgent === 'all' ? 'Add vehicle stock to get started' : 'This agent has no assigned vehicles'}
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
            <Text style={styles.sectionTitle}>Team Reports & Analytics</Text>
            
            {/* Team Summary Cards */}
            <View style={styles.statsContainer}>
              <View style={[styles.statCard, { backgroundColor: '#e50914' }]}>
                <Text style={styles.statNumber}>{myAgents.length}</Text>
                <Text style={styles.statLabel}>My Team Size</Text>
              </View>
              
              <View style={[styles.statCard, { backgroundColor: '#2D2D2D' }]}>
                <Text style={styles.statNumber}>{managerAllocations.length}</Text>
                <Text style={styles.statLabel}>Team Allocations</Text>
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

            {/* Team Performance */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Team Performance</Text>
              {myAgents.map((agent, index) => (
                <View key={agent._id} style={styles.performanceCard}>
                  <View style={styles.performanceHeader}>
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarText}>
                        {agent.accountName?.charAt(0)?.toUpperCase() || 'A'}
                      </Text>
                    </View>
                    <View style={styles.performanceInfo}>
                      <Text style={styles.performanceName}>{agent.accountName}</Text>
                      <Text style={styles.performanceRole}>{agent.role}</Text>
                    </View>
                  </View>
                  <View style={styles.performanceStats}>
                    <Text style={styles.performanceStat}>
                      Allocations: {managerAllocations.filter(a => a.allocatedBy === agent.accountName).length}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Export Options */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Export Team Reports</Text>
              <TouchableOpacity style={[styles.addButton, { backgroundColor: '#6B7280' }]}>
                <Text style={styles.addButtonText}>📊 Export Team Summary</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.addButton, { backgroundColor: '#2D2D2D', marginTop: 10 }]}>
                <Text style={styles.addButtonText}>📋 Export Team Activity</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        );

      case TAB_VEHICLE_PREP:
        return (
          <ScrollView style={styles.tabContent}>
            {/* Header */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Team Vehicle Preparation</Text>
              <Text style={styles.sectionSubtitle}>
                Track preparation progress for all vehicles managed by your team
              </Text>
            </View>

            {/* Search */}
            <TextInput
              style={styles.searchInput}
              placeholder="Search by Unit ID, Model, or Agent..."
              value={search}
              onChangeText={setSearch}
              placeholderTextColor="#6B7280"
            />

            {/* Vehicle Preparation Cards */}
            <View style={styles.section}>
              {loading ? (
                <ActivityIndicator size="large" color="#e50914" />
              ) : (
                filterBySearch(vehicles, ["unitId", "unitName", "assignedDriver", "assignedAgent"])
                  .filter(vehicle => {
                    // Support both 'processes' (from /api/dispatch/assignments) and 'requestedProcesses' (legacy)
                    const processes = vehicle.processes || vehicle.requestedProcesses;
                    const assignedToMyTeam = myAgents.some(agent => 
                      agent.accountName === vehicle.assignedAgent || 
                      agent.accountName === vehicle.allocatedBy
                    );
                    return processes && processes.length > 0 && assignedToMyTeam;
                  })
                  .map((vehicle, index) => {
                    const completedProcesses = Object.keys(vehicle.processStatus || {}).filter(
                      key => vehicle.processStatus[key] === true
                    ).length;
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

                        {/* Agent Info */}
                        <View style={styles.driverSection}>
                          <Text style={styles.infoLabel}>Assigned Agent:</Text>
                          <Text style={styles.infoValue}>
                            {vehicle.assignedAgent || 'Not Assigned'}
                          </Text>
                        </View>

                        {/* Driver Info */}
                        <View style={styles.driverSection}>
                          <Text style={styles.infoLabel}>Driver:</Text>
                          <Text style={styles.infoValue}>
                            {vehicle.assignedDriver || 'Not Assigned'}
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
              {!loading && filterBySearch(vehicles, ["unitId", "unitName", "assignedDriver", "assignedAgent"])
                .filter(vehicle => {
                  const processes = vehicle.processes || vehicle.requestedProcesses;
                  const assignedToMyTeam = myAgents.some(agent => 
                    agent.accountName === vehicle.assignedAgent || 
                    agent.accountName === vehicle.allocatedBy
                  );
                  return processes && processes.length > 0 && assignedToMyTeam;
                }).length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateTitle}>No team vehicles in preparation</Text>
                  <Text style={styles.emptyStateText}>
                    Vehicles assigned to your team members with preparation processes will appear here.
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
              <Text style={styles.sectionTitle}>Team Vehicle Tracking</Text>
              <Text style={styles.sectionSubtitle}>
                Track all vehicles allocated to your team members
              </Text>
            </View>

            {/* Improved Maps - Shows all team vehicles */}
            <ImprovedMapsView 
              style={{ flex: 1, minHeight: 400 }} 
              userRole="manager"
              agentFilter={null}
            />

            {/* Vehicle List */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Team Vehicles</Text>
              
              {managerAllocations.length > 0 ? (
                managerAllocations.map((allocation, index) => (
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
                        <Text style={styles.vehicleInfoLabel}>Assigned Agent:</Text>
                        <Text style={styles.vehicleInfoValue}>
                          {allocation.assignedTo || allocation.allocatedBy || 'Not assigned'}
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
                  <Text style={styles.emptyStateTitle}>No team vehicles</Text>
                  <Text style={styles.emptyStateText}>
                    When vehicles are assigned to your team members, they will appear here for tracking.
                  </Text>
                </View>
              )}
            </View>

            {/* Refresh Button */}
            <TouchableOpacity 
              style={styles.refreshTrackingButton} 
              onPress={() => {
                console.log('Refreshing team vehicle tracking...');
                fetchAllData();
              }}
            >
              <Text style={styles.refreshTrackingText}>🔄 Refresh Team Tracking</Text>
            </TouchableOpacity>
          </View>
        );

      case TAB_HISTORY:
        return (
          <View style={styles.tabContent}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Team Activity History</Text>
              <Text style={styles.sectionSubtitle}>
                View activities and allocations for your team members
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
            <Text style={styles.headerTitle}>I-Track Manager</Text>
            <Text style={styles.headerSubtitle}>Team Management</Text>
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
