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
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { buildApiUrl } from '../constants/api';
import UniformLoading from '../components/UniformLoading';
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
    if (!forgotPasswordEmail.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(buildApiUrl('/forgot-password'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: forgotPasswordEmail.trim() // Using username field but sending email value
        }),
      });

      const result = await response.json();

      if (result.success) {
        Alert.alert(
          'Password Reset Sent',
          result.message || 'If the email exists, a temporary password has been sent.',
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
      } else {
        Alert.alert('Error', result.message || 'Failed to send password reset');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      Alert.alert('Error', 'Failed to send password reset. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    const { username, password } = form;

    if (!username || !password) {
      return Alert.alert('Error', 'Please enter both email and password');
    }

    setIsLoading(true);
    try {
      console.log('🔐 Attempting login with email:', username);
      
      const apiUrl = buildApiUrl('/login');
      console.log('🔗 API URL:', apiUrl);

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: username.toLowerCase().trim(), 
          password 
        })
      });

      console.log('📡 Response status:', res.status);
      console.log('📡 Response headers:', Object.fromEntries(res.headers.entries()));

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        console.error('❌ Non-JSON response:', text);
        throw new Error('Server returned unexpected response format');
      }

      const data = await res.json();
      console.log('📥 Login response data:', JSON.stringify(data, null, 2));

      if (!res.ok || !data.success) {
        const errorMessage = data.message || `Server error (${res.status})`;
        console.error('❌ Login failed:', errorMessage);
        Alert.alert('Login Failed', errorMessage);
        return;
      }

      // Extract user data from response
      const user = data.user;
      const userRole = user?.role;
      const userName = user?.accountName || user?.name || '';
      const userEmail = user?.email || '';
      
      console.log('✅ Login successful for user:', userName);
      console.log('🔍 User role:', userRole);
      console.log('📧 User email:', userEmail);

      if (!userRole) {
        console.error('❌ No role information in response');
        Alert.alert('Error', 'No role information received from server');
        return;
      }

      // Store user data
      await AsyncStorage.multiSet([
        ['userToken', 'authenticated'],
        ['accountName', userName],
        ['role', userRole],
        ['email', userEmail],
        ['userName', userName],
        ['userRole', userRole]
      ]);
      console.log('💾 User data saved to storage');

      if (rememberMe) {
        await AsyncStorage.setItem('rememberedUsername', username);
      } else {
        await AsyncStorage.removeItem('rememberedUsername');
      }

      // ✅ Navigate based on detected role (handle case-insensitive)
      const role = userRole;
      console.log('🧭 Navigating based on role:', role);
      
      switch (role) {
        case 'Admin':
          console.log('➡️ Navigating to AdminDrawer');
          navigation.replace('AdminDrawer');
          break;
        case 'Sales Agent':
          console.log('➡️ Navigating to AgentDrawer');
          navigation.replace('AgentDrawer');
          break;
        case 'Dispatch':
          console.log('➡️ Navigating to DispatchDashboard');
          navigation.replace('DispatchDashboard');
          break;
        case 'Driver':
          console.log('➡️ Navigating to DriverDashboard');
          navigation.replace('DriverDashboard');
          break;
        case 'Supervisor':
        case 'Manager':
          console.log('➡️ Navigating to AdminDrawer (supervisor/manager)');
          navigation.replace('AdminDrawer');
          break;
        default:
          console.error('❌ Unknown role received:', userRole);
          Alert.alert('Error', `Unknown role: ${userRole}. Please contact support.`);
      }

    } catch (err) {
      console.error('❌ Login error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
      
      let userMessage = 'Unable to login. ';
      
      if (err.message.includes('Network request failed') || err.message.includes('fetch')) {
        userMessage += 'Please check your internet connection.';
      } else if (err.message.includes('timeout')) {
        userMessage += 'Request timed out. Please try again.';
      } else if (err.message.includes('JSON')) {
        userMessage += 'Server response error. Please try again later.';
      } else {
        userMessage += 'Please check your credentials and try again.';
      }
      
      Alert.alert('Connection Error', userMessage);
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
      source={require('../assets/isuzupasig.png')}
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
                source={require('../assets/logoitrack.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.title}>I-Track Login</Text>

            <TextInput
              placeholder="Email"
              value={form.username}
              onChangeText={text => handleInputChange('username', text)}
              style={styles.input}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
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
                <View style={styles.loadingContainer}>
                  <Image 
                    source={require('../assets/loading.gif')} 
                    style={styles.loadingGif}
                    resizeMode="contain"
                  />
                  <Text style={styles.loginText}>Logging in...</Text>
                </View>
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
              Enter your email address to receive password reset instructions.
            </Text>
            
            <TextInput
              placeholder="Email Address"
              value={forgotPasswordEmail}
              onChangeText={setForgotPasswordEmail}
              style={styles.input}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
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
    flexGrow: 1,
    paddingHorizontal: 30,
    paddingTop: 40,
    justifyContent: 'center',
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
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#e50914',
    alignSelf: 'center', 
    marginBottom: 30,
  },
  input: {
    borderWidth: 1, 
    borderColor: '#ccc', 
    backgroundColor: '#f9f9f9',
    borderRadius: 8, 
    paddingHorizontal: 14, 
    paddingVertical: 12,
    fontSize: 16, 
    marginBottom: 15,
    color: '#333',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  toggleText: {
    color: '#e50914',
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
    color: '#e50914',
    fontSize: 14,
    fontWeight: '500',
  },
  loginBtn: {
    backgroundColor: '#e50914', 
    paddingVertical: 14,
    borderRadius: 8, 
    alignItems: 'center', 
    marginTop: 10,
  },
  loginText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingGif: {
    width: 20,
    height: 20,
    marginRight: 8,
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
    color: '#e50914',
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
    backgroundColor: '#e50914',
  },
  resetBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
