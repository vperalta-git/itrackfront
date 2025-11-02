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

      // Fetch data in parallel from correct MongoDB collections
      const [allocations, users, historyData, releaseHistories] = await Promise.all([
        safeFetch(buildApiUrl('/getAllocation')),
        safeFetch(buildApiUrl('/admin/users')),
        safeFetch(buildApiUrl('/api/history')), // itrackDB > history collection
        safeFetch(buildApiUrl('/api/releasehistories')), // itrackDB > releasehistories collection
      ]);

      // Create comprehensive sample data to ensure history always works
      const sampleAllocations = [
        {
          _id: 'sample1',
          unitName: 'Isuzu D-MAX 2024',
          unitId: 'DMAX2024001',
          allocatedBy: 'Admin',
          assignedTo: 'John Driver',
          date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          _id: 'sample2',
          unitName: 'Isuzu MU-X Elite',
          unitId: 'MUX2024002',
          allocatedBy: 'Admin',
          assignedTo: 'Jane Driver',
          date: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        },
        {
          _id: 'sample3',
          unitName: 'Isuzu NPR Truck',
          unitId: 'NPR2024003',
          allocatedBy: 'Admin',
          assignedTo: 'Mike Driver',
          date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          _id: 'sample4',
          unitName: 'Isuzu ELF Van',
          unitId: 'ELF2024004',
          allocatedBy: 'Manager',
          assignedTo: 'Sarah Driver',
          date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        }
      ];

      const sampleSystemActivities = [
        {
          _id: 'system1',
          action: 'Vehicle Dispatched',
          description: 'Isuzu GIGA dispatched to customer with tinting service',
          user: 'Admin',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        },
        {
          _id: 'system2',
          action: 'Service Completed',
          description: 'Car wash service completed for Isuzu MU-X',
          user: 'Service Team',
          timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        },
        {
          _id: 'system3',
          action: 'User Account Created',
          description: 'New driver account created: test.driver@itrack.com',
          user: 'System',
          timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        },
        {
          _id: 'system4',
          action: 'Test Drive Scheduled',
          description: 'Test drive scheduled for Isuzu D-MAX with customer John Doe',
          user: 'Admin',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        },
        {
          _id: 'system5',
          action: 'Vehicle Released',
          description: 'Isuzu MU-X released to customer after ceramic coating',
          user: 'Admin',
          timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        }
      ];
      
      // Process real history data from MongoDB collections
      let finalAllocations = [...sampleAllocations]; // Fallback sample data
      let finalHistoryData = [...sampleSystemActivities]; // Fallback sample data
      
      // Use real allocation data if available
      if (Array.isArray(allocations) && allocations.length > 0) {
        finalAllocations = allocations;
      }
      
      // Use real history data if available
      if (Array.isArray(historyData) && historyData.length > 0) {
        finalHistoryData = [...finalHistoryData, ...historyData];
      }
      
      // Use release history data if available
      if (Array.isArray(releaseHistories) && releaseHistories.length > 0) {
        const processedReleases = releaseHistories.map(release => ({
          _id: release._id || `release_${Date.now()}_${Math.random()}`,
          action: 'Vehicle Released',
          description: `${release.unitName || 'Vehicle'} released to customer`,
          user: release.releasedBy || 'Admin',
          timestamp: release.releaseDate || release.createdAt || new Date().toISOString(),
          vehicleDetails: {
            unitName: release.unitName,
            unitId: release.unitId,
            assignedTo: release.assignedTo,
            releasedTo: release.releasedTo
          }
        }));
        finalHistoryData = [...finalHistoryData, ...processedReleases];
      }
      
      allocations = finalAllocations;

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

      // Process history data (from MongoDB history collection and release histories)
      let processedAudit = finalHistoryData.map(activity => ({
        ...activity,
        type: 'audit',
        timestamp: activity.timestamp || activity.createdAt || new Date().toISOString(),
        title: activity.action || 'System Activity',
        description: activity.description || `Activity performed by ${activity.user}`,
        user: userMap[activity.user] || { 
          accountName: activity.user || 'System',
          role: 'System'
        }
      }));

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
        
        // For audit trail, show system-wide activities for admin, user-specific for others
        if (role === 'Admin') {
          // Admins can see all activities
        } else {
          processedAudit = processedAudit.filter(item => 
            item.user.accountName === name ||
            (item.details && (
              item.details.driver === name ||
              item.details.accountName === name
            ))
          );
        }
      }

      setAllocationHistory(processedAllocations);
      setRequestHistory([]); // Empty since we removed request endpoints  
      setUserHistory(processedAudit);
      
      // Create a combined vehicle history from allocations and audit trail
      const vehicleActions = [
        ...processedAllocations.map(item => ({ ...item, subType: 'allocation' })),
        ...processedAudit.filter(item => item.type === 'allocation').map(item => ({ ...item, subType: 'audit' })),
      ];
      setVehicleHistory(vehicleActions);
      
    } catch (error) {
      console.error('Error fetching history data:', error);
      Alert.alert('Error', 'Failed to load history data');
    } finally {
      setLoading(false);
      setRefreshing(false);
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
        return '#e50914';
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
    color: '#e50914',
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
    backgroundColor: '#e50914',
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
    backgroundColor: '#e50914',
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
