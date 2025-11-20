import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Image, 
  ScrollView, 
  Alert,
  Dimensions
} from 'react-native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';

// Import all screens
import AdminDashboard from '../screens/AdminDashboard';
import AgentDashboard from '../screens/AgentDashboard';
import DispatchDashboard from '../screens/DispatchDashboard';
import DriverDashboard from '../screens/DriverDashboard';
import VehicleProgressScreen from '../screens/VehicleProgressScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import VehicleListView from './VehicleListView';
import ProfileScreen from '../screens/ProfileScreen';

// Import screen components that need to be created
import InventoryScreen from '../screens/InventoryScreen';
import ServiceRequestScreen from '../screens/ServiceRequestScreen';
import TestDriveScreen from '../screens/TestDriveScreen';
import UserManagementScreen from '../screens/UserManagementScreen';
import ReportsScreen from '../screens/ReportsScreen';

// Import icons (using the same icons as web)
const dashboardIcon = require('../assets/icons/dashboard.png');
const reportsIcon = require('../assets/icons/reports.png');
const stocksIcon = require('../assets/icons/stocks.png');
const requestIcon = require('../assets/icons/request.png');
const shipmentsIcon = require('../assets/icons/shipments.png');
const usersIcon = require('../assets/icons/users.png');
const signOutIcon = require('../assets/icons/signout.png');
const driverIcon = require('../assets/icons/driverallocation.png');
const testDriveIcon = require('../assets/icons/testdrive.png');
const itrackLogo = require('../assets/icons/itrackwhite.png');

const Drawer = createDrawerNavigator();
const { width } = Dimensions.get('window');

// Custom Drawer Content Component (matching web sidebar)
function CustomDrawerContent(props) {
  const navigation = useNavigation();
  const [userRole, setUserRole] = useState(null);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const getUserInfo = async () => {
      try {
        const role = await AsyncStorage.getItem('userRole');
        const name = await AsyncStorage.getItem('accountName') || await AsyncStorage.getItem('userName');
        setUserRole(role);
        setUserName(name || 'User');
      } catch (error) {
        console.error('Error getting user info:', error);
      }
    };
    getUserInfo();
  }, []);

  // Menu items matching web sidebar exactly
  const menuItems = [
    { name: "Dashboard", icon: dashboardIcon, screen: "Dashboard", roles: ['all'] },
    { name: "Vehicle Stocks", icon: stocksIcon, screen: "Inventory", roles: ['Admin', 'Manager', 'Sales Agent', 'Supervisor'] },
    { name: "Vehicle Preperation", icon: requestIcon, screen: "ServiceRequest", roles: ['Admin', 'Manager', 'Sales Agent', 'Supervisor'] },
    { name: "Driver Allocation", icon: driverIcon, screen: "DriverAllocation", roles: ['Admin', 'Manager', 'Dispatch'] },
    { name: "Test Drive", icon: testDriveIcon, screen: "TestDrive", roles: ['Admin', 'Manager', 'Sales Agent', 'Supervisor'] },
    { name: "User Management", icon: usersIcon, screen: "UserManagement", roles: ['Admin'] },
    { name: "Reports", icon: reportsIcon, screen: "Reports", roles: ['all'] },
    { name: "Vehicle Tracking", icon: shipmentsIcon, screen: "VehicleTracking", roles: ['Admin', 'Manager', 'Dispatch'] },
    { name: "Vehicle Progress", icon: shipmentsIcon, screen: "VehicleProgress", roles: ['Admin', 'Manager', 'Dispatch'] },
    { name: "History", icon: reportsIcon, screen: "History", roles: ['Admin', 'Manager'] },
    { name: "My Profile", icon: usersIcon, screen: "Profile", roles: ['all'] }
  ];

  // Filter menu based on role (matching web logic)
  const getFilteredMenu = () => {
    if (!userRole) return menuItems;
    
    // Filter for Sales Agent, Manager, and Supervisor (matching web)
    if (['Sales Agent', 'Manager', 'Supervisor'].includes(userRole)) {
      return menuItems.filter(item => 
        item.roles.includes('all') || 
        item.roles.includes(userRole) ||
        ['Dashboard', 'Reports', 'Vehicle Stocks', 'Vehicle Preperation', 'Test Drive', 'My Profile'].includes(item.name)
      );
    }
    
    // Admin gets all items
    if (userRole === 'Admin') {
      return menuItems;
    }
    
    // Driver gets limited access
    if (userRole === 'Driver') {
      return menuItems.filter(item => 
        ['Dashboard', 'My Profile'].includes(item.name)
      );
    }
    
    // Dispatch gets dispatch-related items
    if (userRole === 'Dispatch') {
      return menuItems.filter(item => 
        item.roles.includes('all') || 
        item.roles.includes('Dispatch') ||
        ['Dashboard', 'Driver Allocation', 'Vehicle Tracking', 'Vehicle Progress', 'My Profile'].includes(item.name)
      );
    }
    
    return menuItems;
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              navigation.reset({
                index: 0,
                routes: [{ name: 'LoginScreen' }],
              });
            } catch (error) {
              console.error('Logout error:', error);
            }
          },
        },
      ]
    );
  };

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.drawerContainer}>
      {/* Header with logo (matching web) */}
      <View style={styles.drawerHeader}>
        <Image source={itrackLogo} style={styles.logo} />
        <Text style={styles.appTitle}>I-TRACK</Text>
        <Text style={styles.userWelcome}>Welcome, {userName}</Text>
        <Text style={styles.userRole}>{userRole}</Text>
      </View>

      {/* Menu Items */}
      <View style={styles.menuContainer}>
        {getFilteredMenu().map((item) => (
          <TouchableOpacity
            key={item.name}
            style={[
              styles.menuItem,
              props.state.routeNames[props.state.index] === item.screen && styles.activeMenuItem
            ]}
            onPress={() => {
              if (item.screen === 'Dashboard') {
                // Navigate to appropriate dashboard based on role
                if (userRole === 'Driver') {
                  props.navigation.navigate('DriverDashboard');
                } else if (userRole === 'Dispatch') {
                  props.navigation.navigate('DispatchDashboard');
                } else if (userRole === 'Sales Agent') {
                  props.navigation.navigate('AgentDashboard');
                } else {
                  props.navigation.navigate('AdminDashboard');
                }
              } else {
                props.navigation.navigate(item.screen);
              }
            }}
          >
            <Image source={item.icon} style={styles.menuIcon} />
            <Text style={[
              styles.menuText,
              props.state.routeNames[props.state.index] === item.screen && styles.activeMenuText
            ]}>
              {item.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sign Out Button (matching web) */}
      <View style={styles.signOutContainer}>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Image source={signOutIcon} style={styles.signOutIcon} />
          <Text style={styles.signOutText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </DrawerContentScrollView>
  );
}

// Main Unified Drawer Navigator
export default function UnifiedDrawer() {
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const getRole = async () => {
      const storedRole = await AsyncStorage.getItem('userRole');
      setUserRole(storedRole);
    };
    getRole();
  }, []);

  if (!userRole) return null;

  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: '#e50914' },
        headerTintColor: '#ffffff',
        drawerStyle: { backgroundColor: '#6c757d', width: width * 0.8 },
        headerTitle: 'I-Track System',
      }}
    >
      {/* Dashboard Screens */}
      <Drawer.Screen
        name="AdminDashboard"
        component={AdminDashboard}
        options={{ title: 'Admin Dashboard' }}
      />
      <Drawer.Screen
        name="AgentDashboard"
        component={AgentDashboard}
        options={{ title: 'Sales Agent Dashboard' }}
      />
      <Drawer.Screen
        name="DispatchDashboard"
        component={DispatchDashboard}
        options={{ title: 'Dispatch Dashboard' }}
      />
      <Drawer.Screen
        name="DriverDashboard"
        component={DriverDashboard}
        options={{ title: 'Driver Dashboard' }}
      />

      {/* Main Feature Screens (matching web sidebar) */}
      <Drawer.Screen
        name="Inventory"
        component={InventoryScreen}
        options={{ title: 'Vehicle Stocks' }}
      />
      <Drawer.Screen
        name="ServiceRequest"
        component={ServiceRequestScreen}
        options={{ title: 'Vehicle Preperation' }}
      />
      <Drawer.Screen
        name="DriverAllocation"
        component={AdminDashboard} // AdminDashboard handles driver allocation
        options={{ title: 'Driver Allocation' }}
      />
      <Drawer.Screen
        name="TestDrive"
        component={TestDriveScreen}
        options={{ title: 'Test Drive' }}
      />
      <Drawer.Screen
        name="UserManagement"
        component={UserManagementScreen}
        options={{ title: 'User Management' }}
      />
      <Drawer.Screen
        name="Reports"
        component={ReportsScreen}
        options={{ title: 'Reports' }}
      />

      {/* Additional Feature Screens */}
      <Drawer.Screen
        name="VehicleTracking"
        component={VehicleListView}
        options={{ title: 'Vehicle Tracking' }}
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
      <Drawer.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'My Profile' }}
      />
      
      {/* Admin Only */}
      {userRole === 'Admin' && (
        <Drawer.Screen
          name="ChangePassword"
          component={ChangePasswordScreen}
          options={{ title: 'Change Password' }}
        />
      )}
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    backgroundColor: '#6c757d',
  },
  drawerHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    alignItems: 'center',
  },
  logo: {
    width: 60,
    height: 60,
    marginBottom: 10,
    tintColor: '#fff',
  },
  appTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  userWelcome: {
    color: '#ccc',
    fontSize: 16,
    marginBottom: 2,
  },
  userRole: {
    color: '#e50914',
    fontSize: 14,
    fontWeight: '600',
  },
  menuContainer: {
    flex: 1,
    paddingVertical: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginHorizontal: 10,
    borderRadius: 8,
  },
  activeMenuItem: {
    backgroundColor: '#e50914',
  },
  menuIcon: {
    width: 24,
    height: 24,
    marginRight: 15,
    tintColor: '#fff',
  },
  menuText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  activeMenuText: {
    fontWeight: 'bold',
  },
  signOutContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: '#e9ecef',
    borderRadius: 8,
  },
  signOutIcon: {
    width: 20,
    height: 20,
    marginRight: 10,
    tintColor: '#fff',
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});