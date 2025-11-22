import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildApiUrl } from '../constants/api';
import UniformLoading from '../components/UniformLoading';

const { width } = Dimensions.get('window');

export default function ReportsScreen() {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalStocks: 0,
    totalAllocations: 0,
    totalUsers: 0,
    finishedVehiclePreps: 0,
    completedAllocations: 0,
    activeDrivers: 0,
    inProcessAllocations: 0,
    inTransitAllocations: 0,
    availableStocks: 0
  });
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [recentActivities, setRecentActivities] = useState([]);

  // Fetch dashboard statistics
  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(buildApiUrl('/dashboard/stats'));
      const data = await response.json();
      
      // Backend returns stats directly, not wrapped in success/stats
      if (data && typeof data === 'object') {
        setStats({
          totalStocks: data.totalStocks || 0,
          totalAllocations: data.totalAllocations || 0,
          totalUsers: data.totalUsers || 0,
          finishedVehiclePreps: data.finishedVehiclePreps || 0,
          completedAllocations: data.completedAllocations || 0,
          activeDrivers: data.activeDrivers || 0,
          inProcessAllocations: data.inProcessAllocations || 0,
          inTransitAllocations: data.inTransitAllocations || 0,
          availableStocks: data.availableStocks || 0
        });
      } else {
        console.warn('Unexpected stats format:', data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      Alert.alert('Error', 'Failed to load statistics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Fetch recent activities
  const fetchRecentActivities = useCallback(async () => {
    try {
      const response = await fetch(buildApiUrl('/getRecentActivities'));
      const data = await response.json();
      
      if (data.success) {
        setRecentActivities(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching recent activities:', error);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchRecentActivities();
  }, [fetchStats, fetchRecentActivities]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
    fetchRecentActivities();
  };

  // Generate report
  const generateReport = async (reportType) => {
    Alert.alert(
      'Generate Report',
      `Generate ${reportType} report for the selected period?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Generate', 
          onPress: async () => {
            try {
              const response = await fetch(buildApiUrl('/generateReport'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  reportType,
                  period: selectedPeriod,
                  generatedBy: await AsyncStorage.getItem('accountName') || 'System'
                }),
              });

              const data = await response.json();
              
              if (data.success) {
                Alert.alert('Success', 'Report generated successfully');
              } else {
                Alert.alert('Error', data.message || 'Failed to generate report');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to generate report');
            }
          }
        },
      ]
    );
  };

  // Statistics Card Component
  const StatCard = ({ title, value, icon, color = '#e50914', change, changeType }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <View style={styles.statInfo}>
          <Text style={styles.statTitle}>{title}</Text>
          <Text style={styles.statValue}>{value}</Text>
        </View>
        <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
          <MaterialIcons name={icon} size={24} color={color} />
        </View>
      </View>
      {change !== undefined && (
        <View style={styles.statChange}>
          <MaterialIcons 
            name={changeType === 'increase' ? 'trending-up' : 'trending-down'} 
            size={16} 
            color={changeType === 'increase' ? '#28a745' : '#dc3545'} 
          />
          <Text style={[styles.changeText, { 
            color: changeType === 'increase' ? '#28a745' : '#dc3545' 
          }]}>
            {Math.abs(change)}% from last {selectedPeriod}
          </Text>
        </View>
      )}
    </View>
  );

  // Report Button Component
  const ReportButton = ({ title, description, icon, reportType, color = '#007AFF' }) => (
    <TouchableOpacity 
      style={styles.reportButton}
      onPress={() => generateReport(reportType)}
    >
      <View style={styles.reportButtonContent}>
        <View style={[styles.reportIcon, { backgroundColor: color + '20' }]}>
          <MaterialIcons name={icon} size={24} color={color} />
        </View>
        <View style={styles.reportInfo}>
          <Text style={styles.reportTitle}>{title}</Text>
          <Text style={styles.reportDescription}>{description}</Text>
        </View>
        <MaterialIcons name="arrow-forward-ios" size={16} color="#666" />
      </View>
    </TouchableOpacity>
  );

  // Period Filter Component
  const PeriodFilter = () => (
    <View style={styles.periodFilter}>
      <Text style={styles.periodLabel}>Period:</Text>
      <View style={styles.periodButtons}>
        {['week', 'month', 'quarter', 'year'].map(period => (
          <TouchableOpacity
            key={period}
            style={[
              styles.periodBtn,
              selectedPeriod === period && styles.periodBtnActive
            ]}
            onPress={() => setSelectedPeriod(period)}
          >
            <Text style={[
              styles.periodBtnText,
              selectedPeriod === period && styles.periodBtnTextActive
            ]}>
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Reports & Analytics</Text>
        <TouchableOpacity style={styles.exportButton}>
          <MaterialIcons name="file-download" size={20} color="#fff" />
          <Text style={styles.exportButtonText}>Export</Text>
        </TouchableOpacity>
      </View>

      {/* Period Filter */}
      <View style={styles.section}>
        <PeriodFilter />
      </View>

      {loading ? (
        <UniformLoading message="Loading reports..." />
      ) : (
        <>
          {/* Statistics Overview */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Overview Statistics</Text>
            <View style={styles.statsGrid}>
              <StatCard
                title="Total Vehicles"
                value={stats.totalStocks}
                icon="directions-car"
                color="#007AFF"
              />
              <StatCard
                title="Available Vehicles"
                value={stats.availableStocks}
                icon="garage"
                color="#28a745"
              />
              <StatCard
                title="Total Allocations"
                value={stats.totalAllocations}
                icon="assignment"
                color="#e50914"
              />
              <StatCard
                title="Completed"
                value={stats.completedAllocations}
                icon="check-circle"
                color="#17a2b8"
              />
              <StatCard
                title="In Process"
                value={stats.inProcessAllocations}
                icon="autorenew"
                color="#ffc107"
              />
              <StatCard
                title="In Transit"
                value={stats.inTransitAllocations}
                icon="local-shipping"
                color="#6f42c1"
              />
              <StatCard
                title="Finished Preps"
                value={stats.finishedVehiclePreps}
                icon="build"
                color="#795548"
              />
              <StatCard
                title="Total Users"
                value={stats.totalUsers}
                icon="people"
                color="#607d8b"
              />
            </View>
          </View>

          {/* Quick Reports */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Reports</Text>
            <View style={styles.reportsGrid}>
              <ReportButton
                title="Vehicle Allocation Report"
                description="Detailed allocation status and history"
                icon="assignment"
                reportType="allocation"
                color="#e50914"
              />
              <ReportButton
                title="Driver Performance Report"
                description="Driver delivery metrics and efficiency"
                icon="local-shipping"
                reportType="driver-performance"
                color="#28a745"
              />
              <ReportButton
                title="Vehicle Inventory Report"
                description="Current stock levels and status"
                icon="inventory"
                reportType="inventory"
                color="#007AFF"
              />
              <ReportButton
                title="Service Request Report"
                description="Service completion rates and timeline"
                icon="build"
                reportType="service-requests"
                color="#17a2b8"
              />
              <ReportButton
                title="Test Drive Report"
                description="Test drive bookings and conversion rates"
                icon="directions-car"
                reportType="test-drives"
                color="#ffc107"
              />
              <ReportButton
                title="User Activity Report"
                description="User login and activity patterns"
                icon="people"
                reportType="user-activity"
                color="#6f42c1"
              />
            </View>
          </View>

          {/* Recent Activities */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Activities</Text>
            <View style={styles.activitiesContainer}>
              {recentActivities.length > 0 ? (
                recentActivities.slice(0, 10).map((activity, index) => (
                  <View key={index} style={styles.activityItem}>
                    <View style={styles.activityIcon}>
                      <MaterialIcons 
                        name={getActivityIcon(activity.type)} 
                        size={16} 
                        color="#666" 
                      />
                    </View>
                    <View style={styles.activityDetails}>
                      <Text style={styles.activityText}>{activity.description}</Text>
                      <Text style={styles.activityTime}>
                        {new Date(activity.timestamp).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.noActivities}>
                  <MaterialIcons name="history" size={48} color="#ccc" />
                  <Text style={styles.noActivitiesText}>No recent activities</Text>
                </View>
              )}
            </View>
          </View>

          {/* Performance Metrics */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Key Performance Metrics</Text>
            <View style={styles.metricsContainer}>
              <View style={styles.metricCard}>
                <Text style={styles.metricTitle}>Average Delivery Time</Text>
                <Text style={styles.metricValue}>2.4 days</Text>
                <Text style={styles.metricChange}>↓ 0.3 days from last month</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricTitle}>Customer Satisfaction</Text>
                <Text style={styles.metricValue}>4.7/5</Text>
                <Text style={styles.metricChange}>↑ 0.2 from last month</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricTitle}>Fleet Utilization</Text>
                <Text style={styles.metricValue}>87%</Text>
                <Text style={styles.metricChange}>↑ 5% from last month</Text>
              </View>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

// Helper function to get activity icons
const getActivityIcon = (type) => {
  switch (type) {
    case 'allocation': return 'assignment';
    case 'delivery': return 'local-shipping';
    case 'user': return 'person';
    case 'vehicle': return 'directions-car';
    case 'service': return 'build';
    default: return 'info';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e50914',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  exportButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 4,
  },
  section: {
    backgroundColor: '#fff',
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  periodFilter: {
    marginBottom: 16,
  },
  periodLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  periodButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  periodBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  periodBtnActive: {
    backgroundColor: '#e50914',
    borderColor: '#e50914',
  },
  periodBtnText: {
    color: '#666',
    fontWeight: '500',
  },
  periodBtnTextActive: {
    color: '#fff',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: width < 768 ? '48%' : '32%',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statInfo: {
    flex: 1,
  },
  statTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statChange: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  changeText: {
    fontSize: 12,
    marginLeft: 4,
  },
  reportsGrid: {
    flex: 1,
  },
  reportButton: {
    marginBottom: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  reportButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reportIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  reportInfo: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  reportDescription: {
    fontSize: 14,
    color: '#666',
  },
  activitiesContainer: {
    maxHeight: 300,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityDetails: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    color: '#666',
  },
  noActivities: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noActivitiesText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  metricsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: width < 768 ? '48%' : '32%',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  metricTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  metricChange: {
    fontSize: 12,
    color: '#28a745',
  },
});