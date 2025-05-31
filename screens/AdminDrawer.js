import React, { useEffect, useState } from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';

import AdminDashboard from './AdminDashboard';
import AgentDashboard from './AgentDashboard';
import DispatchDashboard from './DispatchDashboard';
import VehicleProgressScreen from './VehicleProgressScreen';
import HistoryScreen from './HistoryScreen';
import ChangePasswordScreen from './ChangePasswordScreen';

const Drawer = createDrawerNavigator();

export default function AdminDrawer() {
  const [role, setRole] = useState(null);

  useEffect(() => {
    const getRole = async () => {
      try {
        const storedRole = await AsyncStorage.getItem('userRole');
        console.log('🧠 Loaded role:', storedRole); // Debug log
        setRole(storedRole);
      } catch (error) {
        console.error('❌ Failed to load user role:', error);
      }
    };
    getRole();
  }, []);

  // Optional loading guard
  if (!role) return null;

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
        options={{
          title: 'Admin Dashboard',
          drawerIcon: ({ color, size }) => (
            <MaterialIcons name="admin-panel-settings" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="AgentDashboard"
        component={AgentDashboard}
        options={{
          title: 'Sales Agent Dashboard',
          drawerIcon: ({ color, size }) => (
            <MaterialIcons name="supervisor-account" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="DispatchDashboard"
        component={DispatchDashboard}
        options={{
          title: 'Dispatch Dashboard',
          drawerIcon: ({ color, size }) => (
            <MaterialIcons name="local-shipping" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="VehicleProgress"
        component={VehicleProgressScreen}
        options={{
          title: 'Vehicle Progress',
          drawerIcon: ({ color, size }) => (
            <MaterialIcons name="directions-car" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="History"
        component={HistoryScreen}
        options={{
          title: 'Release History',
          drawerIcon: ({ color, size }) => (
            <MaterialIcons name="history" size={size} color={color} />
          ),
        }}
      />

      {role === 'admin' && (
        <Drawer.Screen
          name="ChangePassword"
          component={ChangePasswordScreen}
          options={{
            title: 'Change Password',
            drawerIcon: ({ color, size }) => (
              <MaterialIcons name="lock" size={size} color={color} />
            ),
          }}
        />
      )}
    </Drawer.Navigator>
  );
}
