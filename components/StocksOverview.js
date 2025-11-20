import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';

const { width } = Dimensions.get('window');

const StocksOverview = ({ inventory = [], theme }) => {
  const isLargeScreen = width > 1024;
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Process inventory data to create chart data
  const processInventoryData = () => {
    if (!inventory || inventory.length === 0) {
      return [];
    }

    // Group by unit name and count
    const unitCounts = inventory.reduce((acc, item) => {
      const unitName = item.unitName || 'Unknown';
      acc[unitName] = (acc[unitName] || 0) + 1;
      return acc;
    }, {});

    // Convert to chart format with colors
    const colors = [
      '#DC2626', // Red (Isuzu red)
      '#005d9b', // Blue
      '#231f20', // Dark gray/black
      '#234a5c', // Dark blue
      '#709cb7', // Light blue
      '#00aaff', // Bright blue
      '#B91C1C', // Red variant
      '#059669', // Green
      '#f59e0b', // Yellow/Orange
      '#8b5cf6', // Purple
      '#ef4444', // Light red
      '#6b7280'  // Gray
    ];

    return Object.entries(unitCounts)
      .map(([name, count], index) => ({
        name: name,
        count: count,
        value: count,
        color: colors[index % colors.length],
        onPress: () => handleSegmentPress({ name, count, color: colors[index % colors.length] })
      }))
      .sort((a, b) => b.count - a.count); // Sort by count descending
  };

  const handleSegmentPress = (segment) => {
    setSelectedSegment(segment);
    setShowDetailsModal(true);
  };

  const getVehiclesForModel = (modelName) => {
    return inventory.filter(item => item.unitName === modelName);
  };

  const unitData = processInventoryData();
  const totalUnits = inventory.length;

  if (!inventory || inventory.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme?.card || '#ffffff' }]}>
        <Text style={[styles.title, { color: theme?.text || '#374151' }]}>
          Stocks Overview
        </Text>
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: theme?.textSecondary || '#6b7280' }]}>
            No inventory data available
          </Text>
        </View>
      </View>
    );
  }

  // Get all models for display (not just top 3)
  const allModels = unitData;
  
  return (
    <>
      <View style={[styles.container, { backgroundColor: theme?.card || '#ffffff' }]}>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: theme?.text || '#374151' }]}>
            Stocks Overview
          </Text>
          <Text style={[styles.subtitle, { color: theme?.textSecondary || '#6b7280' }]}>
            Tap on pie segments for details
          </Text>
        </View>

        <View style={[styles.row, isLargeScreen && styles.rowLargeScreen]}>
          {/* Left side - Labels */}
          <View style={[styles.leftContainer, isLargeScreen && styles.leftContainerLarge]}>
            <Text style={[styles.secondaryText, { color: theme?.textSecondary || '#666666' }]}>
              Vehicle Models
            </Text>
            <ScrollView style={styles.labelsScrollContainer} showsVerticalScrollIndicator={false}>
              <View style={styles.labelsContainer}>
                {allModels.map((item, index) => {
                  const percentage = totalUnits > 0 
                    ? ((item.count / totalUnits) * 100).toFixed(0) 
                    : '0';
                  return (
                    <TouchableOpacity 
                      key={item.name}
                      onPress={() => handleSegmentPress(item)}
                      activeOpacity={0.7}
                    >
                      <PieLabelRow
                        label={item.name}
                        count={item.count}
                        percentage={percentage}
                        color={item.color}
                        theme={theme}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          {/* Separator */}
          <View style={styles.separator} />

          {/* Right side - Pie Chart */}
          <View style={[styles.rightContainer, isLargeScreen && styles.rightContainerLarge]}>
            <PieChart
              data={unitData}
              donut
              radius={isLargeScreen ? 65 : 75}
              innerRadius={isLargeScreen ? 40 : 50}
              innerCircleColor={theme?.card || '#ffffff'}
              centerLabelComponent={() =>
                !isLargeScreen ? (
                  <View style={styles.centerLabel}>
                    <Text style={[styles.centerNumber, { color: theme?.text || '#000000' }]}>
                      {totalUnits}
                    </Text>
                    <Text style={[styles.centerText, { color: theme?.text || '#000000' }]}>
                      Total
                    </Text>
                  </View>
                ) : null
              }
            />
            {isLargeScreen && (
              <View style={styles.largeScreenLabel}>
                <Text style={[styles.largeNumber, { color: theme?.text || '#000000' }]}>
                  {totalUnits}
                </Text>
                <Text style={[styles.largeText, { color: theme?.text || '#000000' }]}>
                  Total Vehicles
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Details Modal */}
      <Modal
        visible={showDetailsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme?.card || '#ffffff' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme?.text || '#000000' }]}>
                {selectedSegment?.name}
              </Text>
              <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
                <Text style={styles.modalCloseButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalStats}>
              <View style={[styles.modalStatCard, { backgroundColor: selectedSegment?.color || '#DC2626' }]}>
                <Text style={styles.modalStatNumber}>{selectedSegment?.count || 0}</Text>
                <Text style={styles.modalStatLabel}>Total Units</Text>
              </View>
              <View style={[styles.modalStatCard, { backgroundColor: '#374151' }]}>
                <Text style={styles.modalStatNumber}>
                  {totalUnits > 0 ? ((selectedSegment?.count / totalUnits) * 100).toFixed(1) : 0}%
                </Text>
                <Text style={styles.modalStatLabel}>Of Total Stock</Text>
              </View>
            </View>

            <Text style={[styles.modalSectionTitle, { color: theme?.text || '#000000' }]}>
              Vehicle Details
            </Text>
            
            <ScrollView style={styles.modalVehicleList}>
              {selectedSegment && getVehiclesForModel(selectedSegment.name).map((vehicle, index) => (
                <View key={vehicle._id || index} style={[styles.vehicleDetailCard, { backgroundColor: theme?.surface || '#f9fafb' }]}>
                  <View style={styles.vehicleDetailRow}>
                    <Text style={[styles.vehicleDetailLabel, { color: theme?.textSecondary || '#6b7280' }]}>
                      Unit ID:
                    </Text>
                    <Text style={[styles.vehicleDetailValue, { color: theme?.text || '#000000' }]}>
                      {vehicle.unitId || 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.vehicleDetailRow}>
                    <Text style={[styles.vehicleDetailLabel, { color: theme?.textSecondary || '#6b7280' }]}>
                      Color:
                    </Text>
                    <Text style={[styles.vehicleDetailValue, { color: theme?.text || '#000000' }]}>
                      {vehicle.bodyColor || 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.vehicleDetailRow}>
                    <Text style={[styles.vehicleDetailLabel, { color: theme?.textSecondary || '#6b7280' }]}>
                      Variation:
                    </Text>
                    <Text style={[styles.vehicleDetailValue, { color: theme?.text || '#000000' }]}>
                      {vehicle.variation || 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.vehicleDetailRow}>
                    <Text style={[styles.vehicleDetailLabel, { color: theme?.textSecondary || '#6b7280' }]}>
                      Status:
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: vehicle.status === 'Available' ? '#10b981' : '#DC2626' }]}>
                      <Text style={styles.statusBadgeText}>{vehicle.status || 'Available'}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity 
              style={[styles.modalCloseBtn, { backgroundColor: theme?.primary || '#DC2626' }]}
              onPress={() => setShowDetailsModal(false)}
            >
              <Text style={styles.modalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const PieLabelRow = ({ label, count, percentage, color, theme }) => {
  return (
    <View style={styles.labelRow}>
      <View style={styles.labelContent}>
        <View style={[styles.colorDot, { backgroundColor: color }]} />
        <Text style={[styles.labelText, { color: theme?.text || '#000000' }]} numberOfLines={1}>
          {label}:
        </Text>
      </View>
      <View style={styles.labelStats}>
        <Text style={[styles.countText, { color: theme?.text || '#000000' }]}>
          {count}
        </Text>
        <Text style={[styles.percentageText, { color: theme?.text || '#000000' }]}>
          ({percentage}%)
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    minHeight: 320,
  },
  titleContainer: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#DC2626',
    backgroundColor: '#f9fafb',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 24,
    minHeight: 260,
  },
  rowLargeScreen: {
    minHeight: 300,
  },
  leftContainer: {
    width: '45%',
    paddingLeft: 16,
    paddingRight: 8,
    justifyContent: 'flex-start',
  },
  leftContainerLarge: {
    paddingTop: 10,
  },
  secondaryText: {
    color: '#666666',
    fontSize: 14,
    marginBottom: 12,
    fontWeight: '600',
  },
  labelsScrollContainer: {
    flex: 1,
    maxHeight: 200,
  },
  labelsContainer: {
    gap: 8,
    paddingBottom: 10,
  },
  separator: {
    width: 2,
    backgroundColor: '#e5e7eb',
  },
  rightContainer: {
    width: '55%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 16,
  },
  rightContainerLarge: {
    justifyContent: 'flex-start',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  centerLabel: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
  },
  centerText: {
    fontSize: 14,
    color: '#000000',
  },
  largeScreenLabel: {
    justifyContent: 'center',
  },
  largeNumber: {
    fontSize: 35,
    fontWeight: '700',
    color: '#000000',
  },
  largeText: {
    fontSize: 18,
    color: '#000000',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    minHeight: 28,
  },
  labelContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 6,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    flexShrink: 0,
  },
  labelText: {
    fontSize: 11,
    color: '#000000',
    flex: 1,
  },
  labelStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flexShrink: 0,
  },
  countText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  percentageText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000000',
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    flex: 1,
  },
  modalCloseButton: {
    fontSize: 28,
    color: '#6b7280',
    fontWeight: '300',
    padding: 5,
  },
  modalStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  modalStatCard: {
    flex: 1,
    backgroundColor: '#DC2626',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  modalStatNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  modalStatLabel: {
    fontSize: 12,
    color: '#ffffff',
    textAlign: 'center',
    opacity: 0.9,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  modalVehicleList: {
    maxHeight: 300,
    marginBottom: 20,
  },
  vehicleDetailCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  vehicleDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  vehicleDetailLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  vehicleDetailValue: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '600',
  },
  statusBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  modalCloseBtn: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  modalCloseBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default StocksOverview;