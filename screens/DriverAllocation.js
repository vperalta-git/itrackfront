//DriverAllocation.js

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Modal, StyleSheet, Alert, ActivityIndicator, Platform, ScrollView } from 'react-native';
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
  const [pickupPoint, setPickupPoint] = useState('');
  const [dropoffPoint, setDropoffPoint] = useState('');
  const [isViewShipmentOpen, setIsViewShipmentOpen] = useState(false);
  const [selectedRowData, setSelectedRowData] = useState(null);
  const [isRouteSelectionOpen, setIsRouteSelectionOpen] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);

  useEffect(() => {
    fetchAllocations();
    fetchDrivers();
    fetchInventory();
    fetchAgents();
  }, []);

  const fetchAllocations = () => {
    setLoading(true);
    axios.get(buildApiUrl('/getAllocation'))
      .then((res) => {
        console.log('Allocations response:', res.data);
        if (res.data.success && Array.isArray(res.data.data)) {
          setAllocations(res.data.data);
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
              <Text style={styles.fieldLabel}>🏷️ Conduction No.</Text>
              <Text style={styles.fieldValue}>{item.unitId || 'N/A'}</Text>
            </View>
            <View style={styles.cardField}>
              <Text style={styles.fieldLabel}>🎨 Body Color</Text>
              <Text style={styles.fieldValue}>{item.bodyColor || 'N/A'}</Text>
            </View>
          </View>

          <View style={styles.cardRow}>
            <View style={styles.cardField}>
              <Text style={styles.fieldLabel}>⚙️ Variation</Text>
              <Text style={styles.fieldValue}>{item.variation || 'N/A'}</Text>
            </View>
            <View style={styles.cardField}>
              <Text style={styles.fieldLabel}>👤 Driver</Text>
              <Text style={[styles.fieldValue, !item.assignedDriver && styles.unassignedText]}>
                {item.assignedDriver || 'Unassigned'}
              </Text>
            </View>
          </View>

          {/* Route Information */}
          {(item.pickupPoint || item.dropoffPoint) && (
            <View style={styles.routeInfo}>
              <Text style={styles.routeLabel}>📍 Route</Text>
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
              <Text style={styles.customerLabel}>👥 Customer</Text>
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
            <Text style={styles.cardActionText}>📋 View Details</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.cardActionBtn, styles.editActionBtn]} 
            onPress={(e) => {
              e.stopPropagation();
              setEditAllocation(item);
            }}
          >
            <Text style={[styles.cardActionText, styles.editActionText]}>✏️ Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.cardActionBtn, styles.deleteActionBtn]} 
            onPress={(e) => {
              e.stopPropagation();
              handleDelete(item._id);
            }}
          >
            <Text style={[styles.cardActionText, styles.deleteActionText]}>🗑️ Delete</Text>
          </TouchableOpacity>
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
        
        <TouchableOpacity 
          style={styles.createBtn} 
          onPress={() => setIsCreateModalOpen(true)}
        >
          <Text style={styles.createBtnText}>+ Allocate New Driver</Text>
        </TouchableOpacity>
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
                    <Text style={styles.inputLabel}>Select Vehicle from Stock</Text>
                    <Picker
                      selectedValue={selectedVin}
                      style={styles.picker}
                      onValueChange={val => setSelectedVin(val)}
                    >
                      <Picker.Item label="Choose Vehicle..." value="" />
                      {inventory.filter(item => {
                        const status = item.status || 'In Stockyard';
                        // Only show vehicles that are not already allocated
                        return (status === 'In Stockyard' || status === 'Available') && !item.assignedDriver;
                      }).map(v => (
                        <Picker.Item 
                          key={v._id} 
                          label={`${v.unitName} - ${v.variation} (${v.bodyColor}) - ${v.status || 'In Stockyard'}`} 
                          value={v.unitId || v._id} 
                        />
                      ))}
                    </Picker>
                  </View>

              {/* Driver Selection */}
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Assign Driver</Text>
                <Picker
                  selectedValue={selectedDriver}
                  style={styles.picker}
                  onValueChange={val => setSelectedDriver(val)}
                >
                  <Picker.Item label="Select Driver..." value="" />
                  {drivers
                    .filter(d => d.accountName || d.username)
                    .map(d => (
                      <Picker.Item 
                        key={d._id} 
                        label={d.accountName || d.username || 'Unknown Driver'} 
                        value={d.username || d.email || d._id} 
                      />
                    ))}
                </Picker>
              </View>

              {/* Enhanced Route Selection */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>📍 Route Planning</Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Delivery Route</Text>
                
                {selectedRoute ? (
                  <View style={styles.selectedRouteContainer}>
                    <View style={styles.routeInfoHeader}>
                      <Text style={styles.routeInfoTitle}>📊 Selected Route</Text>
                      <TouchableOpacity 
                        style={styles.changeRouteButton}
                        onPress={openRouteSelector}
                      >
                        <Text style={styles.changeRouteText}>Change</Text>
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.routeDetails}>
                      <View style={styles.routePoint}>
                        <Text style={styles.routePointLabel}>📍 Pickup:</Text>
                        <Text style={styles.routePointText}>{selectedRoute.pickup.name}</Text>
                      </View>
                      
                      <View style={styles.routeArrow}>
                        <Text style={styles.routeArrowText}>↓</Text>
                      </View>
                      
                      <View style={styles.routePoint}>
                        <Text style={styles.routePointLabel}>🎯 Drop-off:</Text>
                        <Text style={styles.routePointText}>{selectedRoute.dropoff.name}</Text>
                      </View>
                      
                      <View style={styles.routeMetrics}>
                        <Text style={styles.routeMetric}>
                          📏 Distance: {selectedRoute.distance} km
                        </Text>
                        <Text style={styles.routeMetric}>
                          ⏱️ Est. Time: {selectedRoute.estimatedTime} mins
                        </Text>
                      </View>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={styles.selectRouteButton}
                    onPress={openRouteSelector}
                  >
                    <Text style={styles.selectRouteIcon}>🗺️</Text>
                    <View style={styles.selectRouteContent}>
                      <Text style={styles.selectRouteTitle}>Plan Delivery Route</Text>
                      <Text style={styles.selectRouteDescription}>
                        Use interactive map to select pickup and drop-off locations
                      </Text>
                    </View>
                    <Text style={styles.selectRouteArrow}>›</Text>
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
        data={{...selectedRowData, onRefresh: fetchAllocations}}
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
    backgroundColor: '#f1f5f9',
    borderWidth: 1, 
    borderColor: '#e2e8f0', 
    borderRadius: 10, 
    padding: 14, 
    marginRight: 12,
    fontSize: 16,
    color: '#334155'
  },
  searchBtn: { 
    backgroundColor: '#dc2626', 
    paddingHorizontal: 20,
    paddingVertical: 14, 
    borderRadius: 10,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2
  },
  searchBtnText: { 
    color: '#fff', 
    fontWeight: '600',
    fontSize: 16
  },
  createBtn: { 
    backgroundColor: '#059669', 
    paddingHorizontal: 20,
    paddingVertical: 14, 
    borderRadius: 10,
    marginTop: 8,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2
  },
  createBtnText: { 
    color: '#fff', 
    fontWeight: '600',
    fontSize: 16,
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
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingBottom: 16,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#22c55e',
  },
  routeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  customerLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#d97706',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
  },
  cardActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  editActionBtn: {
    backgroundColor: '#eff6ff',
  },
  editActionText: {
    color: '#2563eb',
  },
  deleteActionBtn: {
    backgroundColor: '#fef2f2',
    borderRightWidth: 0,
  },
  deleteActionText: {
    color: '#dc2626',
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
    paddingHorizontal: 12,
    paddingVertical: 8, 
    borderRadius: 8, 
    backgroundColor: '#f1f5f9',
    minWidth: 40,
    alignItems: 'center'
  },
  paginationBtnText: { 
    color: '#64748b', 
    fontWeight: '600'
  },
  activePage: { 
    backgroundColor: '#dc2626' 
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
  routeArrowText: {
    fontSize: 18,
    color: '#22c55e',
    fontWeight: 'bold',
  },
  routeMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
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
  selectRouteIcon: {
    fontSize: 32,
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
  selectRouteArrow: {
    fontSize: 24,
    color: '#9ca3af',
    fontWeight: 'bold',
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
