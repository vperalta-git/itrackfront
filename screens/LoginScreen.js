import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ImageBackground,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { buildApiUrl } from '../constants/api';
// import { useGoogleAuth } from '../utils/googleAuth'; // Commented out Google Auth

export default function LoginScreen() {
  const navigation = useNavigation();
  // const { signInWithGoogle, isLoading: googleLoading } = useGoogleAuth(); // Commented out Google Auth
  const [form, setForm] = useState({ username: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');

  useEffect(() => {
    const loadStoredUsername = async () => {
      const saved = await AsyncStorage.getItem('rememberedUsername');
      if (saved) {
        setForm(prev => ({ ...prev, username: saved }));
        setRememberMe(true);
      }
    };
    loadStoredUsername();
  }, []);

  const handleInputChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail) {
      Alert.alert('Error', 'Please enter your email/username');
      return;
    }

    try {
      // For now, just show a success message
      // In a real app, you'd send this to your backend
      Alert.alert(
        'Password Reset',
        'If an account with that email exists, you will receive password reset instructions.',
        [
          {
            text: 'OK',
            onPress: () => {
              setShowForgotPassword(false);
              setForgotPasswordEmail('');
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to send password reset. Please try again.');
    }
  };

  const handleLogin = async () => {
    const { username, password } = form;

    if (!username || !password) {
      return Alert.alert('Error', 'Please enter both username and password');
    }

    // ✅ TEMPORARY HARDCODED ADMIN LOGIN
    if (username === 'admin123' && password === 'admin123') {
      await AsyncStorage.setItem('userToken', 'authenticated');
      await AsyncStorage.setItem('userName', 'Admin');
      await AsyncStorage.setItem('accountName', 'Admin');
      await AsyncStorage.setItem('userRole', 'Admin'); // Changed from 'admin' to 'Admin' to match roleRouteMap
      navigation.replace('AdminDrawer');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(buildApiUrl('/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        throw new Error('Unexpected server response: ' + text);
      }

      const data = await res.json();

      if (!res.ok || !data.success || !data.user) {
        Alert.alert('Error', data.message || 'Login failed');
        return;
      }

      // Set all required AsyncStorage keys for consistent session management
      await AsyncStorage.setItem('userToken', 'authenticated');
      await AsyncStorage.setItem('userName', data.user.accountName || data.user.username || '');
      await AsyncStorage.setItem('accountName', data.user.accountName || '');
      await AsyncStorage.setItem('userRole', data.user.role || '');

      if (rememberMe) {
        await AsyncStorage.setItem('rememberedUsername', username);
      } else {
        await AsyncStorage.removeItem('rememberedUsername');
      }

      switch ((data.user.role || '').toLowerCase()) {
        case 'admin':
          navigation.replace('AdminDrawer');
          break;
        case 'manager':
          navigation.replace('ManagerDrawer');
          break;
        case 'sales agent':
        case 'agent':
          navigation.replace('AgentDrawer');
          break;
        case 'dispatch':
          navigation.replace('DispatchDashboard');
          break;
        case 'driver':
          navigation.replace('DriverDashboard');
          break;
        case 'supervisor':
          navigation.replace('SupervisorDrawer');
          break;
        default:
          Alert.alert('Error', `Unknown role: ${data.user.role}`);
      }

    } catch (err) {
      Alert.alert('Error', 'Unable to login. Check your connection or credentials.');
      console.error('Login error:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  /*
  // Commented out Google Sign-In functionality
  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      console.log('🔐 Starting Google Sign-In...');
      
      const result = await signInWithGoogle();
      
      if (result.success) {
        const { user } = result;
        console.log('✅ Google Sign-In successful:', user.email);
        
        // Check if user exists in backend
        const response = await fetch(buildApiUrl('/google-auth'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            googleId: user.id,
            email: user.email,
            name: user.name,
            picture: user.picture,
            accessToken: user.accessToken,
          }),
        });

        const data = await response.json();
        
        if (data.success && data.role) {
          // Store user data
          await AsyncStorage.multiSet([
            ['userRole', data.role],
            ['userName', data.name],
            ['userToken', 'authenticated'],
            ['userId', data.user?.id || ''],
            ['userEmail', user.email],
            ['userPicture', user.picture || '']
          ]);

          Alert.alert('Success', `Welcome ${data.name}! Signed in with Google.`);
          
          // Navigate based on role
          setTimeout(() => {
            navigateToRole(data.role);
          }, 1000);
          
        } else {
          throw new Error(data.message || 'Google authentication failed');
        }
      } else {
        throw new Error(result.error || 'Google Sign-In cancelled');
      }
    } catch (error) {
      console.error('❌ Google Sign-In error:', error);
      Alert.alert('Google Sign-In Error', error.message || 'Failed to sign in with Google');
    } finally {
      setIsLoading(false);
    }
  };
  */

  const navigateToRole = (role) => {
    const roleMap = {
      'Admin': 'AdminDashboard',
      'Manager': 'ManagerDashboard',
      'Sales Agent': 'AgentDashboard',
      'Driver': 'DriverDashboard',
      'Dispatch': 'DispatchDashboard',
      'Supervisor': 'SupervisorDashboard'
    };

    const targetScreen = roleMap[role];
    if (targetScreen) {
      navigation.reset({
        index: 0,
        routes: [{ name: targetScreen }],
      });
    } else {
      Alert.alert('Error', 'Unknown user role. Please contact support.');
    }
  };

  return (
    <ImageBackground
      source={require('../assets/isuzufront.png')}
      style={styles.bg}
      resizeMode="cover"
      imageStyle={{ opacity: 0.8 }}
    >
      <View style={styles.overlay} />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <View style={styles.card}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../assets/isuzufront.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.title}>I-Track Login</Text>

            <TextInput
              placeholder="Username"
              value={form.username}
              onChangeText={text => handleInputChange('username', text)}
              style={styles.input}
              autoCapitalize="none"
              placeholderTextColor="#888"
            />

            <View style={styles.passwordContainer}>
              <TextInput
                placeholder="Password"
                secureTextEntry={!showPassword}
                value={form.password}
                onChangeText={text => handleInputChange('password', text)}
                style={[styles.input, { flex: 1 }]}
                placeholderTextColor="#888"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Text style={styles.toggleText}>
                  {showPassword ? 'Hide' : 'Show'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.rememberRow}>
              <TouchableOpacity onPress={() => setRememberMe(!rememberMe)}>
                <Text style={styles.rememberText}>
                  {rememberMe ? '☑' : '☐'} Remember Me
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowForgotPassword(true)}>
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={handleLogin}
              style={[styles.loginBtn, isLoading && { opacity: 0.6 }]}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginText}>Login</Text>
              )}
            </TouchableOpacity>
            
            {/* Google Sign-In Button - Commented out for now */}
            {/*
            <TouchableOpacity 
              style={[styles.googleSignInBtn, (isLoading || googleLoading) && { opacity: 0.6 }]} 
              onPress={handleGoogleSignIn}
              disabled={isLoading || googleLoading}
            >
              {(isLoading || googleLoading) ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <Text style={styles.googleIcon}>🔐</Text>
                  <Text style={styles.googleSignInText}>Sign in with Google</Text>
                </>
              )}
            </TouchableOpacity>

            {/* OR Divider */}
            {/*
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>
            */}
            
            {/* Development Test Button - Removed */}
            {/*
            <TouchableOpacity 
              style={[styles.loginBtn, { backgroundColor: '#6c757d', marginTop: 10 }]} 
              onPress={() => navigation.navigate('TestMap')}
            >
              <Text style={styles.loginText}>Test Map (Dev)</Text>
            </TouchableOpacity>
            */}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Forgot Password Modal */}
      <Modal
        visible={showForgotPassword}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowForgotPassword(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reset Password</Text>
            <Text style={styles.modalSubtitle}>
              Enter your email or username to receive password reset instructions.
            </Text>
            
            <TextInput
              placeholder="Email or Username"
              value={forgotPasswordEmail}
              onChangeText={setForgotPasswordEmail}
              style={styles.input}
              autoCapitalize="none"
              placeholderTextColor="#888"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => setShowForgotPassword(false)}
                style={[styles.modalBtn, styles.cancelBtn]}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={handleForgotPassword}
                style={[styles.modalBtn, styles.resetBtn]}
              >
                <Text style={styles.resetBtnText}>Send Reset Link</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)', // Darker overlay for better contrast
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)', // Reduced opacity from 0.95 to 0.75 for more transparency
    borderRadius: 16,
    padding: 28,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 180,
    height: 90,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#CB1E2A',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#fff',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 16,
    color: '#333',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  toggleText: {
    color: '#CB1E2A',
    fontWeight: 'bold',
    paddingHorizontal: 10,
  },
  rememberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  rememberText: {
    color: '#444',
    fontSize: 14,
  },
  forgotPasswordText: {
    color: '#CB1E2A',
    fontSize: 14,
    fontWeight: '500',
  },
  loginBtn: {
    backgroundColor: '#CB1E2A',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  loginText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  googleSignInBtn: {
    backgroundColor: '#4285f4',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  googleIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  googleSignInText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#CB1E2A',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  cancelBtn: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelBtnText: {
    color: '#666',
    fontWeight: '500',
  },
  resetBtn: {
    backgroundColor: '#CB1E2A',
  },
  resetBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
