import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  RefreshControl,
  Image,
  FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { buildApiUrl } from '../constants/api';
import UniformLoading from '../components/UniformLoading';

export default function HistoryScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [accountName, setAccountName] = useState('');
  
  // History data states
  const [allocationHistory, setAllocationHistory] = useState([]);
  const [userHistory, setUserHistory] = useState([]);
  const [vehicleHistory, setVehicleHistory] = useState([]);
  const [requestHistory, setRequestHistory] = useState([]);
  
  // Filter states
  const [activeFilter, setActiveFilter] = useState('all');
  const [filteredHistory, setFilteredHistory] = useState([]);

  useEffect(() => {
    loadUserInfoAndHistory();
  }, []);

  useEffect(() => {
    // Update filtered history when filter changes
    filterHistoryByType(activeFilter);
  }, [activeFilter, allocationHistory, userHistory, vehicleHistory, requestHistory]);

  const loadUserInfoAndHistory = async () => {
    try {
      setLoading(true);
      
      const role = await AsyncStorage.getItem('role');
      const name = await AsyncStorage.getItem('accountName');
      
      if (!role || !name) {
        Alert.alert('Error', 'User session not found');
        navigation.navigate('LoginScreen');
        return;
      }
      
      setUserRole(role);
      setAccountName(name);
      
      await fetchHistoryData(role, name);
    } catch (error) {
      console.error('Error loading history:', error);
      Alert.alert('Error', 'Failed to load history data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchHistoryData = async (role, name) => {
    try {
      // Helper function for safe API calls
      const safeFetch = async (url) => {
        try {
          const response = await fetch(url);
          const data = await response.json();
          return response.ok ? data : [];
        } catch (error) {
          console.error(`Error fetching from ${url}:`, error);
          return [];
        }
      };

      // Fetch data in parallel
      const [allocations, users, completedRequests, inProgressRequests, auditTrail] = await Promise.all([
        safeFetch(buildApiUrl('/getAllocation')),
        safeFetch(buildApiUrl('/admin/users')),
        safeFetch(buildApiUrl('/getCompletedRequests')),
        safeFetch(buildApiUrl('/getRequest')),
        safeFetch(buildApiUrl('/api/audit-trail')),
      ]);

      // Create user map for profile pictures and names
      const userMap = {};
      if (Array.isArray(users)) {
        users.forEach(user => {
          userMap[user.accountName] = {
            profilePicture: user.profilePicture,
            accountName: user.accountName,
            role: user.role,
          };
        });
      }

      // Process allocation history
      let processedAllocations = [];
      if (Array.isArray(allocations)) {
        processedAllocations = allocations.map(allocation => ({
          ...allocation,
          type: 'allocation',
          timestamp: allocation.date || allocation.createdAt || new Date().toISOString(),
          title: `Vehicle Allocated: ${allocation.unitName || 'Unknown Vehicle'}`,
          description: `Allocated by ${allocation.allocatedBy || 'Unknown'} to ${allocation.assignedTo || 'Unknown'}`,
          user: userMap[allocation.allocatedBy] || { accountName: allocation.allocatedBy || 'Unknown' },
        }));
      }

      // Process request history
      let processedRequests = [];
      if (Array.isArray(completedRequests)) {
        processedRequests = processedRequests.concat(
          completedRequests.map(request => ({
            ...request,
            type: 'request',
            timestamp: request.completedAt || request.createdAt || new Date().toISOString(),
            title: `Service Request Completed`,
            description: `${request.requestType || 'Unknown'} - ${request.unitName || 'Unknown Vehicle'}`,
            user: userMap[request.completedBy] || { accountName: request.completedBy || 'Unknown' },
          }))
        );
      }
      
      if (Array.isArray(inProgressRequests)) {
        processedRequests = processedRequests.concat(
          inProgressRequests.map(request => ({
            ...request,
            type: 'request',
            timestamp: request.createdAt || new Date().toISOString(),
            title: `Service Request Created`,
            description: `${request.requestType || 'Unknown'} - ${request.unitName || 'Unknown Vehicle'}`,
            user: userMap[request.createdBy] || { accountName: request.createdBy || 'Unknown' },
          }))
        );
      }

      // Process audit trail if available
      let processedAudit = [];
      if (Array.isArray(auditTrail)) {
        processedAudit = auditTrail.map(audit => ({
          ...audit,
          type: 'audit',
          timestamp: audit.timestamp || audit.createdAt || new Date().toISOString(),
          title: audit.action || 'System Action',
          description: audit.details || 'No details available',
          user: userMap[audit.userId] || { accountName: audit.userId || 'System' },
        }));
      }

      // Filter based on user role
      const canViewAll = role === 'Admin' || role === 'Supervisor';
      
      if (!canViewAll) {
        // Filter to show only items related to current user
        processedAllocations = processedAllocations.filter(item => 
          item.allocatedBy === name || 
          item.assignedTo === name || 
          item.assignedDriver === name
        );
        
        processedRequests = processedRequests.filter(item => 
          item.createdBy === name || 
          item.completedBy === name ||
          item.assignedTo === name
        );
        
        processedAudit = processedAudit.filter(item => 
          item.userId === name
        );
      }

      setAllocationHistory(processedAllocations);
      setRequestHistory(processedRequests);
      setUserHistory(processedAudit);
      
      // Create a combined vehicle history from allocations and requests
      const vehicleActions = [
        ...processedAllocations.map(item => ({ ...item, subType: 'allocation' })),
        ...processedRequests.map(item => ({ ...item, subType: 'request' })),
      ];
      setVehicleHistory(vehicleActions);
      
    } catch (error) {
      console.error('Error fetching history data:', error);
      Alert.alert('Error', 'Failed to load history data');
    }
  };

  const filterHistoryByType = (filterType) => {
    let combined = [];
    
    switch (filterType) {
      case 'allocations':
        combined = [...allocationHistory];
        break;
      case 'requests':
        combined = [...requestHistory];
        break;
      case 'vehicles':
        combined = [...vehicleHistory];
        break;
      case 'users':
        combined = [...userHistory];
        break;
      case 'all':
      default:
        combined = [
          ...allocationHistory,
          ...requestHistory,
          ...userHistory,
        ];
        break;
    }
    
    // Sort by timestamp (most recent first)
    combined.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    setFilteredHistory(combined);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadUserInfoAndHistory();
  };

  const renderUserAvatar = (user) => {
    if (user?.profilePicture) {
      return (
        <Image
          source={{ uri: user.profilePicture }}
          style={styles.userAvatar}
          resizeMode="cover"
        />
      );
    } else {
      const initials = (user?.accountName || 'U')
        .split(' ')
        .map(name => name.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);

      return (
        <View style={styles.userAvatarPlaceholder}>
          <Text style={styles.userAvatarText}>{initials}</Text>
        </View>
      );
    }
  };

  const getTypeIcon = (type, subType) => {
    switch (type) {
      case 'allocation':
        return '🚗';
      case 'request':
        return subType === 'completed' ? '✅' : '📋';
      case 'audit':
        return '🔍';
      default:
        return '📄';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'allocation':
        return '#CB1E2A';
      case 'request':
        return '#059669';
      case 'audit':
        return '#2D2D2D';
      default:
        return '#6B7280';
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  const renderHistoryItem = ({ item, index }) => (
    <View style={styles.historyItem}>
      <View style={styles.historyItemLeft}>
        {renderUserAvatar(item.user)}
        <View style={styles.timelineConnector} />
      </View>
      
      <View style={styles.historyItemRight}>
        <View style={styles.historyItemHeader}>
          <View style={styles.historyItemTitleRow}>
            <Text style={styles.historyItemIcon}>
              {getTypeIcon(item.type, item.subType)}
            </Text>
            <Text style={styles.historyItemTitle}>{item.title}</Text>
          </View>
          <Text style={styles.historyItemTime}>
            {formatTimestamp(item.timestamp)}
          </Text>
        </View>
        
        <Text style={styles.historyItemDescription}>{item.description}</Text>
        
        <View style={styles.historyItemFooter}>
          <Text style={styles.historyItemUser}>
            {item.user?.accountName || 'Unknown User'}
          </Text>
          <View
            style={[
              styles.historyItemTypeBadge,
              { backgroundColor: getTypeColor(item.type) }
            ]}
          >
            <Text style={styles.historyItemTypeText}>
              {item.type?.toUpperCase() || 'UNKNOWN'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderFilterTabs = () => {
    const filters = [
      { key: 'all', label: 'All', icon: '📊' },
      { key: 'allocations', label: 'Allocations', icon: '🚗' },
      { key: 'requests', label: 'Requests', icon: '📋' },
      { key: 'vehicles', label: 'Vehicles', icon: '🚛' },
    ];

    // Add user filter only for admin/supervisor
    if (userRole === 'Admin' || userRole === 'Supervisor') {
      filters.push({ key: 'users', label: 'Users', icon: '👥' });
    }

    return (
      <View style={styles.filterTabs}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterTabsContent}
        >
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterTab,
                activeFilter === filter.key && styles.filterTabActive,
              ]}
              onPress={() => setActiveFilter(filter.key)}
            >
              <Text style={styles.filterTabIcon}>{filter.icon}</Text>
              <Text
                style={[
                  styles.filterTabText,
                  activeFilter === filter.key && styles.filterTabTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  if (loading) {
    return (
      <UniformLoading 
        message="Loading history..." 
        size="large"
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>History</Text>
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
          <Text style={styles.refreshButtonText}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      {renderFilterTabs()}

      {/* History List */}
      <View style={styles.historyContainer}>
        {filteredHistory.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📝</Text>
            <Text style={styles.emptyStateTitle}>No history found</Text>
            <Text style={styles.emptyStateText}>
              {activeFilter === 'all' 
                ? 'No activity has been recorded yet.' 
                : `No ${activeFilter} history available.`}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredHistory}
            renderItem={renderHistoryItem}
            keyExtractor={(item, index) => `${item.type}-${item._id || index}`}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.historyList}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },

  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  backButton: {
    padding: 8,
  },

  backButtonText: {
    fontSize: 16,
    color: '#CB1E2A',
    fontWeight: '600',
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D2D2D',
    flex: 1,
    textAlign: 'center',
  },

  refreshButton: {
    padding: 8,
  },

  refreshButtonText: {
    fontSize: 18,
  },

  filterTabs: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },

  filterTabsContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },

  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },

  filterTabActive: {
    backgroundColor: '#CB1E2A',
  },

  filterTabIcon: {
    fontSize: 16,
    marginRight: 6,
  },

  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },

  filterTabTextActive: {
    color: '#FFFFFF',
  },

  historyContainer: {
    flex: 1,
  },

  historyList: {
    paddingVertical: 16,
  },

  historyItem: {
    flexDirection: 'row',
    marginBottom: 16,
    marginHorizontal: 20,
  },

  historyItemLeft: {
    alignItems: 'center',
    marginRight: 12,
  },

  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  userAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#CB1E2A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  userAvatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  timelineConnector: {
    width: 2,
    height: 24,
    backgroundColor: '#E5E7EB',
    marginTop: 8,
  },

  historyItemRight: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },

  historyItemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },

  historyItemIcon: {
    fontSize: 18,
    marginRight: 8,
  },

  historyItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D2D2D',
    flex: 1,
  },

  historyItemTime: {
    fontSize: 12,
    color: '#6B7280',
  },

  historyItemDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },

  historyItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  historyItemUser: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },

  historyItemTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },

  historyItemTypeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },

  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },

  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },

  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
});
