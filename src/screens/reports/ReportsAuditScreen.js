import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { apiGet } from '../../utils/api';
import { API_ENDPOINTS } from '../../config/api';
import { COLORS, SPACING, FONT_SIZES } from '../../constants/theme';

const ReportsAuditScreen = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('audit'); // 'audit' or 'reports'
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Audit Trail State
  const [auditLogs, setAuditLogs] = useState([]);
  
  // Reports State
  const [completedRequests, setCompletedRequests] = useState([]);
  const [completedAllocations, setCompletedAllocations] = useState([]);
  const [stockSummary, setStockSummary] = useState([]);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'audit') {
        await fetchAuditLogs();
      } else {
        await fetchReportsData();
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Fetch Audit Trail Logs
  const fetchAuditLogs = async () => {
    try {
      // Backend endpoint: GET /api/audit-trail
      const response = await fetch('https://itrack-backend-1.onrender.com/api/audit-trail', {
        credentials: 'include',
      });
      const data = await response.json();
      setAuditLogs(data);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    }
  };

  // Fetch Reports Data
  const fetchReportsData = async () => {
    try {
      // Fetch completed requests
      const requestsRes = await fetch('https://itrack-backend-1.onrender.com/api/getCompletedRequests', {
        credentials: 'include',
      });
      const requestsData = await requestsRes.json();
      setCompletedRequests(requestsData);

      // Fetch completed allocations
      const allocationsRes = await fetch('https://itrack-backend-1.onrender.com/api/getCompletedAllocations', {
        credentials: 'include',
      });
      const allocationsData = await allocationsRes.json();
      setCompletedAllocations(allocationsData);

      // Fetch stock summary
      const stockRes = await apiGet(API_ENDPOINTS.GET_STOCK);
      if (stockRes) {
        // Group by unitName and count occurrences
        const summary = stockRes.reduce((acc, item) => {
          acc[item.unitName] = (acc[item.unitName] || 0) + 1;
          return acc;
        }, {});

        const summaryArray = Object.entries(summary).map(([unitName, quantity]) => ({
          unitName,
          quantity,
        }));
        setStockSummary(summaryArray);
      }
    } catch (error) {
      console.error('Error fetching reports data:', error);
    }
  };

  // Get changes between before and after states
  const getChanges = (before, after) => {
    if (!before || !after) return [];

    return Object.keys(after).reduce((changes, key) => {
      if (before[key] !== after[key]) {
        changes.push({ field: key, before: before[key], after: after[key] });
      }
      return changes;
    }, []);
  };

  // Render Audit Log Details
  const renderAuditDetails = (log) => {
    const changes = getChanges(log.details?.before, log.details?.after);

    // Profile picture only change
    if (
      log.action.toLowerCase() === 'update' &&
      changes.length === 1 &&
      changes[0].field === 'picture'
    ) {
      return <Text style={styles.detailText}>Profile picture changed</Text>;
    }

    // Multiple fields changed
    if (log.action.toLowerCase() === 'update' && changes.length > 0) {
      return (
        <View style={styles.changesContainer}>
          {changes.map((change, idx) => (
            <View key={idx} style={styles.changeItem}>
              <Text style={styles.fieldName}>{change.field}:</Text>
              <Text style={styles.beforeValue}>
                {typeof change.before === 'object'
                  ? JSON.stringify(change.before)
                  : String(change.before)}
              </Text>
              <Text style={styles.arrow}> → </Text>
              <Text style={styles.afterValue}>
                {typeof change.after === 'object'
                  ? JSON.stringify(change.after)
                  : String(change.after)}
              </Text>
            </View>
          ))}
        </View>
      );
    }

    // Create
    if (log.action.toLowerCase() === 'create' && log.details?.after) {
      return (
        <Text style={[styles.detailText, { color: COLORS.success }]}>
          Created: {JSON.stringify(log.details.after, null, 2)}
        </Text>
      );
    }

    // Delete
    if (log.action.toLowerCase() === 'delete' && log.details?.before) {
      return (
        <Text style={[styles.detailText, { color: COLORS.error }]}>
          Deleted: {JSON.stringify(log.details.before, null, 2)}
        </Text>
      );
    }

    // Fallback
    return (
      <Text style={styles.detailText}>
        {log.details?.summary || (typeof log.details === 'string' ? log.details : '')}
      </Text>
    );
  };

  // Render Audit Trail Tab
  const renderAuditTrail = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <Image
            source={require('../../../assets/loading.gif')}
            style={styles.loadingGif}
          />
          <Text style={styles.loadingText}>Loading audit logs...</Text>
        </View>
      );
    }

    if (auditLogs.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>No audit logs found</Text>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {auditLogs.map((log, idx) => (
          <View key={idx} style={styles.auditCard}>
            <View style={styles.auditHeader}>
              <Text style={styles.auditTimestamp}>
                {new Date(log.timestamp).toLocaleString()}
              </Text>
              <View style={[styles.actionBadge, getActionBadgeStyle(log.action)]}>
                <Text style={styles.actionText}>{log.action}</Text>
              </View>
            </View>
            <View style={styles.auditBody}>
              <Text style={styles.auditResource}>
                <Text style={styles.label}>Resource: </Text>
                {log.resource}
              </Text>
              <Text style={styles.auditPerformer}>
                <Text style={styles.label}>By: </Text>
                {log.performedBy}
              </Text>
              <View style={styles.detailsContainer}>{renderAuditDetails(log)}</View>
            </View>
          </View>
        ))}
      </ScrollView>
    );
  };

  // Get action badge style based on action type
  const getActionBadgeStyle = (action) => {
    const actionLower = action.toLowerCase();
    if (actionLower === 'create') return { backgroundColor: COLORS.success };
    if (actionLower === 'update') return { backgroundColor: COLORS.warning };
    if (actionLower === 'delete') return { backgroundColor: COLORS.error };
    return { backgroundColor: COLORS.primary };
  };

  // Render Reports Tab
  const renderReports = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <Image
            source={require('../../../assets/loading.gif')}
            style={styles.loadingGif}
          />
          <Text style={styles.loadingText}>Loading reports...</Text>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Stock Summary Section */}
        <View style={styles.reportSection}>
          <Text style={styles.sectionTitle}>Stock Summary</Text>
          <View style={styles.summaryGrid}>
            {stockSummary.map((item, idx) => (
              <View key={idx} style={styles.summaryCard}>
                <Text style={styles.summaryUnit}>{item.unitName}</Text>
                <Text style={styles.summaryQuantity}>{item.quantity}</Text>
              </View>
            ))}
          </View>
          {stockSummary.length === 0 && (
            <Text style={styles.emptyText}>No stock data available</Text>
          )}
        </View>

        {/* Completed Vehicle Preparation */}
        <View style={styles.reportSection}>
          <Text style={styles.sectionTitle}>
            Completed Vehicle Preparation ({completedRequests.length})
          </Text>
          {completedRequests.slice(0, 10).map((req, idx) => (
            <View key={idx} style={styles.reportCard}>
              <View style={styles.reportRow}>
                <Text style={styles.reportLabel}>Vehicle:</Text>
                <Text style={styles.reportValue}>{req.vehicleRegNo}</Text>
              </View>
              <View style={styles.reportRow}>
                <Text style={styles.reportLabel}>Prepared By:</Text>
                <Text style={styles.reportValue}>{req.preparedBy || 'N/A'}</Text>
              </View>
              <View style={styles.reportRow}>
                <Text style={styles.reportLabel}>Completed:</Text>
                <Text style={styles.reportValue}>
                  {req.completedAt
                    ? new Date(req.completedAt).toLocaleDateString()
                    : 'N/A'}
                </Text>
              </View>
              {req.duration && (
                <View style={styles.reportRow}>
                  <Text style={styles.reportLabel}>Duration:</Text>
                  <Text style={styles.reportValue}>{req.duration}</Text>
                </View>
              )}
            </View>
          ))}
          {completedRequests.length === 0 && (
            <Text style={styles.emptyText}>No completed requests</Text>
          )}
        </View>

        {/* Completed Allocations */}
        <View style={styles.reportSection}>
          <Text style={styles.sectionTitle}>
            Completed Allocations ({completedAllocations.length})
          </Text>
          {completedAllocations.slice(0, 10).map((alloc, idx) => (
            <View key={idx} style={styles.reportCard}>
              <View style={styles.reportRow}>
                <Text style={styles.reportLabel}>Vehicle:</Text>
                <Text style={styles.reportValue}>{alloc.vehicleRegNo || 'N/A'}</Text>
              </View>
              <View style={styles.reportRow}>
                <Text style={styles.reportLabel}>Driver:</Text>
                <Text style={styles.reportValue}>{alloc.driverName || 'N/A'}</Text>
              </View>
              <View style={styles.reportRow}>
                <Text style={styles.reportLabel}>Date:</Text>
                <Text style={styles.reportValue}>
                  {alloc.date
                    ? new Date(alloc.date).toLocaleDateString()
                    : alloc.createdAt
                    ? new Date(alloc.createdAt).toLocaleDateString()
                    : 'N/A'}
                </Text>
              </View>
            </View>
          ))}
          {completedAllocations.length === 0 && (
            <Text style={styles.emptyText}>No completed allocations</Text>
          )}
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reports & Audit Trail</Text>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'audit' && styles.activeTab]}
          onPress={() => setActiveTab('audit')}
        >
          <Text style={[styles.tabText, activeTab === 'audit' && styles.activeTabText]}>
            Audit Trail
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'reports' && styles.activeTab]}
          onPress={() => setActiveTab('reports')}
        >
          <Text style={[styles.tabText, activeTab === 'reports' && styles.activeTabText]}>
            Reports
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'audit' ? renderAuditTrail() : renderReports()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: SPACING.md,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  loadingGif: {
    width: 60,
    height: 60,
  },
  loadingText: {
    marginTop: SPACING.sm,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.md,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.md,
    fontStyle: 'italic',
    marginVertical: SPACING.lg,
  },

  // Audit Trail Styles
  auditCard: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  auditHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  auditTimestamp: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  actionBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 4,
  },
  actionText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.xs,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  auditBody: {
    marginTop: SPACING.xs,
  },
  auditResource: {
    fontSize: FONT_SIZES.md,
    marginBottom: SPACING.xs,
  },
  auditPerformer: {
    fontSize: FONT_SIZES.md,
    marginBottom: SPACING.sm,
  },
  label: {
    fontWeight: 'bold',
    color: COLORS.text,
  },
  detailsContainer: {
    marginTop: SPACING.xs,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  detailText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  changesContainer: {
    marginTop: SPACING.xs,
  },
  changeItem: {
    marginBottom: SPACING.xs,
  },
  fieldName: {
    fontWeight: 'bold',
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  beforeValue: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.error,
  },
  arrow: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  afterValue: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.success,
  },

  // Reports Styles
  reportSection: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -SPACING.xs,
  },
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: SPACING.md,
    margin: SPACING.xs,
    minWidth: '45%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryUnit: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  summaryQuantity: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  reportCard: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  reportRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  reportLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  reportValue: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontWeight: 'bold',
  },
});

export default ReportsAuditScreen;
