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
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
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
  const itemsPerPage = 6;

  useEffect(() => {
    fetchAllocations();
    fetchAgents();
    fetchAvailableUnits();
  }, []);

  // GET all allocations
  const fetchAllocations = () => {
    setLoading(true);
    axios.get("https://itrack-web-backend.onrender.com/api/getUnitAllocation")
      .then(res => {
        console.log('Allocations:', res.data);
        setAllocations(res.data);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  // GET all Sales Agents
  const fetchAgents = () => {
    axios.get("https://itrack-web-backend.onrender.com/api/getUsers")
      .then(res => {
        const agentList = res.data.filter(u => u.role?.toLowerCase() === "sales agent");
        setAgents(agentList);
      })
      .catch(err => console.error(err));
  };

  // GET available units from inventory
  const fetchAvailableUnits = () => {
    axios.get("https://itrack-web-backend.onrender.com/api/getStock")
      .then(res => {
        const units = res.data.filter(u =>
          u.status === "In Stockyard" || u.status === "Available"
        );
        setAvailableUnits(units);
      })
      .catch(err => console.error(err));
  };

  // CREATE allocation
  const handleCreateAllocation = () => {
    if (!newAllocation.unitId || !newAllocation.assignedTo) {
      Alert.alert("Error", "All fields are required!");
      return;
    }

    axios.post("https://itrack-web-backend.onrender.com/api/createUnitAllocation", newAllocation)
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
        console.error(err);
        Alert.alert("Error", "Failed to allocate unit");
      });
  };

  // UPDATE allocation
  const handleUpdateAllocation = (id) => {
    axios.put(`https://itrack-web-backend.onrender.com/api/updateUnitAllocation/${id}`, editAllocation)
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
            axios.delete(`https://itrack-web-backend.onrender.com/api/deleteUnitAllocation/${id}`)
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
                      const allocationData = {
                        unitName: selectedUnit.unitName,
                        unitId: selectedUnit.unitId,
                        bodyColor: selectedUnit.bodyColor,
                        variation: selectedUnit.variation,
                        assignedTo: isModalOpen ? newAllocation.assignedTo : editAllocation?.assignedTo
                      };

                      if (isModalOpen) {
                        setNewAllocation({ ...newAllocation, ...allocationData });
                      } else {
                        setEditAllocation({ ...editAllocation, ...allocationData });
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

              {/* Assign To */}
              <Text style={styles.inputLabel}>
                Assign To <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={isModalOpen ? newAllocation.assignedTo : editAllocation?.assignedTo}
                  onValueChange={(value) => {
                    if (isModalOpen) {
                      setNewAllocation({ ...newAllocation, assignedTo: value });
                    } else {
                      setEditAllocation({ ...editAllocation, assignedTo: value });
                    }
                  }}
                  style={styles.picker}
                >
                  <Picker.Item label="Select Sales Agent" value="" />
                  {agents.map(agent => (
                    <Picker.Item
                      key={agent._id}
                      label={agent.name}
                      value={agent.name}
                    />
                  ))}
                </Picker>
              </View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
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
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  closeButton: {
    fontSize: 28,
    color: '#666',
    fontWeight: '300',
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
    borderTopColor: '#f0f0f0',
  },
  modalButton: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: '#DC2626',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
});
