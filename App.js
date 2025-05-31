import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';

// Screens
import LoginScreen from './screens/LoginScreen';
import DriverDashboard from './screens/DriverDashboard';
import AgentDashboard from './screens/AgentDashboard';
import AdminDashboard from './screens/AdminDashboard';
import VehicleProgressScreen from './screens/VehicleProgressScreen';
import DispatchDashboard from './screens/DispatchDashboard';
import DispatchVehicleDetail from './screens/DispatchVehicleDetail';
import HistoryScreen from './screens/HistoryScreen';
import ChangePasswordScreen from './screens/ChangePasswordScreen';

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

// Sales Agent drawer
function AgentDrawer() {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#CB1E2A' },
        headerTintColor: '#fff',
        drawerActiveTintColor: '#CB1E2A',
      }}
    >
      <Drawer.Screen
        name="AgentDashboard"
        component={AgentDashboard}
        options={{ title: 'Dashboard' }}
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

// Admin drawer
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
        options={{ title: 'Sales Agent Dashboard' }}
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
      <Drawer.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{ title: 'Change Password' }}
      />
    </Drawer.Navigator>
  );
}

export default function App() {
  const [initialRoute, setInitialRoute] = useState('Login');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function checkLogin() {
      try {
        const isLoggedIn = await AsyncStorage.getItem('isLoggedIn');
        const role = await AsyncStorage.getItem('userRole');

        if (isLoggedIn === 'true' && role) {
          switch (role) {
            case 'admin':
              setInitialRoute('AdminDrawer');
              break;
            case 'agent':
              setInitialRoute('AgentDrawer');
              break;
            case 'dispatch':
              setInitialRoute('DispatchDashboard');
              break;
            case 'driver':
              setInitialRoute('DriverDashboard');
              break;
            default:
              setInitialRoute('Login');
          }
        } else {
          setInitialRoute('Login');
        }
      } catch (err) {
        console.error('Error checking login state:', err);
        setInitialRoute('Login');
      } finally {
        setIsReady(true);
      }
    }
    checkLogin();
  }, []);

  if (!isReady) return null; // Optional: Replace with loading/splash screen

  return (
    <>
      <NavigationContainer>
        <Stack.Navigator initialRouteName={initialRoute}>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="AdminDrawer" component={AdminDrawer} options={{ headerShown: false }} />
          <Stack.Screen name="AgentDrawer" component={AgentDrawer} options={{ headerShown: false }} />
          <Stack.Screen name="DispatchDashboard" component={DispatchDashboard} options={{ title: 'Dispatch Dashboard' }} />
          <Stack.Screen name="DriverDashboard" component={DriverDashboard} options={{ title: 'Driver Dashboard' }} />
          <Stack.Screen name="DispatchDetail" component={DispatchVehicleDetail} options={{ title: 'Vehicle Details' }} />
          <Stack.Screen name="History" component={HistoryScreen} options={{ title: 'Release History' }} />
        </Stack.Navigator>
      </NavigationContainer>
      <Toast />
    </>
  );
}
