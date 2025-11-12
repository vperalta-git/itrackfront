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
import AdminVehicleTracking from './AdminVehicleTracking';
import ProfileScreen from './ProfileScreen';
// ❌ Removed UserManagementScreen import

const Drawer = createDrawerNavigator();

export default function AdminDrawer() {
  const [role, setRole] = useState(null);

  useEffect(() => {
    const getRole = async () => {
      const storedRole = await AsyncStorage.getItem('userRole');
      setRole(storedRole);
    };
    getRole();
  }, []);

  if (!role) return null;

  return (
    <Drawer.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#e50914' },
        headerTintColor: '#fff',
        drawerActiveTintColor: '#e50914',
      }}
    >
      <Drawer.Screen
        name="AdminDashboard"
        component={AdminDashboard}
        options={{
          title: 'Driver Assignment',
          drawerIcon: ({ color, size }) => (
            <MaterialIcons name="assignment-ind" size={size} color={color} />
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
      <Drawer.Screen
        name="AdminVehicleTracking"
        component={AdminVehicleTracking}
        options={{
          title: 'Vehicle Tracking',
          drawerIcon: ({ color, size }) => (
            <MaterialIcons name="map" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'My Profile',
          drawerIcon: ({ color, size }) => (
            <MaterialIcons name="account-circle" size={size} color={color} />
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
