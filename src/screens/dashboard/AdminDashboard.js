import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Image,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../constants/theme';
import { PieChart } from 'react-native-chart-kit';
import { apiGet } from '../../utils/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const AdminDashboard = ({ navigation }) => {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Dashboard data states
  const [stockCount, setStockCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [ongoingCount, setOngoingCount] = useState(0);
  const [inTransitCount, setInTransitCount] = useState(0);
  const [stockData, setStockData] = useState([]);
  const [recentPreparations, setRecentPreparations] = useState([]);
  const [recentShipments, setRecentShipments] = useState([]);
  const [completedRequests, setCompletedRequests] = useState([]);

  // Pie chart colors matching web design
  const CHART_COLORS = [
    '#e50914', // Red
    '#005d9bff', // Blue
    '#231f20', // Black
    '#234a5cff', // Dark Blue
    '#709cb7', // Light Blue
    '#00aaffff', // Cyan
  ];

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch stock data
      const stockResponse = await apiGet('/getStock');
      setStockCount(stockResponse.length);
      
      // Aggregate stock by unitName for pie chart
      const unitMap = {};
      stockResponse.forEach(item => {
        if (item.unitName) {
          unitMap[item.unitName] = (unitMap[item.unitName] || 0) + (item.quantity || 1);
        }
      });
      const pieData = Object.entries(unitMap).map(([name, value]) => ({
        name,
        population: value,
        color: CHART_COLORS[Object.keys(unitMap).indexOf(name) % CHART_COLORS.length],
        legendFontColor: '#374151',
        legendFontSize: 14,
      }));
      setStockData(pieData);

      // Fetch completed requests count
      const completedResponse = await apiGet('/api/getCompletedRequests');
      setCompletedCount(completedResponse.length);

      // Fetch service requests for ongoing preparations
      const requestsResponse = await apiGet('/api/getRequest');
      const inProgress = requestsResponse.filter(req => req.status === 'In Progress');
      setOngoingCount(inProgress.length);
      
      // Get top 5 recent in-progress preparations
      const sortedInProgress = inProgress.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.dateCreated);
        const dateB = new Date(b.createdAt || b.dateCreated);
        return dateB - dateA;
      });
      setRecentPreparations(sortedInProgress.slice(0, 5));

      // Fetch allocations for shipments
      const allocationsResponse = await apiGet('/api/getAllocation');
      const inTransit = allocationsResponse.filter(item => item.status === 'In Transit');
      setInTransitCount(inTransit.length);
      
      // Get pending and in-transit shipments
      const activeShipments = allocationsResponse.filter(item => 
        ['Pending', 'In Transit'].includes(item.status)
      );
      setRecentShipments(activeShipments.slice(0, 3));
      
      // Get completed requests
      const completed = allocationsResponse.filter(item => item.status === 'Completed');
      setCompletedRequests(completed.slice(0, 3));

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const cards = [
    { 
      title: 'Total Stocks', 
      value: stockCount, 
      route: 'Inventory',
      bgColor: COLORS.primary,
    },
    { 
      title: 'Finished Vehicle Preparation', 
      value: completedCount, 
      route: 'Reports',
      bgColor: '#374151',
    },
    { 
      title: 'Ongoing Shipment', 
      value: inTransitCount, 
      route: 'Allocations',
      bgColor: COLORS.primary,
    },
    { 
      title: 'Ongoing Vehicle Preparation', 
      value: ongoingCount, 
      route: 'ServiceRequest',
      bgColor: COLORS.primary,
    },
  ];

  const getStatusBadgeStyle = (status) => {
    const statusLower = status?.toLowerCase().replace(' ', '-');
    switch (statusLower) {
      case 'in-progress':
        return styles.statusInProgress;
      case 'pending':
        return styles.statusPending;
      case 'in-transit':
        return styles.statusInTransit;
      case 'completed':
        return styles.statusCompleted;
      default:
        return styles.statusDefault;
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <Image
          source={require('../../../assets/loading.gif')}
          style={styles.loadingGif}
        />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Dashboard Cards */}
      <View style={styles.cardsGrid}>
        {cards.map(({ title, value, route, bgColor }, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.card,
              { backgroundColor: bgColor },
              index === 1 && styles.cardDark,
            ]}
            onPress={() => navigation.navigate(route)}
          >
            <Text style={styles.cardValue}>{value}</Text>
            <Text style={styles.cardTitle}>{title}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stocks Overview with Pie Chart */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Stocks Overview</Text>
        <Text style={styles.sectionSubtitle}>Tap on pie segments for details</Text>
        
        {stockData.length > 0 ? (
          <View style={styles.chartContainer}>
            <PieChart
              data={stockData}
              width={SCREEN_WIDTH - 40}
              height={220}
              chartConfig={{
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              }}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
              hasLegend={true}
            />
            
            {/* Custom Legend */}
            <View style={styles.legendContainer}>
              {stockData.map((item, index) => (
                <View key={index} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                  <Text style={styles.legendName}>{item.name}</Text>
                  <Text style={styles.legendValue}>{item.population}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <Text style={styles.emptyText}>No stock data available</Text>
        )}
      </View>

      {/* Recent In Progress Vehicle Preparation */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent In Progress Vehicle Preparation</Text>
        
        {recentPreparations.length === 0 ? (
          <Text style={styles.emptyText}>No vehicle preparation in progress</Text>
        ) : (
          <View style={styles.tableContainer}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 1 }]}>Conduction No.</Text>
              <Text style={[styles.tableHeaderText, { flex: 2 }]}>Service</Text>
            </View>
            {recentPreparations.map((prep, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 1 }]}>
                  {prep.vehicleRegNo || prep.unitId || '-'}
                </Text>
                <Text style={[styles.tableCell, { flex: 2 }]} numberOfLines={2}>
                  {Array.isArray(prep.service)
                    ? prep.service.join(', ')
                    : prep.service || '-'}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Recent Assigned Shipments */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Assigned Shipments</Text>
        
        {recentShipments.length === 0 ? (
          <Text style={styles.emptyText}>No pending or in transit shipments</Text>
        ) : (
          <View style={styles.tableContainer}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Unit Name</Text>
              <Text style={[styles.tableHeaderText, { flex: 1 }]}>Driver</Text>
              <Text style={[styles.tableHeaderText, { flex: 1 }]}>Status</Text>
            </View>
            {recentShipments.map((item, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 1.5 }]} numberOfLines={1}>
                  {item.unitName}
                </Text>
                <Text style={[styles.tableCell, { flex: 1 }]} numberOfLines={1}>
                  {item.assignedDriver}
                </Text>
                <View style={[styles.tableCell, { flex: 1 }]}>
                  <View style={[styles.statusBadge, getStatusBadgeStyle(item.status)]}>
                    <Text style={styles.statusText}>{item.status}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Recent Completed Requests */}
      <View style={[styles.section, { marginBottom: SPACING.xl }]}>
        <Text style={styles.sectionTitle}>Recent Completed Requests</Text>
        
        {completedRequests.length === 0 ? (
          <Text style={styles.emptyText}>No completed requests</Text>
        ) : (
          <View style={styles.tableContainer}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Unit Name</Text>
              <Text style={[styles.tableHeaderText, { flex: 1 }]}>Date</Text>
              <Text style={[styles.tableHeaderText, { flex: 1 }]}>Remarks</Text>
            </View>
            {completedRequests.map((item, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 1.5 }]} numberOfLines={1}>
                  {item.unitName}
                </Text>
                <Text style={[styles.tableCell, { flex: 1 }]} numberOfLines={1}>
                  {new Date(item.date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </Text>
                <Text style={[styles.tableCell, { flex: 1 }]} numberOfLines={1}>
                  {item.remarks || '-'}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingGif: {
    width: 60,
    height: 60,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: SPACING.md,
    gap: SPACING.md,
  },
  card: {
    width: (SCREEN_WIDTH - SPACING.md * 3) / 2,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    minHeight: 120,
    justifyContent: 'center',
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardDark: {
    backgroundColor: '#374151',
  },
  cardValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  cardTitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
    lineHeight: 18,
  },
  section: {
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  sectionSubtitle: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  chartContainer: {
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  legendContainer: {
    width: '100%',
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: SPACING.sm,
  },
  legendName: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: '#374151',
    fontWeight: '500',
  },
  legendValue: {
    fontSize: FONT_SIZES.md,
    color: '#111827',
    fontWeight: '600',
    marginRight: SPACING.md,
  },
  emptyText: {
    textAlign: 'center',
    color: '#888',
    fontSize: FONT_SIZES.md,
    fontStyle: 'italic',
    paddingVertical: SPACING.lg,
  },
  tableContainer: {
    marginTop: SPACING.sm,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.xs,
  },
  tableHeaderText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    alignItems: 'center',
  },
  tableCell: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.white,
  },
  statusInProgress: {
    backgroundColor: '#3B82F6',
  },
  statusPending: {
    backgroundColor: '#F59E0B',
  },
  statusInTransit: {
    backgroundColor: '#8B5CF6',
  },
  statusCompleted: {
    backgroundColor: '#10B981',
  },
  statusDefault: {
    backgroundColor: '#6B7280',
  },
});

export default AdminDashboard;
