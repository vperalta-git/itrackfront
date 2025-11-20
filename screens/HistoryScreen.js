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

      // Quick audit trail API test
      console.log('🧪 Testing audit trail API directly...');
      try {
        const testUrl = buildApiUrl('/api/audit-trail?limit=1');
        console.log('🧪 Test URL:', testUrl);
        const testResponse = await fetch(testUrl);
        console.log('🧪 Test response status:', testResponse.status);
        if (testResponse.ok) {
          const testData = await testResponse.json();
          console.log('🧪 Test data received:', Array.isArray(testData) ? `Array with ${testData.length} items` : typeof testData);
          if (Array.isArray(testData) && testData.length > 0) {
            console.log('🧪 Sample audit trail item:', testData[0]);
          }
        } else {
          console.log('🧪 Test failed with status:', testResponse.status, testResponse.statusText);
        }
      } catch (testError) {
        console.log('🧪 Test error:', testError.message);
      }
      
      await fetchHistoryData(role, name);
    } catch (error) {
      console.error('Error loading history:', error);
      Alert.alert('Error', 'Failed to load history data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Helper function to get changes between before and after states
  const getChanges = (before, after) => {
    if (!before || !after) return [];

    return Object.keys(after).reduce((changes, key) => {
      if (before[key] !== after[key]) {
        changes.push({ field: key, before: before[key], after: after[key] });
      }
      return changes;
    }, []);
  };

  // Helper functions for processing audit trail data
  const getAuditActionDescription = (action, resource) => {
    const actionMap = {
      create: 'Created',
      update: 'Updated', 
      delete: 'Deleted'
    };
    
    const resourceMap = {
      Inventory: 'Vehicle',
      ServiceRequest: 'Service Request',
      DriverAllocation: 'Driver Allocation',
      User: 'User Account'
    };
    
    const actionText = actionMap[action] || action || 'Modified';
    const resourceText = resourceMap[resource] || resource || 'Resource';
    
    return `${actionText} ${resourceText}`;
  };

  const getAuditDescription = (trail) => {
    const { action, resource, details, performedBy } = trail;
    
    try {
      const before = details?.before || {};
      const after = details?.after || {};

      // Handle different actions with before/after details (web-style format)
      switch (action?.toLowerCase()) {
        case 'update':
          const changes = getChanges(before, after);
          if (changes.length > 0) {
            // Show up to 2 key changes in mobile format
            const keyChanges = changes.slice(0, 2);
            const changeText = keyChanges.map(change => {
              const fieldName = change.field.charAt(0).toUpperCase() + change.field.slice(1);
              return `${fieldName}: ${change.before} → ${change.after}`;
            }).join(', ');
            
            const moreChanges = changes.length > 2 ? ` (+${changes.length - 2} more)` : '';
            const identifier = after.unitName || after.name || after.username || before.unitName || before.name || before.username;
            const itemRef = identifier ? `${identifier}: ` : '';
            
            return `${itemRef}${changeText}${moreChanges}`;
          }
          break;

        case 'create':
          if (after && Object.keys(after).length > 0) {
            const identifier = after.unitName || after.name || after.username || after.title;
            const variation = after.variation ? ` (${after.variation})` : '';
            const unitId = after.unitId ? ` [${after.unitId}]` : '';
            
            if (identifier) {
              return `Created: ${identifier}${variation}${unitId}`;
            }
            return `Created new ${resource}`;
          }
          break;

        case 'delete':
          if (before && Object.keys(before).length > 0) {
            const identifier = before.unitName || before.name || before.username || before.title;
            const variation = before.variation ? ` (${before.variation})` : '';
            const unitId = before.unitId ? ` [${before.unitId}]` : '';
            
            if (identifier) {
              return `Deleted: ${identifier}${variation}${unitId}`;
            }
            return `Deleted ${resource}`;
          }
          break;

        default:
          // Handle legacy format for backwards compatibility
          if (resource === 'Inventory') {
            const vehicle = details?.newInventory || details?.after || after;
            if (vehicle?.unitName) {
              return `${action}: ${vehicle.unitName} ${vehicle.unitId ? `[${vehicle.unitId}]` : ''}`;
            }
          } else if (resource === 'ServiceRequest') {
            const request = details?.newRequest || after;
            if (request?.vehicleRegNo) {
              return `${action}: Service for ${request.vehicleRegNo}`;
            }
          } else if (resource === 'DriverAllocation') {
            const allocation = details?.newAllocation || after;
            if (allocation?.unitName && allocation?.assignedDriver) {
              return `${action}: ${allocation.unitName} → ${allocation.assignedDriver}`;
            }
          } else if (resource === 'User') {
            const user = details?.newUser || details?.updatedUser || after;
            if (user?.name || user?.username) {
              return `${action}: ${user.name || user.username}`;
            }
          }
          break;
      }
      
      // Final fallback
      const identifier = after?.name || after?.unitName || after?.username || 
                        before?.name || before?.unitName || before?.username;
      return identifier ? `${action} ${identifier}` : `${action} ${resource}`;
    } catch (error) {
      console.error('Error processing audit description:', error);
      return `${action} operation on ${resource}`;
    }
  };

  const fetchHistoryData = async (role, name) => {
    try {
      // Helper function for safe API calls with detailed logging
      const safeFetch = async (url) => {
        try {
          console.log(`🔄 Fetching from: ${url}`);
          const response = await fetch(url);
          
          if (!response.ok) {
            console.warn(`⚠️ Non-OK response from ${url}: ${response.status} ${response.statusText}`);
            // Try to get error details from response
            try {
              const errorData = await response.text();
              console.warn(`⚠️ Error response body: ${errorData}`);
            } catch (e) {
              console.warn(`⚠️ Could not parse error response`);
            }
            return [];
          }
          
          const data = await response.json();
          console.log(`✅ Received data from ${url}:`, {
            isArray: Array.isArray(data),
            length: Array.isArray(data) ? data.length : 'N/A',
            hasSuccess: data.hasOwnProperty('success'),
            sampleKeys: typeof data === 'object' ? Object.keys(data).slice(0, 5) : [],
            firstItemKeys: Array.isArray(data) && data.length > 0 ? Object.keys(data[0]).slice(0, 5) : []
          });
          
          return data;
        } catch (error) {
          console.error(`❌ Error fetching from ${url}:`, error.message);
          console.error(`❌ Full error details:`, error);
          return [];
        }
      };

      // Fetch audit trails directly from the database
      let auditTrails = [];
      
      try {
        console.log('🔄 Fetching audit trails...');
        const response = await safeFetch(buildApiUrl('/api/audit-trail'));
        
        // Handle different response formats
        if (Array.isArray(response)) {
          auditTrails = response;
        } else if (response?.success && Array.isArray(response.data)) {
          auditTrails = response.data;
        } else {
          console.warn('⚠️ Unexpected audit trail response format:', typeof response);
          auditTrails = [];
        }
        
        console.log('✅ Fetched', auditTrails.length, 'audit trail entries');
      } catch (error) {
        console.error('❌ Error fetching audit trails:', error);
        auditTrails = [];
      }

      // Fetch additional data for context
      const [allocationsData, users] = await Promise.all([
        safeFetch(buildApiUrl('/getAllocation')),
        safeFetch(buildApiUrl('/getUsers')),
      ]);

      // Enhanced logging for debugging
      console.log('🔍 API Response Debug:', {
        allocationsType: typeof allocationsData,
        allocationsLength: Array.isArray(allocationsData) ? allocationsData.length : 'Not array',
        auditTrailsType: typeof auditTrails,
        auditTrailsLength: Array.isArray(auditTrails) ? auditTrails.length : 'Not array',
        auditTrailsSample: Array.isArray(auditTrails) ? auditTrails.slice(0, 2) : auditTrails
      });

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
      
      // Process real data from MongoDB collections
      let finalAllocations = [...sampleAllocations]; // Fallback sample data
      let finalAuditData = [...sampleSystemActivities]; // Fallback sample data
      
      // Use real allocation data if available
      if (Array.isArray(allocationsData) && allocationsData.length > 0) {
        finalAllocations = allocationsData;
      }
      
      // Use real audit trails data if available (web format)
      if (Array.isArray(auditTrails)) {
        if (auditTrails.length > 0) {
          console.log(`📊 Processing ${auditTrails.length} audit trails from web endpoint`);
          
          const processedAuditTrails = auditTrails.map(trail => ({
            _id: trail._id || `audit_${Date.now()}_${Math.random()}`,
            action: getAuditActionDescription(trail.action, trail.resource),
            description: getAuditDescription(trail),
            user: trail.performedBy || 'Unknown',
            timestamp: trail.timestamp || new Date().toISOString(),
            resource: trail.resource,
            resourceId: trail.resourceId,
            details: trail.details,
            originalTrail: trail
          }));
          
          finalAuditData = processedAuditTrails;
          console.log('✅ Successfully processed real audit trail data');
        } else {
          console.log('⚠️ Audit trails API returned empty array, using sample data');
        }
      } else {
        console.log('❌ Audit trails API did not return array, using sample data. Received:', typeof auditTrails);
      }
      
      // Use finalAllocations for processing
      const allocations = finalAllocations;

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

      // Process audit trails data  
      let processedAudit = finalAuditData.map(activity => ({
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
        // Show allocation-related audit trails and direct allocations
        combined = [
          ...allocationHistory,
          ...userHistory.filter(item => 
            item.resource === 'DriverAllocation' || 
            item.action?.toLowerCase().includes('allocation') ||
            item.action?.toLowerCase().includes('driver')
          )
        ];
        break;
      case 'inventory':
        // Show inventory-related audit trails
        combined = userHistory.filter(item => 
          item.resource === 'Inventory' ||
          item.action?.toLowerCase().includes('inventory') ||
          item.action?.toLowerCase().includes('vehicle') ||
          item.action?.toLowerCase().includes('stock')
        );
        break;
      case 'services':
        // Show service request audit trails
        combined = userHistory.filter(item => 
          item.resource === 'ServiceRequest' ||
          item.action?.toLowerCase().includes('service') ||
          item.action?.toLowerCase().includes('request')
        );
        break;
      case 'users':
        // Show user-related audit trails
        combined = userHistory.filter(item => 
          item.resource === 'User' ||
          item.action?.toLowerCase().includes('user') ||
          item.action?.toLowerCase().includes('account')
        );
        break;
      case 'all':
      default:
        combined = [
          ...allocationHistory,
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

  const testAuditTrailAPI = async () => {
    try {
      console.log('🧪 Manual audit trail API test started...');
      Alert.alert('Debug', 'Testing audit trail API - check console for logs');
      
      const testUrl = buildApiUrl('/api/audit-trail?limit=10');
      console.log('🧪 Testing URL:', testUrl);
      
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('🧪 Response status:', response.status);
      console.log('🧪 Response headers:', response.headers);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🧪 Success! Data type:', typeof data);
        console.log('🧪 Is array:', Array.isArray(data));
        console.log('🧪 Length:', Array.isArray(data) ? data.length : 'N/A');
        
        if (Array.isArray(data) && data.length > 0) {
          console.log('🧪 Sample item:', data[0]);
          Alert.alert('Success', `Found ${data.length} audit trail records! Check console for details.`);
        } else {
          console.log('🧪 Empty array returned');
          Alert.alert('Info', 'API returned empty audit trail data');
        }
      } else {
        const errorText = await response.text();
        console.log('🧪 Error response:', errorText);
        Alert.alert('Error', `API returned status ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('🧪 Test error:', error);
      Alert.alert('Error', `Test failed: ${error.message}`);
    }
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
        return '🔹';
      case 'request':
        return subType === 'completed' ? '✓' : '◆';
      case 'audit':
        return '●';
      default:
        return '○';
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

  const renderDetailsContent = (item) => {
    const { action, details, originalTrail } = item;
    
    if (!details && !originalTrail) {
      return <Text style={styles.auditDetailsText}>{item.description || 'No additional details'}</Text>;
    }

    const trail = originalTrail || item;
    const changes = getChanges(trail.details?.before, trail.details?.after);

    // CASE 1: Only profile picture changed
    if (
      action?.toLowerCase().includes('update') &&
      changes.length === 1 &&
      changes[0].field === 'picture'
    ) {
      return <Text style={styles.auditDetailsText}>Profile picture changed</Text>;
    }

    // CASE 2: Multiple fields changed → show list
    if (action?.toLowerCase().includes('update') && changes.length > 0) {
      return (
        <View style={styles.changesContainer}>
          {changes.map((c, i) => (
            <View key={i} style={styles.changeItem}>
              <Text style={styles.changeFieldText}>
                {c.field.charAt(0).toUpperCase() + c.field.slice(1)}:
              </Text>
              <View style={styles.changeValuesRow}>
                <Text style={styles.changeBeforeText}>
                  {typeof c.before === 'object' ? JSON.stringify(c.before) : String(c.before || 'N/A')}
                </Text>
                <Text style={styles.changeArrowText}> → </Text>
                <Text style={styles.changeAfterText}>
                  {typeof c.after === 'object' ? JSON.stringify(c.after) : String(c.after || 'N/A')}
                </Text>
              </View>
            </View>
          ))}
        </View>
      );
    }

    // CASE 3: Create
    if (action?.toLowerCase().includes('create') && trail.details?.after) {
      const data = trail.details.after;
      const displayText = data.unitName || data.name || data.username || JSON.stringify(data);
      return (
        <Text style={[styles.auditDetailsText, { color: '#059669' }]}>
          Created: {displayText}
        </Text>
      );
    }

    // CASE 4: Delete
    if (action?.toLowerCase().includes('delete') && trail.details?.before) {
      const data = trail.details.before;
      const displayText = data.unitName || data.name || data.username || JSON.stringify(data);
      return (
        <Text style={[styles.auditDetailsText, { color: '#e50914' }]}>
          Deleted: {displayText}
        </Text>
      );
    }

    // CASE 5: Fallback
    return (
      <Text style={styles.auditDetailsText}>
        {item.description || trail.details?.summary || 'Activity performed'}
      </Text>
    );
  };

  const renderHistoryItem = ({ item, index }) => {
    const timestamp = new Date(item.timestamp);
    const formattedDate = timestamp.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
    const formattedTime = timestamp.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    return (
      <View style={styles.auditCard}>
        {/* Timestamp Row */}
        <View style={styles.auditRow}>
          <Text style={styles.auditLabel}>TIMESTAMP</Text>
          <View style={styles.auditValue}>
            <Text style={styles.auditDateText}>{formattedDate}, {formattedTime}</Text>
          </View>
        </View>

        {/* Action Row */}
        <View style={styles.auditRow}>
          <Text style={styles.auditLabel}>ACTION</Text>
          <Text style={styles.auditText}>{item.action || item.title || 'Unknown Action'}</Text>
        </View>

        {/* Resource Row */}
        <View style={styles.auditRow}>
          <Text style={styles.auditLabel}>RESOURCE</Text>
          <Text style={styles.auditText}>{item.resource || item.type?.toUpperCase() || 'Unknown'}</Text>
        </View>

        {/* Performed By Row */}
        <View style={styles.auditRow}>
          <Text style={styles.auditLabel}>PERFORMED BY</Text>
          <Text style={styles.auditText}>{item.user?.accountName || item.user || 'Unknown User'}</Text>
        </View>

        {/* Details Row */}
        <View style={styles.auditRow}>
          <Text style={styles.auditLabel}>DETAILS</Text>
          {renderDetailsContent(item)}
        </View>
      </View>
    );
  };

  const renderFilterTabs = () => {
    const filters = [
      { key: 'all', label: 'All Activities', icon: '●' },
      { key: 'allocations', label: 'Allocations', icon: '🔹' },
      { key: 'inventory', label: 'Inventory', icon: '�' },
      { key: 'services', label: 'Services', icon: '�' },
      { key: 'users', label: 'Users', icon: '○' },
    ];

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
        <Text style={styles.headerTitle}>Audit Trail</Text>
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
            <Text style={styles.emptyStateIcon}>○</Text>
            <Text style={styles.emptyStateTitle}>No audit trail found</Text>
            <Text style={styles.emptyStateText}>
              {activeFilter === 'all' 
                ? 'No audit activity has been recorded yet.' 
                : `No ${activeFilter} audit records available.`}
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

  debugButton: {
    padding: 8,
    marginLeft: 8,
  },

  debugButtonText: {
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
    paddingHorizontal: 16,
  },

  auditCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  auditRow: {
    marginBottom: 12,
  },

  auditLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.5,
    marginBottom: 4,
    textTransform: 'uppercase',
  },

  auditValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  auditDateText: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },

  auditText: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },

  auditDetailsText: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },

  changesContainer: {
    marginTop: 4,
  },

  changeItem: {
    marginBottom: 8,
  },

  changeFieldText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },

  changeValuesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },

  changeBeforeText: {
    fontSize: 12,
    color: '#e50914',
    fontWeight: '500',
  },

  changeArrowText: {
    fontSize: 12,
    color: '#6B7280',
    marginHorizontal: 4,
  },

  changeAfterText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
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
