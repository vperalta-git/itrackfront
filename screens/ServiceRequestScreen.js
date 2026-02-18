import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildApiUrl } from '../constants/api';
import UniformLoading from '../components/UniformLoading';
import NotificationService from '../utils/notificationService';

const { width } = Dimensions.get('window');

export default function ServiceRequestScreen() {
  const [serviceRequests, setServiceRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortOrder, setSortOrder] = useState('recent'); // 'recent' or 'alphabetical'
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [agentName, setAgentName] = useState('');
  const [userId, setUserId] = useState('');
  const [teamAgents, setTeamAgents] = useState([]); // manager's agents
  const [agentUnits, setAgentUnits] = useState([]); // Units allocated to this agent
  const [agentAllocationsLoaded, setAgentAllocationsLoaded] = useState(false);
  const [unitCustomerMap, setUnitCustomerMap] = useState({}); // unitId -> customer details
  const [customerForm, setCustomerForm] = useState({ name: '', email: '', phone: '' });
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  // New service request form state
  const [newRequest, setNewRequest] = useState({
    selectedVehicle: null,
    requestedServices: [],
    notes: '',
    targetCompletionDate: ''
  });

  // Inventory vehicles state
  const [inventoryVehicles, setInventoryVehicles] = useState([]);
  const [showVehicleSelector, setShowVehicleSelector] = useState(false);

  const normalizedRole = (userRole || '').toLowerCase();
  const isAgent = normalizedRole === 'sales agent' || normalizedRole === 'manager';
  const isManager = normalizedRole === 'manager';

  useEffect(() => {
    const loadRole = async () => {
      try {
        const role = await AsyncStorage.getItem('userRole');
        const name = await AsyncStorage.getItem('accountName') || await AsyncStorage.getItem('userName') || '';
        const id = await AsyncStorage.getItem('userId') || '';
        if (role) setUserRole(role);
        if (name) setAgentName(name);
        if (id) setUserId(id);
      } catch (error) {
        console.error('Error loading user role:', error);
      }
    };
    loadRole();
  }, []);

  useEffect(() => {
    const loadTeamAgents = async () => {
      if (!isManager || !userId) return;
      try {
        const res = await fetch(buildApiUrl('/getUsers'));
        const data = await res.json();
        if (data?.success && Array.isArray(data.data)) {
          const assigned = data.data.filter(u => (u.role || '').toLowerCase() === 'sales agent' && u.assignedTo === userId);
          setTeamAgents(assigned.map(u => (u.accountName || '').trim().toLowerCase()).filter(Boolean));
        }
      } catch (err) {
        console.error('Error loading team agents for manager:', err);
        setTeamAgents([]);
      }
    };
    loadTeamAgents();
  }, [isManager, userId]);

  // Load customer details when request is selected
  useEffect(() => {
    if (selectedRequest && showDetailsModal) {
      const key = (selectedRequest.unitId || '').toLowerCase();
      const details = unitCustomerMap[key] || {};
      setCustomerForm({
        name: details.customerName || '',
        phone: details.customerPhone || '',
        email: details.customerEmail || ''
      });
      // If customer has been saved (has name or phone), set to edit mode
      setIsEditingCustomer(!!(details.customerName || details.customerPhone));
    }
  }, [selectedRequest, showDetailsModal, unitCustomerMap]);

  // Load unit allocations for the logged-in agent
  const fetchAgentAllocations = useCallback(async () => {
    // Always load allocations to build customer map; filter to agent units when needed
    const normalizedName = (agentName || '').trim().toLowerCase();
    const normalizedId = (userId || '').trim().toLowerCase();
    const normalizedTeamAgents = teamAgents.map(a => a.trim().toLowerCase());

    const safeParse = (text) => {
      try {
        return JSON.parse(text);
      } catch (err) {
        console.error('❌ JSON parse error for allocations:', err);
        return {};
      }
    };

    try {
      setAgentAllocationsLoaded(false);
      const response = await fetch(buildApiUrl('/api/getUnitAllocation'));
      const text = await response.text();
      const data = text ? safeParse(text) : {};
      const allocations = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);

      // Build lookup for customer details
      const customerMap = {};
      allocations.forEach(alloc => {
        const key = (alloc.unitId || '').toLowerCase();
        if (!key) return;
        customerMap[key] = {
          id: alloc._id,
          customerName: alloc.customerName || '',
          customerEmail: alloc.customerEmail || '',
          customerPhone: alloc.customerPhone || alloc.customerContact || ''
        };
      });
      setUnitCustomerMap(customerMap);

      if (!isAgent) {
        setAgentUnits([]);
        setAgentAllocationsLoaded(true);
        return;
      }

      if (!normalizedName) {
        setAgentUnits([]);
        setAgentAllocationsLoaded(true);
        return;
      }

      const assignedUnits = allocations.filter(alloc => {
        const assignedTo = (alloc.assignedTo || alloc.assignedAgent || '').trim().toLowerCase();
        if (!assignedTo) return false;
        // Strict match or contains to handle minor formatting differences
        const matchesSelf = assignedTo === normalizedName || assignedTo.includes(normalizedName) || normalizedName.includes(assignedTo) || (normalizedId && assignedTo === normalizedId);
        const matchesTeam = isManager && normalizedTeamAgents.some(agent => assignedTo === agent || assignedTo.includes(agent) || agent.includes(assignedTo));
        return matchesSelf || matchesTeam;
      }).map(alloc => ({
        unitId: alloc.unitId,
        unitName: alloc.unitName
      }));

      setAgentUnits(assignedUnits);
    } catch (error) {
      console.error('❌ Error fetching agent allocations:', error);
      setAgentUnits([]);
    } finally {
      setAgentAllocationsLoaded(true);
    }
  }, [agentName, userId, isAgent, isManager, teamAgents]);

  // When opening details, prefill customer form
  useEffect(() => {
    if (!selectedRequest) return;
    const key = (selectedRequest.unitId || '').toLowerCase();
    const details = unitCustomerMap[key] || {};
    setCustomerForm({
      name: details.customerName || '',
      email: details.customerEmail || '',
      phone: details.customerPhone || ''
    });
  }, [selectedRequest, unitCustomerMap]);

  const handleSaveCustomerDetails = async () => {
    if (!selectedRequest) return;
    const key = (selectedRequest.unitId || '').toLowerCase();
    const details = unitCustomerMap[key] || {};
    const allocationId = details.id;

    const payload = {
      customerName: customerForm.name.trim(),
      customerEmail: customerForm.email.trim(),
      customerPhone: customerForm.phone.trim(),
    };

    // Helper to update by id
    const updateById = async (idToUse) => {
      const response = await fetch(buildApiUrl(`/updateAllocation/${idToUse}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || result.success === false) {
        throw new Error(result.message || 'Failed to update customer details');
      }
    };
    const safeParse = (text) => {
      try {
        return JSON.parse(text);
      } catch (err) {
        console.error('❌ JSON parse error during fallback allocation lookup:', err);
        return {};
      }
    };

    setSavingCustomer(true);
    try {
      if (allocationId) {
        await updateById(allocationId);
      } else {
        throw new Error('Allocation id missing, attempting lookup');
      }
    } catch (primaryError) {
      console.warn('Primary allocation update failed, attempting lookup by unitId:', primaryError?.message);
      try {
        const allocRes = await fetch(buildApiUrl('/getAllocation'));
        const allocText = await allocRes.text();
        const allocData = safeParse(allocText || '{}');
        const allocList = allocData.data || [];
        const match = allocList.find((a) => (a.unitId || '').toLowerCase() === key);
        if (!match || !match._id) {
          throw new Error('Allocation not found for this unit');
        }
        await updateById(match._id);
      } catch (fallbackError) {
        console.error('❌ Error updating customer details:', fallbackError);
        Alert.alert('Error', fallbackError.message || 'Failed to update customer details');
        setSavingCustomer(false);
        return;
      }
    }

    try {
      // Refresh allocation map so UI reflects new values
      await fetchAgentAllocations();
      setIsEditingCustomer(true); // Switch to edit mode after successful save
      Alert.alert('Saved', 'Customer details updated');
    } catch (refreshError) {
      console.warn('Customer saved but failed to refresh allocations:', refreshError);
    } finally {
      setSavingCustomer(false);
    }
  };

  // Available services matching web version
  const availableServices = [
    { id: 'Carwash', label: 'Carwash' },
    { id: 'Tinting', label: 'Tinting' },
    { id: 'Ceramic Coating', label: 'Ceramic Coating' },
    { id: 'Accessories', label: 'Accessories' },
    { id: 'Rust Proof', label: 'Rust Proof' }
  ];

  // Fetch service requests
  const fetchServiceRequests = useCallback(async () => {
    setLoading(true);
    try {
      const url = buildApiUrl('/getRequest');
      console.log('📡 Fetching service requests from:', url);
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('📦 Service requests response:', data);
      console.log('📊 Total service requests:', data.data?.length || 0);
      
      if (data.success) {
        setServiceRequests(data.data || []);
        console.log('✅ Service requests loaded:', data.data?.length || 0);
      } else {
        console.warn('❌ Failed to fetch service requests:', data.message);
        setServiceRequests([]);
      }
    } catch (error) {
      console.error('❌ Error fetching service requests:', error);
      Alert.alert('Error', 'Failed to load service requests');
      setServiceRequests([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchServiceRequests();
    fetchAgentAllocations();
    fetchInventoryVehicles();
  }, [fetchServiceRequests, fetchAgentAllocations]);

  // Fetch inventory vehicles for selection
  const fetchInventoryVehicles = async () => {
    try {
      const response = await fetch(buildApiUrl('/getStock'));
      const result = await response.json();
      
      console.log('📦 Raw inventory response:', result);
      
      // Handle both {success: true, data: [...]} and direct array responses
      const data = result.success ? result.data : (Array.isArray(result) ? result : []);
      
      if (Array.isArray(data)) {
        console.log('📊 Total inventory items:', data.length);
        console.log('📊 Sample inventory item:', data[0]);
        
        // Filter only Available vehicles (case-insensitive)
        const availableVehicles = data.filter(vehicle => {
          const status = vehicle.status?.toLowerCase();
          console.log(`Vehicle ${vehicle.unitName}: status = "${vehicle.status}" (${status})`);
          return status === 'available';
        });
        
        setInventoryVehicles(availableVehicles);
        console.log('✅ Available vehicles loaded:', availableVehicles.length);
        console.log('✅ Available vehicles:', availableVehicles.map(v => `${v.unitName} (${v.status})`));
      } else {
        console.error('❌ Data is not an array:', data);
      }
    } catch (error) {
      console.error('❌ Error fetching inventory:', error);
    }
  };

  // Filter and search service requests
  const getFilteredRequests = () => {
    let filtered = serviceRequests;

    // Limit to units allocated to this agent
    if (isAgent) {
      if (!agentAllocationsLoaded) return [];
      const allowedIds = new Set(agentUnits.map(u => (u.unitId || '').toLowerCase()));
      const allowedNames = new Set(agentUnits.map(u => (u.unitName || '').toLowerCase()));

      filtered = filtered.filter(request => {
        const unitId = (request.unitId || '').toLowerCase();
        const unitName = (request.unitName || '').toLowerCase();
        return (unitId && allowedIds.has(unitId)) || (unitName && allowedNames.has(unitName));
      });
    }

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(request => {
        const matchesUnit = request.unitName?.toLowerCase().includes(searchLower) ||
          request.unitId?.toLowerCase().includes(searchLower);
        
        const matchesService = request.requestedServices?.some(service => {
          if (typeof service === 'object' && service !== null) {
            return (service.label || service.name || service.id || '').toLowerCase().includes(searchLower);
          }
          return (service || '').toLowerCase().includes(searchLower);
        });
        
        return matchesUnit || matchesService;
      });
    }

    // Apply sorting
    if (sortOrder === 'alphabetical') {
      filtered = filtered.sort((a, b) => 
        (a.unitName || '').localeCompare(b.unitName || '')
      );
    } else {
      // Sort by most recent (dateCreated or createdAt)
      filtered = filtered.sort((a, b) => 
        new Date(b.dateCreated || b.createdAt) - new Date(a.dateCreated || a.createdAt)
      );
    }

    return filtered;
  };

  // Notify customer via email


  // Send SMS notification to customer
  const handleNotifyCustomerSMS = async (request) => {
    if (!request) return;
    const unitKey = (request.unitId || '').toLowerCase();
    const customerDetails = unitCustomerMap[unitKey] || {};
    const customerPhone = customerDetails.customerPhone;
    const customerName = customerDetails.customerName || 'Customer';

    if (!customerPhone) {
      Alert.alert('Missing phone', 'No customer phone number on file for this unit.');
      return;
    }

    try {
      setLoading(true);
      // Send SMS notification via backend
      const notificationResult = await NotificationService.sendStatusNotification(
        { 
          name: customerName, 
          phone: customerPhone
        },
        { unitName: request.unitName, unitId: request.unitId },
        request.status || 'Vehicle Preparation'
      );

      if (notificationResult.success) {
        const methodText = 'via SMS';
          
        Alert.alert('Sent', `Customer notification sent ${methodText}.`);
      } else {
        Alert.alert('Not sent', notificationResult.message || 'Failed to send notification.');
      }
    } catch (error) {
      console.error('❌ Error sending SMS notification:', error);
      Alert.alert('Error', error.message || 'Failed to send notification');
    } finally {
      setLoading(false);
    }
  };

  // Add new service request
  const handleAddServiceRequest = async () => {
    console.log('🔍 Starting create request...');
    
    if (!newRequest.selectedVehicle) {
      Alert.alert('Error', 'Please select a vehicle');
      return;
    }
    
    if (newRequest.requestedServices.length === 0) {
      Alert.alert('Error', 'Please select at least one service');
      return;
    }

    setLoading(true);
    
    try {
      const accountName = await AsyncStorage.getItem('accountName');
      
      // Extract just the service labels for the backend
      const serviceLabels = newRequest.requestedServices.map(service => 
        typeof service === 'object' ? service.label : service
      );
      
      const requestBody = {
        unitId: newRequest.selectedVehicle.unitId || newRequest.selectedVehicle._id,
        unitName: newRequest.selectedVehicle.unitName,
        service: serviceLabels,
        status: 'Pending',
        preparedBy: accountName || 'System',
        dispatchedFrom: 'Mobile App',
        completedServices: [],
        pendingServices: serviceLabels,
        dateCreated: new Date().toISOString()
      };
      
      console.log('📤 Creating service request:', requestBody);
      
      const response = await fetch(buildApiUrl('/createServiceRequest'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('📥 Create response:', JSON.stringify(data, null, 2));
      
      if (data.success || response.ok) {
        console.log('✅ Created request ID:', data.data?._id);
        console.log('📦 Created request details:', {
          unitName: data.data?.unitName,
          status: data.data?.status,
          services: data.data?.service
        });
        
        // Update inventory status to "In Dispatch"
        console.log('🔄 Updating inventory status...');
        await updateInventoryStatus(newRequest.selectedVehicle._id, 'In Dispatch');
        
        // Close modal and reset form
        setShowAddModal(false);
        resetNewRequestForm();
        
        // Refresh the list and inventory
        console.log('🔄 Refreshing service requests and inventory...');
        await fetchServiceRequests();
        await fetchInventoryVehicles();
        console.log('✅ Refresh complete');
        
        Alert.alert('Success', 'Service request created successfully!');
      } else {
        throw new Error(data.message || 'Failed to create service request');
      }
    } catch (error) {
      console.error('❌ Error creating service request:', error);
      Alert.alert('Error', error.message || 'Failed to create service request');
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const resetNewRequestForm = () => {
    setNewRequest({
      selectedVehicle: null,
      requestedServices: [],
      notes: '',
      targetCompletionDate: ''
    });
  };

  // Update inventory status
  const updateInventoryStatus = async (inventoryId, newStatus) => {
    try {
      console.log(`📦 Updating inventory ${inventoryId} to status: ${newStatus}`);
      const response = await fetch(buildApiUrl(`/updateStock/${inventoryId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        console.log(`✅ Inventory status updated to ${newStatus}`);
      }
    } catch (error) {
      console.error('❌ Error updating inventory status:', error);
    }
  };

  // Delete service request
  const handleDeleteRequest = async (request) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete the request for "${request.unitName}" (${request.unitId})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️ Deleting request:', request._id);
              console.log('🔗 Delete URL:', buildApiUrl(`/deleteServiceRequest/${request._id}`));
              
              const response = await fetch(buildApiUrl(`/deleteServiceRequest/${request._id}`), {
                method: 'DELETE'
              });

              console.log('📥 Delete response status:', response.status);
              
              const data = await response.json();
              console.log('📥 Delete response data:', JSON.stringify(data, null, 2));

              if (response.ok && data.success) {
                console.log('✅ Request deleted successfully');
                
                // Fetch the inventory item by unitId (not from filtered list)
                console.log('🔍 Fetching inventory with unitId:', request.unitId);
                try {
                  const inventoryResponse = await fetch(buildApiUrl('/getStock'));
                  const inventoryData = await inventoryResponse.json();
                  
                  if (inventoryData.success && inventoryData.data) {
                    const inventoryItem = inventoryData.data.find(v => v.unitId === request.unitId);
                    
                    if (inventoryItem) {
                      console.log('📦 Found inventory item:', inventoryItem._id);
                      await updateInventoryStatus(inventoryItem._id, 'Available');
                    } else {
                      console.warn('⚠️ Inventory item not found for unitId:', request.unitId);
                    }
                  }
                } catch (inventoryError) {
                  console.error('❌ Error fetching inventory:', inventoryError);
                }
                
                // Refresh lists
                console.log('🔄 Refreshing lists...');
                await fetchServiceRequests();
                await fetchInventoryVehicles();
                console.log('✅ Refresh complete');
                
                Alert.alert('Success', 'Request deleted successfully and vehicle returned to inventory!');
              } else {
                console.error('❌ Delete failed:', data.message || 'Unknown error');
                Alert.alert('Error', data.message || 'Failed to delete request');
              }
            } catch (error) {
              console.error('❌ Delete error:', error);
              Alert.alert('Error', error.message || 'Failed to delete request');
            }
          }
        }
      ]
    );
  };

  // Update service request status (removed - keeping for compatibility but won't be used in UI)
  const updateRequestStatus = async (requestId, newStatus) => {
    try {
      const response = await fetch(buildApiUrl(`/updateServiceRequest/${requestId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          lastUpdatedBy: await AsyncStorage.getItem('accountName') || 'System'
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        Alert.alert('Success', `Request status updated to ${newStatus}`);
        fetchServiceRequests();
      } else {
        Alert.alert('Error', data.message || 'Failed to update request');
      }
    } catch (error) {
      console.error('Error updating request:', error);
      Alert.alert('Error', 'Failed to update request status');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchServiceRequests();
  };

  // Toggle service selection
  const toggleService = (service) => {
    const serviceId = typeof service === 'object' ? service.id : service;
    const isSelected = newRequest.requestedServices.some(s => 
      (typeof s === 'object' ? s.id : s) === serviceId
    );
    
    if (isSelected) {
      setNewRequest({
        ...newRequest,
        requestedServices: newRequest.requestedServices.filter(s => 
          (typeof s === 'object' ? s.id : s) !== serviceId
        )
      });
    } else {
      setNewRequest({
        ...newRequest,
        requestedServices: [...newRequest.requestedServices, service]
      });
    }
  };

  // Select vehicle from inventory
  const selectVehicle = (vehicle) => {
    setNewRequest({
      ...newRequest,
      selectedVehicle: vehicle
    });
    setShowVehicleSelector(false);
  };

  // Format service name for display
  const formatServiceName = (service) => {
    // Handle both string and object formats
    if (typeof service === 'object' && service !== null) {
      return service.label || service.name || service.id || '';
    }
    if (typeof service === 'string') {
      return service.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    return '';
  };

  // Normalize requested services from various payload shapes
  const extractServices = (item) => {
    let services = item?.requestedServices
      || item?.services
      || item?.service
      || item?.requestedService
      || item?.serviceList
      || [];

    if (typeof services === 'string') {
      services = services.split(',').map(s => s.trim()).filter(Boolean);
    }

    if (!Array.isArray(services)) return [];

    return services.map((s) => {
      if (typeof s === 'string') return s;
      if (typeof s === 'object' && s !== null) {
        return s.label || s.name || s.id || '';
      }
      return '';
    }).filter(Boolean);
  };

  // Get priority color
  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high': return '#dc3545';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return '#ffc107';
      case 'in progress': return '#007bff';
      case 'completed': return '#28a745';
      case 'cancelled': return '#dc3545';
      default: return '#6c757d';
    }
  };

  // Render service request item
  const renderRequestItem = ({ item }) => {
    const statusStyle = getStatusStyle(item.status);
    const services = extractServices(item);
    
    return (
      <TouchableOpacity
        style={styles.requestCard}
        onPress={() => {
          setSelectedRequest(item);
          setShowDetailsModal(true);
        }}
        activeOpacity={0.7}
      >
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.cardTitle}>{item.unitName || 'Unknown Vehicle'}</Text>
            <Text style={styles.cardSubtitle}>
              {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              }) : 'Date not set'}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.backgroundColor }]}>
            <Text style={[styles.statusText, { color: statusStyle.color }]}>
              {item.status || 'Pending'}
            </Text>
          </View>
        </View>

        {/* Card Body */}
        <View style={styles.cardBody}>
          <View style={styles.cardRow}>
            <View style={styles.cardField}>
              <View style={styles.fieldLabelRow}>
                <MaterialIcons name="label" size={14} color="#666" style={styles.fieldIcon} />
                <Text style={styles.fieldLabel}>Unit ID</Text>
              </View>
              <Text style={styles.fieldValue}>{item.unitId || 'N/A'}</Text>
            </View>
            <View style={styles.cardField}>
              <View style={styles.fieldLabelRow}>
                <MaterialIcons name="build" size={14} color="#666" style={styles.fieldIcon} />
                <Text style={styles.fieldLabel}>Total Services</Text>
              </View>
              <Text style={styles.fieldValue}>{services.length}</Text>
            </View>
          </View>

          {/* Requested Services */}
          <View style={styles.servicesSection}>
            <View style={styles.servicesLabelRow}>
              <MaterialIcons name="assignment" size={16} color="#666" style={styles.fieldIcon} />
              <Text style={styles.servicesLabel}>Requested Services:</Text>
            </View>
            <View style={styles.servicesWrap}>
              {services.map((service, index) => (
                <View key={index} style={styles.serviceTag}>
                  <Text style={styles.serviceTagText}>{formatServiceName(service)}</Text>
                </View>
              ))}
              {services.length === 0 && (
                <Text style={styles.emptySubtext}>No services listed</Text>
              )}
            </View>
          </View>

          {/* Notes if available */}
          {item.notes && (
            <View style={styles.notesSection}>
              <View style={styles.notesLabelRow}>
                <MaterialIcons name="note" size={16} color="#666" style={styles.fieldIcon} />
                <Text style={styles.notesLabel}>Notes</Text>
              </View>
              <Text style={styles.notesText} numberOfLines={2}>{item.notes}</Text>
            </View>
          )}
        </View>

        {/* Card Actions */}
        <View style={styles.cardActions}>
          <TouchableOpacity 
            style={styles.cardActionBtn} 
            onPress={(e) => {
              e.stopPropagation();
              setSelectedRequest(item);
              setShowDetailsModal(true);
            }}
          >
            <MaterialIcons name="visibility" size={16} color="#2196F3" />
            <Text style={styles.cardActionText}>View Details</Text>
          </TouchableOpacity>
          {!isAgent && (
            <TouchableOpacity 
              style={[styles.cardActionBtn, styles.deleteActionBtn]} 
              onPress={(e) => {
                e.stopPropagation();
                handleDeleteRequest(item);
              }}
            >
              <MaterialIcons name="delete" size={16} color="#dc3545" />
              <Text style={[styles.cardActionText, styles.deleteActionText]}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Get status style helper
  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return { backgroundColor: '#fef3c7', color: '#92400e' };
      case 'in progress':
        return { backgroundColor: '#dbeafe', color: '#1e40af' };
      case 'completed':
        return { backgroundColor: '#d1fae5', color: '#065f46' };
      case 'cancelled':
        return { backgroundColor: '#fee2e2', color: '#991b1b' };
      default:
        return { backgroundColor: '#f3f4f6', color: '#6b7280' };
    }
  };

  // Filter buttons
  const FilterButton = ({ title, value, active }) => (
    <TouchableOpacity
      style={[styles.filterBtn, active && styles.filterBtnActive]}
      onPress={() => setFilterStatus(value)}
    >
      <Text style={[styles.filterBtnText, active && styles.filterBtnTextActive]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Vehicle Preparation</Text>
        {!isAgent && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
          >
            <MaterialIcons name="add" size={24} color="#fff" />
            <Text style={styles.addButtonText}>New Request</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Search and Filter */}
      <View style={styles.searchFilterContainer}>
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search service requests..."
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <MaterialIcons name="close" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
        >
          <Ionicons name="filter" size={20} color="#FFFFFF" />
          <Text style={styles.filterButtonText}>Filter</Text>
        </TouchableOpacity>
      </View>

      {/* Service Requests List */}
      {loading ? (
        <UniformLoading message="Loading service requests..." />
      ) : (
        <FlatList
          data={getFilteredRequests()}
          keyExtractor={(item) => item._id}
          renderItem={renderRequestItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="build" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No service requests found</Text>
              <Text style={styles.emptySubtext}>
                {searchTerm || filterStatus !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Create a new service request to get started'
                }
              </Text>
            </View>
          }
        />
      )}

      {/* Add Service Request Modal */}
      {!isAgent && (
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Service Request</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Select Vehicle *</Text>
              <TouchableOpacity 
                style={[styles.vehicleSelector, newRequest.selectedVehicle && styles.vehicleSelectorSelected]}
                onPress={() => setShowVehicleSelector(true)}
              >
                <View style={styles.vehicleSelectorContent}>
                  {newRequest.selectedVehicle ? (
                    <>
                      <View style={styles.vehicleInfo}>
                        <Text style={styles.vehicleName}>{newRequest.selectedVehicle.unitName}</Text>
                        <Text style={styles.vehicleDetails}>
                          {newRequest.selectedVehicle.variation} • {newRequest.selectedVehicle.bodyColor}
                        </Text>
                        <Text style={styles.vehicleId}>ID: {newRequest.selectedVehicle.unitId || newRequest.selectedVehicle._id}</Text>
                      </View>
                      <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
                    </>
                  ) : (
                    <>
                      <Text style={styles.placeholderText}>Choose vehicle from inventory</Text>
                      <MaterialIcons name="arrow-forward-ios" size={20} color="#666" />
                    </>
                  )}
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Requested Services *</Text>
              <View style={styles.servicesContainer}>
                {availableServices.map(service => (
                  <TouchableOpacity
                    key={typeof service === 'object' ? service.id : service}
                    style={[
                      styles.serviceOption,
                      newRequest.requestedServices.some(s => 
                        (typeof s === 'object' ? s.id : s) === (typeof service === 'object' ? service.id : service)
                      ) && styles.serviceOptionActive
                    ]}
                    onPress={() => toggleService(service)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.serviceOptionText,
                      newRequest.requestedServices.some(s => 
                        (typeof s === 'object' ? s.id : s) === (typeof service === 'object' ? service.id : service)
                      ) && styles.serviceOptionTextActive
                    ]}>
                      {formatServiceName(service)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Additional notes or special instructions..."
                value={newRequest.notes}
                onChangeText={(text) => setNewRequest({...newRequest, notes: text})}
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.modalBtn, styles.cancelBtn]}
              onPress={() => {
                setShowAddModal(false);
                resetNewRequestForm();
              }}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, styles.saveBtn]}
              onPress={handleAddServiceRequest}
            >
              <Text style={styles.saveBtnText}>Create Request</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      )}

      {/* Vehicle Selector Modal */}
      <Modal visible={showVehicleSelector} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Vehicle</Text>
            <TouchableOpacity onPress={() => setShowVehicleSelector(false)} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {inventoryVehicles.length === 0 ? (
              <View style={styles.emptyVehicles}>
                <MaterialIcons name="inventory" size={48} color="#ccc" />
                <Text style={styles.emptyVehiclesText}>No available vehicles</Text>
                <Text style={styles.emptyVehiclesSubtext}>Check inventory for available vehicles</Text>
              </View>
            ) : (
              inventoryVehicles.map((vehicle) => (
                <TouchableOpacity
                  key={vehicle._id}
                  style={styles.vehicleOption}
                  onPress={() => selectVehicle(vehicle)}
                >
                  <View style={styles.vehicleOptionContent}>
                    <View style={styles.vehicleOptionInfo}>
                      <Text style={styles.vehicleOptionName}>{vehicle.unitName}</Text>
                      <Text style={styles.vehicleOptionDetails}>
                        {vehicle.variation} • {vehicle.bodyColor}
                      </Text>
                      <Text style={styles.vehicleOptionId}>ID: {vehicle.unitId || vehicle._id}</Text>
                      <View style={[styles.vehicleStatusBadge, { backgroundColor: getStatusColor(vehicle.status) }]}>
                        <Text style={styles.vehicleStatusText}>{vehicle.status}</Text>
                      </View>
                    </View>
                    <MaterialIcons name="arrow-forward-ios" size={20} color="#666" />
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Request Details Modal */}
      <Modal visible={showDetailsModal} animationType="fade" transparent={true}>
        <View style={styles.centeredModalOverlay}>
          <View style={styles.detailsModalContent}>
            {/* Header */}
            <View style={styles.detailsModalHeader}>
              <Text style={styles.detailsModalTitle}>Request Details</Text>
              <TouchableOpacity 
                onPress={() => setShowDetailsModal(false)}
                style={styles.detailsCloseBtn}
              >
                <MaterialIcons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {selectedRequest && (
              <ScrollView 
                style={styles.detailsScrollView} 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.detailsScrollContent}
              >
                {/* Status Badge - Centered */}
                <View style={styles.detailsStatusContainer}>
                  <View style={[styles.detailsStatusBadge, { backgroundColor: getStatusStyle(selectedRequest.status).backgroundColor }]}>
                    <Text style={[styles.detailsStatusText, { color: getStatusStyle(selectedRequest.status).color }]}>
                      {selectedRequest.status || 'Pending'}
                    </Text>
                  </View>
                </View>

                {/* Vehicle Information Card */}
                <View style={styles.detailsCard}>
                  <View style={styles.detailsCardHeader}>
                    <MaterialIcons name="directions-car" size={22} color="#DC2626" />
                    <Text style={styles.detailsCardTitle}>Vehicle Information</Text>
                  </View>
                  <View style={styles.detailsInfoRow}>
                    <Text style={styles.detailsLabel}>Unit Name</Text>
                    <Text style={styles.detailsValue}>{selectedRequest.unitName || 'N/A'}</Text>
                  </View>
                  <View style={styles.detailsDivider} />
                  <View style={styles.detailsInfoRow}>
                    <Text style={styles.detailsLabel}>Unit ID</Text>
                    <Text style={styles.detailsValue}>{selectedRequest.unitId || 'N/A'}</Text>
                  </View>
                </View>

                {/* Completed Services Card */}
                {(selectedRequest.completedServices && selectedRequest.completedServices.length > 0) && (
                  <View style={styles.detailsCard}>
                    <View style={styles.detailsCardHeader}>
                      <MaterialIcons name="check-circle" size={22} color="#28a745" />
                      <Text style={styles.detailsCardTitle}>Completed Services</Text>
                    </View>
                    <View style={styles.detailsServicesGrid}>
                      {selectedRequest.completedServices.map((service, index) => (
                        <View key={index} style={styles.completedServiceChip}>
                          <MaterialIcons name="check" size={16} color="#fff" />
                          <Text style={styles.completedServiceText}>{formatServiceName(service)}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Pending Services Card */}
                {(selectedRequest.pendingServices && selectedRequest.pendingServices.length > 0) && (
                  <View style={styles.detailsCard}>
                    <View style={styles.detailsCardHeader}>
                      <MaterialIcons name="schedule" size={22} color="#ffc107" />
                      <Text style={styles.detailsCardTitle}>Pending Services</Text>
                    </View>
                    <View style={styles.detailsServicesGrid}>
                      {selectedRequest.pendingServices.map((service, index) => (
                        <View key={index} style={styles.pendingServiceChip}>
                          <MaterialIcons name="schedule" size={16} color="#ff9800" />
                          <Text style={styles.pendingServiceText}>{formatServiceName(service)}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* All Services (fallback if no completed/pending split) */}
                {(!selectedRequest.completedServices && !selectedRequest.pendingServices) && extractServices(selectedRequest).length > 0 && (
                  <View style={styles.detailsCard}>
                    <View style={styles.detailsCardHeader}>
                      <MaterialIcons name="build" size={22} color="#DC2626" />
                      <Text style={styles.detailsCardTitle}>Requested Services</Text>
                    </View>
                    <View style={styles.detailsServicesGrid}>
                      {extractServices(selectedRequest).map((service, index) => (
                        <View key={index} style={styles.allServiceChip}>
                          <MaterialIcons name="build" size={16} color="#DC2626" />
                          <Text style={styles.allServiceText}>{formatServiceName(service)}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Request Information Card */}
                <View style={styles.detailsCard}>
                  <View style={styles.detailsCardHeader}>
                    <MaterialIcons name="info" size={22} color="#2196F3" />
                    <Text style={styles.detailsCardTitle}>Request Information</Text>
                  </View>
                  <View style={styles.detailsInfoRow}>
                    <Text style={styles.detailsLabel}>Date Created</Text>
                    <Text style={styles.detailsValue}>
                      {selectedRequest.dateCreated ? new Date(selectedRequest.dateCreated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.detailsDivider} />
                  <View style={styles.detailsInfoRow}>
                    <Text style={styles.detailsLabel}>Prepared By</Text>
                    <Text style={styles.detailsValue}>{selectedRequest.preparedBy || 'System'}</Text>
                  </View>
                  {selectedRequest.completedAt && (
                    <>
                      <View style={styles.detailsDivider} />
                      <View style={styles.detailsInfoRow}>
                        <Text style={styles.detailsLabel}>Completed</Text>
                        <Text style={styles.detailsValue}>
                          {new Date(selectedRequest.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    </>
                  )}
                  {selectedRequest.completedBy && (
                    <>
                      <View style={styles.detailsDivider} />
                      <View style={styles.detailsInfoRow}>
                        <Text style={styles.detailsLabel}>Completed By</Text>
                        <Text style={styles.detailsValue}>{selectedRequest.completedBy}</Text>
                      </View>
                    </>
                  )}
                </View>

                {/* Customer Details */}
                <View style={styles.detailsCard}>
                  <View style={styles.detailsCardHeader}>
                    <MaterialIcons name="person" size={22} color="#16a34a" />
                    <Text style={styles.detailsCardTitle}>Customer Details</Text>
                  </View>

                  <View style={styles.detailsInfoRowColumn}>
                    <Text style={styles.detailsLabel}>Customer Name</Text>
                    <TextInput
                      style={styles.customerInput}
                      placeholder="Enter customer name"
                      value={customerForm.name}
                      onChangeText={(text) => setCustomerForm(prev => ({ ...prev, name: text }))}
                      placeholderTextColor="#9ca3af"
                    />
                  </View>

                  <View style={styles.detailsDivider} />

                  <View style={styles.detailsInfoRowColumn}>
                    <Text style={styles.detailsLabel}>Contact Number</Text>
                    <TextInput
                      style={styles.customerInput}
                      placeholder="09XX XXX XXXX"
                      value={customerForm.phone}
                      onChangeText={(text) => {
                        // Remove all non-digits
                        const cleaned = text.replace(/\D/g, '');
                        
                        if (cleaned.length <= 11) {
                          let formatted = '';
                          
                          if (cleaned.length > 0) {
                            // If starts with 9, prepend 0
                            let numStr = cleaned;
                            if (numStr.startsWith('9') && numStr.length >= 10) {
                              numStr = '0' + numStr;
                            }
                            // Ensure it starts with 0
                            if (!numStr.startsWith('0') && numStr.length > 0) {
                              numStr = '0' + numStr;
                            }
                            
                            // Format: 09XX XXX XXXX (total 12 chars with spaces)
                            if (numStr.length === 11) {
                              formatted = numStr.slice(0, 4) + ' ' + numStr.slice(4, 7) + ' ' + numStr.slice(7, 11);
                            } else if (numStr.length >= 7) {
                              formatted = numStr.slice(0, 4) + ' ' + numStr.slice(4, 7) + ' ' + numStr.slice(7);
                            } else if (numStr.length >= 4) {
                              formatted = numStr.slice(0, 4) + ' ' + numStr.slice(4);
                            } else {
                              formatted = numStr;
                            }
                          }
                          
                          setCustomerForm(prev => ({ ...prev, phone: formatted }));
                        }
                      }}
                      keyboardType="phone-pad"
                      placeholderTextColor="#9ca3af"
                      maxLength={13}
                    />
                    <Text style={styles.helperText}>Format: 09XX XXX XXXX (11 digits)</Text>
                  </View>

                  <View style={styles.detailsDivider} />

                  <TouchableOpacity
                    style={[styles.saveCustomerBtn, savingCustomer && styles.saveCustomerBtnDisabled]}
                    onPress={handleSaveCustomerDetails}
                    disabled={savingCustomer}
                  >
                    <Text style={styles.saveCustomerText}>
                      {savingCustomer ? 'Saving...' : (isEditingCustomer ? 'Edit Customer Details' : 'Save Customer Details')}
                    </Text>
                  </TouchableOpacity>

                  <Text style={styles.contactHint}>
                    SMS notifications are active when a customer phone number is available.
                  </Text>
                </View>
              </ScrollView>
            )}

            {/* Footer with Close Button */}
            <View style={styles.detailsModalFooter}>
              <TouchableOpacity
                style={styles.detailsCloseButton}
                onPress={() => setShowDetailsModal(false)}
              >
                <Text style={styles.detailsCloseButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <TouchableOpacity 
          style={styles.filterModalOverlay}
          activeOpacity={1}
          onPress={() => setShowFilterModal(false)}
        >
          <View style={styles.filterModalContent}>
            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>Sort Options</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            {/* Sort Options */}
            <Text style={styles.filterSectionTitle}>Sort By</Text>
            
            <TouchableOpacity 
              style={[styles.filterOption, sortOrder === 'recent' && styles.filterOptionActive]}
              onPress={() => {
                setSortOrder('recent');
                setShowFilterModal(false);
              }}
            >
              <Text style={[styles.filterOptionText, sortOrder === 'recent' && styles.filterOptionTextActive]}>
                Most Recent
              </Text>
              {sortOrder === 'recent' && <Ionicons name="checkmark" size={20} color="#DC2626" />}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.filterOption, sortOrder === 'alphabetical' && styles.filterOptionActive]}
              onPress={() => {
                setSortOrder('alphabetical');
                setShowFilterModal(false);
              }}
            >
              <Text style={[styles.filterOptionText, sortOrder === 'alphabetical' && styles.filterOptionTextActive]}>
                Alphabetically
              </Text>
              {sortOrder === 'alphabetical' && <Ionicons name="checkmark" size={20} color="#DC2626" />}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

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
    backgroundcolor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 4,
  },
  searchFilterContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1f2937',
    paddingVertical: 6,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  filterButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '85%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
  },
  filterOptionActive: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#DC2626',
  },
  filterOptionText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#4B5563',
  },
  filterOptionTextActive: {
    color: '#DC2626',
    fontWeight: '600',
  },
  listContainer: {
    paddingBottom: 20,
  },
  requestCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  cardHeaderLeft: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 80,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  cardBody: {
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardField: {
    flex: 1,
    marginRight: 8,
  },
  fieldLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  fieldValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  servicesSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  servicesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  servicesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  serviceTag: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#bbdefb',
  },
  serviceTagText: {
    fontSize: 12,
    color: '#1565c0',
    fontWeight: '600',
  },
  notesSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 8,
  },
  cardActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  editActionBtn: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
  },
  deleteActionBtn: {
    backgroundColor: '#fee2e2',
    borderColor: '#dc2626',
  },
  cardActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  editActionText: {
    color: '#d97706',
  },
  deleteActionText: {
    color: '#dc2626',
  },
  // Old styles kept for modals and other components
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  requestInfo: {
    flex: 1,
  },
  requestTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  requestId: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  servicesContainer: {
    marginBottom: 16,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  updateBtn: {
    backgroundColor: '#f0f8ff',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  actionBtnText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    maxWidth: 250,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#ffffff',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  modalBody: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#ffffff',
    color: '#1F2937',
    minHeight: 52,
    fontWeight: '500',
  },
  vehicleSelector: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#ffffff',
  },
  vehicleSelectorSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#f8fff8',
  },
  vehicleSelectorContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  vehicleDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  vehicleId: {
    fontSize: 12,
    color: '#999',
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  // Vehicle selector styles
  vehicleOption: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  vehicleOptionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vehicleOptionInfo: {
    flex: 1,
  },
  vehicleOptionName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  vehicleOptionDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  vehicleOptionId: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  vehicleStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  vehicleStatusText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  emptyVehicles: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyVehiclesText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyVehiclesSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  servicesContainer: {
    gap: 8,
  },
  serviceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  serviceOptionActive: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
    shadowColor: '#DC2626',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  serviceOptionText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  serviceOptionTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelBtn: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cancelBtnText: {
    color: '#666',
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: '#DC2626',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // Details Modal Styles
  detailSection: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
  },
  detailSubValue: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: 'row',
  },
  detailBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  detailServicesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  detailServiceTag: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  detailServiceTagText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  // Vehicle selector modal styles
  vehicleSelectorModal: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  vehicleSelectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  vehicleSelectorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
  },
  vehicleList: {
    padding: 16,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  // Enhanced Details Modal Styles
  centeredModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  detailsModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 20,
  },
  detailsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#DC2626',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  detailsModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  detailsCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsScrollView: {
    maxHeight: '75%',
  },
  detailsScrollContent: {
    padding: 20,
  },
  detailsStatusContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  detailsStatusBadge: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 160,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  detailsStatusText: {
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  detailsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  detailsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#f1f3f5',
  },
  detailsCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a1a',
    marginLeft: 10,
    letterSpacing: 0.3,
  },
  detailsInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailsInfoRowColumn: {
    paddingVertical: 8,
  },
  detailsDivider: {
    height: 1,
    backgroundColor: '#f1f3f5',
    marginVertical: 4,
  },
  detailsLabel: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '600',
    flex: 1,
  },
  customerInput: {
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#f8fafc',
  },
  detailsValue: {
    fontSize: 14,
    color: '#212529',
    fontWeight: '600',
    flex: 1.5,
    textAlign: 'right',
  },
  detailsServicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  completedServiceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#28a745',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#28a745',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  completedServiceText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  pendingServiceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#ffc107',
    shadowColor: '#ffc107',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  pendingServiceText: {
    fontSize: 13,
    color: '#856404',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  allServiceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#DC2626',
  },
  allServiceText: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  detailsModalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderTopWidth: 1.5,
    borderTopColor: '#e9ecef',
  },
  detailsCloseButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  detailsCloseButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  // Icon styles for labels
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  servicesLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  notesLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  fieldIcon: {
    marginRight: 4,
  },
  contactActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 10,
  },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  saveCustomerBtn: {
    marginTop: 12,
    backgroundColor: '#16a34a',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveCustomerBtnDisabled: {
    opacity: 0.6,
  },
  saveCustomerText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  emailBtn: {
    backgroundColor: '#2563eb',
  },
  smsBtn: {
    backgroundColor: '#9ca3af',
  },
  contactBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  contactHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
  },
  helperText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
    fontStyle: 'italic',
  },
});
