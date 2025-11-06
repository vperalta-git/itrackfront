import React from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { PieChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');

const StocksOverview = ({ inventory = [], theme }) => {
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
      '#e50914', // Red (Isuzu red)
      '#005d9b', // Blue
      '#231f20', // Dark gray/black
      '#234a5c', // Dark blue
      '#709cb7', // Light blue
      '#00aaff', // Bright blue
      '#dc2626', // Red variant
      '#059669', // Green
      '#f59e0b', // Yellow/Orange
      '#8b5cf6', // Purple
      '#ef4444', // Light red
      '#6b7280'  // Gray
    ];

    return Object.entries(unitCounts)
      .map(([name, count], index) => ({
        name: name,
        population: count,
        color: colors[index % colors.length],
        legendFontColor: theme?.text || '#374151',
        legendFontSize: 12,
      }))
      .sort((a, b) => b.population - a.population) // Sort by count descending
      .slice(0, 10); // Limit to top 10 to avoid overcrowding
  };

  // Process status data for secondary chart
  const processStatusData = () => {
    if (!inventory || inventory.length === 0) {
      return [];
    }

    const statusCounts = inventory.reduce((acc, item) => {
      const status = item.status || 'Available';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const statusColors = {
      'Available': '#059669',
      'Allocated': '#f59e0b',
      'In Use': '#3b82f6',
      'In Dispatch': '#e50914',
      'Maintenance': '#ef4444',
      'Reserved': '#8b5cf6',
      'In Transit': '#dc2626',
      'Released': '#6b7280'
    };

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status,
      population: count,
      color: statusColors[status] || '#6b7280',
      legendFontColor: theme?.text || '#374151',
      legendFontSize: 12,
    }));
  };

  const unitData = processInventoryData();
  const statusData = processStatusData();

  const chartConfig = {
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
  };

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

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme?.card || '#ffffff' }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: theme?.text || '#374151' }]}>
        Stocks Overview
      </Text>

      {/* Vehicle Models Distribution */}
      <View style={styles.chartSection}>
        <Text style={[styles.sectionTitle, { color: theme?.text || '#374151' }]}>
          Vehicle Models Distribution
        </Text>
        
        {unitData.length > 0 && (
          <PieChart
            data={unitData}
            width={width - 60}
            height={220}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            center={[10, 0]}
            hasLegend={true}
          />
        )}

        {/* Summary Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: theme?.text || '#374151' }]}>
              {inventory.length}
            </Text>
            <Text style={[styles.statLabel, { color: theme?.textSecondary || '#6b7280' }]}>
              Total Units
            </Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: theme?.text || '#374151' }]}>
              {unitData.length}
            </Text>
            <Text style={[styles.statLabel, { color: theme?.textSecondary || '#6b7280' }]}>
              Models
            </Text>
          </View>
        </View>
      </View>

      {/* Status Distribution */}
      {statusData.length > 1 && (
        <View style={styles.chartSection}>
          <Text style={[styles.sectionTitle, { color: theme?.text || '#374151' }]}>
            Status Distribution
          </Text>
          
          <PieChart
            data={statusData}
            width={width - 60}
            height={220}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            center={[10, 0]}
            hasLegend={true}
          />
        </View>
      )}

      {/* Top Models List */}
      <View style={styles.chartSection}>
        <Text style={[styles.sectionTitle, { color: theme?.text || '#374151' }]}>
          Top Vehicle Models
        </Text>
        
        <View style={styles.modelsList}>
          {unitData.slice(0, 5).map((item, index) => {
            const percentage = inventory.length > 0 
              ? ((item.population / inventory.length) * 100).toFixed(1) 
              : '0.0';
            
            return (
              <View key={item.name} style={styles.modelItem}>
                <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                <Text style={[styles.modelName, { color: theme?.text || '#374151' }]}>
                  {item.name}
                </Text>
                <View style={styles.modelStats}>
                  <Text style={[styles.modelCount, { color: theme?.text || '#374151' }]}>
                    {item.population}
                  </Text>
                  <Text style={[styles.modelPercentage, { color: theme?.textSecondary || '#6b7280' }]}>
                    ({percentage}%)
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    margin: 16,
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
  chartSection: {
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#374151',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  modelsList: {
    gap: 12,
  },
  modelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  modelName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  modelStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modelCount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  modelPercentage: {
    fontSize: 12,
    color: '#6b7280',
  },
  emptyState: {
    flex: 1,
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