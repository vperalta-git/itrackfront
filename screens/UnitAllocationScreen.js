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
  const [filteredAllocations, setFilteredAllocations] = useState([]);
  const [agents, setAgents] = useState([]);
  const [managers, setManagers] = useState([]);
  const [availableUnits, setAvailableUnits] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAllocation, setNewAllocation] = useState({
    unitName: "",
    unitId: "",
    bodyColor: "",
    variation: "",
    assignedTo: "",
    customerName: "",
    customerEmail: "",
    customerPhone: ""
  });
  const [editAllocation, setEditAllocation] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);
  const [unitSearchQuery, setUnitSearchQuery] = useState('');
  const [agentSearchQuery, setAgentSearchQuery] = useState('');
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent'); // 'recent' or 'team'
  const [selectedTeam, setSelectedTeam] = useState('all'); // 'all' or manager name
  const itemsPerPage = 6;

  useEffect(() => {
    fetchAllocations();
    fetchAgents();
    fetchManagers();
    fetchAvailableUnits();
  }, []);

  // Apply search and filter whenever allocations, search, or sort changes
  useEffect(() => {
    applyFilters();
  }, [allocations, searchQuery, sortBy, selectedTeam, agents, managers]);

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
        console.log('📊 All users:', res.data.map(u => ({ name: u.name || u.accountName, role: u.role })));
        const agentList = res.data.filter(u => {
          const displayName = u.accountName || u.name || u.username || '';
          if (!displayName) return false; // Skip users with no name
          const role = u.role?.toLowerCase() || '';
          return role === "sales agent" || role === "sales" || role === "agent" || role === "salesagent";
        }).map(u => ({
          ...u,
          displayName: u.accountName || u.name || u.username || '',
          managerId: u.assignedTo || u.managerId,
          managerName: u.manager || ''
        }));
        setAgents(agentList);
        console.log(`📊 Loaded ${agentList.length} sales agents:`, agentList.map(a => ({ name: a.displayName, managerId: a.managerId, manager: a.managerName })));
        if (agentList.length === 0) {
          console.warn('⚠️ No sales agents found. Check user roles in database.');
        }
      })
      .catch(err => {
        console.error('Fetch agents error:', err.response?.data || err.message);
        Alert.alert('Error', 'Failed to load sales agents');
      });
  };

  // GET all Managers
  const fetchManagers = () => {
    axios.get("https://itrack-backend-1.onrender.com/api/getUsers")
      .then(res => {
        const managerList = res.data.filter(u => {
          const displayName = u.accountName || u.name || u.username || '';
          if (!displayName) return false;
          const role = u.role?.toLowerCase() || '';
          return role === "manager";
        }).map(u => ({
          ...u,
          displayName: u.accountName || u.name || u.username || '',
          id: u._id || u.id
        }));
        setManagers(managerList);
        console.log(`👔 Loaded ${managerList.length} managers:`, managerList.map(m => m.displayName));
      })
      .catch(err => {
        console.error('Fetch managers error:', err.response?.data || err.message);
      });
  };

  const resolveManagerName = (agent) => {
    if (!agent) return '';
    const managerId = agent.managerId;
    const managerNameField = (agent.managerName || '').trim();
    const byId = managers.find(m => m.id === managerId || m._id === managerId);
    if (byId) return byId.displayName || byId.accountName || byId.name || byId.username || '';
    const byName = managers.find(m => {
      const candidate = (m.displayName || m.accountName || m.name || '').trim().toLowerCase();
      return managerNameField && candidate === managerNameField.toLowerCase();
    });
    if (byName) return byName.displayName || byName.accountName || byName.name || byName.username || '';
    return managerNameField || '';
  };

  const resolveAgentForAllocation = (alloc) => {
    const assigned = (alloc.assignedTo || '').trim().toLowerCase();
    return agents.find(a => {
      const name = (a.displayName || a.name || '').trim().toLowerCase();
      return name === assigned;
    });
  };

  const getAgentAvatar = (agent) => {
    if (!agent) return '';
    return (
      agent.profilePicture ||
      agent.photoUrl ||
      agent.avatar ||
      agent.imageUrl ||
      agent.picture ||
      ''
    );
  };

  // Apply search and sort filters
  const applyFilters = () => {
    let filtered = [...allocations];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(alloc =>
        alloc.unitName?.toLowerCase().includes(query) ||
        alloc.unitId?.toLowerCase().includes(query) ||
        alloc.assignedTo?.toLowerCase().includes(query) ||
        alloc.bodyColor?.toLowerCase().includes(query)
      );
    }

    // Apply team filter
    if (selectedTeam !== 'all') {
      filtered = filtered.filter(alloc => {
        const agent = resolveAgentForAllocation(alloc);
        const managerName = resolveManagerName(agent);
        return managerName && managerName.toLowerCase() === selectedTeam.toLowerCase();
      });
    }

    // Apply sort
    if (sortBy === 'recent') {
      filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    } else if (sortBy === 'team') {
      filtered.sort((a, b) => {
        const managerA = resolveManagerName(resolveAgentForAllocation(a)) || '';
        const managerB = resolveManagerName(resolveAgentForAllocation(b)) || '';
        return managerA.localeCompare(managerB);
      });
    }

    setFilteredAllocations(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  // GET available units from inventory (exclude only Released status)
  const fetchAvailableUnits = () => {
    axios.get("https://itrack-backend-1.onrender.com/getStock")
      .then(res => {
        console.log('📦 Raw stock response:', res.data);
        // Handle both response formats: plain array or { success, data }
        const inventoryData = Array.isArray(res.data) ? res.data : res.data.data || [];
        // Allow all statuses EXCEPT "Released"
        const units = inventoryData.filter(u => {
          const status = u.status?.toLowerCase() || '';
          return status !== "released";
        });
        setAvailableUnits(units);
        console.log(`📦 Loaded ${units.length} available units (filtered from ${inventoryData.length} total, excluding Released)`);
      })
      .catch(err => {
        console.error('Fetch units error:', err.response?.data || err.message);
        Alert.alert('Error', 'Failed to load available units. Check console for details.');
      });
  };

  // CREATE allocation
  const handleCreateAllocation = () => {
    if (!newAllocation.unitId || !newAllocation.assignedTo) {
      Alert.alert("Error", "Unit and Assigned To are required");
      return;
    }
    if (!newAllocation.customerName || (!newAllocation.customerEmail && !newAllocation.customerPhone)) {
      Alert.alert("Error", "Enter customer name and at least an email or phone number");
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
          assignedTo: "",
          customerName: "",
          customerEmail: "",
          customerPhone: ""
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
    if (!editAllocation?.customerName || (!editAllocation?.customerEmail && !editAllocation?.customerPhone)) {
      Alert.alert("Error", "Enter customer name and at least an email or phone number");
      return;
    }
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
  const currentAllocations = filteredAllocations.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAllocations.length / itemsPerPage);

  // Get unique manager names from agents
  const managerTeams = [...new Set(agents.map(a => resolveManagerName(a)).filter(Boolean))];

  const renderAllocationCard = ({ item }) => {
    const agent = resolveAgentForAllocation(item);
    const managerName = resolveManagerName(agent) || 'No Team Group';
    const badgeLabel = managerName || 'No Team Group';
    const avatarInitials = (item.assignedTo || '').split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase();
    const avatarUri = getAgentAvatar(agent);
    
    return (
      <View style={styles.card}>
          <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.unitName}</Text>
          <View style={styles.teamBadge}>
            <Text style={styles.teamBadgeText}>{badgeLabel}</Text>
          </View>
        </View>

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <View style={styles.infoLabelRow}>
            <MaterialIcons name="label" size={16} color="#9ca3af" style={styles.infoIcon} />
            <Text style={styles.infoLabel}>Conduction #:</Text>
          </View>
          <Text style={styles.infoValue}>{item.unitId}</Text>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoLabelRow}>
            <MaterialIcons name="palette" size={16} color="#9ca3af" style={styles.infoIcon} />
            <Text style={styles.infoLabel}>Color:</Text>
          </View>
          <Text style={styles.infoValue}>{item.bodyColor}</Text>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoLabelRow}>
            <MaterialIcons name="build" size={16} color="#9ca3af" style={styles.infoIcon} />
            <Text style={styles.infoLabel}>Variation:</Text>
          </View>
          <Text style={styles.infoValue}>{item.variation}</Text>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoLabelRow}>
            <MaterialIcons name="person" size={16} color="#9ca3af" style={styles.infoIcon} />
            <Text style={styles.infoLabel}>Assigned To:</Text>
          </View>
          <View style={styles.agentRow}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{avatarInitials || '?'}</Text>
              </View>
            )}
            <View>
              <Text style={styles.infoValue}>{item.assignedTo}</Text>
            </View>
          </View>
        </View>

        {(item.customerName || item.customerEmail || item.customerPhone) && (
          <View style={styles.infoRow}>
            <View style={styles.infoLabelRow}>
              <MaterialIcons name="people" size={16} color="#9ca3af" style={styles.infoIcon} />
              <Text style={styles.infoLabel}>Customer:</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoValue}>{item.customerName || 'N/A'}</Text>
              {item.customerEmail ? <Text style={styles.subValue}>{item.customerEmail}</Text> : null}
              {item.customerPhone ? <Text style={styles.subValue}>{item.customerPhone}</Text> : null}
            </View>
          </View>
        )}
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => setEditAllocation(item)}
        >
          <View style={styles.actionButtonContent}>
            <MaterialIcons name="edit" size={16} color="#1d4ed8" style={styles.actionIcon} />
            <Text style={styles.actionButtonText}>Edit</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteAllocation(item._id)}
        >
          <View style={styles.actionButtonContent}>
            <MaterialIcons name="delete" size={16} color="#dc2626" style={styles.actionIcon} />
            <Text style={styles.actionButtonText}>Delete</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.header}>Unit Allocation</Text>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by unit, agent, color..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <MaterialIcons name="close" size={20} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      {/* Sort and Filter Controls */}
      <View style={styles.filterContainer}>
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Sort By:</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={sortBy}
              onValueChange={(value) => setSortBy(value)}
              mode="dropdown"
              style={styles.picker}
            >
              <Picker.Item label="Recent" value="recent" />
              <Picker.Item label="Manager" value="team" />
            </Picker>
          </View>
        </View>

        {/* Team Filter */}
        {managerTeams.length > 0 && (
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Manager:</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={selectedTeam}
                onValueChange={(value) => setSelectedTeam(value)}
                mode="dropdown"
                style={styles.picker}
              >
                <Picker.Item label="All Teams" value="all" />
                {managerTeams.map((manager, index) => (
                  <Picker.Item key={index} label={`${manager} Group`} value={manager} />
                ))}
              </Picker>
            </View>
          </View>
        )}
      </View>

      {/* Add Button */}
      <View style={styles.actionBar}>
        <Text style={styles.resultCount}>
          {filteredAllocations.length} {filteredAllocations.length === 1 ? 'allocation' : 'allocations'}
        </Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setIsModalOpen(true)}
        >
          <MaterialIcons name="add" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Allocate Unit</Text>
        </TouchableOpacity>
      </View>

      {/* Allocations List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#DC2626" />
          <Text style={styles.loadingText}>Loading allocations...</Text>
        </View>
      ) : filteredAllocations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="inbox" size={80} color="#d1d5db" />
          <Text style={styles.emptyText}>
            {searchQuery || selectedTeam !== 'all' ? 'No allocations match your filters' : 'No allocations found'}
          </Text>
          <Text style={styles.emptySubtext}>
            {searchQuery || selectedTeam !== 'all' ? 'Try adjusting your search or filters' : 'Start by allocating units to sales agents'}
          </Text>
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
                  setShowUnitDropdown(false);
                  setUnitSearchQuery('');
                  setAgentSearchQuery('');
                  setShowAgentDropdown(false);
                }}
              >
                <MaterialIcons name="close" size={26} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Select Unit */}
              <Text style={styles.inputLabel}>
                Unit <Text style={styles.required}>*</Text>
              </Text>
              <View>
                <TouchableOpacity
                  style={styles.searchableDropdown}
                  onPress={() => setShowUnitDropdown(!showUnitDropdown)}
                  activeOpacity={0.8}
                >
                  <View style={styles.selectedAgentContainer}>
                    {(() => {
                      const selectedId = isModalOpen ? newAllocation.unitId : editAllocation?.unitId;
                      if (!selectedId) return <Text style={styles.placeholderText}>Select Unit</Text>;
                      const unit = availableUnits.find(u => u.unitId === selectedId);
                      if (!unit) return <Text style={styles.placeholderText}>Select Unit</Text>;
                      const label = `${unit.unitName} - ${unit.unitId}${unit.bodyColor ? ` (${unit.bodyColor})` : ''}`;
                      return <Text style={styles.selectedAgentText}>{label}</Text>;
                    })()}
                  </View>
                  <MaterialIcons name={showUnitDropdown ? "arrow-drop-up" : "arrow-drop-down"} size={24} color="#666" />
                </TouchableOpacity>

                {showUnitDropdown && (
                  <View style={styles.dropdownContainer}>
                    <View style={styles.searchContainer}>
                      <MaterialIcons name="search" size={20} color="#999" style={styles.searchIcon} />
                      <TextInput
                        style={styles.searchInput}
                        placeholder="Search units..."
                        value={unitSearchQuery}
                        onChangeText={setUnitSearchQuery}
                      />
                      {unitSearchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setUnitSearchQuery('')}>
                          <MaterialIcons name="close" size={20} color="#999" />
                        </TouchableOpacity>
                      )}
                    </View>

                    <ScrollView style={styles.agentList} nestedScrollEnabled>
                      {availableUnits
                        .filter(unit => {
                          const query = unitSearchQuery.toLowerCase();
                          return [unit.unitName, unit.unitId, unit.bodyColor, unit.variation]
                            .some(field => (field || '').toLowerCase().includes(query));
                        })
                        .map(unit => {
                          const label = `${unit.unitName} - ${unit.unitId}${unit.bodyColor ? ` (${unit.bodyColor})` : ''}`;
                          const selectedId = isModalOpen ? newAllocation.unitId : editAllocation?.unitId;
                          const isSelected = selectedId === unit.unitId;
                          return (
                            <TouchableOpacity
                              key={unit._id}
                              style={styles.agentItem}
                              onPress={() => {
                                if (isModalOpen) {
                                  setNewAllocation({
                                    ...newAllocation,
                                    unitName: unit.unitName,
                                    unitId: unit.unitId,
                                    bodyColor: unit.bodyColor,
                                    variation: unit.variation,
                                  });
                                } else {
                                  setEditAllocation({
                                    ...editAllocation,
                                    unitName: unit.unitName,
                                    unitId: unit.unitId,
                                    bodyColor: unit.bodyColor,
                                    variation: unit.variation,
                                  });
                                }
                                setShowUnitDropdown(false);
                                setUnitSearchQuery('');
                              }}
                            >
                              <View style={styles.unitInfo}>
                                <Text style={styles.agentName}>{label}</Text>
                                <Text style={styles.agentRole}>{unit.variation || unit.bodyColor || '—'}</Text>
                              </View>
                              {isSelected && (
                                <MaterialIcons name="check-circle" size={24} color="#059669" />
                              )}
                            </TouchableOpacity>
                          );
                        })}

                      {availableUnits.filter(unit => {
                        const query = unitSearchQuery.toLowerCase();
                        return [unit.unitName, unit.unitId, unit.bodyColor, unit.variation]
                          .some(field => (field || '').toLowerCase().includes(query));
                      }).length === 0 && (
                        <View style={styles.noResultsContainer}>
                          <MaterialIcons name="search-off" size={48} color="#ccc" />
                          <Text style={styles.noResultsText}>No units found</Text>
                        </View>
                      )}
                    </ScrollView>
                  </View>
                )}
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
                      (() => {
                        const selectedAgent = agents.find(a => {
                          const displayName = a.displayName || a.name || a.username || '';
                          return displayName === (isModalOpen ? newAllocation.assignedTo : editAllocation?.assignedTo);
                        });
                        if (!selectedAgent) return <Text style={styles.placeholderText}>Select Sales Agent</Text>;
                        const displayName = selectedAgent.displayName || selectedAgent.name || selectedAgent.username || '';
                        const avatarUri = getAgentAvatar(selectedAgent);
                        return (
                          <>
                            {avatarUri ? (
                              <Image source={{ uri: avatarUri }} style={styles.smallProfilePic} />
                            ) : (
                              <View style={styles.smallProfilePlaceholder}>
                                <MaterialIcons name="person" size={16} color="#999" />
                              </View>
                            )}
                            <Text style={styles.selectedAgentText}>{displayName}</Text>
                          </>
                        );
                      })()
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
                        .filter(agent => {
                          const displayName = (agent.displayName || agent.name || agent.username || '').toLowerCase();
                          return displayName.includes(agentSearchQuery.toLowerCase());
                        })
                        .map(agent => {
                          const displayName = agent.displayName || agent.name || agent.username || '';
                          const avatarUri = getAgentAvatar(agent);
                          return (
                          <TouchableOpacity
                            key={agent._id}
                            style={styles.agentItem}
                            onPress={() => {
                              if (isModalOpen) {
                                setNewAllocation({ ...newAllocation, assignedTo: displayName });
                              } else {
                                setEditAllocation({ ...editAllocation, assignedTo: displayName });
                              }
                              setShowAgentDropdown(false);
                              setAgentSearchQuery('');
                            }}
                          >
                            {avatarUri ? (
                              <Image source={{ uri: avatarUri }} style={styles.agentProfilePic} />
                            ) : (
                              <View style={styles.agentProfilePlaceholder}>
                                <MaterialIcons name="person" size={24} color="#999" />
                              </View>
                            )}
                            <View style={styles.agentInfo}>
                              <Text style={styles.agentName}>{displayName}</Text>
                              <Text style={styles.agentRole}>Sales Agent</Text>
                            </View>
                            {(isModalOpen ? newAllocation.assignedTo : editAllocation?.assignedTo) === displayName && (
                              <MaterialIcons name="check-circle" size={24} color="#059669" />
                            )}
                          </TouchableOpacity>
                        );
                        })
                      }
                      {agents.filter(agent => {
                        const displayName = (agent.displayName || agent.name || agent.username || '').toLowerCase();
                        return displayName.includes(agentSearchQuery.toLowerCase());
                      }).length === 0 && (
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
                  setShowUnitDropdown(false);
                  setUnitSearchQuery('');
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
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  // Search Bar Styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
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
  // Filter and Sort Styles
  filterContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterRow: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  picker: {
    height: 48,
    width: '100%',
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  resultCount: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    gap: 6,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 15,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    flex: 1,
  },
  teamBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  teamBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1e40af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardBody: {
    padding: 20,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 150,
  },
  infoIcon: {
    marginRight: 6,
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
  agentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fde68a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f59e0b',
    marginRight: 8,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400e',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
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
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  editButton: {
    backgroundColor: '#eff6ff',
  },
  deleteButton: {
    backgroundColor: '#fef2f2',
    borderRightWidth: 0,
  },
  actionIcon: {
    marginRight: 4,
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
    height: 48,
    width: '100%',
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
  unitInfo: {
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
