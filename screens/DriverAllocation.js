//DriverAllocation.js

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Modal, StyleSheet, Alert, ActivityIndicator, Platform, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import { buildApiUrl } from '../constants/api';
import { useTheme } from '../context/ThemeContext';
import ViewShipment from '../components/ViewShipment';
import RouteSelectionModal from '../components/RouteSelectionModal';
import { VEHICLE_MODELS, getUnitNames, getVariationsForUnit } from '../constants/VehicleModels';

const DriverAllocation = () => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [allocations, setAllocations] = useState([]);
  const [newAllocation, setNewAllocation] = useState({
    unitName: '',
    unitId: '',
    bodyColor: '',
    variation: '',
    assignedDriver: '',
    status: 'Pending',
    date: '',
    customerName: '',
    customerEmail: '',
    customerPhone: ''
  });
  const [editAllocation, setEditAllocation] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [drivers, setDrivers] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [agents, setAgents] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const [loading, setLoading] = useState(false);
  const [selectedVin, setSelectedVin] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
  const [vehicleSearchQuery, setVehicleSearchQuery] = useState('');
  const [showDriverDropdown, setShowDriverDropdown] = useState(false);
  const [driverSearchQuery, setDriverSearchQuery] = useState('');
  const [pickupPoint, setPickupPoint] = useState('');
  const [dropoffPoint, setDropoffPoint] = useState('');
  const [isViewShipmentOpen, setIsViewShipmentOpen] = useState(false);
  const [selectedRowData, setSelectedRowData] = useState(null);
  const [isRouteSelectionOpen, setIsRouteSelectionOpen] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [userRole, setUserRole] = useState('');
  const [agentName, setAgentName] = useState('');
  const [userId, setUserId] = useState('');
  const [teamAgents, setTeamAgents] = useState([]); // manager's agents
  const normalizedRole = (userRole || '').toLowerCase();
  const isAgent = normalizedRole === 'sales agent' || normalizedRole === 'manager';
  const isManager = normalizedRole === 'manager';

  useEffect(() => {
    const loadUserContext = async () => {
      try {
        const role = await AsyncStorage.getItem('userRole');
        const name = await AsyncStorage.getItem('accountName') || await AsyncStorage.getItem('userName') || await AsyncStorage.getItem('username') || '';
        const id = await AsyncStorage.getItem('userId') || '';
        if (role) setUserRole(role);
        if (name) setAgentName(name);
        if (id) setUserId(id);
      } catch (err) {
        console.error('Error loading user context for allocations:', err);
      }
    };

    loadUserContext();
    fetchDrivers();
    fetchInventory();
    fetchAgents();
  }, []);

  useEffect(() => {
    const loadTeamAgents = async () => {
      if (!isManager || !userId) return;
      try {
        const res = await axios.get(buildApiUrl('/getUsers'));
        if (res.data?.success && Array.isArray(res.data.data)) {
          const assigned = res.data.data.filter(u => (u.role || '').toLowerCase() === 'sales agent' && u.assignedTo === userId);
          setTeamAgents(assigned.map(u => (u.accountName || '').trim().toLowerCase()).filter(Boolean));
        }
      } catch (err) {
        console.error('Error loading team agents for manager:', err);
        setTeamAgents([]);
      }
    };
    loadTeamAgents();
  }, [isManager, userId]);

  useEffect(() => {
    fetchAllocations();
  }, [userRole, agentName]);

  const fetchAllocations = () => {
    setLoading(true);
    axios.get(buildApiUrl('/getAllocation'))
      .then((res) => {
        console.log('Allocations response:', res.data);
        if (res.data.success && Array.isArray(res.data.data)) {
          const base = res.data.data;
          const normalizedAgent = (agentName || '').trim().toLowerCase();

          if (isAgent) {
            const filtered = base.filter((item) => {
              const assigned = (item.assignedAgent || '').trim().toLowerCase();
              const status = (item.status || '').trim().toLowerCase();
              const isInTransit = ['in transit', 'in-transit', 'intransit'].includes(status);
              const matchesAgent = assigned && (
                assigned === normalizedAgent ||
                assigned.includes(normalizedAgent) ||
                normalizedAgent.includes(assigned) ||
                (isManager && teamAgents.includes(assigned))
              );
              return matchesAgent && isInTransit;
            });
            setAllocations(filtered);
          } else {
            const active = base.filter(item => (item.status || '').trim().toLowerCase() !== 'completed');
            setAllocations(active);
          }
        } else {
          setAllocations([]);
        }
      })
      .catch((err) => {
        console.error('Error fetching allocations:', err);
        setAllocations([]);
      })
      .finally(() => setLoading(false));
  };

  const fetchDrivers = () => {
    axios.get(buildApiUrl('/getUsers'))
      .then((res) => {
        console.log('Users response:', res.data);
        if (res.data.success && Array.isArray(res.data.data)) {
          const driverList = res.data.data.filter(user => user.role === 'Driver');
          setDrivers(driverList);
        } else {
          setDrivers([]);
        }
      })
      .catch((err) => {
        console.error('Error fetching drivers:', err);
        setDrivers([]);
      });
  };

  const fetchInventory = () => {
    axios.get(buildApiUrl('/getStock'))
      .then((res) => {
        console.log('Inventory response:', res.data);
        if (res.data.success && Array.isArray(res.data.data)) {
          setInventory(res.data.data);
        } else {
          setInventory([]);
        }
      })
      .catch((err) => {
        console.error('Error fetching inventory:', err);
        setInventory([]);
      });
  };

  const fetchAgents = () => {
    axios.get(buildApiUrl('/getUsers'))
      .then((res) => {
        console.log('Agents response:', res.data);
        if (res.data.success && Array.isArray(res.data.data)) {
          const agentList = res.data.data.filter(user => user.role === 'Sales Agent');
          setAgents(agentList);
        } else {
          setAgents([]);
        }
      })
      .catch((err) => {
        console.error('Error fetching agents:', err);
        setAgents([]);
      });
  };

  const assignFromStock = async () => {
    if (!selectedVin || !selectedDriver) {
      Alert.alert('Missing Info', 'Please select vehicle and driver.');
      return;
    }

    if (!newAllocation.customerName || !newAllocation.customerEmail) {
      Alert.alert('Missing Customer Info', 'Please provide customer name and email address.');
      return;
    }

    try {
      const selectedVehicle = inventory.find(v => (v.unitId || v._id) === selectedVin);
      if (!selectedVehicle) {
        Alert.alert('Error', 'Selected vehicle not found in inventory.');
        return;
      }

      // Get the selected driver's email for reliable matching
      const selectedDriverData = drivers.find(d => (d.accountName || d.username) === selectedDriver);
      const assignedDriverEmail = selectedDriverData?.email || '';
      
      const allocationPayload = {
        unitName: selectedVehicle.unitName,
        unitId: selectedVehicle.unitId || selectedVehicle._id,
        bodyColor: selectedVehicle.bodyColor,
        variation: selectedVehicle.variation,
        assignedDriver: selectedDriver,
        assignedDriverEmail: assignedDriverEmail, // Store driver email for reliable matching
        status: 'Pending',
        allocatedBy: 'Admin',
        pickupPoint: selectedRoute?.pickup?.name || pickupPoint,
        dropoffPoint: selectedRoute?.dropoff?.name || dropoffPoint,
        pickupCoordinates: selectedRoute?.pickup?.coordinates,
        dropoffCoordinates: selectedRoute?.dropoff?.coordinates,
        routeDistance: selectedRoute?.distance,
        estimatedTime: selectedRoute?.estimatedTime,
        date: new Date().toISOString(),
        customerName: newAllocation.customerName,
        customerEmail: newAllocation.customerEmail,
        customerPhone: newAllocation.customerPhone
      };

      const res = await axios.post(buildApiUrl('/createAllocation'), allocationPayload);

      if (res.data.success) {
        // Status automatically updated to 'Pending' by backend
        Alert.alert('Success', 'Vehicle assigned successfully from stock!');
        setSelectedVin('');
        setSelectedDriver('');
        setPickupPoint('');
        setDropoffPoint('');
        setIsCreateModalOpen(false);
        await Promise.all([fetchAllocations(), fetchInventory()]);
      } else {
        throw new Error(res.data.message || 'Failed to assign vehicle');
      }
    } catch (err) {
      console.error('Assign from stock error:', err);
      Alert.alert('Error', err.message || 'Failed to assign vehicle');
    }
  };

  const handleRouteSelection = (routeData) => {
    setSelectedRoute(routeData);
    setPickupPoint(routeData.pickup.name);
    setDropoffPoint(routeData.dropoff.name);
  };

  const openRouteSelector = () => {
    if (!selectedRoute) {
      setIsRouteSelectionOpen(true);
    } else {
      // If route already selected, ask if they want to change it
      Alert.alert(
        'Change Route?',
        'A route is already selected. Do you want to change it?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Change Route', onPress: () => setIsRouteSelectionOpen(true) }
        ]
      );
    }
  };

  const handleCreate = () => {
    // Validate that route is selected
    if (!selectedRoute && !pickupPoint && !dropoffPoint) {
      Alert.alert('Missing Route', 'Please select pickup and drop-off locations using the route planner.');
      return;
    }

    assignFromStock();
  };

  const handleUpdate = async (id) => {
    if (!editAllocation) return;

    try {
      console.log('Updating allocation:', id, editAllocation);
      const res = await axios.put(buildApiUrl(`/updateAllocation/${id}`), editAllocation);
      
      if (res.data.success) {
        Alert.alert('Success', 'Allocation updated successfully!');
        setEditAllocation(null);
        fetchAllocations();
      } else {
        throw new Error(res.data.message || 'Failed to update');
      }
    } catch (err) {
      console.error('Update error:', err);
      Alert.alert('Error', err.message || 'Failed to update allocation');
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Allocation', 'Are you sure you want to delete this allocation? This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          console.log('Deleting allocation:', id);
          const res = await axios.delete(buildApiUrl(`/deleteAllocation/${id}`));
          
          if (res.data.success) {
            Alert.alert('Success', 'Allocation deleted successfully');
            fetchAllocations();
          } else {
            throw new Error(res.data.message || 'Failed to delete');
          }
        } catch (err) {
          console.error('Delete error:', err);
          Alert.alert('Error', err.message || 'Failed to delete allocation');
        }
      }}
    ]);
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const filteredAllocations = allocations.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    const unitName = (item.unitName || '').toLowerCase();
    const unitId = (item.unitId || '').toLowerCase();
    const assignedDriver = (item.assignedDriver || '').toLowerCase();
    
    return unitName.includes(searchLower) ||
           unitId.includes(searchLower) ||
           assignedDriver.includes(searchLower);
  });
  const currentAllocations = filteredAllocations.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAllocations.length / itemsPerPage);

  const handleRowPress = (item) => {
    setSelectedRowData(item);
    setIsViewShipmentOpen(true);
  };

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return { backgroundColor: '#fef3c7', color: '#92400e' };
      case 'in transit':
        return { backgroundColor: '#dbeafe', color: '#1e40af' };
      case 'delivered':
      case 'completed':
        return { backgroundColor: '#d1fae5', color: '#065f46' };
      default:
        return { backgroundColor: '#f3f4f6', color: '#6b7280' };
    }
  };

  const renderAllocationCard = ({ item, index }) => {
    const statusStyle = getStatusStyle(item.status);

    return (
      <TouchableOpacity 
        style={styles.allocationCard}
        onPress={() => handleRowPress(item)}
        activeOpacity={0.7}
      >
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.cardTitle}>{item.unitName || 'Unknown Vehicle'}</Text>
            <Text style={styles.cardSubtitle}>
              {item.date ? new Date(item.date).toLocaleDateString('en-US', {
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
                <MaterialIcons name="label" size={14} color="#666" style={{ marginRight: 4 }} />
                <Text style={styles.fieldLabel}>Conduction No.</Text>
              </View>
              <Text style={styles.fieldValue}>{item.unitId || 'N/A'}</Text>
            </View>
            <View style={styles.cardField}>
              <View style={styles.fieldLabelRow}>
                <MaterialIcons name="palette" size={14} color="#666" style={{ marginRight: 4 }} />
                <Text style={styles.fieldLabel}>Body Color</Text>
              </View>
              <Text style={styles.fieldValue}>{item.bodyColor || 'N/A'}</Text>
            </View>
          </View>

          <View style={styles.cardRow}>
            <View style={styles.cardField}>
              <View style={styles.fieldLabelRow}>
                <MaterialIcons name="settings" size={14} color="#666" style={{ marginRight: 4 }} />
                <Text style={styles.fieldLabel}>Variation</Text>
              </View>
              <Text style={styles.fieldValue}>{item.variation || 'N/A'}</Text>
            </View>
            <View style={styles.cardField}>
              <View style={styles.fieldLabelRow}>
                <MaterialIcons name="person" size={14} color="#666" style={{ marginRight: 4 }} />
                <Text style={styles.fieldLabel}>Driver</Text>
              </View>
              <Text style={[styles.fieldValue, !item.assignedDriver && styles.unassignedText]}>
                {item.assignedDriver || 'Unassigned'}
              </Text>
            </View>
          </View>

          {/* Route Information */}
          {(item.pickupPoint || item.dropoffPoint) && (
            <View style={styles.routeInfo}>
              <View style={styles.routeLabelRow}>
                <MaterialIcons name="location-on" size={16} color="#666" style={{ marginRight: 4 }} />
                <Text style={styles.routeLabel}>Route</Text>
              </View>
              <View style={styles.routeDetails}>
                {item.pickupPoint && (
                  <Text style={styles.routePoint}>From: {item.pickupPoint}</Text>
                )}
                {item.dropoffPoint && (
                  <Text style={styles.routePoint}>To: {item.dropoffPoint}</Text>
                )}
                {item.routeDistance && (
                  <Text style={styles.routeDistance}>~{item.routeDistance} km</Text>
                )}
              </View>
            </View>
          )}

          {/* Customer Information */}
          {(item.customerName || item.customerEmail) && (
            <View style={styles.customerInfo}>
              <View style={styles.customerLabelRow}>
                <MaterialIcons name="people" size={16} color="#666" style={{ marginRight: 4 }} />
                <Text style={styles.customerLabel}>Customer</Text>
              </View>
              <View style={styles.customerDetails}>
                {item.customerName && (
                  <Text style={styles.customerName}>{item.customerName}</Text>
                )}
                {item.customerEmail && (
                  <Text style={styles.customerEmail}>{item.customerEmail}</Text>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Card Actions */}
        <View style={styles.cardActions}>
          <TouchableOpacity 
            style={styles.cardActionBtn} 
            onPress={(e) => {
              e.stopPropagation();
              handleRowPress(item);
            }}
          >
            <MaterialIcons name="visibility" size={16} color="#2196F3" />
            <Text style={styles.cardActionText}>View Details</Text>
          </TouchableOpacity>
          {!isAgent && (
            <>
              <TouchableOpacity 
                style={[styles.cardActionBtn, styles.editActionBtn]} 
                onPress={(e) => {
                  e.stopPropagation();
                  setEditAllocation(item);
                }}
              >
                <MaterialIcons name="edit" size={16} color="#ff9800" />
                <Text style={[styles.cardActionText, styles.editActionText]}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.cardActionBtn, styles.deleteActionBtn]} 
                onPress={(e) => {
                  e.stopPropagation();
                  handleDelete(item._id);
                }}
              >
                <MaterialIcons name="delete" size={16} color="#dc3545" />
                <Text style={[styles.cardActionText, styles.deleteActionText]}>Delete</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.header}>Driver Allocation</Text>
      
      <View style={styles.topSection}>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by unit name, driver, or ID..."
            value={searchInput}
            onChangeText={setSearchInput}
            placeholderTextColor="#94a3b8"
          />
          <TouchableOpacity 
            style={styles.searchBtn} 
            onPress={() => setSearchTerm(searchInput)}
          >
            <Text style={styles.searchBtnText}>Search</Text>
          </TouchableOpacity>
        </View>
        
        {!isAgent && (
          <TouchableOpacity 
            style={styles.createBtn} 
            onPress={() => setIsCreateModalOpen(true)}
          >
            <Text style={styles.createBtnText}>+ Allocate New Driver</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#dc2626" />
          <Text style={styles.emptyText}>Loading allocations...</Text>
        </View>
      ) : filteredAllocations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No driver allocations found</Text>
          <Text style={styles.emptySubtext}>
            {searchTerm ? 'Try adjusting your search terms' : 'Create your first allocation to get started'}
          </Text>
        </View>
      ) : (
        <View style={styles.cardsContainer}>
          <FlatList
            data={currentAllocations}
            renderItem={renderAllocationCard}
            keyExtractor={item => item._id || Math.random().toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.cardsList}
            scrollEnabled={false}
            nestedScrollEnabled={true}
          />
        </View>
      )}

      {totalPages > 1 && (
        <View style={styles.paginationContainer}>
          <View style={styles.paginationRow}>
            <TouchableOpacity
              style={styles.paginationBtn}
              onPress={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <Text style={[styles.paginationBtnText, currentPage === 1 && { color: '#cbd5e1' }]}>
                ‹
              </Text>
            </TouchableOpacity>
            
            {Array.from({ length: totalPages }, (_, i) => (
              <TouchableOpacity
                key={i + 1}
                style={[
                  styles.paginationBtn, 
                  currentPage === i + 1 && styles.activePage
                ]}
                onPress={() => setCurrentPage(i + 1)}
              >
                <Text style={[
                  styles.paginationBtnText,
                  currentPage === i + 1 && styles.activePageText
                ]}>
                  {i + 1}
                </Text>
              </TouchableOpacity>
            ))}
            
            <TouchableOpacity
              style={styles.paginationBtn}
              onPress={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              <Text style={[styles.paginationBtnText, currentPage === totalPages && { color: '#cbd5e1' }]}>
                ›
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      {/* Create Modal */}
      <Modal visible={isCreateModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Vehicle Assignment</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => {
                  setIsCreateModalOpen(false);
                  setSelectedVin('');
                  setSelectedDriver('');
                  setShowVehicleDropdown(false);
                  setVehicleSearchQuery('');
                  setShowDriverDropdown(false);
                  setDriverSearchQuery('');
                  setPickupPoint('');
                  setDropoffPoint('');
                  setSelectedRoute(null);
                }}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              style={styles.modalScrollView}
              contentContainerStyle={{ paddingBottom: 10 }}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
            >
              <View style={styles.modalForm}>
                  {/* Stock Selection Form */}
                  <View style={styles.formGroup}>
                    <TouchableOpacity
                      style={styles.searchableDropdown}
                      onPress={() => setShowVehicleDropdown(!showVehicleDropdown)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.selectedItemContainer}>
                        {(() => {
                          if (!selectedVin) return <Text style={styles.placeholderText}>Choose Vehicle...</Text>;
                          const unit = inventory.find(v => (v.unitId || v._id) === selectedVin);
                          if (!unit) return <Text style={styles.placeholderText}>Choose Vehicle...</Text>;
                          const label = `${unit.unitName} - ${unit.variation || ''}${unit.bodyColor ? ` (${unit.bodyColor})` : ''}`.trim();
                          return <Text style={styles.selectedAgentText}>{label}</Text>;
                        })()}
                      </View>
                      <MaterialIcons name={showVehicleDropdown ? "arrow-drop-up" : "arrow-drop-down"} size={24} color="#666" />
                    </TouchableOpacity>

                    {showVehicleDropdown && (
                      <View style={styles.dropdownContainer}>
                        <View style={styles.searchContainer}>
                          <MaterialIcons name="search" size={20} color="#999" style={styles.searchIcon} />
                          <TextInput
                            style={styles.searchInput}
                            placeholder="Search vehicles..."
                            value={vehicleSearchQuery}
                            onChangeText={setVehicleSearchQuery}
                          />
                          {vehicleSearchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setVehicleSearchQuery('')}>
                              <MaterialIcons name="close" size={20} color="#999" />
                            </TouchableOpacity>
                          )}
                        </View>

                        <ScrollView style={styles.dropdownList} nestedScrollEnabled>
                          {inventory
                            .filter(item => {
                              const status = item.status || 'In Stockyard';
                              const available = (status === 'In Stockyard' || status === 'Available') && !item.assignedDriver;
                              if (!available) return false;
                              const q = vehicleSearchQuery.toLowerCase();
                              return [item.unitName, item.unitId, item.bodyColor, item.variation]
                                .some(f => (f || '').toLowerCase().includes(q));
                            })
                            .map(item => {
                              const label = `${item.unitName} - ${item.variation || ''}${item.bodyColor ? ` (${item.bodyColor})` : ''}`.trim();
                              const isSelected = selectedVin === (item.unitId || item._id);
                              return (
                                <TouchableOpacity
                                  key={item._id}
                                  style={styles.dropdownItem}
                                  onPress={() => {
                                    setSelectedVin(item.unitId || item._id);
                                    setShowVehicleDropdown(false);
                                    setVehicleSearchQuery('');
                                  }}
                                >
                                  <View style={styles.dropdownItemInfo}>
                                    <Text style={styles.agentName}>{label}</Text>
                                    <Text style={styles.agentRole}>{item.status || 'In Stockyard'}</Text>
                                  </View>
                                  {isSelected && <MaterialIcons name="check-circle" size={22} color="#059669" />}
                                </TouchableOpacity>
                              );
                            })}

                          {inventory.filter(item => {
                            const status = item.status || 'In Stockyard';
                            const available = (status === 'In Stockyard' || status === 'Available') && !item.assignedDriver;
                            if (!available) return false;
                            const q = vehicleSearchQuery.toLowerCase();
                            return [item.unitName, item.unitId, item.bodyColor, item.variation]
                              .some(f => (f || '').toLowerCase().includes(q));
                          }).length === 0 && (
                            <View style={styles.noResultsContainer}>
                              <MaterialIcons name="search-off" size={48} color="#ccc" />
                              <Text style={styles.noResultsText}>No vehicles found</Text>
                            </View>
                          )}
                        </ScrollView>
                      </View>
                    )}
                  </View>

              {/* Driver Selection */}
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Assign Driver</Text>
                <TouchableOpacity
                  style={styles.searchableDropdown}
                  onPress={() => setShowDriverDropdown(!showDriverDropdown)}
                  activeOpacity={0.85}
                >
                  <View style={styles.selectedItemContainer}>
                    {(() => {
                      if (!selectedDriver) return <Text style={styles.placeholderText}>Select Driver...</Text>;
                      const driver = drivers.find(d => (d.username || d.email || d._id) === selectedDriver);
                      const label = driver ? (driver.accountName || driver.username || 'Unknown Driver') : 'Select Driver...';
                      return <Text style={styles.selectedAgentText}>{label}</Text>;
                    })()}
                  </View>
                  <MaterialIcons name={showDriverDropdown ? "arrow-drop-up" : "arrow-drop-down"} size={24} color="#666" />
                </TouchableOpacity>

                {showDriverDropdown && (
                  <View style={styles.dropdownContainer}>
                    <View style={styles.searchContainer}>
                      <MaterialIcons name="search" size={20} color="#999" style={styles.searchIcon} />
                      <TextInput
                        style={styles.searchInput}
                        placeholder="Search drivers..."
                        value={driverSearchQuery}
                        onChangeText={setDriverSearchQuery}
                      />
                      {driverSearchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setDriverSearchQuery('')}>
                          <MaterialIcons name="close" size={20} color="#999" />
                        </TouchableOpacity>
                      )}
                    </View>

                    <ScrollView style={styles.dropdownList} nestedScrollEnabled>
                      {drivers
                        .filter(d => (d.accountName || d.username)
                          && (d.accountName || d.username).toLowerCase().includes(driverSearchQuery.toLowerCase()))
                        .map(d => {
                          const label = d.accountName || d.username || 'Unknown Driver';
                          const value = d.username || d.email || d._id;
                          const isSelected = selectedDriver === value;
                          return (
                            <TouchableOpacity
                              key={d._id}
                              style={styles.dropdownItem}
                              onPress={() => {
                                setSelectedDriver(value);
                                setShowDriverDropdown(false);
                                setDriverSearchQuery('');
                              }}
                            >
                              <View style={styles.dropdownItemInfo}>
                                <Text style={styles.agentName}>{label}</Text>
                                <Text style={styles.agentRole}>{d.email || d.username || ''}</Text>
                              </View>
                              {isSelected && <MaterialIcons name="check-circle" size={22} color="#059669" />}
                            </TouchableOpacity>
                          );
                        })}

                      {drivers.filter(d => (d.accountName || d.username)
                        && (d.accountName || d.username).toLowerCase().includes(driverSearchQuery.toLowerCase())).length === 0 && (
                        <View style={styles.noResultsContainer}>
                          <MaterialIcons name="search-off" size={48} color="#ccc" />
                          <Text style={styles.noResultsText}>No drivers found</Text>
                        </View>
                      )}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Enhanced Route Selection */}
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <MaterialIcons name="alt-route" size={18} color="#1f2937" style={{ marginRight: 8 }} />
                  <Text style={styles.sectionTitle}>Route Planning</Text>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Delivery Route</Text>
                
                {selectedRoute ? (
                  <View style={styles.selectedRouteContainer}>
                    <View style={styles.routeInfoHeader}>
                      <View style={styles.routeInfoTitleRow}>
                        <MaterialIcons name="map" size={18} color="#1f2937" style={{ marginRight: 8 }} />
                        <Text style={styles.routeInfoTitle}>Selected Route</Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.changeRouteButton}
                        onPress={openRouteSelector}
                      >
                        <Text style={styles.changeRouteText}>Change</Text>
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.routeDetails}>
                      <View style={styles.routePoint}>
                        <MaterialIcons name="place" size={18} color="#ef4444" style={styles.routePointIcon} />
                        <Text style={styles.routePointLabel}>Pickup:</Text>
                        <Text style={styles.routePointText}>{selectedRoute.pickup.name}</Text>
                      </View>
                      
                      <View style={styles.routeArrow}>
                        <MaterialIcons name="arrow-downward" size={18} color="#22c55e" style={styles.routeArrowIcon} />
                      </View>
                      
                      <View style={styles.routePoint}>
                        <MaterialIcons name="flag" size={18} color="#16a34a" style={styles.routePointIcon} />
                        <Text style={styles.routePointLabel}>Drop-off:</Text>
                        <Text style={styles.routePointText}>{selectedRoute.dropoff.name}</Text>
                      </View>
                      
                      <View style={styles.routeMetrics}>
                        <View style={styles.routeMetricItem}>
                          <MaterialIcons name="straighten" size={16} color="#22c55e" style={{ marginRight: 6 }} />
                          <Text style={styles.routeMetric}>Distance: {selectedRoute.distance} km</Text>
                        </View>
                        <View style={styles.routeMetricItem}>
                          <MaterialIcons name="schedule" size={16} color="#2563eb" style={{ marginRight: 6 }} />
                          <Text style={styles.routeMetric}>Est. Time: {selectedRoute.estimatedTime} mins</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={styles.selectRouteButton}
                    onPress={openRouteSelector}
                  >
                    <View style={styles.selectRouteIconWrap}>
                      <MaterialIcons name="map" size={28} color="#2563eb" />
                    </View>
                    <View style={styles.selectRouteContent}>
                      <Text style={styles.selectRouteTitle}>Plan Delivery Route</Text>
                      <Text style={styles.selectRouteDescription}>
                        Use interactive map to select pickup and drop-off locations
                      </Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={24} color="#9ca3af" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
            </ScrollView>
            
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.submitBtn} onPress={handleCreate}>
                <Text style={styles.submitBtnText}>Create Assignment</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => {
                setIsCreateModalOpen(false);
                setSelectedVin('');
                setSelectedDriver('');
                setShowVehicleDropdown(false);
                setVehicleSearchQuery('');
                setShowDriverDropdown(false);
                setDriverSearchQuery('');
                setPickupPoint('');
                setDropoffPoint('');
                setSelectedRoute(null);
              }}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Edit Modal */}
      <Modal visible={!!editAllocation} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Edit Allocation</Text>
            {editAllocation && (
              <ScrollView style={styles.modalForm}>
                <Text style={styles.fieldLabel}>Unit Name</Text>
                <Picker
                  selectedValue={editAllocation.unitName || ''}
                  style={styles.input}
                  onValueChange={itemValue => {
                    setEditAllocation({ 
                      ...editAllocation, 
                      unitName: itemValue,
                      variation: '' // Reset variation when unit name changes
                    });
                  }}
                >
                  <Picker.Item label="Select Unit Name" value="" />
                  {getUnitNames().map((unitName) => (
                    <Picker.Item key={unitName} label={unitName} value={unitName} />
                  ))}
                </Picker>

                <Text style={styles.fieldLabel}>Unit ID (Conduction Number)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter Unit ID"
                  value={editAllocation.unitId || ''}
                  onChangeText={text => setEditAllocation({ ...editAllocation, unitId: text })}
                />

                <Text style={styles.fieldLabel}>Body Color</Text>
                <Picker
                  selectedValue={editAllocation.bodyColor || ''}
                  style={styles.input}
                  onValueChange={itemValue => setEditAllocation({ ...editAllocation, bodyColor: itemValue })}
                >
                  <Picker.Item label="Select Color" value="" />
                  <Picker.Item label="White" value="White" />
                  <Picker.Item label="Black" value="Black" />
                  <Picker.Item label="Silver" value="Silver" />
                  <Picker.Item label="Gray" value="Gray" />
                  <Picker.Item label="Red" value="Red" />
                  <Picker.Item label="Blue" value="Blue" />
                  <Picker.Item label="Orange" value="Orange" />
                  <Picker.Item label="Green" value="Green" />
                  <Picker.Item label="Yellow" value="Yellow" />
                  <Picker.Item label="Brown" value="Brown" />
                </Picker>

                <Text style={styles.fieldLabel}>Variation</Text>
                <Picker
                  selectedValue={editAllocation.variation || ''}
                  style={styles.input}
                  onValueChange={itemValue => setEditAllocation({ ...editAllocation, variation: itemValue })}
                  enabled={!!editAllocation.unitName}
                >
                  <Picker.Item 
                    label={editAllocation.unitName ? "Select Variation" : "First select Unit Name"} 
                    value="" 
                  />
                  {editAllocation.unitName && getVariationsForUnit(editAllocation.unitName).map((variation) => (
                    <Picker.Item key={variation} label={variation} value={variation} />
                  ))}
                </Picker>

                <Text style={styles.fieldLabel}>Assigned Driver</Text>
                <Picker
                  selectedValue={editAllocation.assignedDriver || ''}
                  style={styles.input}
                  onValueChange={itemValue => setEditAllocation({ ...editAllocation, assignedDriver: itemValue })}
                >
                  <Picker.Item label="Select Driver" value="" />
                  {drivers.map(driver => (
                    <Picker.Item key={driver._id} label={driver.accountName || driver.name || driver.username} value={driver.accountName || driver.name || driver.username} />
                  ))}
                </Picker>

                <Text style={styles.fieldLabel}>Status</Text>
                <Picker
                  selectedValue={editAllocation.status || 'Pending'}
                  style={styles.input}
                  onValueChange={itemValue => setEditAllocation({ ...editAllocation, status: itemValue })}
                >
                  <Picker.Item label="Pending" value="Pending" />
                  <Picker.Item label="Assigned" value="Assigned" />
                  <Picker.Item label="In Transit" value="In Transit" />
                  <Picker.Item label="Delivered" value="Delivered" />
                  <Picker.Item label="Completed" value="Completed" />
                </Picker>
              </ScrollView>
            )}
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.createBtn} onPress={() => handleUpdate(editAllocation._id)}>
                <Text style={styles.createBtnText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditAllocation(null)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* View Shipment Modal */}
      <ViewShipment
        isOpen={isViewShipmentOpen}
        onClose={() => setIsViewShipmentOpen(false)}
        data={{
          ...selectedRowData,
          onRefresh: fetchAllocations,
          onClear: (id) => setAllocations(prev => prev.filter(item => item._id !== id))
        }}
      />

      {/* Route Selection Modal */}
      <RouteSelectionModal
        isVisible={isRouteSelectionOpen}
        onClose={() => setIsRouteSelectionOpen(false)}
        onRouteSelect={handleRouteSelection}
        title="Plan Delivery Route"
        initialPickup={selectedRoute?.pickup}
        initialDropoff={selectedRoute?.dropoff}
      />
    </ScrollView>
  );
};

const createStyles = (theme) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: theme.surface, 
    paddingTop: 20 
  },
  header: { 
    fontSize: 28, 
    fontWeight: '700', 
    color: theme.text, 
    marginBottom: 24, 
    textAlign: 'center',
    letterSpacing: 0.5
  },
  
  // Search and Actions Section
  topSection: {
    backgroundColor: theme.card,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3
  },
  searchRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 16 
  },
  searchInput: { 
    flex: 1, 
    backgroundColor: '#f8fafc',
    borderWidth: 1, 
    borderColor: '#cbd5e1', 
    borderRadius: 10, 
    padding: 12, 
    marginRight: 12,
    fontSize: 14,
    color: '#334155'
  },
  searchBtn: { 
    backgroundColor: '#dc2626', 
    paddingHorizontal: 20,
    paddingVertical: 12, 
    borderRadius: 10,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2
  },
  searchBtnText: { 
    color: '#fff', 
    fontWeight: '600',
    fontSize: 14
  },
  createBtn: { 
    backgroundColor: '#dc2626', 
    paddingHorizontal: 24,
    paddingVertical: 12, 
    borderRadius: 10,
    marginTop: 12,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  createBtnText: { 
    color: '#fff', 
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center'
  },

  // Modern Card-based Design
  cardsContainer: {
    flex: 1,
    marginHorizontal: 16,
  },
  cardsList: {
    paddingBottom: 20,
  },
  allocationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 18,
    paddingBottom: 14,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  cardHeaderLeft: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 75,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  cardBody: {
    padding: 20,
    paddingTop: 16,
  },
  cardRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 16,
  },
  cardField: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  unassignedText: {
    color: '#ef4444',
    fontStyle: 'italic',
  },
  routeInfo: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#6b7280',
  },
  routeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  routeDetails: {
    gap: 4,
  },
  routePoint: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  routeDistance: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
    fontStyle: 'italic',
  },
  customerInfo: {
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#dc2626',
  },
  customerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7f1d1d',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  customerDetails: {
    gap: 2,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
  },
  customerEmail: {
    fontSize: 13,
    color: '#a16207',
  },
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  cardActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
  },
  cardActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  editActionBtn: {
    backgroundColor: '#f3f4f6',
  },
  editActionText: {
    color: '#374151',
  },
  deleteActionBtn: {
    backgroundColor: '#fef2f2',
    borderRightWidth: 0,
  },
  deleteActionText: {
    color: '#991b1b',
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  routeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  customerLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  // Pagination
  paginationContainer: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 20,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2
  },
  paginationRow: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center',
    gap: 8
  },
  paginationBtn: { 
    paddingHorizontal: 10,
    paddingVertical: 8, 
    borderRadius: 8, 
    backgroundColor: '#f1f5f9',
    minWidth: 36,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  paginationBtnText: { 
    color: '#64748b', 
    fontWeight: '600',
    fontSize: 14
  },
  activePage: { 
    backgroundColor: '#dc2626',
    borderColor: '#dc2626'
  },
  activePageText: {
    color: '#fff'
  },

  // Modal Styles
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center', 
    alignItems: 'center',
    padding: 20
  },
  modal: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 24, 
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { 
    fontSize: 24, 
    fontWeight: '700', 
    color: '#1e293b', 
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#64748b',
    fontWeight: '600',
  },
  modalScrollView: {
    maxHeight: 500,
  },
  modalForm: {
    paddingBottom: 24,
  },
  
  // Mode Selector
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#dc2626',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  modeButtonTextActive: {
    color: '#ffffff',
  },

  // Form Styles
  formGroup: {
    marginBottom: 16
  },
  sectionHeader: {
    marginTop: 20,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6
  },
  input: { 
    backgroundColor: '#f9fafb',
    borderWidth: 1.5, 
    borderColor: '#d1d5db', 
    borderRadius: 10, 
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    minHeight: 52
  },
  picker: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10
  },

  // Location Selection Styles
  locationButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  quickLocationBtn: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectedLocationBtn: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626',
  },
  quickLocationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  selectedLocationText: {
    color: '#ffffff',
  },

  // Enhanced Route Selection Styles
  selectedRouteContainer: {
    backgroundColor: '#f0fdf4',
    borderWidth: 2,
    borderColor: '#22c55e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  routeInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  routeInfoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeInfoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  changeRouteButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  changeRouteText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  routeDetails: {
    gap: 8,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
    borderRadius: 8,
  },
  routePointIcon: {
    marginRight: 8,
  },
  routePointLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    minWidth: 80,
  },
  routePointText: {
    fontSize: 14,
    color: '#1f2937',
    flex: 1,
    marginLeft: 8,
  },
  routeArrow: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  routeArrowIcon: {
    marginVertical: 2,
  },
  routeMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 12,
  // Dropdowns (vehicle/driver)
  searchableDropdown: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  selectedItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  placeholderText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  dropdownContainer: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    backgroundColor: '#fff',
    marginTop: 6,
    maxHeight: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchIcon: {
    marginRight: 4,
  },
  dropdownList: {
    maxHeight: 260,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 12,
  },
  dropdownItemInfo: {
    flex: 1,
  },
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  noResultsText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
  },
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  routeMetricItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeMetric: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  selectRouteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  selectRouteIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  selectRouteContent: {
    flex: 1,
  },
  selectRouteTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  selectRouteDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  orDivider: {
    textAlign: 'center',
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '600',
    marginVertical: 20,
  },
  legacyLocationContainer: {
    padding: 16,
    backgroundColor: '#fafafa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  
  modalBtnRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 24 
  },
  cancelBtn: { 
    backgroundColor: '#f3f4f6', 
    paddingVertical: 14,
    paddingHorizontal: 24, 
    borderRadius: 10,
    flex: 1
  },
  cancelBtnText: { 
    color: '#6b7280', 
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 16
  },
  submitBtn: {
    backgroundColor: '#dc2626',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    flex: 1
  },
  submitBtnText: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 16
  },

  // Loading and Empty States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40
  },
  emptyText: {
    fontSize: 18,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 16
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 8
  }
});

export default DriverAllocation;
