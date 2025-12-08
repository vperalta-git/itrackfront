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
import axios from 'axios';
import { buildApiUrl } from '../constants/api';

// Import all screens
import AdminDashboard from '../screens/AdminDashboard';
import AgentDashboard from '../screens/AgentDashboard';
import DriverDashboard from '../screens/DriverDashboard';
import DriverAllocation from '../screens/DriverAllocation';
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
import ReleaseScreen from '../screens/ReleaseScreen';
import VehicleAssignmentScreen from '../screens/VehicleAssignmentScreen';
import UnitAllocationScreen from '../screens/UnitAllocationScreen';

// Import icons (using the same icons as web)
const dashboardIcon = require('../assets/icons/dashboard.png');
const reportsIcon = require('../assets/icons/reports.png');
const stocksIcon = require('../assets/icons/stocks.png');
const requestIcon = require('../assets/icons/request.png');
const shipmentsIcon = require('../assets/icons/shipments.png');
const usersIcon = require('../assets/icons/users.png');
const signOutIcon = require('../assets/icons/signout.png');
const driverIcon = require('../assets/icons/driverallocation.png');
const releaseIcon = require('../assets/icons/release.png');
const testDriveIcon = require('../assets/icons/testdrive.png');
const agentAllocationIcon = require('../assets/icons/users.png');
const itrackLogo = require('../assets/icons/itrackwhite.png');

const Drawer = createDrawerNavigator();
const { width } = Dimensions.get('window');

// Profile Button Component for Header
function ProfileButton() {
  const navigation = useNavigation();
  const [userInfo, setUserInfo] = useState({
    name: '',
    picture: '',
    userId: ''
  });

  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const name = await AsyncStorage.getItem('accountName') || await AsyncStorage.getItem('userName');
        const userId = await AsyncStorage.getItem('userId');
        const userEmail = await AsyncStorage.getItem('userEmail');
        
        setUserInfo({ name: name || 'User', userId });
        
        // Fetch user's profile picture from database
        if (userId || userEmail) {
          let userData = null;
          
          if (userId) {
            const response = await axios.get(buildApiUrl(`/api/getUser/${userId}`));
            if (response.data.success && response.data.data) {
              userData = response.data.data;
            }
          } else if (userEmail) {
            // If no userId, fetch all users and find by email
            const response = await axios.get(buildApiUrl('/getUsers'));
            if (response.data.success) {
              const users = response.data.data || [];
              userData = users.find(u => u.email === userEmail);
              if (userData) {
                // Store the userId for future use
                await AsyncStorage.setItem('userId', userData._id);
              }
            }
          }
          
          if (userData) {
            setUserInfo(prev => ({
              ...prev,
              picture: userData.picture || '',
              userId: userData._id
            }));
          }
        }
      } catch (error) {
        console.error('Error loading user info:', error);
      }
    };
    loadUserInfo();
  }, []);

  return (
    <TouchableOpacity 
      style={styles.headerProfileButton}
      onPress={() => navigation.navigate('Profile')}
      activeOpacity={0.7}
    >
      <Text style={styles.welcomeText}>Welcome, {userInfo.name}</Text>
      {userInfo.picture ? (
        <Image 
          source={{ uri: userInfo.picture }} 
          style={styles.profilePicture}
        />
      ) : (
        <View style={styles.profilePicturePlaceholder}>
          <MaterialIcons name="person" size={20} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );
}

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
    { name: "Agent Allocation", icon: agentAllocationIcon, screen: "AgentAllocation", roles: ['Admin', 'Manager', 'Sales Agent', 'Supervisor'] },
    { name: "Driver Allocation", icon: driverIcon, screen: "DriverAllocation", roles: ['Admin', 'Manager', 'Dispatch'] },
    { name: "Release", icon: releaseIcon, screen: "Release", roles: ['Admin', 'Manager', 'Dispatch'] },
    { name: "Test Drive", icon: testDriveIcon, screen: "TestDrive", roles: ['Admin', 'Manager', 'Sales Agent', 'Supervisor'] },
    { name: "User Management", icon: usersIcon, screen: "UserManagement", roles: ['Admin'] },
    { name: "Reports", icon: reportsIcon, screen: "Reports", roles: ['all'] }
  ];

  // Filter menu based on role (matching web logic)
  const getFilteredMenu = () => {
    if (!userRole) return menuItems;
    
    // Filter for Sales Agent, Manager, and Supervisor (matching web)
    if (['Sales Agent', 'Manager', 'Supervisor'].includes(userRole)) {
      return menuItems.filter(item => 
        item.roles.includes('all') || 
        item.roles.includes(userRole) ||
        ['Dashboard', 'Reports', 'Vehicle Stocks', 'Vehicle Preperation', 'Agent Allocation', 'Test Drive'].includes(item.name)
      );
    }
    
    // Admin gets all items
    if (userRole === 'Admin') {
      return menuItems;
    }
    
    // Driver gets limited access
    if (userRole === 'Driver') {
      return menuItems.filter(item => 
        ['Dashboard'].includes(item.name)
      );
    }
    
    // Dispatch gets dispatch-related items
    if (userRole === 'Dispatch') {
      return menuItems.filter(item => 
        ['Dashboard'].includes(item.name)
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
    <View style={styles.drawerWrapper}>
      <DrawerContentScrollView 
        {...props} 
        contentContainerStyle={styles.drawerScrollContainer}
        showsVerticalScrollIndicator={false}
      >
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
              <Image source={item.icon} style={[
                styles.menuIcon,
                props.state.routeNames[props.state.index] === item.screen && styles.activeMenuIcon
              ]} />
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
    </View>
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
        headerStyle: { 
          backgroundColor: '#e50914',
          elevation: 4,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 3,
        },
        headerTintColor: '#ffffff',
        drawerStyle: { 
          backgroundColor: '#e50914',
          width: Math.min(width * 0.88, 340),
        },
        headerTitle: 'I-Track',
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '700',
          color: '#ffffff',
        },
        headerRight: () => <ProfileButton />,
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
        name="AgentAllocation"
        component={UnitAllocationScreen}
        options={{ title: 'Agent Allocation' }}
      />
      <Drawer.Screen
        name="DriverAllocation"
        component={DriverAllocation}
        options={{ title: 'Driver Allocation' }}
      />
      <Drawer.Screen
        name="Release"
        component={ReleaseScreen}
        options={{ title: 'Release' }}
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
        name="VehicleProgress"
        component={VehicleProgressScreen}
        options={{ title: 'Vehicle Progress' }}
      />
      <Drawer.Screen
        name="History"
        component={HistoryScreen}
        options={{ title: 'Audit Trail' }}
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
  drawerWrapper: {
    flex: 1,
    backgroundColor: '#e50914', // Clean red sidebar background (Netflix red)
  },
  drawerScrollContainer: {
    flexGrow: 1,
    paddingBottom: 30,
    minHeight: '100%',
  },
  drawerHeader: {
    padding: 20,
    paddingTop: 40, // More space for status bar
    paddingBottom: 25,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    backgroundColor: '#e50914',
  },
  logo: {
    width: 50,
    height: 50,
    marginBottom: 12,
    tintColor: '#ffffff',
  },
  appTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  userWelcome: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    marginBottom: 4,
    textAlign: 'center',
  },
  userRole: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 15,
    textAlign: 'center',
    overflow: 'hidden',
  },
  menuContainer: {
    paddingVertical: 20,
    paddingHorizontal: 8,
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginHorizontal: 6,
    marginVertical: 3,
    borderRadius: 10,
    minHeight: 52,
    backgroundColor: 'transparent',
  },
  activeMenuItem: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderLeftWidth: 4,
    borderLeftColor: '#ffffff',
    paddingLeft: 14, // Adjust for border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  menuIcon: {
    width: 24,
    height: 24,
    marginRight: 16,
    tintColor: '#ffffff',
    opacity: 0.9,
  },
  activeMenuIcon: {
    tintColor: '#ffffff',
    opacity: 1,
  },
  menuText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
    opacity: 0.9,
  },
  activeMenuText: {
    fontWeight: '600',
    color: '#ffffff',
    opacity: 1,
  },
  signOutContainer: {
    paddingHorizontal: 14,
    paddingVertical: 20,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.15)',
    marginTop: 'auto',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    minHeight: 52,
  },
  signOutIcon: {
    width: 22,
    height: 22,
    marginRight: 14,
    tintColor: '#ffffff',
    opacity: 0.9,
  },
  signOutText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    opacity: 0.9,
  },
  headerProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 15,
    paddingVertical: 8,
  },
  welcomeText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 10,
  },
  profilePicture: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  profilePicturePlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 2,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
});