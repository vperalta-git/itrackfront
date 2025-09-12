//App.js
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigat      <Drawer.Screen 
        name="HistoryScreen" 
        component={HistoryScreen} 
        options={{ title: 'System History' }} 
      />
    </Drawer.Navigator>
  );
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';

// Screens
import LoginScreen from './screens/LoginScreen';
import DriverDashboard from './screens/DriverDashboard';
import AgentDashboard from './screens/AgentDashboard';
import AdminDashboard from './screens/AdminDashboard';
import ManagerDashboard from './screens/ManagerDashboard';
import SupervisorDashboard from './screens/SupervisorDashboard';
import VehicleProgressScreen from './screens/VehicleProgressScreen';
import VehicleStatusScreen from './screens/VehicleStatusScreen';
import DispatchDashboard from './screens/DispatchDashboard';
import DispatchVehicleDetail from './screens/DispatchVehicleDetail';
import HistoryScreen from './screens/HistoryScreen';
import AdminVehicleTracking from './screens/AdminVehicleTracking';
import UserManagementScreen from './screens/UserManagementScreen';
import DriverAllocation from './screens/DriverAllocation';
// import TestMapScreen from './screens/TestMapScreen'; // Removed test map feature
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import SignUpScreen from './screens/SignUpScreen';
import UserProfile from './screens/UserProfile';
import ThemeProvider from './context/ThemeContext';

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

// ✅ Sales Agent Drawer
function AgentDrawer() {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#CB1E2A' },
        headerTintColor: '#fff',
        drawerActiveTintColor: '#CB1E2A',
        drawerLabelStyle: { fontSize: 16 },
      }}
    >
      <Drawer.Screen 
        name="AgentDashboard" 
        component={AgentDashboard} 
        options={{ title: 'Sales Agent Dashboard' }} 
      />
      <Drawer.Screen 
        name="VehicleProgress" 
        component={VehicleProgressScreen} 
        options={{ title: 'Vehicle Progress' }} 
      />
      <Drawer.Screen 
        name="VehicleStatus" 
        component={VehicleStatusScreen} 
        options={{ title: 'Vehicle Status' }} 
      />
      <Drawer.Screen 
        name="History" 
        component={HistoryScreen} 
        options={{ title: 'Service History' }} 
      />
    </Drawer.Navigator>
  );
}

// ✅ Admin Drawer with User Management
function AdminDrawer() {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#CB1E2A' },
        headerTintColor: '#fff',
        drawerActiveTintColor: '#CB1E2A',
        drawerLabelStyle: { fontSize: 16 },
      }}
    >
      <Drawer.Screen 
        name="AdminDashboard" 
        component={AdminDashboard} 
        options={{ title: 'Admin Dashboard' }} 
      />
      <Drawer.Screen 
        name="UserManagement" 
        component={UserManagementScreen} 
        options={{ title: 'User Management' }} 
      />
      <Drawer.Screen 
        name="AdminVehicleTracking" 
        component={AdminVehicleTracking} 
        options={{ title: 'Vehicle Tracking' }} 
      />
      <Drawer.Screen 
        name="DriverAllocation" 
        component={DriverAllocation} 
        options={{ title: 'Driver Allocation' }} 
      />
      <Drawer.Screen 
        name="AgentDashboard" 
        component={AgentDashboard} 
        options={{ title: 'Sales Operations' }} 
      />
      <Drawer.Screen 
        name="DispatchDashboard" 
        component={DispatchDashboard} 
        options={{ title: 'Dispatch Center' }} 
      />
      <Drawer.Screen 
        name="VehicleProgress" 
        component={VehicleProgressScreen} 
        options={{ title: 'Vehicle Progress' }} 
      />
      <Drawer.Screen 
        name="History" 
        component={HistoryScreen} 
        options={{ title: 'System History' }} 
      />
    </Drawer.Navigator>
  );
}

// ✅ Manager Drawer
function ManagerDrawer() {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#CB1E2A' },
        headerTintColor: '#fff',
        drawerActiveTintColor: '#CB1E2A',
        drawerLabelStyle: { fontSize: 16 },
      }}
    >
      <Drawer.Screen 
        name="ManagerDashboard" 
        component={ManagerDashboard} 
        options={{ title: 'Manager Dashboard' }} 
      />
      <Drawer.Screen 
        name="DriverAllocation" 
        component={DriverAllocation} 
        options={{ title: 'Driver Allocation' }} 
      />
      <Drawer.Screen 
        name="AgentDashboard" 
        component={AgentDashboard} 
        options={{ title: 'Sales Operations' }} 
      />
      <Drawer.Screen 
        name="VehicleProgress" 
        component={VehicleProgressScreen} 
        options={{ title: 'Vehicle Progress' }} 
      />
      <Drawer.Screen 
        name="History" 
        component={HistoryScreen} 
        options={{ title: 'Reports' }} 
      />
    </Drawer.Navigator>
  );
}

// ✅ Supervisor Drawer
function SupervisorDrawer() {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#CB1E2A' },
        headerTintColor: '#fff',
        drawerActiveTintColor: '#CB1E2A',
        drawerLabelStyle: { fontSize: 16 },
      }}
    >
      <Drawer.Screen 
        name="SupervisorDashboard" 
        component={SupervisorDashboard} 
        options={{ title: 'Supervisor Dashboard' }} 
      />
      <Drawer.Screen 
        name="VehicleProgress" 
        component={VehicleProgressScreen} 
        options={{ title: 'Vehicle Progress' }} 
      />
      <Drawer.Screen 
        name="History" 
        component={HistoryScreen} 
        options={{ title: 'Supervision History' }} 
      />
    </Drawer.Navigator>
  );
}

export default function App() {
  const [initialRoute, setInitialRoute] = useState('LoginScreen');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function checkLogin() {
      try {
        const userToken = await AsyncStorage.getItem('userToken');
        const userRole = await AsyncStorage.getItem('userRole');
        const userName = await AsyncStorage.getItem('userName');

        console.log('🔍 App startup check:', { userToken, userRole, userName });

        if (userToken === 'authenticated' && userRole && userName) {
          // Map roles to their respective screens
          const roleRouteMap = {
            'Admin': 'AdminDrawer',
            'Manager': 'ManagerDrawer',
            'Sales Agent': 'AgentDrawer',
            'Driver': 'DriverDashboard',
            'Dispatch': 'DispatchDashboard',
            'Supervisor': 'SupervisorDrawer'
          };

          const targetRoute = roleRouteMap[userRole] || 'LoginScreen';
          console.log('✅ Auto-login:', userRole, '→', targetRoute);
          setInitialRoute(targetRoute);
        } else {
          console.log('❌ No valid session found, redirecting to login');
          setInitialRoute('LoginScreen');
        }
      } catch (err) {
        console.error('❌ Error checking login state:', err);
        setInitialRoute('LoginScreen');
      } finally {
        setIsReady(true);
      }
    }
    
    checkLogin();
  }, []);

  if (!isReady) {
    return null; // Could add a loading screen here
  }

  return (
    <ThemeProvider>
      <NavigationContainer>
        <Stack.Navigator 
          initialRouteName={initialRoute}
          screenOptions={{
            headerStyle: { backgroundColor: '#CB1E2A' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: 'bold' },
          }}
        >
          {/* Authentication Screens */}
          <Stack.Screen 
            name="LoginScreen" 
            component={LoginScreen} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="SignUpScreen" 
            component={SignUpScreen} 
            options={{ title: 'Create Account' }} 
          />
          <Stack.Screen 
            name="ForgotPasswordScreen" 
            component={ForgotPasswordScreen} 
            options={{ title: 'Reset Password' }} 
          />

          {/* Main Dashboard Screens */}
          <Stack.Screen 
            name="AdminDrawer" 
            component={AdminDrawer} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="ManagerDrawer" 
            component={ManagerDrawer} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="AgentDrawer" 
            component={AgentDrawer} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="SupervisorDrawer" 
            component={SupervisorDrawer} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="DriverDashboard" 
            component={DriverDashboard} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="DispatchDashboard" 
            component={DispatchDashboard} 
            options={{ headerShown: false }} 
          />

          {/* Individual Component Screens */}
          <Stack.Screen 
            name="AdminDashboard" 
            component={AdminDashboard} 
            options={{ title: 'Admin Dashboard' }} 
          />
          <Stack.Screen 
            name="ManagerDashboard" 
            component={ManagerDashboard} 
            options={{ title: 'Manager Dashboard' }} 
          />
          <Stack.Screen 
            name="AgentDashboard" 
            component={AgentDashboard} 
            options={{ title: 'Sales Agent Dashboard' }} 
          />
          <Stack.Screen 
            name="SupervisorDashboard" 
            component={SupervisorDashboard} 
            options={{ title: 'Supervisor Dashboard' }} 
          />

          {/* Utility Screens */}
          <Stack.Screen 
            name="UserManagement" 
            component={UserManagementScreen} 
            options={{ title: 'User Management' }} 
          />
          <Stack.Screen 
            name="DriverAllocation" 
            component={DriverAllocation} 
            options={{ title: 'Driver Allocation' }} 
          />
          <Stack.Screen 
            name="VehicleProgress" 
            component={VehicleProgressScreen} 
            options={{ title: 'Vehicle Progress' }} 
          />
          <Stack.Screen 
            name="VehicleStatus" 
            component={VehicleStatusScreen} 
            options={{ title: 'Vehicle Status' }} 
          />
          <Stack.Screen 
            name="AdminVehicleTracking" 
            component={AdminVehicleTracking} 
            options={{ title: 'Vehicle Tracking' }} 
          />
          <Stack.Screen 
            name="DispatchDetail" 
            component={DispatchVehicleDetail} 
            options={{ title: 'Vehicle Details' }} 
          />
          <Stack.Screen 
            name="HistoryScreen" 
            component={HistoryScreen} 
            options={{ title: 'History' }} 
          />
          <Stack.Screen 
            name="UserProfile" 
            component={UserProfile} 
            options={{ title: 'User Profile' }} 
          />

          {/* Testing & Development - Removed TestMapScreen */}
          {/* 
          <Stack.Screen 
            name="TestMap" 
            component={TestMapScreen} 
            options={{ title: 'Map Test (Dev)' }} 
          />
          */}
        </Stack.Navigator>
      </NavigationContainer>

      <Toast />
    </ThemeProvider>
  );
}
