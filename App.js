//App.js - I-Track v47.0.1 - WEB SYNC COMPLETE - Updated November 5, 2025

// 🚨 IMMEDIATE StyleSheet crash protection - MUST be first
if (typeof StyleSheet === 'undefined') {
    global.StyleSheet = {
        create: (styles) => styles,
        flatten: (style) => style,
        compose: (...styles) => Object.assign({}, ...styles)
    };
}

// ⚠️ CRITICAL: Import StyleSheet fix FIRST to ensure compatibility
import './utils/StyleSheetFix';

import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';

// Screens
import LoginScreen from './screens/LoginScreen';
import DriverDashboard from './screens/DriverDashboard';
import NewDriverDashboard from './components/NewDriverDashboard';
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
import ProfileScreen from './screens/ProfileScreen';
import TestDriveBookingScreen from './screens/TestDriveBookingScreen';
import TestDriveManagementScreen from './screens/TestDriveManagementScreen';
import BookingDetailsScreen from './screens/BookingDetailsScreen';
import ThemeProvider from './context/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';

// New Unified Drawer Component
import UnifiedDrawer from './components/UnifiedDrawer';

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

// ✅ Sales Agent Drawer
function AgentDrawer() {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerStyle: { 
          backgroundColor: '#e50914',
          elevation: 4,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 3,
        },
        headerTintColor: '#ffffff',
        drawerActiveTintColor: '#e50914',
        drawerLabelStyle: { fontSize: 16, fontWeight: '500' },
        drawerStyle: { backgroundColor: '#e50914' },
        drawerContentStyle: { backgroundColor: '#e50914' },
        drawerItemStyle: { marginVertical: 2 },
        drawerActiveBackgroundColor: 'rgba(255,255,255,0.15)',
        drawerInactiveTintColor: 'rgba(255,255,255,0.85)',
        headerTitleStyle: { fontWeight: '700' },
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
      <Drawer.Screen 
        name="TestDriveBooking" 
        component={TestDriveBookingScreen} 
        options={{ title: 'Book Test Drive' }} 
      />
      <Drawer.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ title: 'My Profile' }} 
      />
    </Drawer.Navigator>
  );
}

// ✅ Admin Drawer with User Management
function AdminDrawer() {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerStyle: { 
          backgroundColor: '#e50914',
          elevation: 4,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 3,
        },
        headerTintColor: '#ffffff',
        drawerActiveTintColor: '#e50914',
        drawerLabelStyle: { fontSize: 16, fontWeight: '500' },
        drawerStyle: { backgroundColor: '#e50914' },
        drawerContentStyle: { backgroundColor: '#e50914' },
        drawerItemStyle: { marginVertical: 2 },
        drawerActiveBackgroundColor: 'rgba(255,255,255,0.15)',
        drawerInactiveTintColor: 'rgba(255,255,255,0.85)',
        headerTitleStyle: { fontWeight: '700' },
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
      <Drawer.Screen 
        name="TestDriveManagement" 
        component={TestDriveManagementScreen} 
        options={{ title: 'Approve Test Drives' }} 
      />
      <Drawer.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ title: 'My Profile' }} 
      />
    </Drawer.Navigator>
  );
}

// ✅ Manager Drawer
function ManagerDrawer() {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerStyle: { 
          backgroundColor: '#e50914',
          elevation: 4,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 3,
        },
        headerTintColor: '#ffffff',
        drawerActiveTintColor: '#e50914',
        drawerLabelStyle: { fontSize: 16, fontWeight: '500' },
        drawerStyle: { backgroundColor: '#e50914' },
        drawerContentStyle: { backgroundColor: '#e50914' },
        drawerItemStyle: { marginVertical: 2 },
        drawerActiveBackgroundColor: 'rgba(255,255,255,0.15)',
        drawerInactiveTintColor: 'rgba(255,255,255,0.85)',
        headerTitleStyle: { fontWeight: '700' },
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
      <Drawer.Screen 
        name="TestDriveBooking" 
        component={TestDriveBookingScreen} 
        options={{ title: 'Book Test Drive' }} 
      />
      <Drawer.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ title: 'My Profile' }} 
      />
    </Drawer.Navigator>
  );
}

// ✅ Supervisor Drawer
function SupervisorDrawer() {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerStyle: { 
          backgroundColor: '#e50914',
          elevation: 4,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 3,
        },
        headerTintColor: '#ffffff',
        drawerActiveTintColor: '#e50914',
        drawerLabelStyle: { fontSize: 16, fontWeight: '500' },
        drawerStyle: { backgroundColor: '#e50914' },
        drawerContentStyle: { backgroundColor: '#e50914' },
        drawerItemStyle: { marginVertical: 2 },
        drawerActiveBackgroundColor: 'rgba(255,255,255,0.15)',
        drawerInactiveTintColor: 'rgba(255,255,255,0.85)',
        headerTitleStyle: { fontWeight: '700' },
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
      <Drawer.Screen 
        name="TestDriveBooking" 
        component={TestDriveBookingScreen} 
        options={{ title: 'Book Test Drive' }} 
      />
      <Drawer.Screen 
        name="TestDriveManagement" 
        component={TestDriveManagementScreen} 
        options={{ title: 'Approve Test Drives' }} 
      />
      <Drawer.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ title: 'My Profile' }} 
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
        // Add timeout to AsyncStorage calls to prevent hanging
        const asyncStorageWithTimeout = async (key, timeout = 5000) => {
          return Promise.race([
            AsyncStorage.getItem(key),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error(`AsyncStorage timeout for ${key}`)), timeout)
            )
          ]);
        };

        const userToken = await asyncStorageWithTimeout('userToken');
        const userRole = await asyncStorageWithTimeout('role');
        const userName = await asyncStorageWithTimeout('userName');

        console.log('🔍 App startup check:', { userToken, userRole, userName });

        if (userToken === 'authenticated' && userRole && userName) {
          // Map roles to their respective screens - USE UNIFIED DRAWER FOR ALL
          const roleRouteMap = {
            'Admin': 'UnifiedDrawer',
            'Manager': 'UnifiedDrawer',
            'Sales Agent': 'UnifiedDrawer',
            'Driver': 'DriverDashboard',
            'Dispatch': 'UnifiedDrawer',
            'Supervisor': 'UnifiedDrawer'
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
        console.error('❌ Error details:', err.message);
        // Always fallback to LoginScreen on error
        setInitialRoute('LoginScreen');
      } finally {
        console.log('🔍 App initialization complete');
        setIsReady(true);
      }
    }
    
    checkLogin();
  }, []);

  if (!isReady) {
    return null; // Could add a loading screen here
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <NavigationContainer>
        <Stack.Navigator 
          initialRouteName={initialRoute}
          screenOptions={{
            headerStyle: { 
              backgroundColor: '#e50914',
              elevation: 4,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3,
            },
            headerTintColor: '#ffffff',
            headerTitleStyle: { 
              fontWeight: '700',
              fontSize: 18,
              color: '#ffffff'
            },
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
          {/* NEW: Unified Drawer for all roles except Driver */}
          <Stack.Screen 
            name="UnifiedDrawer" 
            component={UnifiedDrawer} 
            options={{ headerShown: false }} 
          />
          
          {/* Legacy Drawers - keeping for backward compatibility */}
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
            component={NewDriverDashboard} 
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
          <Stack.Screen 
            name="Profile" 
            component={ProfileScreen} 
            options={{ title: 'My Profile' }} 
          />
          <Stack.Screen 
            name="TestDriveBookingScreen" 
            component={TestDriveBookingScreen} 
            options={{ title: 'Book Test Drive' }} 
          />
          <Stack.Screen 
            name="TestDriveManagementScreen" 
            component={TestDriveManagementScreen} 
            options={{ title: 'Test Drive Management' }} 
          />
          <Stack.Screen 
            name="BookingDetails" 
            component={BookingDetailsScreen} 
            options={{ title: 'Booking Details' }} 
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
  </ErrorBoundary>
  );
}
