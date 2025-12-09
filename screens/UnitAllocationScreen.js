import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
  ActivityIndicator,
  Image,
  TextInput,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';

export default function UnitAllocationScreen() {
  const [allocations, setAllocations] = useState([]);
  const [agents, setAgents] = useState([]);
  const [availableUnits, setAvailableUnits] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAllocation, setNewAllocation] = useState({
    unitName: "",
    unitId: "",
    bodyColor: "",
    variation: "",
    assignedTo: "" 
  });
  const [editAllocation, setEditAllocation] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [agentSearchQuery, setAgentSearchQuery] = useState('');
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const itemsPerPage = 6;

  useEffect(() => {
    fetchAllocations();
    fetchAgents();
    fetchAvailableUnits();
  }, []);

  // GET all allocations
  const fetchAllocations = () => {
    setLoading(true);
    axios.get("https://itrack-backend-1.onrender.com/api/getUnitAllocation")
      .then(res => {
        console.log('Allocations:', res.data);
        setAllocations(res.data);
      })
      .catch(err => {
        console.error('Fetch allocations error:', err.response?.data || err.message);
        Alert.alert('Error', `Failed to load allocations: ${err.response?.data?.message || err.message}`);
      })
      .finally(() => setLoading(false));
  };

  // GET all Sales Agents
  const fetchAgents = () => {
    axios.get("https://itrack-backend-1.onrender.com/api/getUsers")
      .then(res => {
        console.log('📊 All users:', res.data.map(u => ({ name: u.name, role: u.role })));
        const agentList = res.data.filter(u => {
          const role = u.role?.toLowerCase() || '';
          return role === "sales agent" || role === "sales" || role === "agent" || role === "salesagent";
        });
        setAgents(agentList);
        console.log(`📊 Loaded ${agentList.length} sales agents:`, agentList.map(a => a.name));
        if (agentList.length === 0) {
          console.warn('⚠️ No sales agents found. Check user roles in database.');
        }
      })
      .catch(err => {
        console.error('Fetch agents error:', err.response?.data || err.message);
        Alert.alert('Error', 'Failed to load sales agents');
      });
  };

  // GET available units from inventory
  const fetchAvailableUnits = () => {
    axios.get("https://itrack-backend-1.onrender.com/api/getStock")
      .then(res => {
        const units = res.data.filter(u =>
          u.status === "In Stockyard" || u.status === "Available"
        );
        setAvailableUnits(units);
        console.log(`📦 Loaded ${units.length} available units`);
      })
      .catch(err => {
        console.error('Fetch units error:', err.response?.data || err.message);
      });
  };

  // CREATE allocation
  const handleCreateAllocation = () => {
    if (!newAllocation.unitId || !newAllocation.assignedTo) {
      Alert.alert("Error", "All fields are required!");
      return;
    }

    axios.post("https://itrack-backend-1.onrender.com/api/createUnitAllocation", newAllocation)
      .then(() => {
        fetchAllocations();
        fetchAvailableUnits(); // Refresh available units
        setNewAllocation({
          unitName: "",
          unitId: "",
          bodyColor: "",
          variation: "",
          assignedTo: ""
        });
        setIsModalOpen(false);
        setCurrentPage(1);
        Alert.alert("Success", "Unit allocated successfully!");
      })
      .catch(err => {
        console.error('Create allocation error:', err.response?.data || err.message);
        Alert.alert("Error", `Failed to allocate unit: ${err.response?.data?.message || err.message}`);
      });
  };

  // UPDATE allocation
  const handleUpdateAllocation = (id) => {
    axios.put(`https://itrack-backend-1.onrender.com/api/updateUnitAllocation/${id}`, editAllocation)
      .then(() => {
        fetchAllocations();
        setEditAllocation(null);
        Alert.alert("Success", "Allocation updated successfully!");
      })
      .catch(err => {
        console.error(err);
        Alert.alert("Error", "Failed to update allocation");
      });
  };

  // DELETE allocation
  const handleDeleteAllocation = (id) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this allocation?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            axios.delete(`https://itrack-backend-1.onrender.com/api/deleteUnitAllocation/${id}`)
              .then(() => {
                fetchAllocations();
                fetchAvailableUnits(); // Refresh available units
                setCurrentPage(1);
                Alert.alert("Success", "Allocation deleted successfully!");
              })
              .catch(err => {
                console.error(err);
                Alert.alert("Error", "Failed to delete allocation");
              });
          }
        }
      ]
    );
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentAllocations = allocations.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(allocations.length / itemsPerPage);

  const renderAllocationCard = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.unitName}</Text>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>🏷️ Conduction #:</Text>
          <Text style={styles.infoValue}>{item.unitId}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>🎨 Color:</Text>
          <Text style={styles.infoValue}>{item.bodyColor}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>⚙️ Variation:</Text>
          <Text style={styles.infoValue}>{item.variation}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>👤 Assigned To:</Text>
          <Text style={styles.infoValue}>{item.assignedTo}</Text>
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => setEditAllocation(item)}
        >
          <Text style={styles.actionButtonText}>✏️ Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteAllocation(item._id)}
        >
          <Text style={styles.actionButtonText}>🗑️ Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.header}>Unit Allocation</Text>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={[styles.summaryCard, { backgroundColor: '#DC2626' }]}>
          <Text style={styles.summaryNumber}>{allocations.length}</Text>
          <Text style={styles.summaryLabel}>Total Allocations</Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: '#059669' }]}>
          <Text style={styles.summaryNumber}>{availableUnits.length}</Text>
          <Text style={styles.summaryLabel}>Available Units</Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: '#2563EB' }]}>
          <Text style={styles.summaryNumber}>{agents.length}</Text>
          <Text style={styles.summaryLabel}>Active Agents</Text>
        </View>
      </View>

      {/* Add Button */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setIsModalOpen(true)}
        >
          <Text style={styles.addButtonText}>+ Allocate Unit</Text>
        </TouchableOpacity>
      </View>

      {/* Allocations List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#DC2626" />
          <Text style={styles.loadingText}>Loading allocations...</Text>
        </View>
      ) : allocations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No allocations found</Text>
          <Text style={styles.emptySubtext}>Start by allocating units to sales agents</Text>
        </View>
      ) : (
        <>
          <FlatList
            data={currentAllocations}
            renderItem={renderAllocationCard}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContainer}
            scrollEnabled={false}
            nestedScrollEnabled={true}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <View style={styles.paginationContainer}>
              <TouchableOpacity
                style={[styles.paginationBtn, currentPage === 1 && styles.disabledBtn]}
                onPress={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <Text style={styles.paginationText}>‹</Text>
              </TouchableOpacity>

              {Array.from({ length: totalPages }, (_, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.paginationBtn,
                    currentPage === i + 1 && styles.activePage
                  ]}
                  onPress={() => setCurrentPage(i + 1)}
                >
                  <Text style={[
                    styles.paginationText,
                    currentPage === i + 1 && styles.activePageText
                  ]}>
                    {i + 1}
                  </Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={[styles.paginationBtn, currentPage === totalPages && styles.disabledBtn]}
                onPress={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <Text style={styles.paginationText}>›</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {/* Create/Edit Modal */}
      <Modal
        visible={isModalOpen || !!editAllocation}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setIsModalOpen(false);
          setEditAllocation(null);
          setAgentSearchQuery('');
          setShowAgentDropdown(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isModalOpen ? "Allocate Unit" : "Edit Allocation"}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setIsModalOpen(false);
                  setEditAllocation(null);
                  setAgentSearchQuery('');
                  setShowAgentDropdown(false);
                }}
              >
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Select Unit */}
              <Text style={styles.inputLabel}>
                Unit <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={isModalOpen ? newAllocation.unitId : editAllocation?.unitId}
                  onValueChange={(value) => {
                    const selectedUnit = availableUnits.find(u => u.unitId === value);
                    if (selectedUnit) {
                      if (isModalOpen) {
                        setNewAllocation({
                          ...newAllocation,
                          unitName: selectedUnit.unitName,
                          unitId: selectedUnit.unitId,
                          bodyColor: selectedUnit.bodyColor,
                          variation: selectedUnit.variation,
                        });
                      } else {
                        setEditAllocation({
                          ...editAllocation,
                          unitName: selectedUnit.unitName,
                          unitId: selectedUnit.unitId,
                          bodyColor: selectedUnit.bodyColor,
                          variation: selectedUnit.variation,
                        });
                      }
                    }
                  }}
                  style={styles.picker}
                >
                  <Picker.Item label="Select Unit" value="" />
                  {availableUnits.map(unit => (
                    <Picker.Item
                      key={unit._id}
                      label={`${unit.unitName} - ${unit.unitId} (${unit.bodyColor})`}
                      value={unit.unitId}
                    />
                  ))}
                </Picker>
              </View>

              {/* Assign To - Searchable with Profile Pictures */}
              <Text style={styles.inputLabel}>
                Assign To <Text style={styles.required}>*</Text>
              </Text>
              {agents.length === 0 ? (
                <View style={styles.noAgentsWarning}>
                  <MaterialIcons name="warning" size={24} color="#f59e0b" />
                  <Text style={styles.noAgentsText}>No sales agents available. Please add sales agents first.</Text>
                </View>
              ) : (
                <View>
                <TouchableOpacity
                  style={styles.searchableDropdown}
                  onPress={() => setShowAgentDropdown(!showAgentDropdown)}
                >
                  <View style={styles.selectedAgentContainer}>
                    {(isModalOpen ? newAllocation.assignedTo : editAllocation?.assignedTo) ? (
                      <>
                        {(() => {
                          const selectedAgent = agents.find(a => a.name === (isModalOpen ? newAllocation.assignedTo : editAllocation?.assignedTo));
                          return selectedAgent ? (
                            <>
                              {selectedAgent.picture ? (
                                <Image source={{ uri: selectedAgent.picture }} style={styles.smallProfilePic} />
                              ) : (
                                <View style={styles.smallProfilePlaceholder}>
                                  <MaterialIcons name="person" size={16} color="#999" />
                                </View>
                              )}
                              <Text style={styles.selectedAgentText}>{selectedAgent.name}</Text>
                            </>
                          ) : (
                            <Text style={styles.placeholderText}>Select Sales Agent</Text>
                          );
                        })()}
                      </>
                    ) : (
                      <Text style={styles.placeholderText}>Select Sales Agent</Text>
                    )}
                  </View>
                  <MaterialIcons name={showAgentDropdown ? "arrow-drop-up" : "arrow-drop-down"} size={24} color="#666" />
                </TouchableOpacity>

                {showAgentDropdown && (
                  <View style={styles.dropdownContainer}>
                    <View style={styles.searchContainer}>
                      <MaterialIcons name="search" size={20} color="#999" style={styles.searchIcon} />
                      <TextInput
                        style={styles.searchInput}
                        placeholder="Search agents..."
                        value={agentSearchQuery}
                        onChangeText={setAgentSearchQuery}
                      />
                      {agentSearchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setAgentSearchQuery('')}>
                          <MaterialIcons name="close" size={20} color="#999" />
                        </TouchableOpacity>
                      )}
                    </View>

                    <ScrollView style={styles.agentList} nestedScrollEnabled>
                      {agents
                        .filter(agent => 
                          agent.name && agent.name.toLowerCase().includes(agentSearchQuery.toLowerCase())
                        )
                        .map(agent => (
                          <TouchableOpacity
                            key={agent._id}
                            style={styles.agentItem}
                            onPress={() => {
                              if (isModalOpen) {
                                setNewAllocation({ ...newAllocation, assignedTo: agent.name });
                              } else {
                                setEditAllocation({ ...editAllocation, assignedTo: agent.name });
                              }
                              setShowAgentDropdown(false);
                              setAgentSearchQuery('');
                            }}
                          >
                            {agent.picture ? (
                              <Image source={{ uri: agent.picture }} style={styles.agentProfilePic} />
                            ) : (
                              <View style={styles.agentProfilePlaceholder}>
                                <MaterialIcons name="person" size={24} color="#999" />
                              </View>
                            )}
                            <View style={styles.agentInfo}>
                              <Text style={styles.agentName}>{agent.name}</Text>
                              <Text style={styles.agentRole}>Sales Agent</Text>
                            </View>
                            {(isModalOpen ? newAllocation.assignedTo : editAllocation?.assignedTo) === agent.name && (
                              <MaterialIcons name="check-circle" size={24} color="#059669" />
                            )}
                          </TouchableOpacity>
                        ))}
                      {agents.filter(agent => 
                        agent.name && agent.name.toLowerCase().includes(agentSearchQuery.toLowerCase())
                      ).length === 0 && (
                        <View style={styles.noResultsContainer}>
                          <MaterialIcons name="search-off" size={48} color="#ccc" />
                          <Text style={styles.noResultsText}>No agents found</Text>
                        </View>
                      )}
                    </ScrollView>
                  </View>
                )}
              </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={() => {
                  if (isModalOpen) {
                    handleCreateAllocation();
                  } else {
                    handleUpdateAllocation(editAllocation._id);
                  }
                }}
              >
                <Text style={styles.confirmButtonText}>
                  {isModalOpen ? "Allocate" : "Save"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setIsModalOpen(false);
                  setEditAllocation(null);
                  setAgentSearchQuery('');
                  setShowAgentDropdown(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginBottom: 24,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
    textAlign: 'center',
  },
  actionBar: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
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
    padding: 20,
    paddingBottom: 16,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  cardBody: {
    padding: 20,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    width: 150,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    flex: 1,
  },
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
  },
  editButton: {
    backgroundColor: '#eff6ff',
  },
  deleteButton: {
    backgroundColor: '#fef2f2',
    borderRightWidth: 0,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    gap: 8,
  },
  paginationBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    minWidth: 40,
    alignItems: 'center',
  },
  disabledBtn: {
    opacity: 0.5,
  },
  activePage: {
    backgroundColor: '#DC2626',
  },
  paginationText: {
    color: '#64748b',
    fontWeight: '600',
    fontSize: 14,
  },
  activePageText: {
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 450,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fafafa',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: 0.3,
  },
  closeButton: {
    fontSize: 30,
    color: '#9ca3af',
    fontWeight: '300',
    width: 36,
    height: 36,
    textAlign: 'center',
    lineHeight: 36,
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 12,
  },
  required: {
    color: '#DC2626',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    backgroundColor: '#f9fafb',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fafafa',
  },
  modalButton: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmButton: {
    backgroundColor: '#DC2626',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  // Searchable Dropdown Styles
  searchableDropdown: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    backgroundColor: '#f9fafb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 50,
  },
  selectedAgentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  smallProfilePic: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  smallProfilePlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedAgentText: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
  },
  placeholderText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  dropdownContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    marginTop: 4,
    maxHeight: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1f2937',
    padding: 0,
  },
  agentList: {
    maxHeight: 240,
  },
  agentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  agentProfilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  agentProfilePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  agentInfo: {
    flex: 1,
  },
  agentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  agentRole: {
    fontSize: 12,
    color: '#6b7280',
  },
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  noResultsText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
  },
  noAgentsWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fbbf24',
    borderRadius: 10,
    padding: 16,
    gap: 12,
  },
  noAgentsText: {
    flex: 1,
    fontSize: 13,
    color: '#92400e',
    lineHeight: 18,
  },
});
