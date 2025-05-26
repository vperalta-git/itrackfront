import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import AdminDashboard from './AdminDashboard'; // Your admin dashboard component
import AgentDashboard from './AgentDashboard'; // Sales agent dashboard component
import DispatchDashboard from './DispatchDashboard'; // Dispatch dashboard component
import VehicleProgressScreen from './VehicleProgressScreen'; // Vehicle progress screen
import HistoryScreen from './HistoryScreen'; // Release history screen

const Drawer = createDrawerNavigator();

function AdminDrawer() {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#CB1E2A' },
        headerTintColor: '#fff',
        drawerActiveTintColor: '#CB1E2A',
      }}
    >
      <Drawer.Screen
        name="AdminDashboard"
        component={AdminDashboard}
        options={{ title: 'Admin Dashboard' }}
      />
      <Drawer.Screen
        name="AgentDashboard"
        component={AgentDashboard}
        options={{ title: 'Agent Dashboard' }}
      />
      <Drawer.Screen
        name="DispatchDashboard"
        component={DispatchDashboard}
        options={{ title: 'Dispatch Dashboard' }}
      />
      <Drawer.Screen
        name="VehicleProgress"
        component={VehicleProgressScreen}
        options={{ title: 'Vehicle Progress' }}
      />
      <Drawer.Screen
        name="History"
        component={HistoryScreen}
        options={{ title: 'Release History' }}
      />
    </Drawer.Navigator>
  );
}

export default AdminDrawer;
