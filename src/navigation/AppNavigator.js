import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { TouchableOpacity, Text } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../constants/theme';
import { ROLES } from '../constants/roles';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';

// Dashboard Screens
import AdminDashboard from '../screens/dashboard/AdminDashboard';
import DriverDashboard from '../screens/dashboard/DriverDashboard';
import SalesAgentDashboard from '../screens/dashboard/SalesAgentDashboard';
import DispatchDashboard from '../screens/dashboard/DispatchDashboard';

// Placeholder screens (to be implemented)
import PlaceholderScreen from '../screens/common/PlaceholderScreen';
import InventoryScreen from '../screens/inventory/InventoryScreen';
import ReportsAuditScreen from '../screens/reports/ReportsAuditScreen';
import DriverAllocationScreen from '../screens/allocations/DriverAllocationScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

// Drawer Navigator for authenticated users
const AppDrawer = () => {
  const { user, logout } = useAuth();

  // Determine which dashboard to show based on role
  const getDashboardScreen = () => {
    switch (user?.role) {
      case ROLES.ADMIN:
      case ROLES.MANAGER:
        return AdminDashboard;
      case ROLES.DRIVER:
        return DriverDashboard;
      case ROLES.SALES_AGENT:
        return SalesAgentDashboard;
      case ROLES.DISPATCH:
        return DispatchDashboard;
      case ROLES.SUPERVISOR:
        return AdminDashboard; // Supervisor uses admin dashboard for now
      default:
        return PlaceholderScreen;
    }
  };

  return (
    <Drawer.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: COLORS.white,
        headerTitleStyle: { fontWeight: 'bold' },
        drawerActiveTintColor: COLORS.primary,
        drawerInactiveTintColor: COLORS.gray600,
      }}
    >
      <Drawer.Screen
        name="Dashboard"
        component={getDashboardScreen()}
        options={{ title: 'Dashboard' }}
      />
      
      {/* Admin/Manager/Supervisor screens */}
      {(user?.role === ROLES.ADMIN || user?.role === ROLES.MANAGER || user?.role === ROLES.SUPERVISOR) && (
        <>
          <Drawer.Screen
            name="Inventory"
            component={InventoryScreen}
            options={{ title: 'Vehicle Stocks' }}
          />
          <Drawer.Screen
            name="ServiceRequest"
            component={PlaceholderScreen}
            options={{ title: 'Vehicle Preparation' }}
          />
          <Drawer.Screen
            name="Release"
            component={PlaceholderScreen}
            options={{ title: 'Release' }}
          />
          <Drawer.Screen
            name="Allocations"
            component={DriverAllocationScreen}
            options={{ title: 'Driver Allocation' }}
          />
          <Drawer.Screen
            name="TestDrive"
            component={PlaceholderScreen}
            options={{ title: 'Test Drive' }}
          />
          <Drawer.Screen
            name="UserManagement"
            component={PlaceholderScreen}
            options={{ title: 'User Management' }}
          />
          <Drawer.Screen
            name="AuditTrail"
            component={ReportsAuditScreen}
            options={{ title: 'Audit Trail' }}
          />
          <Drawer.Screen
            name="Reports"
            component={ReportsAuditScreen}
            options={{ title: 'Reports' }}
          />
        </>
      )}
      
      {/* Sales Agent screens - filtered menu matching web */}
      {user?.role === ROLES.SALES_AGENT && (
        <>
          <Drawer.Screen
            name="Inventory"
            component={InventoryScreen}
            options={{ title: 'Vehicle Stocks' }}
          />
          <Drawer.Screen
            name="ServiceRequest"
            component={PlaceholderScreen}
            options={{ title: 'Vehicle Preparation' }}
          />
          <Drawer.Screen
            name="Allocations"
            component={DriverAllocationScreen}
            options={{ title: 'Driver Allocation' }}
          />
          <Drawer.Screen
            name="TestDrive"
            component={PlaceholderScreen}
            options={{ title: 'Test Drive' }}
          />
          <Drawer.Screen
            name="Reports"
            component={ReportsAuditScreen}
            options={{ title: 'Reports' }}
          />
        </>
      )}
      
      {/* Common screens for all roles */}
      <Drawer.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'My Profile' }}
      />
      
      {/* Dispatch screens */}
      {user?.role === ROLES.DISPATCH && (
        <>
          <Drawer.Screen
            name="DispatchAssignments"
            component={PlaceholderScreen}
            options={{ title: 'Assignments' }}
          />
          <Drawer.Screen
            name="DispatchChecklist"
            component={PlaceholderScreen}
            options={{ title: 'Task Checklist' }}
          />
        </>
      )}
      
      {/* Logout */}
      <Drawer.Screen
        name="Logout"
        component={PlaceholderScreen}
        options={{
          title: 'Logout',
        }}
        listeners={{
          focus: () => {
            logout();
          },
        }}
      />
    </Drawer.Navigator>
  );
};

// Main Navigation Container
const AppNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null; // Or a loading screen
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          </>
        ) : (
          <Stack.Screen name="Main" component={AppDrawer} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
