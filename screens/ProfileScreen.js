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
  Switch,
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
    profilePicture: '',
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
      const userName = await AsyncStorage.getItem('userName') || await AsyncStorage.getItem('accountName');
      const userEmail = await AsyncStorage.getItem('userEmail');
      const userRole = await AsyncStorage.getItem('userRole');
      const userPhone = await AsyncStorage.getItem('userPhone');
      const darkMode = await AsyncStorage.getItem('isDarkMode') === 'true';

      if (userId) {
        // Fetch full profile from server
        const response = await fetch(buildApiUrl(`/api/getUser/${userId}`));
        if (response.ok) {
          const result = await response.json();
          const serverProfile = result.data || result.user || result;
          
          setUserProfile({
            id: serverProfile._id || userId,
            name: serverProfile.name || userName || 'Unknown User',
            email: serverProfile.email || userEmail || '',
            phoneNumber: serverProfile.phoneNumber || userPhone || '',
            role: serverProfile.role || userRole || 'User',
            accountName: serverProfile.accountName || userName || '',
            profilePicture: serverProfile.profilePicture || '',
            personalDetails: serverProfile.personalDetails || '',
            isDarkMode: darkMode,
          });
        } else {
          // Use AsyncStorage data if server fetch fails
          setUserProfile({
            id: userId,
            name: userName || 'Unknown User',
            email: userEmail || '',
            phoneNumber: userPhone || '',
            role: userRole || 'User',
            accountName: userName || '',
            profilePicture: '',
            personalDetails: '',
            isDarkMode: darkMode,
          });
        }
      }
      
      setEditForm({ ...userProfile });
      
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
      const response = await fetch(buildApiUrl('/api/getUsers'));
      if (response.ok) {
        const users = await response.json();
        const usersArray = Array.isArray(users) ? users : (users.data || []);
        
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
        setEditForm(prev => ({ ...prev, profilePicture: imageUri }));
      }
    } catch (error) {
      console.error('❌ Error selecting profile picture:', error);
      Alert.alert('Error', 'Failed to select profile picture');
    }
  };

  // Handle dark mode toggle
  const toggleDarkMode = async (value) => {
    try {
      await AsyncStorage.setItem('isDarkMode', value.toString());
      setUserProfile(prev => ({ ...prev, isDarkMode: value }));
      setEditForm(prev => ({ ...prev, isDarkMode: value }));
      
      // Apply theme immediately (this would typically trigger a theme provider)
      console.log(`🎨 Dark mode ${value ? 'enabled' : 'disabled'}`);
      
    } catch (error) {
      console.error('❌ Error toggling dark mode:', error);
    }
  };

  // Save profile changes
  const saveProfile = async () => {
    try {
      setSaving(true);
      
      const updateData = {
        name: editForm.name,
        phoneNumber: editForm.phoneNumber,
        personalDetails: editForm.personalDetails,
        profilePicture: editForm.profilePicture,
      };

      // Use the user management endpoint for updates
      const response = await fetch(buildApiUrl(`/admin/users/${userProfile.id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });
      
      // Also try alternative endpoint if first fails
      if (!response.ok) {
        console.log('Trying alternative endpoint for profile update');
        const altResponse = await fetch(buildApiUrl('/updateProfile'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...updateData,
            accountName: userProfile.accountName,
            email: userProfile.email
          }),
        });
        if (altResponse.ok) {
          response = altResponse;
        }
      }

      if (response.ok) {
        setUserProfile(prev => ({ ...prev, ...updateData }));
        setIsEditing(false);
        Alert.alert('Success', 'Profile updated successfully');
        
        // Update AsyncStorage
        await AsyncStorage.setItem('userName', updateData.name);
        if (updateData.phoneNumber) {
          await AsyncStorage.setItem('userPhone', updateData.phoneNumber);
        }
        
      } else {
        Alert.alert('Error', 'Failed to update profile');
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
      
      if (newPassword.length < 6) {
        Alert.alert('Error', 'New password must be at least 6 characters');
        return;
      }

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

  // View another user's profile
  const viewOtherProfile = (user) => {
    Alert.alert(
      `${user.name}'s Profile`,
      `Role: ${user.role}\nEmail: ${user.email}\nPhone: ${user.phoneNumber || 'N/A'}\n\nPersonal Details:\n${user.personalDetails || 'No details available'}`,
      [{ text: 'Close', style: 'cancel' }]
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
    background: userProfile.isDarkMode ? '#1a1a1a' : '#f8f9fa',
    cardBackground: userProfile.isDarkMode ? '#2d2d2d' : '#ffffff',
    text: userProfile.isDarkMode ? '#ffffff' : '#333333',
    textSecondary: userProfile.isDarkMode ? '#cccccc' : '#666666',
    border: userProfile.isDarkMode ? '#404040' : '#e9ecef',
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: themeColors.cardBackground, borderBottomColor: themeColors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={themeColors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>Profile</Text>
        <TouchableOpacity
          onPress={() => setIsEditing(!isEditing)}
          style={styles.editButton}
        >
          <Ionicons
            name={isEditing ? "close" : "create"}
            size={24}
            color={isEditing ? "#dc3545" : "#007bff"}
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: themeColors.cardBackground }]}>
          {/* Profile Picture Section */}
          <View style={styles.profilePictureSection}>
            <TouchableOpacity
              style={styles.profilePictureContainer}
              onPress={isEditing ? handleProfilePictureChange : null}
              disabled={!isEditing}
            >
              {(editForm.profilePicture || userProfile.profilePicture) ? (
                <Image
                  source={{ uri: editForm.profilePicture || userProfile.profilePicture }}
                  style={styles.profilePicture}
                />
              ) : (
                <View style={[styles.profilePicturePlaceholder, { backgroundColor: themeColors.border }]}>
                  <Ionicons name="person" size={50} color={themeColors.textSecondary} />
                </View>
              )}
              {isEditing && (
                <View style={styles.cameraIcon}>
                  <Ionicons name="camera" size={20} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
            
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: themeColors.text }]}>
                {userProfile.name}
              </Text>
              <Text style={[styles.profileRole, { color: themeColors.textSecondary }]}>
                {userProfile.role}
              </Text>
              <Text style={[styles.profileEmail, { color: themeColors.textSecondary }]}>
                {userProfile.email}
              </Text>
            </View>
          </View>
        </View>

        {/* Profile Details */}
        <View style={[styles.detailsCard, { backgroundColor: themeColors.cardBackground }]}>
          {/* Name */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: themeColors.text }]}>Full Name</Text>
            {isEditing ? (
              <TextInput
                style={[styles.textInput, { 
                  backgroundColor: themeColors.background, 
                  color: themeColors.text,
                  borderColor: themeColors.border 
                }]}
                value={editForm.name}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, name: text }))}
                placeholder="Enter your full name"
                placeholderTextColor={themeColors.textSecondary}
              />
            ) : (
              <Text style={[styles.fieldValue, { color: themeColors.textSecondary }]}>
                {userProfile.name || 'Not set'}
              </Text>
            )}
          </View>

          {/* Phone Number */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: themeColors.text }]}>Phone Number</Text>
            {isEditing ? (
              <TextInput
                style={[styles.textInput, { 
                  backgroundColor: themeColors.background, 
                  color: themeColors.text,
                  borderColor: themeColors.border 
                }]}
                value={editForm.phoneNumber}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, phoneNumber: text }))}
                placeholder="Enter your phone number"
                placeholderTextColor={themeColors.textSecondary}
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={[styles.fieldValue, { color: themeColors.textSecondary }]}>
                {userProfile.phoneNumber || 'Not set'}
              </Text>
            )}
          </View>

          {/* Email (Read-only) */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: themeColors.text }]}>Email</Text>
            <Text style={[styles.fieldValue, { color: themeColors.textSecondary }]}>
              {userProfile.email}
            </Text>
          </View>

          {/* Role (Read-only) */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: themeColors.text }]}>Role</Text>
            <Text style={[styles.fieldValue, { color: themeColors.textSecondary }]}>
              {userProfile.role}
            </Text>
          </View>

          {/* Personal Details */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: themeColors.text }]}>Personal Details</Text>
            {isEditing ? (
              <TextInput
                style={[styles.textArea, { 
                  backgroundColor: themeColors.background, 
                  color: themeColors.text,
                  borderColor: themeColors.border 
                }]}
                value={editForm.personalDetails}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, personalDetails: text }))}
                placeholder="Enter personal or work-related details..."
                placeholderTextColor={themeColors.textSecondary}
                multiline
                numberOfLines={4}
              />
            ) : (
              <Text style={[styles.fieldValue, { color: themeColors.textSecondary }]}>
                {userProfile.personalDetails || 'No details added yet'}
              </Text>
            )}
          </View>
        </View>

        {/* Settings Card */}
        <View style={[styles.detailsCard, { backgroundColor: themeColors.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Settings</Text>
          
          {/* Dark Mode Toggle */}
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="moon" size={20} color={themeColors.text} />
              <Text style={[styles.settingLabel, { color: themeColors.text }]}>Dark Mode</Text>
            </View>
            <Switch
              value={userProfile.isDarkMode}
              onValueChange={toggleDarkMode}
              trackColor={{ false: '#767577', true: '#007bff' }}
              thumbColor={userProfile.isDarkMode ? '#ffffff' : '#f4f3f4'}
            />
          </View>

          {/* Change Password */}
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => setShowPasswordModal(true)}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="lock-closed" size={20} color={themeColors.text} />
              <Text style={[styles.settingLabel, { color: themeColors.text }]}>Change Password</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={themeColors.textSecondary} />
          </TouchableOpacity>

          {/* View Other Profiles */}
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => setShowOtherProfiles(true)}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="people" size={20} color={themeColors.text} />
              <Text style={[styles.settingLabel, { color: themeColors.text }]}>View Other Profiles</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={themeColors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Save Button */}
        {isEditing && (
          <TouchableOpacity
            style={styles.saveButton}
            onPress={saveProfile}
            disabled={saving}
          >
            {saving ? (
              <UniformLoading size="small" />
            ) : (
              <>
                <Ionicons name="checkmark" size={20} color="#fff" />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Password Change Modal */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.cardBackground }]}>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>Change Password</Text>
            
            <TextInput
              style={[styles.textInput, { 
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
            
            <TextInput
              style={[styles.textInput, { 
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
            
            <TextInput
              style={[styles.textInput, { 
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
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowPasswordModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.primaryButton]}
                onPress={changePassword}
              >
                <Text style={styles.primaryButtonText}>Change</Text>
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
            
            <ScrollView style={styles.userList}>
              {otherUsers.map((user, index) => (
                <TouchableOpacity
                  key={user._id || index}
                  style={[styles.userItem, { borderBottomColor: themeColors.border }]}
                  onPress={() => viewOtherProfile(user)}
                >
                  <View style={styles.userInfo}>
                    <View style={[styles.userAvatar, { backgroundColor: themeColors.border }]}>
                      {user.profilePicture ? (
                        <Image source={{ uri: user.profilePicture }} style={styles.userAvatarImage} />
                      ) : (
                        <Ionicons name="person" size={20} color={themeColors.textSecondary} />
                      )}
                    </View>
                    <View style={styles.userDetails}>
                      <Text style={[styles.userName, { color: themeColors.text }]}>{user.name}</Text>
                      <Text style={[styles.userRole, { color: themeColors.textSecondary }]}>{user.role}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={themeColors.textSecondary} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  editButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  profileCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  profilePictureSection: {
    alignItems: 'center',
  },
  profilePictureContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profilePicture: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profilePicturePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#007bff',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    alignItems: 'center',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 16,
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 14,
  },
  detailsCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  fieldValue: {
    fontSize: 16,
    lineHeight: 22,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 16,
    marginLeft: 12,
  },
  saveButton: {
    backgroundColor: '#007bff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.9,
    maxHeight: '80%',
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  primaryButton: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  modalButtonText: {
    fontSize: 16,
    color: '#666',
  },
  primaryButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  modalCloseButton: {
    marginTop: 20,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  userList: {
    maxHeight: 300,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  userRole: {
    fontSize: 14,
  },
});
