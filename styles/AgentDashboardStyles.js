import { StyleSheet } from "react-native";

export default StyleSheet.create({
  // Modern Container
  modernContainer: {
    flex: 1,
    backgroundColor: "#F5F5F5", // Light Gray
  },

  // Modern Header
  modernHeader: {
    backgroundColor: "#FFFFFF", // White
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },

  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerLeft: {
    flex: 1,
  },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#6B7280",
  },

  profileButtonText: {
    fontSize: 18,
    color: "#6B7280",
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000000", // Black
    marginBottom: 2,
  },

  headerSubtitle: {
    fontSize: 14,
    color: "#6B7280", // Gray
    fontWeight: "500",
  },

  modernLogoutBtn: {
    backgroundColor: "#F5F5F5", // Light Gray
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#6B7280", // Gray
  },

  modernLogoutText: {
    color: "#CB1E2A", // Red
    fontWeight: "600",
    fontSize: 14,
  },

  // Modern Tabs
  modernTabsContainer: {
    backgroundColor: "#FFFFFF", // White
    borderBottomWidth: 1,
    borderBottomColor: "#6B7280", // Gray
  },

  tabsScrollContent: {
    paddingHorizontal: 20,
  },

  modernTabBtn: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
    marginRight: 8,
    borderRadius: 12,
    minWidth: 100,
  },

  modernTabBtnActive: {
    backgroundColor: "#CB1E2A", // Red
  },

  tabIcon: {
    fontSize: 18,
    marginBottom: 4,
  },

  modernTabBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280", // Gray
    textAlign: "center",
  },

  modernTabBtnTextActive: {
    color: "#FFFFFF", // White
  },

  // Content Container
  contentContainer: {
    flex: 1,
    backgroundColor: "#F5F5F5", // Light Gray
  },

  tabContent: {
    flex: 1,
    padding: 20,
  },

  // Welcome Section
  welcomeSection: {
    backgroundColor: "#FFFFFF", // White
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: "#CB1E2A", // Red
  },

  welcomeContent: {
    flex: 1,
  },

  welcomeTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000000", // Black
    marginBottom: 4,
  },

  welcomeSubtitle: {
    fontSize: 14,
    color: "#6B7280", // Gray
    lineHeight: 20,
  },

  welcomeEmoji: {
    fontSize: 32,
  },

  // Modern Statistics
  modernStatsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 24,
  },

  modernStatCard: {
    backgroundColor: "#FFFFFF", // White
    borderRadius: 16,
    padding: 20,
    width: "48%",
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },

  statCardContent: {
    alignItems: "flex-start",
  },

  statCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 8,
  },

  statCardIcon: {
    fontSize: 24,
  },

  statCardValue: {
    fontSize: 28,
    fontWeight: "700",
  },

  statCardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2D2D2D", // Dark Gray
    marginBottom: 4,
  },

  statCardSubtitle: {
    fontSize: 12,
    color: "#6B7280", // Gray
  },

  // Team Grid Styles for Manager Dashboard
  teamGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  teamMemberCard: {
    backgroundColor: "#FFFFFF", // White
    borderRadius: 12,
    padding: 16,
    width: "48%",
    marginBottom: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#E5E7EB", // Light Gray
  },

  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#CB1E2A", // Red
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },

  avatarText: {
    color: "#FFFFFF", // White
    fontSize: 20,
    fontWeight: "700",
  },

  teamMemberName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2D2D2D", // Dark Gray
    marginBottom: 2,
    textAlign: "center",
  },

  teamMemberRole: {
    fontSize: 12,
    color: "#6B7280", // Gray
    textAlign: "center",
  },

  // Performance Card Styles for Manager Dashboard
  performanceCard: {
    backgroundColor: "#FFFFFF", // White
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: "#CB1E2A", // Red
  },

  performanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  performanceInfo: {
    flex: 1,
    marginLeft: 12,
  },

  performanceName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2D2D2D", // Dark Gray
    marginBottom: 2,
  },

  performanceRole: {
    fontSize: 12,
    color: "#6B7280", // Gray
  },

  performanceStats: {
    marginTop: 8,
  },

  performanceStat: {
    fontSize: 14,
    color: "#6B7280", // Gray
    marginBottom: 4,
  },

  // Quick Actions
  quickActionsSection: {
    marginBottom: 24,
  },

  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  quickActionCard: {
    backgroundColor: "#FFFFFF", // White
    borderRadius: 12,
    padding: 16,
    width: "48%",
    marginBottom: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#6B7280", // Gray
  },

  quickActionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },

  quickActionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2D2D2D", // Dark Gray
    marginBottom: 4,
    textAlign: "center",
  },

  quickActionSubtitle: {
    fontSize: 12,
    color: "#6B7280", // Gray
    textAlign: "center",
  },

  // Section Headers
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000000", // Black
    marginBottom: 16,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  sectionAction: {
    fontSize: 14,
    color: "#CB1E2A", // Red
    fontWeight: "600",
  },

  // Recent Activity
  recentActivitySection: {
    backgroundColor: "#FFFFFF", // White
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: "#CB1E2A", // Red
  },

  activityList: {
    gap: 16,
  },

  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5", // Light Gray
  },

  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F5F5", // Light Gray
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  activityContent: {
    flex: 1,
  },

  activityTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2D2D2D", // Dark Gray
    marginBottom: 4,
  },

  activitySubtitle: {
    fontSize: 12,
    color: "#6B7280", // Gray
    marginBottom: 2,
  },

  activityTime: {
    fontSize: 11,
    color: "#6B7280", // Gray
  },

  // Modern Status Badge
  modernStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 80,
  },

  modernStatusText: {
    color: "#FFFFFF", // White
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
  },

  // Empty States
  emptyActivityState: {
    alignItems: "center",
    paddingVertical: 40,
  },

  emptyActivityText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 4,
  },

  emptyActivitySubtext: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
  },

  // Legacy styles for compatibility (other tabs)
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5", // Light Gray
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: "#6B7280", // Gray
    backgroundColor: "#FFFFFF", // White
  },

  greeting: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000000", // Black
    marginBottom: 12,
  },

  logoutBtn: {
    backgroundColor: "#F5F5F5", // Light Gray
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    minHeight: 36,
    borderWidth: 1,
    borderColor: "#6B7280", // Gray
  },

  logoutText: {
    color: "#CB1E2A", // Red
    fontWeight: "600",
    fontSize: 14,
  },

  tabsContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#6B7280", // Gray
    backgroundColor: "#FFFFFF", // White
  },

  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderColor: "transparent",
    minHeight: 45,
  },

  tabBtnActive: {
    borderColor: "#CB1E2A", // Red
    backgroundColor: "#CB1E2A", // Red
  },

  tabBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280", // Gray
  },

  tabBtnTextActive: {
    color: "#FFFFFF", // White
  },

  content: {
    padding: 20,
    minWidth: '100%',
  },

  // Statistics Cards (Legacy)
  statsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  statCard: {
    width: "48%",
    backgroundColor: "#CB1E2A", // Red
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: "center",
    minHeight: 80,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },

  statNumber: {
    color: "#FFFFFF", // White
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
  },

  statLabel: {
    color: "#FFFFFF", // White
    fontSize: 12,
    textAlign: "center",
    fontWeight: "500",
  },

  // Search Input
  searchInput: {
    backgroundColor: "#FFFFFF", // White
    borderWidth: 1,
    borderColor: "#6B7280", // Gray
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#2D2D2D", // Dark Gray
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  // Section styles
  section: {
    backgroundColor: "#FFFFFF", // White
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#CB1E2A", // Red
  },

  sectionSubtitle: {
    fontSize: 14,
    color: "#6B7280", // Gray
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 20,
  },

  // Add Button
  addButton: {
    backgroundColor: "#CB1E2A", // Red
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
    minHeight: 42,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  addButtonText: {
    color: "#FFFFFF", // White
    fontWeight: "600",
    fontSize: 14,
  },

  // Table Styles
  tableSection: {
    backgroundColor: "white",
    borderRadius: 6, // Reduced from 8
    padding: 10, // Reduced from 12
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 }, // Reduced shadow
    shadowOpacity: 0.05, // Reduced opacity
    shadowRadius: 2, // Reduced radius
    elevation: 1, // Reduced elevation
    height: 300, // Fixed height for the container
    marginBottom: 10,
  },
  
  section: {
    backgroundColor: "white",
    borderRadius: 6, // Reduced from 8
    padding: 10, // Reduced from 12
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 }, // Reduced shadow
    shadowOpacity: 0.05, // Reduced opacity
    shadowRadius: 2, // Reduced radius
    elevation: 1, // Reduced elevation
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 15, // Reduced from 16 for mobile
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10, // Reduced from 12
  },

  tableContainer: {
    backgroundColor: "white",
    flex: 1, // Take up remaining space in the fixed container
    marginTop: 5,
  },

  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f8f9fa",
    paddingVertical: 8, // Reduced from 10
    paddingHorizontal: 4, // Reduced from 6
    borderRadius: 4, // Reduced from 5
  },

  tableHeaderCell: {
    fontSize: 10, // Reduced from 11 for mobile
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    minWidth: 65, // Reduced from 70
    paddingHorizontal: 1, // Reduced from 2
  },

  tableRow: {
    flexDirection: "row",
    paddingVertical: 8, // Reduced from 10
    paddingHorizontal: 4, // Reduced from 6
    borderBottomWidth: 0.5, // Reduced thickness
    borderBottomColor: "#f0f0f0",
    alignItems: "center",
  },

  tableCell: {
    fontSize: 10, // Reduced from 11 for mobile
    color: "#666",
    textAlign: "center",
    minWidth: 65, // Reduced from 70
    paddingHorizontal: 1, // Reduced from 2
  },

  statusBadge: {
    paddingHorizontal: 5, // Reduced from 6
    paddingVertical: 2, // Reduced from 3
    borderRadius: 8, // Reduced from 10
    alignItems: "center",
    justifyContent: "center",
    minWidth: 50, // Reduced from 60
  },

  statusText: {
    color: "white",
    fontSize: 8, // Reduced from 9 for mobile
    fontWeight: "bold",
  },

  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6, // Reduced from 8
    paddingHorizontal: 10, // Reduced from 12
    paddingVertical: 8, // Reduced from 10
    fontSize: 13, // Reduced from 14
    color: "#333",
    marginBottom: 10, // Reduced from 12
    backgroundColor: "#fff",
    height: 40, // Reduced from 45
  },

  addButton: {
    backgroundColor: "#CB1E2A",
    alignSelf: "flex-start",
    paddingHorizontal: 14, // Reduced from 16
    paddingVertical: 8, // Reduced from 10
    borderRadius: 5, // Reduced from 6
    marginTop: 6, // Reduced from 8
    minHeight: 36, // Reduced from 42
  },

  addButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 13, // Reduced from 14
  },

  vehicleCard: {
    backgroundColor: "#fff",
    padding: 10, // Reduced from 12
    marginBottom: 10, // Reduced from 12
    borderRadius: 6, // Reduced from 8
    borderWidth: 1,
    borderColor: "#ddd",
    shadowColor: "#000",
    shadowOpacity: 0.03, // Reduced opacity
    shadowRadius: 2, // Reduced radius
    shadowOffset: { width: 0, height: 1 },
  },

  vehicleTitle: {
    fontWeight: "bold",
    fontSize: 13, // Reduced from 14
    marginBottom: 3, // Reduced from 4
    color: "#222",
  },

  vehicleDriver: {
    fontSize: 11, // Reduced from 12
    color: "#444",
    marginBottom: 2, // Reduced from 3
  },

  sectionLabel: {
    fontWeight: "bold",
    marginTop: 6, // Reduced from 8
    marginBottom: 4, // Reduced from 5
    color: "#CB1E2A",
    fontSize: 11, // Reduced from 12
  },

  processRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  requestTag: {
    fontSize: 9, // Reduced from 10
    color: "#333",
    paddingHorizontal: 6, // Reduced from 8
    paddingVertical: 3, // Reduced from 4
    borderRadius: 4, // Reduced from 5
    marginRight: 5, // Reduced from 6
    marginBottom: 5, // Reduced from 6
  },

  requestTagText: {
    fontSize: 9, // Reduced from 10
    fontWeight: "500",
    color: "#333",
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16, // Reduced from 20
  },

  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 10, // Reduced from 12
    padding: 16, // Reduced from 20
    width: "92%", // Increased from 90% for better mobile use
    maxWidth: 380, // Reduced from 400
    maxHeight: "75%", // Reduced from 80%
  },

  modalTitle: {
    fontSize: 16, // Reduced from 18
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12, // Reduced from 16
    textAlign: "center",
  },

  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16, // Reduced from 20
    gap: 10, // Reduced from 12
  },

  modalButton: {
    flex: 1,
    paddingVertical: 10, // Reduced from 12
    paddingHorizontal: 12, // Reduced from 16
    borderRadius: 6, // Reduced from 8
    alignItems: "center",
    minHeight: 40, // Reduced from 45
  },

  modalButtonCancel: {
    backgroundColor: "#6c757d",
  },

  modalButtonPrimary: {
    backgroundColor: "#CB1E2A",
  },

  modalButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13, // Reduced from 14
  },

  // Modern Vehicle Stocks Styles
  stocksContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
  },

  stocksHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },

  stocksTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
  },

  modernAddButton: {
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },

  modernAddButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },

  // Search Section
  stocksSearchSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },

  stocksSearchInput: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#334155',
  },

  // Stats Section
  stocksStatsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },

  stocksStatCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },

  stocksStatNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },

  stocksStatLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    opacity: 0.9,
  },

  // Stock Cards
  stocksList: {
    flex: 1,
  },

  stockCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
  },

  stockCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  stockUnitName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
  },

  stockStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },

  stockStatusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  stockCardContent: {
    gap: 8,
  },

  stockInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },

  stockInfoLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    flex: 1,
  },

  stockInfoValue: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '600',
    flex: 2,
    textAlign: 'right',
  },

  stockDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 8,
  },

  // Empty States
  stocksEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },

  stocksEmptyText: {
    fontSize: 18,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 8,
  },

  stocksEmptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },

  // Vehicle Preparation Styles
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    marginBottom: 16,
  },

  vehiclePrepCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#CB1E2A',
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },

  vehicleInfo: {
    flex: 1,
  },

  vehicleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },

  vehicleSubtitle: {
    fontSize: 14,
    color: '#666',
  },

  completionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 12,
  },

  completionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },

  driverSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 4,
  },

  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    flex: 1,
  },

  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    flex: 2,
    textAlign: 'right',
  },

  progressSection: {
    marginTop: 12,
    marginBottom: 16,
  },

  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },

  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    borderRadius: 4,
  },

  processListSection: {
    marginTop: 16,
  },

  processListTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },

  processItem: {
    marginBottom: 12,
  },

  processInfo: {
    flex: 1,
  },

  processHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },

  processName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },

  processNameCompleted: {
    color: '#28a745',
  },

  processStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 12,
  },

  processStatusCompleted: {
    backgroundColor: '#d4edda',
  },

  processStatusPending: {
    backgroundColor: '#fff3cd',
  },

  processStatusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },

  processStatusTextCompleted: {
    color: '#155724',
  },

  processStatusTextPending: {
    color: '#856404',
  },

  completionDetails: {
    marginTop: 8,
    paddingLeft: 16,
  },

  completionInfo: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },

  overallStatusSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },

  readyStatusContainer: {
    backgroundColor: '#d4edda',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },

  readyStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#155724',
    marginBottom: 4,
  },

  readyDetails: {
    fontSize: 12,
    color: '#155724',
  },

  pendingStatusContainer: {
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },

  pendingStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#856404',
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },

  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },

  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Vehicle Tracking Styles
  mapSection: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  agentMap: {
    height: 250,
    width: '100%',
  },

  mapLegend: {
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },

  legendTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },

  legendText: {
    fontSize: 12,
    color: '#6B7280',
  },

  emptyMapState: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },

  emptyMapTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },

  emptyMapText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },

  vehicleTrackingCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  selectedVehicleCard: {
    borderColor: '#CB1E2A',
    borderWidth: 2,
    shadowColor: '#CB1E2A',
    shadowOpacity: 0.2,
  },

  vehicleCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  vehicleTrackingName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },

  trackingStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },

  trackingStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  vehicleCardContent: {
    gap: 8,
  },

  vehicleInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  vehicleInfoLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },

  vehicleInfoValue: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: 8,
  },

  refreshTrackingButton: {
    backgroundColor: '#CB1E2A',
    marginHorizontal: 16,
    marginVertical: 20,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },

  refreshTrackingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Agent Filter Styles for Manager Dashboard
  agentFilterSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },

  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },

  agentFilterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  agentFilterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },

  agentFilterButtonActive: {
    backgroundColor: '#CB1E2A',
    borderColor: '#CB1E2A',
  },

  agentFilterText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },

  agentFilterTextActive: {
    color: '#FFFFFF',
  },

  // Enhanced Stats for Manager Dashboard
  managerStatsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },

  managerStatCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flex: 1,
    minWidth: '45%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  managerStatIcon: {
    fontSize: 24,
    marginBottom: 8,
  },

  managerStatValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },

  managerStatLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },

  managerStatSubtitle: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
});
