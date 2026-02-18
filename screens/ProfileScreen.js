import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { buildApiUrl } from '../constants/api';
import UniformLoading from '../components/UniformLoading';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const navigation = useNavigation();
  
  // User data
  const [userProfile, setUserProfile] = useState({
    id: '',
    name: '',
    email: '',
    phoneNumber: '',
    role: '',
    accountName: '',
    picture: '',
    personalDetails: '',
    isDarkMode: false,
  });
  
  // State management
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showOtherProfiles, setShowOtherProfiles] = useState(false);
  const [otherUsers, setOtherUsers] = useState([]);
  
  // Form states
  const [editForm, setEditForm] = useState({});
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    loadUserProfile();
    loadOtherProfiles();
  }, []);

  // Load current user profile
  const loadUserProfile = async () => {
    try {
      console.log('📱 Loading user profile...');
      
      // Get user data from AsyncStorage
      const userId = await AsyncStorage.getItem('userId');
      const userName = await AsyncStorage.getItem('accountName') || await AsyncStorage.getItem('userName');
      const userEmail = await AsyncStorage.getItem('userEmail');
      const userRole = await AsyncStorage.getItem('userRole');
      const userPhone = await AsyncStorage.getItem('phoneno') || await AsyncStorage.getItem('userPhone');

      console.log('📊 AsyncStorage data:', { userId, userName, userEmail, userRole, userPhone });

      // Start with AsyncStorage data
      let profileData = {
        id: userId || '',
        name: userName || '',
        email: userEmail || '',
        phoneNumber: userPhone || '',
        role: userRole || '',
        accountName: userName || '',
        picture: '',
        personalDetails: '',
        isDarkMode: false,
      };

      // Try to fetch from server - use userId or find by email
      if (userId || userEmail) {
        try {
          let response;
          if (userId) {
            response = await fetch(buildApiUrl(`/api/getUser/${userId}`));
          } else {
            // If no userId, fetch all users and find by email
            response = await fetch(buildApiUrl('/getUsers'));
            if (response.ok) {
              const usersResult = await response.json();
              const users = usersResult.data || [];
              const currentUser = users.find(u => u.email === userEmail);
              if (currentUser) {
                // Store the userId for future use
                await AsyncStorage.setItem('userId', currentUser._id);
                profileData.id = currentUser._id;
                // Create a mock response
                response = {
                  ok: true,
                  json: async () => ({ success: true, data: currentUser })
                };
              }
            }
          }
          console.log('API response status:', response?.status);
          
          if (response.ok) {
            const result = await response.json();
            console.log('Server response:', result);
            
            if (result.success && result.data) {
              const serverProfile = result.data;
              console.log('Server profile data:', serverProfile);
              console.log('Phone from server:', serverProfile.phoneno);
              console.log('Picture from server:', serverProfile.picture ? 'EXISTS' : 'MISSING');
              
              // Merge server data with AsyncStorage data (server data takes priority)
              profileData = {
                id: serverProfile._id || userId,
                name: serverProfile.name || userName || '',
                email: serverProfile.email || userEmail || '',
                phoneNumber: serverProfile.phoneno || serverProfile.phoneNumber || userPhone || '',
                role: serverProfile.role || userRole || '',
                accountName: serverProfile.accountName || userName || '',
                picture: serverProfile.picture || '',
                personalDetails: serverProfile.personalDetails || '',
                isDarkMode: false,
              };
              console.log('✅ Using server data');
              console.log('Profile data phoneNumber:', profileData.phoneNumber);
              console.log('Profile data picture:', profileData.picture ? 'EXISTS' : 'MISSING');
            }
          } else {
            console.log('\u26a0\ufe0f Server fetch failed, using AsyncStorage data');
          }
        } catch (fetchError) {
          console.log('\u26a0\ufe0f Server fetch error, using AsyncStorage data:', fetchError.message);
        }
      }
      
      console.log('Final profile data:', profileData);
      setUserProfile(profileData);
      setEditForm({ ...profileData });
      
    } catch (error) {
      console.error('❌ Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  // Load other user profiles for viewing
  const loadOtherProfiles = async () => {
    try {
      const response = await fetch(buildApiUrl('/getUsers'));
      if (response.ok) {
        const result = await response.json();
        const usersArray = result.data || [];
        
        // Filter out current user
        const currentUserId = await AsyncStorage.getItem('userId');
        const otherProfiles = usersArray.filter(user => user._id !== currentUserId);
        
        setOtherUsers(otherProfiles);
        console.log(`📊 Loaded ${otherProfiles.length} other user profiles`);
      }
    } catch (error) {
      console.error('❌ Error loading other profiles:', error);
    }
  };

  // Handle profile picture selection
  const handleProfilePictureChange = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Permission to access camera roll is required!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled) {
        const imageUri = result.assets[0].uri;
        setEditForm(prev => ({ ...prev, picture: imageUri }));
      }
    } catch (error) {
      console.error('❌ Error selecting profile picture:', error);
      Alert.alert('Error', 'Failed to select profile picture');
    }
  };

  // Save profile changes
  const saveProfile = async () => {
    try {
      setSaving(true);
      
      if (!userProfile.id) {
        Alert.alert('Error', 'User ID not found. Please try reloading the profile.');
        setSaving(false);
        return;
      }
      
      const updateData = {
        name: editForm.name,
        phoneNumber: editForm.phoneNumber,
        personalDetails: editForm.personalDetails,
        picture: editForm.picture,
      };

      console.log('Saving profile for user ID:', userProfile.id);
      console.log('Update data:', updateData);

      // Use the updateProfile endpoint
      const response = await fetch(buildApiUrl(`/updateProfile/${userProfile.id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const result = await response.json();
      console.log('Update response:', result);

      if (response.ok && result.success) {
        setUserProfile(prev => ({ ...prev, ...updateData }));
        setIsEditing(false);
        Alert.alert('Success', 'Profile updated successfully');
        
        // Update AsyncStorage
        if (updateData.name) {
          await AsyncStorage.setItem('accountName', updateData.name);
          await AsyncStorage.setItem('userName', updateData.name);
        }
        if (updateData.phoneNumber) {
          await AsyncStorage.setItem('phoneno', updateData.phoneNumber);
          await AsyncStorage.setItem('userPhone', updateData.phoneNumber);
        }
        
      } else {
        Alert.alert('Error', result.message || 'Failed to update profile');
      }
      
    } catch (error) {
      console.error('❌ Error saving profile:', error);
      Alert.alert('Error', 'Network error while saving profile');
    } finally {
      setSaving(false);
    }
  };

  // Handle password change
  const changePassword = async () => {
    try {
      const { currentPassword, newPassword, confirmPassword } = passwordForm;
      
      if (!currentPassword || !newPassword || !confirmPassword) {
        Alert.alert('Error', 'Please fill in all password fields');
        return;
      }
      
      if (newPassword !== confirmPassword) {
        Alert.alert('Error', 'New passwords do not match');
        return;
      }
      
      // Password requirements validation commented out for now
      // if (newPassword.length < 6) {
      //   Alert.alert('Error', 'New password must be at least 6 characters');
      //   return;
      // }

      const response = await fetch(buildApiUrl('/change-password'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userProfile.id,
          currentPassword,
          newPassword,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        Alert.alert('Success', 'Password changed successfully');
        setShowPasswordModal(false);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        Alert.alert('Error', result.message || 'Failed to change password');
      }
      
    } catch (error) {
      console.error('❌ Error changing password:', error);
      Alert.alert('Error', 'Network error while changing password');
    }
  };

  // State for viewing other user's profile
  const [viewingUser, setViewingUser] = useState(null);
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);

  // View another user's profile
  const viewOtherProfile = (user) => {
    setViewingUser(user);
    setShowOtherProfiles(false);
    setShowUserProfileModal(true);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear all stored data
              await AsyncStorage.multiRemove([
                'userId',
                'accountName',
                'userName',
                'userEmail',
                'userRole',
                'phoneno',
                'userPhone',
                'isDarkMode'
              ]);
              
              // Navigate to Login screen
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.error('Error during logout:', error);
              Alert.alert('Error', 'Failed to logout properly');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <UniformLoading
        message="Loading profile..."
        size="large"
        backgroundColor="#f8f9fa"
      />
    );
  }

  const themeColors = {
    background: '#f8f9fa',
    cardBackground: '#ffffff',
    text: '#333333',
    textSecondary: '#666666',
    border: '#e9ecef',
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Modern Gradient Header */}
      <View style={styles.headerGradient}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <View style={styles.backButtonCircle}>
              <Text style={{fontSize: 22, color: "#fff", fontWeight: 'bold'}}>←</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Profile</Text>
          <TouchableOpacity
            onPress={() => setIsEditing(!isEditing)}
            style={styles.editButton}
          >
            <View style={[styles.editButtonCircle, { backgroundColor: isEditing ? "#fff" : "#e50914" }]}>
              <Text style={{
                fontSize: 20, 
                color: isEditing ? "#e50914" : "#fff",
                fontWeight: 'bold'
              }}>
                {isEditing ? "✖" : "✏️"}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Enhanced Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: themeColors.cardBackground }]}>
          {/* Profile Picture Section */}
          <View style={styles.profilePictureSection}>
            <TouchableOpacity
              style={styles.profilePictureContainer}
              onPress={isEditing ? handleProfilePictureChange : null}
              disabled={!isEditing}
            >
              <View style={styles.profilePictureRing}>
                {(editForm.picture || userProfile.picture) ? (
                  <Image
                    source={{ uri: editForm.picture || userProfile.picture }}
                    style={styles.profilePicture}
                  />
                ) : (
                  <View style={[styles.profilePicturePlaceholder, { backgroundColor: '#e50914' }]}>
                    <MaterialIcons name="person" size={60} color="#fff" />
                  </View>
                )}
              </View>
              {isEditing && (
                <View style={styles.cameraIconEnhanced}>
                  <MaterialIcons name="camera-alt" size={18} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
            
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: themeColors.text }]}>
                {userProfile.name}
              </Text>
              <View style={styles.profileRoleBadge}>
                <Ionicons name="briefcase-outline" size={14} color="#e50914" />
                <Text style={styles.profileRoleText}>
                  {userProfile.role}
                </Text>
              </View>
              <View style={styles.profileEmailRow}>
                <Ionicons name="mail-outline" size={14} color={themeColors.textSecondary} />
                <Text style={[styles.profileEmail, { color: themeColors.textSecondary }]}>
                  {userProfile.email}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Enhanced Profile Details */}
        <View style={[styles.detailsCard, { backgroundColor: themeColors.cardBackground }]}>
          <Text style={[styles.sectionTitleEnhanced, { color: themeColors.text }]}>
            <Text style={{fontSize: 20, color: "#e50914"}}>👤</Text> Personal Information
          </Text>
          
          {/* Name */}
          <View style={styles.fieldContainerEnhanced}>
            <View style={styles.fieldIconCircle}>
              <Text style={{fontSize: 18, color: "#e50914", fontWeight: 'bold'}}>👤</Text>
            </View>
            <View style={styles.fieldContent}>
              <Text style={[styles.fieldLabel, { color: themeColors.textSecondary }]}>Full Name</Text>
              {isEditing ? (
                <TextInput
                  style={[styles.textInputEnhanced, { 
                    backgroundColor: themeColors.background, 
                    color: themeColors.text,
                    borderColor: '#e50914' 
                  }]}
                  value={editForm.name}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, name: text }))}
                  placeholder="Enter your full name"
                  placeholderTextColor={themeColors.textSecondary}
                />
              ) : (
                <Text style={[styles.fieldValueEnhanced, { color: themeColors.text }]}>
                  {userProfile.name || 'Not set'}
                </Text>
              )}
            </View>
          </View>

          {/* Phone Number */}
          <View style={styles.fieldContainerEnhanced}>
            <View style={styles.fieldIconCircle}>
              <Text style={{fontSize: 18, color: "#e50914", fontWeight: 'bold'}}>📞</Text>
            </View>
            <View style={styles.fieldContent}>
              <Text style={[styles.fieldLabel, { color: themeColors.textSecondary }]}>Phone Number</Text>
              {isEditing ? (
                <TextInput
                  style={[styles.textInputEnhanced, { 
                    backgroundColor: themeColors.background, 
                    color: themeColors.text,
                    borderColor: '#e50914' 
                  }]}
                  value={editForm.phoneNumber}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, phoneNumber: text }))}
                  placeholder="Enter your phone number"
                  placeholderTextColor={themeColors.textSecondary}
                  keyboardType="phone-pad"
                />
              ) : (
                <Text style={[styles.fieldValueEnhanced, { color: themeColors.text }]}>
                  {userProfile.phoneNumber || 'Not set'}
                </Text>
              )}
            </View>
          </View>

          {/* Email (Read-only) */}
          <View style={styles.fieldContainerEnhanced}>
            <View style={styles.fieldIconCircle}>
              <Text style={{fontSize: 18, color: "#e50914", fontWeight: 'bold'}}>✉️</Text>
            </View>
            <View style={styles.fieldContent}>
              <Text style={[styles.fieldLabel, { color: themeColors.textSecondary }]}>Email</Text>
              <Text style={[styles.fieldValueEnhanced, { color: themeColors.text }]}>
                {userProfile.email}
              </Text>
            </View>
          </View>

          {/* Role (Read-only) */}
          <View style={styles.fieldContainerEnhanced}>
            <View style={styles.fieldIconCircle}>
              <Text style={{fontSize: 18, color: "#e50914", fontWeight: 'bold'}}>🔒</Text>
            </View>
            <View style={styles.fieldContent}>
              <Text style={[styles.fieldLabel, { color: themeColors.textSecondary }]}>Role</Text>
              <Text style={[styles.fieldValueEnhanced, { color: themeColors.text }]}>
                {userProfile.role}
              </Text>
            </View>
          </View>

          {/* Personal Details */}
          <View style={styles.fieldContainerEnhanced}>
            <View style={styles.fieldIconCircle}>
              <Text style={{fontSize: 18, color: "#e50914", fontWeight: 'bold'}}>📝</Text>
            </View>
            <View style={styles.fieldContent}>
              <Text style={[styles.fieldLabel, { color: themeColors.textSecondary }]}>Personal Details</Text>
              {isEditing ? (
                <TextInput
                  style={[styles.textAreaEnhanced, { 
                    backgroundColor: themeColors.background, 
                    color: themeColors.text,
                    borderColor: '#e50914' 
                  }]}
                  value={editForm.personalDetails}
                  onChangeText={(text) => setEditForm(prev => ({ ...prev, personalDetails: text }))}
                  placeholder="Enter personal or work-related details..."
                  placeholderTextColor={themeColors.textSecondary}
                  multiline
                  numberOfLines={4}
                />
              ) : (
                <Text style={[styles.fieldValueEnhanced, { color: themeColors.text }]}>
                  {userProfile.personalDetails || 'No details added yet'}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Enhanced Settings Card */}
        <View style={[styles.detailsCard, { backgroundColor: themeColors.cardBackground }]}>
          <Text style={[styles.sectionTitleEnhanced, { color: themeColors.text }]}>
            <Ionicons name="settings-outline" size={20} color="#e50914" /> Settings & Actions
          </Text>
          
          {/* Change Password */}
          <TouchableOpacity
            style={styles.settingRowEnhanced}
            onPress={() => setShowPasswordModal(true)}
          >
            <View style={styles.settingInfoEnhanced}>
              <View style={[styles.settingIconCircle, { backgroundColor: '#fee' }]}>
                <Ionicons name="lock-closed" size={20} color="#e50914" />
              </View>
              <Text style={[styles.settingLabel, { color: themeColors.text }]}>Change Password</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color="#9ca3af" />
          </TouchableOpacity>

          {/* View Other Profiles */}
          <TouchableOpacity
            style={styles.settingRowEnhanced}
            onPress={() => setShowOtherProfiles(true)}
          >
            <View style={styles.settingInfoEnhanced}>
              <View style={[styles.settingIconCircle, { backgroundColor: '#fee' }]}>
                <Ionicons name="people" size={20} color="#e50914" />
              </View>
              <Text style={[styles.settingLabel, { color: themeColors.text }]}>Team Profiles</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        {/* Enhanced Save Button */}
        {isEditing && (
          <TouchableOpacity
            style={styles.saveButtonEnhanced}
            onPress={saveProfile}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <UniformLoading size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color="#fff" />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Enhanced Logout Button - Only for Dispatch role */}
        {userProfile.role?.toLowerCase() === 'dispatch' && (
          <TouchableOpacity
            style={styles.logoutButtonEnhanced}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={22} color="#fff" />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Enhanced Password Change Modal */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.passwordModalContent, { backgroundColor: themeColors.cardBackground }]}>
            {/* Modal Header */}
            <View style={styles.passwordModalHeader}>
              <View style={styles.passwordIconCircle}>
                <Ionicons name="lock-closed" size={28} color="#fff" />
              </View>
              <Text style={[styles.passwordModalTitle, { color: themeColors.text }]}>Change Password</Text>
              <Text style={[styles.passwordModalSubtitle, { color: themeColors.textSecondary }]}>
                Please enter your current and new password
              </Text>
            </View>
            
            {/* Password Input Fields */}
            <View style={styles.passwordInputsContainer}>
              <View style={styles.passwordInputWrapper}>
                <View style={styles.passwordInputIconCircle}>
                  <Ionicons name="shield-checkmark-outline" size={20} color="#e50914" />
                </View>
                <TextInput
                  style={[styles.passwordInput, { 
                    backgroundColor: themeColors.background, 
                    color: themeColors.text,
                    borderColor: themeColors.border 
                  }]}
                  placeholder="Current Password"
                  placeholderTextColor={themeColors.textSecondary}
                  secureTextEntry
                  value={passwordForm.currentPassword}
                  onChangeText={(text) => setPasswordForm(prev => ({ ...prev, currentPassword: text }))}
                />
              </View>
              
              <View style={styles.passwordInputWrapper}>
                <View style={styles.passwordInputIconCircle}>
                  <Ionicons name="key-outline" size={20} color="#e50914" />
                </View>
                <TextInput
                  style={[styles.passwordInput, { 
                    backgroundColor: themeColors.background, 
                    color: themeColors.text,
                    borderColor: themeColors.border 
                  }]}
                  placeholder="New Password"
                  placeholderTextColor={themeColors.textSecondary}
                  secureTextEntry
                  value={passwordForm.newPassword}
                  onChangeText={(text) => setPasswordForm(prev => ({ ...prev, newPassword: text }))}
                />
              </View>
              
              <View style={styles.passwordInputWrapper}>
                <View style={styles.passwordInputIconCircle}>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#e50914" />
                </View>
                <TextInput
                  style={[styles.passwordInput, { 
                    backgroundColor: themeColors.background, 
                    color: themeColors.text,
                    borderColor: themeColors.border 
                  }]}
                  placeholder="Confirm New Password"
                  placeholderTextColor={themeColors.textSecondary}
                  secureTextEntry
                  value={passwordForm.confirmPassword}
                  onChangeText={(text) => setPasswordForm(prev => ({ ...prev, confirmPassword: text }))}
                />
              </View>
            </View>
            
            {/* Password Requirements Info - Commented out for now */}
            {/* <View style={styles.passwordRequirements}>
              <Text style={[styles.requirementsTitle, { color: themeColors.textSecondary }]}>
                <Ionicons name="information-circle-outline" size={16} color={themeColors.textSecondary} /> Password Requirements:
              </Text>
              <Text style={[styles.requirementText, { color: themeColors.textSecondary }]}>• At least 6 characters long</Text>
            </View> */}
            
            {/* Action Buttons */}
            <View style={styles.passwordModalButtons}>
              <TouchableOpacity
                style={[styles.passwordCancelButton, { borderColor: themeColors.border }]}
                onPress={() => setShowPasswordModal(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.passwordCancelButtonText, { color: themeColors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.passwordChangeButton}
                onPress={changePassword}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.passwordChangeButtonText}>Change Password</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Other Profiles Modal */}
      <Modal
        visible={showOtherProfiles}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowOtherProfiles(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.cardBackground }]}>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>Team Profiles</Text>
            
            <ScrollView style={styles.userList} showsVerticalScrollIndicator={false}>
              {otherUsers.map((user, index) => (
                <TouchableOpacity
                  key={user._id || index}
                  style={[styles.userItemEnhanced, { backgroundColor: themeColors.background }]}
                  onPress={() => viewOtherProfile(user)}
                  activeOpacity={0.7}
                >
                  <View style={styles.userInfo}>
                    <View style={styles.userAvatarEnhanced}>
                      {user.picture ? (
                        <Image source={{ uri: user.picture }} style={styles.userAvatarImage} />
                      ) : (
                        <View style={[styles.userAvatarPlaceholder, { backgroundColor: '#e50914' }]}>
                          <Ionicons name="person" size={24} color="#fff" />
                        </View>
                      )}
                    </View>
                    <View style={styles.userDetailsEnhanced}>
                      <Text style={[styles.userNameEnhanced, { color: themeColors.text }]}>{user.name || 'Unknown User'}</Text>
                      <View style={styles.userRoleBadgeSmall}>
                        <Ionicons name="briefcase-outline" size={12} color="#6b7280" />
                        <Text style={styles.userRoleEnhanced}>{user.role || 'No Role'}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.chevronCircle}>
                    <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowOtherProfiles(false)}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* User Profile View Modal - Professional Design */}
      <Modal
        visible={showUserProfileModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowUserProfileModal(false)}
      >
        <View style={styles.profileModalOverlay}>
          <View style={[styles.profileModalContent, { backgroundColor: themeColors.background }]}>
            {/* Header */}
            <View style={[styles.profileModalHeader, { backgroundColor: themeColors.cardBackground, borderBottomColor: themeColors.border }]}>
              <TouchableOpacity
                onPress={() => setShowUserProfileModal(false)}
                style={styles.profileModalBackButton}
              >
                <Ionicons name="arrow-back" size={24} color={themeColors.text} />
              </TouchableOpacity>
              <Text style={[styles.profileModalHeaderTitle, { color: themeColors.text }]}>Agent Profile</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.profileModalScroll} showsVerticalScrollIndicator={false}>
              {viewingUser && (
                <>
                  {/* Profile Header Card */}
                  <View style={[styles.profileViewCard, { backgroundColor: themeColors.cardBackground }]}>
                    <View style={styles.profileViewPictureSection}>
                      <View style={styles.profileViewPictureContainer}>
                        {viewingUser.picture ? (
                          <Image
                            source={{ uri: viewingUser.picture }}
                            style={styles.profileViewPicture}
                          />
                        ) : (
                          <View style={[styles.profileViewPicturePlaceholder, { backgroundColor: themeColors.border }]}>
                            <Ionicons name="person" size={60} color={themeColors.textSecondary} />
                          </View>
                        )}
                      </View>
                      
                      <View style={styles.profileViewInfo}>
                        <Text style={[styles.profileViewName, { color: themeColors.text }]}>
                          {viewingUser.name || 'Name not set'}
                        </Text>
                        <View style={styles.profileViewRoleBadge}>
                          <Ionicons name="briefcase" size={16} color="#007bff" />
                          <Text style={styles.profileViewRoleText}>
                            {viewingUser.role || 'Role not assigned'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Contact Information Card */}
                  <View style={[styles.profileViewDetailsCard, { backgroundColor: themeColors.cardBackground }]}>
                    <Text style={[styles.profileViewSectionTitle, { color: themeColors.text }]}>
                      <Ionicons name="call" size={18} color="#e50914" /> Contact Information
                    </Text>
                    
                    <View style={styles.profileViewDetailRow}>
                      <View style={styles.profileViewDetailIcon}>
                        <Ionicons name="mail" size={18} color={themeColors.textSecondary} />
                      </View>
                      <View style={styles.profileViewDetailContent}>
                        <Text style={[styles.profileViewDetailLabel, { color: themeColors.textSecondary }]}>Email</Text>
                        <Text style={[styles.profileViewDetailValue, { color: themeColors.text }]}>
                          {viewingUser.email || 'Not provided'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.profileViewDetailRow}>
                      <View style={styles.profileViewDetailIcon}>
                        <Ionicons name="call" size={18} color={themeColors.textSecondary} />
                      </View>
                      <View style={styles.profileViewDetailContent}>
                        <Text style={[styles.profileViewDetailLabel, { color: themeColors.textSecondary }]}>Phone Number</Text>
                        <Text style={[styles.profileViewDetailValue, { color: themeColors.text }]}>
                          {viewingUser.phoneNumber || viewingUser.phoneno || 'Not provided'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Personal Details Card */}
                  {viewingUser.personalDetails && (
                    <View style={[styles.profileViewDetailsCard, { backgroundColor: themeColors.cardBackground }]}>
                      <Text style={[styles.profileViewSectionTitle, { color: themeColors.text }]}>
                        <Ionicons name="document-text" size={18} color="#e50914" /> Personal Details
                      </Text>
                      <Text style={[styles.profileViewPersonalDetails, { color: themeColors.textSecondary }]}>
                        {viewingUser.personalDetails}
                      </Text>
                    </View>
                  )}

                  {/* Account Information Card */}
                  <View style={[styles.profileViewDetailsCard, { backgroundColor: themeColors.cardBackground }]}>
                    <Text style={[styles.profileViewSectionTitle, { color: themeColors.text }]}>
                      <Ionicons name="information-circle" size={18} color="#e50914" /> Account Information
                    </Text>
                    
                    <View style={styles.profileViewDetailRow}>
                      <View style={styles.profileViewDetailIcon}>
                        <Ionicons name="person-circle" size={18} color={themeColors.textSecondary} />
                      </View>
                      <View style={styles.profileViewDetailContent}>
                        <Text style={[styles.profileViewDetailLabel, { color: themeColors.textSecondary }]}>Account Name</Text>
                        <Text style={[styles.profileViewDetailValue, { color: themeColors.text }]}>
                          {viewingUser.accountName || viewingUser.name || 'Not set'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.profileViewDetailRow}>
                      <View style={styles.profileViewDetailIcon}>
                        <Ionicons name="shield-checkmark" size={18} color={themeColors.textSecondary} />
                      </View>
                      <View style={styles.profileViewDetailContent}>
                        <Text style={[styles.profileViewDetailLabel, { color: themeColors.textSecondary }]}>User ID</Text>
                        <Text style={[styles.profileViewDetailValue, { color: themeColors.text }]} numberOfLines={1}>
                          {viewingUser._id || 'Not available'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </>
              )}
            </ScrollView>

            {/* Footer Button */}
            <View style={[styles.profileModalFooter, { backgroundColor: themeColors.cardBackground, borderTopColor: themeColors.border }]}>
              <TouchableOpacity
                style={styles.profileModalCloseButton}
                onPress={() => setShowUserProfileModal(false)}
              >
                <Text style={styles.profileModalCloseButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Modern Gradient Header Styles
  headerGradient: {
    backgroundColor: '#e50914',
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 4,
  },
  backButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 0.5,
  },
  editButton: {
    padding: 4,
  },
  editButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  // Enhanced Profile Card Styles
  profileCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    marginTop: -30,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  profilePictureSection: {
    alignItems: 'center',
  },
  profilePictureContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  profilePictureRing: {
    padding: 4,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: '#e50914',
    backgroundColor: '#fff',
  },
  profilePicture: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  profilePicturePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIconEnhanced: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#e50914',
    borderRadius: 18,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  profileInfo: {
    alignItems: 'center',
  },
  profileName: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  profileRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
  },
  profileRoleText: {
    fontSize: 14,
    color: '#e50914',
    fontWeight: '600',
    marginLeft: 6,
  },
  profileEmailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  profileEmail: {
    fontSize: 14,
    marginLeft: 6,
  },
  // Enhanced Details Card Styles
  detailsCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
  },
  sectionTitleEnhanced: {
    fontSize: 19,
    fontWeight: 'bold',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#fee',
  },
  // Enhanced Field Container Styles
  fieldContainerEnhanced: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 18,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  fieldIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fee',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  fieldContent: {
    flex: 1,
    justifyContent: 'center',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldValueEnhanced: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
  },
  textInputEnhanced: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    fontWeight: '500',
  },
  textAreaEnhanced: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    fontWeight: '500',
  },
  // Enhanced Settings Row Styles
  settingRowEnhanced: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingInfoEnhanced: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  // Enhanced Buttons
  saveButtonEnhanced: {
    backgroundColor: '#e50914',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#e50914',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    marginLeft: 10,
    letterSpacing: 0.5,
  },
  logoutButtonEnhanced: {
    backgroundColor: '#dc3545',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 30,
    marginTop: 6,
    elevation: 3,
    shadowColor: '#dc3545',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    marginLeft: 10,
    letterSpacing: 0.5,
  },
  // Enhanced Password Modal Styles
  passwordModalContent: {
    width: width * 0.92,
    maxHeight: '80%',
    borderRadius: 24,
    padding: 0,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  passwordModalHeader: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  passwordIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#e50914',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#e50914',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
  },
  passwordModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  passwordModalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  passwordInputsContainer: {
    padding: 24,
    paddingTop: 30,
  },
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  passwordInputIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fee',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  passwordInput: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '500',
  },
  passwordRequirements: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#f9fafb',
    marginHorizontal: 24,
    borderRadius: 12,
    marginBottom: 24,
  },
  requirementsTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 12,
    marginLeft: 8,
    marginVertical: 2,
  },
  passwordModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  passwordCancelButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 2,
    marginRight: 6,
  },
  passwordCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  passwordChangeButton: {
    flex: 1,
    backgroundColor: '#e50914',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#e50914',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    marginLeft: 6,
  },
  passwordChangeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.9,
    maxHeight: '75%',
    borderRadius: 20,
    padding: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    marginHorizontal: 6,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  primaryButton: {
    backgroundColor: '#e50914',
    borderColor: '#e50914',
  },
  modalButtonText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '600',
  },
  primaryButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '700',
  },
  modalCloseButton: {
    marginTop: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  // Enhanced User List Styles
  userList: {
    maxHeight: 400,
  },
  userItemEnhanced: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatarEnhanced: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 14,
    overflow: 'hidden',
  },
  userAvatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  userDetailsEnhanced: {
    flex: 1,
  },
  userNameEnhanced: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  userRoleBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  userRoleEnhanced: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
    marginLeft: 4,
  },
  chevronCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Professional Profile View Modal Styles
  profileModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  profileModalContent: {
    flex: 1,
    marginTop: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  profileModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  profileModalBackButton: {
    padding: 4,
  },
  profileModalHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  profileModalScroll: {
    flex: 1,
    padding: 16,
  },
  profileViewCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  profileViewPictureSection: {
    alignItems: 'center',
  },
  profileViewPictureContainer: {
    marginBottom: 16,
  },
  profileViewPicture: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#e50914',
  },
  profileViewPicturePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#e9ecef',
  },
  profileViewInfo: {
    alignItems: 'center',
  },
  profileViewName: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  profileViewRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  profileViewRoleText: {
    fontSize: 15,
    color: '#e50914',
    fontWeight: '600',
    marginLeft: 6,
  },
  profileViewDetailsCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  profileViewSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    paddingBottom: 8,
  },
  profileViewDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  profileViewDetailIcon: {
    width: 40,
    alignItems: 'center',
    paddingTop: 2,
  },
  profileViewDetailContent: {
    flex: 1,
  },
  profileViewDetailLabel: {
    fontSize: 13,
    marginBottom: 4,
    fontWeight: '500',
  },
  profileViewDetailValue: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 22,
  },
  profileViewPersonalDetails: {
    fontSize: 15,
    lineHeight: 24,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#e50914',
  },
  profileModalFooter: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  profileModalCloseButton: {
    backgroundColor: '#e50914',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  profileModalCloseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
