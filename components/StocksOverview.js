import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';

const { width } = Dimensions.get('window');

const StocksOverview = ({ inventory = [], theme }) => {
  const isLargeScreen = width > 1024;

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
        focused: index === 0, // Focus on the first (largest) item
      }))
      .sort((a, b) => b.count - a.count); // Sort by count descending
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

  // Get top 3 models for display
  const topModels = unitData.slice(0, 3);
  
  return (
    <View style={[styles.container, { backgroundColor: theme?.card || '#ffffff' }]}>
      <Text style={[styles.title, { color: theme?.text || '#374151' }]}>
        Stocks Overview
      </Text>

      <View style={styles.row}>
        {/* Left side - Labels */}
        <View style={styles.leftContainer}>
          <Text style={[styles.secondaryText, { color: theme?.textSecondary || '#666666' }]}>
            Vehicle Models
          </Text>
          <View style={styles.labelsContainer}>
            {topModels.map((item, index) => {
              const percentage = totalUnits > 0 
                ? ((item.count / totalUnits) * 100).toFixed(0) 
                : '0';
              return (
                <PieLabelRow
                  key={item.name}
                  label={item.name}
                  count={item.count}
                  percentage={percentage}
                  color={item.color}
                  theme={theme}
                />
              );
            })}
          </View>
        </View>

        {/* Separator */}
        <View style={styles.separator} />

        {/* Right side - Pie Chart */}
        <View style={[styles.rightContainer, isLargeScreen && styles.rightContainerLarge]}>
          <PieChart
            data={unitData}
            donut
            sectionAutoFocus
            radius={isLargeScreen ? 55 : 65}
            innerRadius={isLargeScreen ? 35 : 45}
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    textAlign: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 20,
  },
  leftContainer: {
    width: '50%',
    paddingLeft: 20,
    paddingRight: 10,
    justifyContent: 'center',
  },
  secondaryText: {
    color: '#666666',
    fontSize: 16,
    marginBottom: 20,
    fontWeight: '600',
  },
  labelsContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 12,
  },
  separator: {
    width: 1,
    backgroundColor: '#E0E0E0',
  },
  rightContainer: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    gap: 16,
  },
  rightContainerLarge: {
    justifyContent: 'flex-start',
    paddingVertical: 15,
    paddingHorizontal: 15,
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
  },
  labelContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  labelText: {
    fontSize: 14,
    color: '#000000',
    flex: 1,
  },
  labelStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  countText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  percentageText: {
    fontSize: 14,
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
});

export default StocksOverview;