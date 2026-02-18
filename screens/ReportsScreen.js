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
  FlatList,
  Share,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { 
  Car, Truck, Settings, Calendar, Users, Building, 
  ClipboardList, Clock, BarChart3, History, Download, 
  Save, RefreshCw, ChevronRight, ArrowUp, ArrowDown, Check,
  ChevronUp, ChevronDown 
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildApiUrl } from '../constants/api';
import UniformLoading from '../components/UniformLoading';

const { width } = Dimensions.get('window');

// Helper function to get date range based on period
const getDateRange = (period) => {
  const endDate = new Date();
  const startDate = new Date();

  switch (period) {
    case 'week':
      startDate.setDate(endDate.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(endDate.getMonth() - 1);
      break;
    case 'quarter':
      startDate.setMonth(endDate.getMonth() - 3);
      break;
    case 'year':
      startDate.setFullYear(endDate.getFullYear() - 1);
      break;
    case 'all-time':
      startDate.setFullYear(2000);
      break;
    default:
      startDate.setMonth(endDate.getMonth() - 1);
  }

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  };
};

// Helper function to get activity icon based on type
const getActivityIcon = (type) => {
  const iconMap = {
    allocation: 'assignment',
    vehicle: 'directions-car',
    driver: 'person',
    status: 'info',
    allocation_update: 'autorenew',
    status_change: 'check-circle',
    default: 'info'
  };
  return iconMap[type] || iconMap.default;
};

export default function ReportsScreen() {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('reports'); // 'reports' | 'audit' | 'history'
  const [userRole, setUserRole] = useState(null);
  const [stats, setStats] = useState({
    totalVehicleStocksAdded: 0,
    totalReleasedVehicles: 0,
    processesCompleted: 0,
    testDrivesScheduled: 0,
    accountsMade: 0,
    totalVehiclesInStock: 0,
    allocatedUnits: 0,
    unallocatedUnits: 0,
  });
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const [recentActivities, setRecentActivities] = useState([]);
  const [auditTrail, setAuditTrail] = useState([]);
  const [releaseHistory, setReleaseHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRefreshing, setHistoryRefreshing] = useState(false);

  const normalizedRole = (userRole || '').toLowerCase();
  const isSalesAgent = normalizedRole === 'sales agent';
  const isManager = normalizedRole === 'manager';

  // Fetch dashboard statistics with safe JSON parsing
  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const dateRange = getDateRange(selectedPeriod);
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });
      
      console.log(`📅 Fetching stats for period: ${selectedPeriod}`);
      console.log(`📅 Date range: ${dateRange.startDate} to ${dateRange.endDate}`);
      
      const response = await fetch(buildApiUrl(`/dashboard/stats?${params}`));
      const text = await response.text();

      if (!text) {
        console.warn('Stats response empty');
        setStats(prev => ({ ...prev }));
        return;
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('Stats JSON parse error:', parseError);
        console.error('Stats raw response:', text);
        Alert.alert('Error', 'Invalid stats response format');
        return;
      }
      
      if (data && typeof data === 'object') {
        const totalStocks = data.totalStocks || 0;
        const totalAllocations = data.totalAllocations || 0;
        const completedAllocations = data.completedAllocations || 0;
        const finishedPreps = data.finishedVehiclePreps || 0;
        const availableStocks = data.availableStocks || 0;
        const totalUsers = data.totalUsers || 0;
        const testDrives = data.testDrivesScheduled || data.testDrives || 0;

        const unallocatedUnits = Math.max(totalStocks - totalAllocations, 0);

        setStats({
          totalVehicleStocksAdded: totalStocks,
          totalReleasedVehicles: completedAllocations,
          processesCompleted: finishedPreps,
          testDrivesScheduled: testDrives,
          accountsMade: totalUsers,
          totalVehiclesInStock: availableStocks,
          allocatedUnits: totalAllocations,
          unallocatedUnits,
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
  }, [selectedPeriod]);

  // Fetch recent activities (kept but no UI usage now; may be used later)
  const fetchRecentActivities = useCallback(async () => {
    try {
      const response = await fetch(buildApiUrl('/getRecentActivities'));
      const text = await response.text();
      if (!text) return;
      const data = JSON.parse(text);
      if (data.success) {
        setRecentActivities(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching recent activities:', error);
    }
  }, []);

  // Fetch audit trail from /api/audit-trail endpoint (same as web version)
  const fetchAuditTrail = useCallback(async () => {
    try {
      console.log('📡 Fetching audit trail data...');
      
      const endpoint = '/api/audit-trail';
      const response = await fetch(buildApiUrl(endpoint));
      const text = await response.text();

      if (!text) {
        console.warn('Audit trail empty response');
        setAuditTrail([]);
        return;
      }

      // If server returned HTML (e.g., 404 page), skip
      if (text.trim().startsWith('<')) {
        console.warn('Audit trail non-JSON response (HTML returned)');
        setAuditTrail([]);
        return;
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('Audit trail JSON parse error:', parseError);
        console.error('Audit trail raw response:', text.substring(0, 200));
        setAuditTrail([]);
        return;
      }

      // The web version returns an array directly
      if (Array.isArray(data)) {
        console.log(`✅ Audit trail loaded: ${data.length} total activities`);
        
        // Filter by date range
        const dateRange = getDateRange(selectedPeriod);
        const filteredData = data.filter(log => {
          const logDate = new Date(log.timestamp);
          const start = new Date(dateRange.startDate);
          const end = new Date(dateRange.endDate);
          return logDate >= start && logDate <= end;
        });
        
        console.log(`📊 Filtered audit trail: ${filteredData.length} activities in selected period`);
        setAuditTrail(filteredData);
      } else {
        console.warn('Audit trail response is not an array:', typeof data);
        setAuditTrail([]);
      }
    } catch (error) {
      console.error('❌ Error fetching audit trail:', error);
      setAuditTrail([]);
    }
  }, [selectedPeriod]);

  // Fetch release history (all releases) for history tab
  const fetchReleaseHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const response = await fetch(buildApiUrl('/getRequest'));
      const text = await response.text();

      if (!text) {
        setReleaseHistory([]);
        return;
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('Release history JSON parse error:', parseError);
        console.error('Release history raw response:', text.substring(0, 200));
        setReleaseHistory([]);
        return;
      }

      const releases = (data.data || []).filter(entry => {
        const status = (entry.status || '').toLowerCase();
        return entry.releasedToCustomer === true || status === 'released to customer' || status === 'released';
      });

      const mapped = releases.map(entry => ({
        id: entry._id || `${entry.unitId || 'unit'}-${entry.releasedAt || entry.updatedAt || Date.now()}`,
        unitName: entry.unitName || 'Unknown Unit',
        unitId: entry.unitId || 'N/A',
        bodyColor: entry.bodyColor || 'N/A',
        variation: entry.variation || entry.serviceType || '',
        releasedAt: entry.releasedAt || entry.updatedAt || entry.date || null,
        agent: entry.assignedAgent || entry.assignedTo || entry.agentName || '',
        driver: entry.assignedDriver || entry.driver || '',
        processes: Array.isArray(entry.completedServices) ? entry.completedServices : (Array.isArray(entry.service) ? entry.service : []),
        customerName: entry.customerName || '',
        customerEmail: entry.customerEmail || '',
        customerPhone: entry.customerPhone || entry.customerContact || '',
      })).sort((a, b) => {
        const aDate = a.releasedAt ? new Date(a.releasedAt).getTime() : 0;
        const bDate = b.releasedAt ? new Date(b.releasedAt).getTime() : 0;
        return bDate - aDate;
      });

      setReleaseHistory(mapped);
    } catch (error) {
      console.error('❌ Error fetching release history:', error);
      setReleaseHistory([]);
    } finally {
      setHistoryLoading(false);
      setHistoryRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchAuditTrail();
  }, [fetchStats, fetchAuditTrail, selectedPeriod]);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchReleaseHistory();
    }
  }, [activeTab, fetchReleaseHistory]);

  useEffect(() => {
    const loadRole = async () => {
      const role = await AsyncStorage.getItem('userRole');
      setUserRole(role);
      const lower = (role || '').toLowerCase();
      if ((lower === 'sales agent' || lower === 'manager') && activeTab === 'audit') {
        setActiveTab('reports');
      }
    };
    loadRole();
  }, [activeTab]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
    fetchAuditTrail();
  };

  const onRefreshHistory = () => {
    setHistoryRefreshing(true);
    fetchReleaseHistory();
  };

  const formatDateTime = (value) => {
    if (!value) return 'Not recorded';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Not recorded';
    return date.toLocaleString();
  };

  // Generate report with date filtering
  const generateReport = async (reportType) => {
    const reportNames = {
      'allocation': 'Vehicle Allocation',
      'driver-performance': 'Driver Performance',
      'inventory': 'Vehicle Inventory',
      'service-requests': 'Service Request',
      'test-drives': 'Test Drive',
      'user-activity': 'User Activity',
      'summary': 'Summary Image'
    };

    if (reportType === 'summary') {
      await generateSummaryImage();
      return;
    }
    
    Alert.alert(
      'Generate Report',
      `Generate ${reportNames[reportType] || reportType} report for the selected period?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Generate', 
          onPress: async () => {
            try {
              const dateRange = getDateRange(selectedPeriod);
              const response = await fetch(buildApiUrl('/generateReport'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  reportType,
                  period: selectedPeriod,
                  startDate: dateRange.startDate,
                  endDate: dateRange.endDate,
                  generatedBy: await AsyncStorage.getItem('accountName') || 'System'
                }),
              });

              const data = await response.json();
              
              if (data.success) {
                Alert.alert('Success', `${reportNames[reportType] || reportType} report generated successfully`);
              } else {
                Alert.alert('Error', data.message || 'Failed to generate report');
              }
            } catch (error) {
              console.error('Error generating report:', error);
              Alert.alert('Error', 'Failed to generate report');
            }
          }
        },
      ]
    );
  };

  // Period options for dropdown
  const periodOptions = [
    { label: 'This Week', value: 'week' },
    { label: 'This Month', value: 'month' },
    { label: 'This Quarter', value: 'quarter' },
    { label: 'This Year', value: 'year' },
    { label: 'All-Time', value: 'all-time' },
  ];

  // Generate summary and share or copy
  const generateSummaryImage = async () => {
    try {
      const periodLabel = periodOptions.find(p => p.value === selectedPeriod)?.label || 'This Month';
      const currentDate = new Date().toLocaleDateString();
      
      // Create a formatted text summary
      const summary = `
I-TRACK SUMMARY REPORT
Period: ${periodLabel}
Generated: ${currentDate}

═══════════════════════════════

OVERVIEW STATISTICS

Total Vehicle Stocks Added: ${stats.totalVehicleStocksAdded}
Total Released Vehicles: ${stats.totalReleasedVehicles}
Processes Completed: ${stats.processesCompleted}
Test Drives Scheduled: ${stats.testDrivesScheduled}
Accounts Made: ${stats.accountsMade}
Total Vehicles in Stock: ${stats.totalVehiclesInStock}
Allocated Units: ${stats.allocatedUnits}
Unallocated Units: ${stats.unallocatedUnits}

═══════════════════════════════

Report generated by I-Track System
      `.trim();

      // Share the summary
      await Share.share({
        message: summary,
        title: 'I-Track Summary Report',
      });
    } catch (error) {
      if (error.message !== 'Share cancelled.') {
        console.error('Error generating summary:', error);
        Alert.alert('Error', 'Failed to generate summary');
      }
    }
  };

  // Icon mapping function
  const getLucideIcon = (iconName, size, color) => {
    const iconMap = {
      'directions-car': <Car size={size} color={color} />,
      'local-shipping': <Truck size={size} color={color} />,
      'build-circle': <Settings size={size} color={color} />,
      'event-available': <Calendar size={size} color={color} />,
      'people': <Users size={size} color={color} />,
      'garage': <Building size={size} color={color} />,
      'assignment': <ClipboardList size={size} color={color} />,
      'pending-actions': <Clock size={size} color={color} />,
      'assessment': <BarChart3 size={size} color={color} />,
      'history': <History size={size} color={color} />,
      'save': <Save size={size} color={color} />,
      'file-download': <Download size={size} color={color} />,
      'refresh': <RefreshCw size={size} color={color} />,
      'arrow-forward-ios': <ChevronRight size={size} color={color} />,
      'trending-up': <ArrowUp size={size} color={color} />,
      'trending-down': <ArrowDown size={size} color={color} />,
      'check': <Check size={size} color={color} />,
      'description': <ClipboardList size={size} color={color} />
    };
    return iconMap[iconName] || <Car size={size} color={color} />;
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
          {getLucideIcon(icon, 24, color)}
        </View>
      </View>
      {change !== undefined && (
        <View style={styles.statChange}>
          {changeType === 'increase' ? 
            <ArrowUp size={16} color="#28a745" /> : 
            <ArrowDown size={16} color="#dc3545" />
          }
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
          {getLucideIcon(icon, 24, color)}
        </View>
        <View style={styles.reportInfo}>
          <Text style={styles.reportTitle}>{title}</Text>
          <Text style={styles.reportDescription}>{description}</Text>
        </View>
        <ChevronRight size={16} color="#666" />
      </View>
    </TouchableOpacity>
  );

  // Period Filter Component - custom dropdown without external dependency
  const PeriodFilter = () => (
    <View style={styles.periodFilter}>
      <Text style={styles.periodLabel}>Period:</Text>
      <View style={styles.dropdownWrapper}>
        <TouchableOpacity
          style={styles.pickerContainer}
          onPress={() => {
            console.log('Dropdown clicked, current state:', showPeriodDropdown);
            setShowPeriodDropdown(!showPeriodDropdown);
          }}
        >
          <Text style={styles.pickerText}>
            {periodOptions.find(p => p.value === selectedPeriod)?.label || 'This Month'}
          </Text>
          {showPeriodDropdown ? 
            <ChevronUp size={24} color="#666" /> : 
            <ChevronDown size={24} color="#666" />
          }
        </TouchableOpacity>
        {showPeriodDropdown && (
          <View style={styles.dropdownList}>
            {periodOptions.map(option => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.dropdownItem,
                  selectedPeriod === option.value && styles.dropdownItemActive
                ]}
                onPress={() => {
                  console.log('Selected period:', option.value);
                  setSelectedPeriod(option.value);
                  setShowPeriodDropdown(false);
                }}
              >
                <Text style={[
                  styles.dropdownItemText,
                  selectedPeriod === option.value && styles.dropdownItemTextActive
                ]}>
                  {option.label}
                </Text>
                {selectedPeriod === option.value && (
                  <Check size={20} color="#e50914" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );

  const statItems = [
    { title: 'Total Vehicle Stocks Added', value: stats.totalVehicleStocksAdded, icon: 'directions-car', color: '#007AFF' },
    { title: 'Total Released Vehicles', value: stats.totalReleasedVehicles, icon: 'local-shipping', color: '#28a745' },
    { title: 'Processes Completed', value: stats.processesCompleted, icon: 'build-circle', color: '#e50914' },
    { title: 'Test Drives Scheduled', value: stats.testDrivesScheduled, icon: 'event-available', color: '#ffc107' },
    { title: 'Accounts Made', value: stats.accountsMade, icon: 'people', color: '#6f42c1' },
    { title: 'Total Vehicles in Stock', value: stats.totalVehiclesInStock, icon: 'garage', color: '#17a2b8' },
    { title: 'Allocated Units', value: stats.allocatedUnits, icon: 'assignment', color: '#ff6b6b' },
    { title: 'Unallocated Units', value: stats.unallocatedUnits, icon: 'pending-actions', color: '#795548' },
  ];

  return (
    <View style={styles.container}>
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'reports' && styles.activeTab]}
          onPress={() => setActiveTab('reports')}
        >
          <BarChart3 
            size={20} 
            color={activeTab === 'reports' ? '#fff' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'reports' && styles.activeTabText]}>
            Reports
          </Text>
        </TouchableOpacity>
        {!isSalesAgent && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'audit' && styles.activeTab]}
            onPress={() => setActiveTab('audit')}
          >
            <History 
              size={20} 
              color={activeTab === 'audit' ? '#fff' : '#666'} 
            />
            <Text style={[styles.tabText, activeTab === 'audit' && styles.activeTabText]}>
              Audit Trail
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <Truck 
            size={20} 
            color={activeTab === 'history' ? '#fff' : '#666'} 
          />
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
            Release History
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content based on active tab */}
      {activeTab === 'reports' ? (
        <ScrollView 
          style={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Reports & Analytics</Text>
            <TouchableOpacity style={styles.exportButton} onPress={() => generateSummaryImage()}>
              <Save size={20} color="#fff" />
              <Text style={styles.exportButtonText}>Save Report</Text>
            </TouchableOpacity>
          </View>

          {/* Period Filter */}
          <View style={[styles.section, styles.periodFilterSection]}>
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
                  {statItems.map((item, idx) => (
                    <StatCard
                      key={`${item.title}-${idx}`}
                      title={item.title}
                      value={item.value}
                      icon={item.icon}
                      color={item.color}
                    />
                  ))}
                </View>
              </View>

              {/* Summary Report */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Summary Report</Text>
                <View style={styles.reportsGrid}>
                  <ReportButton
                    title="Generate Summary Report"
                    description="Creates a text summary you can share or save"
                    icon="description"
                    reportType="summary"
                    color="#007AFF"
                  />
                </View>
              </View>
            </>
          )}
        </ScrollView>
      ) : (
        activeTab === 'audit' && !isSalesAgent ? (
          // Audit Trail View
          <ScrollView 
            style={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            <View style={styles.header}>
              <Text style={styles.title}>Audit Trail</Text>
              <TouchableOpacity style={styles.exportButton}>
                <Download size={20} color="#fff" />
                <Text style={styles.exportButtonText}>Export</Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <UniformLoading message="Loading audit trail..." />
            ) : (
              <View style={styles.section}>
                {auditTrail.length > 0 ? (
                  auditTrail.map((item, index) => {
                    // Helper function to get changes from before/after
                    const getChanges = (before, after) => {
                      if (!before || !after) return [];
                      return Object.keys(after).reduce((changes, key) => {
                        if (before[key] !== after[key]) {
                          changes.push({ 
                            field: key, 
                            before: before[key], 
                            after: after[key] 
                          });
                        }
                        return changes;
                      }, []);
                    };

                    const changes = getChanges(item.details?.before, item.details?.after);
                    
                    // Format details text
                    let detailsText = '';
                    if (item.action?.toLowerCase() === 'update' && changes.length > 0) {
                      if (changes.length === 1 && changes[0].field === 'picture') {
                        detailsText = 'Profile picture changed';
                      } else {
                        detailsText = changes.map(c => 
                          `${c.field}: ${c.before} → ${c.after}`
                        ).join('\n');
                      }
                    } else if (item.details?.summary) {
                      detailsText = item.details.summary;
                    } else if (typeof item.details === 'string') {
                      detailsText = item.details;
                    }

                    return (
                      <View key={item._id || index} style={styles.auditItem}>
                        <View style={styles.auditHeader}>
                          <View style={styles.auditIcon}>
                            <MaterialIcons 
                              name={getAuditIcon(item.action)} 
                              size={20} 
                              color="#e50914" 
                            />
                          </View>
                          <View style={styles.auditInfo}>
                            <Text style={styles.auditAction}>
                              {item.action} {item.resource}
                            </Text>
                            <Text style={styles.auditUser}>
                              by {item.performedBy || 'System'}
                            </Text>
                          </View>
                          <Text style={styles.auditTime}>
                            {new Date(item.timestamp).toLocaleString()}
                          </Text>
                        </View>
                        {detailsText && (
                          <View style={styles.auditDetails}>
                            <Text style={styles.auditDetailsText}>{detailsText}</Text>
                          </View>
                        )}
                      </View>
                    );
                  })
                ) : (
                  <View style={styles.emptyAudit}>
                    <History size={64} color="#ccc" />
                    <Text style={styles.emptyAuditText}>No audit records found</Text>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        ) : (
          // Release History View
          <ScrollView
            style={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={historyRefreshing} onRefresh={onRefreshHistory} />}
          >
            <View style={styles.header}>
              <Text style={styles.title}>Release History</Text>
              <TouchableOpacity style={styles.exportButton} onPress={fetchReleaseHistory}>
                <RefreshCw size={20} color="#fff" />
                <Text style={styles.exportButtonText}>Refresh</Text>
              </TouchableOpacity>
            </View>

            {historyLoading ? (
              <UniformLoading message="Loading release history..." />
            ) : (
              <View style={styles.section}>
                {releaseHistory.length > 0 ? (
                  releaseHistory.map(item => (
                    <View key={item.id} style={styles.historyCard}>
                      <View style={styles.historyHeader}>
                        <View style={styles.historyTitleGroup}>
                          <Text style={styles.historyTitle}>{item.unitName}</Text>
                          <Text style={styles.historySubTitle}>Unit ID: {item.unitId}</Text>
                          {!!item.variation && (
                            <Text style={styles.historySubTitle}>Variation: {item.variation}</Text>
                          )}
                        </View>
                        <View style={styles.historyBadge}>
                          <Text style={styles.historyBadgeText}>{formatDateTime(item.releasedAt)}</Text>
                        </View>
                      </View>

                      <View style={styles.historyGrid}>
                        <View style={styles.historyRow}>
                          <Text style={styles.historyLabel}>Body Color</Text>
                          <Text style={styles.historyValue}>{item.bodyColor}</Text>
                        </View>
                        <View style={styles.historyRow}>
                          <Text style={styles.historyLabel}>Agent</Text>
                          <Text style={styles.historyValue}>{item.agent || '—'}</Text>
                        </View>
                        <View style={styles.historyRow}>
                          <Text style={styles.historyLabel}>Driver</Text>
                          <Text style={styles.historyValue}>{item.driver || '—'}</Text>
                        </View>
                        <View style={styles.historyRow}>
                          <Text style={styles.historyLabel}>Customer</Text>
                          <Text style={styles.historyValue}>{item.customerName || '—'}</Text>
                        </View>
                        <View style={styles.historyRow}>
                          <Text style={styles.historyLabel}>Email</Text>
                          <Text style={styles.historyValue}>{item.customerEmail || '—'}</Text>
                        </View>
                        <View style={styles.historyRow}>
                          <Text style={styles.historyLabel}>Phone</Text>
                          <Text style={styles.historyValue}>{item.customerPhone || '—'}</Text>
                        </View>
                      </View>

                      <View style={styles.historyProcessSection}>
                        <Text style={styles.historyProcessTitle}>Completed Processes</Text>
                        {item.processes && item.processes.length > 0 ? (
                          <View style={styles.historyChips}>
                            {item.processes.map(proc => (
                              <View key={proc} style={styles.historyChip}>
                                <Text style={styles.historyChipText}>{proc.replace(/_/g, ' ')}</Text>
                              </View>
                            ))}
                          </View>
                        ) : (
                          <Text style={styles.historyValue}>No processes recorded</Text>
                        )}
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyAudit}>
                    <Car size={64} color="#ccc" />
                    <Text style={styles.emptyAuditText}>No release history found</Text>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        )
      )}
    </View>
  );
}

// Helper function to get audit icons
const getAuditIcon = (action) => {
  if (action?.toLowerCase().includes('create')) return 'add-circle';
  if (action?.toLowerCase().includes('update')) return 'edit';
  if (action?.toLowerCase().includes('delete')) return 'delete';
  if (action?.toLowerCase().includes('login')) return 'login';
  if (action?.toLowerCase().includes('logout')) return 'logout';
  return 'info';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  activeTab: {
    backgroundColor: '#e50914',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#fff',
  },
  scrollContent: {
    flex: 1,
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
    overflow: 'visible',
  },
  periodFilterSection: {
    zIndex: 100,
    elevation: 100,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  periodFilter: {
    marginBottom: 16,
    zIndex: 1000,
    elevation: 1000,
  },
  periodLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  dropdownWrapper: {
    position: 'relative',
    zIndex: 1000,
    elevation: 1000,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    overflow: 'visible',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pickerText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  dropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    zIndex: 9999,
    elevation: 9999,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    maxHeight: 250,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemActive: {
    backgroundColor: '#f8f9fa',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownItemTextActive: {
    color: '#e50914',
    fontWeight: '600',
  },
  captureContainer: {
    backgroundColor: '#f8f9fa',
  },
  picker: {
    height: 50,
    color: '#333',
    backgroundColor: '#f8f9fa',
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
  // Audit Trail Styles
  auditList: {
    paddingBottom: 20,
  },
  auditItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#e50914',
  },
  auditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  auditIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  auditInfo: {
    flex: 1,
  },
  auditAction: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  auditUser: {
    fontSize: 14,
    color: '#666',
  },
  auditTime: {
    fontSize: 12,
    color: '#999',
  },
  auditDetails: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  auditDetailsText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  auditChanges: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  auditChangesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  auditChangesText: {
    fontSize: 12,
    color: '#444',
    fontFamily: 'monospace',
  },
  emptyAudit: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyAuditText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  historyCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  historyTitleGroup: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  historySubTitle: {
    fontSize: 13,
    color: '#555',
    marginTop: 2,
  },
  historyBadge: {
    backgroundColor: '#e50914',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  historyBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  historyGrid: {
    marginTop: 8,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  historyLabel: {
    fontSize: 13,
    color: '#666',
    width: '40%',
  },
  historyValue: {
    fontSize: 13,
    color: '#111',
    width: '60%',
    textAlign: 'right',
  },
  historyProcessSection: {
    marginTop: 12,
  },
  historyProcessTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
  },
  historyChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  historyChip: {
    backgroundColor: '#fff',
    borderColor: '#e0e0e0',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  historyChipText: {
    fontSize: 12,
    color: '#333',
  },
});
