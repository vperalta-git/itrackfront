import { StyleSheet } from "react-native";

export default StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },

  greeting: { fontSize: 24, fontWeight: "bold", color: "#CB1E2A" },

  logoutBtn: {
    backgroundColor: "#eee",
    borderRadius: 5,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },

  logoutText: { color: "#CB1E2A", fontWeight: "bold" },

  tabsContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fafafa",
  },

  tabBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    borderBottomWidth: 2,
    borderColor: "transparent",
  },

  tabBtnActive: {
    borderColor: "#CB1E2A",
    backgroundColor: "#fff",
  },

  tabBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
  },

  tabBtnTextActive: {
    color: "#CB1E2A",
  },

  content: { flex: 1, padding: 20 },

  statsCardsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },

  statCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 8,
    width: "48%",
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ddd",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },

  statCardLabel: {
    fontSize: 12,
    color: "#888",
    fontWeight: "bold",
    marginBottom: 5,
    letterSpacing: 1,
  },

  statCardValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#CB1E2A",
  },

  vehicleCard: {
    backgroundColor: "#fff",
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },

  vehicleTitle: { fontWeight: "bold", fontSize: 16, marginBottom: 5 },

  vehicleDriver: { fontSize: 14, color: "#555", marginBottom: 10 },

  sectionLabel: { fontWeight: "bold", marginBottom: 5, color: "#333" },

  processRow: { flexDirection: "row", flexWrap: "wrap" },

  requestTag: {
    backgroundColor: "#eee",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    marginRight: 8,
    marginBottom: 8,
  },

  requestTagText: { fontSize: 12, color: "#333" },

  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f8f8f8",
    borderBottomWidth: 1,
    borderColor: "#ddd",
    paddingVertical: 10,
  },

  tableHeaderCell: {
    fontWeight: "bold",
    fontSize: 12,
    color: "#555",
    textTransform: "uppercase",
    paddingHorizontal: 8,
  },

  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#eee",
    paddingVertical: 12,
    alignItems: "center",
  },

  tableCell: {
    fontSize: 14,
    paddingHorizontal: 8,
    color: "#333",
  },

  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignSelf: "flex-start",
  },

  statusBadgeText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
  },

  actionBtn: {
    backgroundColor: "#eee",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginRight: 8,
  },

  actionBtnText: {
    fontWeight: "600",
    color: "#333",
  },

  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    gap: 10,
  },

  // Updated input style for taller, wider textbox & bigger font size
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14, // increased height
    fontSize: 18, // bigger font size for typing visibility
    color: "#333",
    minHeight: 50, // enforce minimum height
    textAlignVertical: "top", // multiline align at top for Android
  },

  filterBtn: {
    backgroundColor: "#CB1E2A",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },

  filterBtnText: {
    color: "#fff",
    fontWeight: "bold",
  },

  searchRow: {
    flexDirection: "row",
    marginBottom: 10,
  },

  addButton: {
    backgroundColor: "#CB1E2A",
    alignSelf: "flex-start",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 10,
  },

  addButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },

  modalContent: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 20,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#CB1E2A",
    textAlign: "center",
  },

  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
    marginTop: 12,
  },

  picker: {
    marginBottom: 15,
  },

  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  createBtn: {
    backgroundColor: "#CB1E2A",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 5,
    flex: 1,
    marginRight: 10,
    alignItems: "center",
  },

  createBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },

  cancelBtn: {
    backgroundColor: "#ccc",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 5,
    flex: 1,
    marginLeft: 10,
    alignItems: "center",
  },

  cancelBtnText: {
    color: "#333",
    fontWeight: "bold",
    fontSize: 16,
  },
});
