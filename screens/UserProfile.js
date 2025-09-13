import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../context/ThemeContext';
import { buildApiUrl } from '../constants/api';

export default function UserProfile() {
  const navigation = useNavigation();
  const { isDarkMode, theme, toggleTheme } = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [imagePickerVisible, setImagePickerVisible] = useState(false);

  // Password change modal state
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [userProfile, setUserProfile] = useState({
    _id: '',
    username: '',
    accountName: '',
    email: '',
    phoneNumber: '',
    secondaryPhone: '',
    role: '',
    profilePicture: null,
    dateJoined: '',
    lastLogin: '',
    assignedTo: '',
    department: '',
    employeeId: '',
    emergencyContact: '',
    emergencyPhone: '',
    address: '',
    bio: '',
  });

  const [tempProfile, setTempProfile] = useState({ ...userProfile });

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      
      // Get current user data from AsyncStorage
      const accountName = await AsyncStorage.getItem('accountName');
      const role = await AsyncStorage.getItem('role');
      
      if (!accountName) {
        Alert.alert('Error', 'No user session found');
        navigation.navigate('LoginScreen');
        return;
      }

      // Fetch user profile from server
      const response = await fetch(`https://itrack-backend-1.onrender.com/admin/users`);
      const users = await response.json();
      
      if (Array.isArray(users)) {
        const currentUser = users.find(user => user.accountName === accountName);
        if (currentUser) {
          const profileData = {
            ...userProfile,
            _id: currentUser._id || '',
            username: currentUser.username || '',
            accountName: currentUser.accountName || '',
            email: currentUser.email || '',
            phoneNumber: currentUser.phoneNumber || '',
            secondaryPhone: currentUser.secondaryPhone || '',
            role: currentUser.role || role,
            profilePicture: currentUser.profilePicture || null,
            dateJoined: currentUser.createdAt || new Date().toISOString(),
            lastLogin: currentUser.lastLogin || '',
            assignedTo: currentUser.assignedTo || '',
            department: currentUser.department || '',
            employeeId: currentUser.employeeId || '',
            emergencyContact: currentUser.emergencyContact || '',
            emergencyPhone: currentUser.emergencyPhone || '',
            address: currentUser.address || '',
            bio: currentUser.bio || '',
          };
          setUserProfile(profileData);
          setTempProfile(profileData);
        } else {
          Alert.alert('Error', 'User profile not found');
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);

      const response = await fetch(`https://itrack-backend-1.onrender.com/admin/users/${userProfile._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: tempProfile.email,
          phoneNumber: tempProfile.phoneNumber,
          secondaryPhone: tempProfile.secondaryPhone,
          profilePicture: tempProfile.profilePicture,
          department: tempProfile.department,
          employeeId: tempProfile.employeeId,
          emergencyContact: tempProfile.emergencyContact,
          emergencyPhone: tempProfile.emergencyPhone,
          address: tempProfile.address,
          bio: tempProfile.bio,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setUserProfile({ ...tempProfile });
        setEditMode(false);
        Alert.alert('Success', 'Profile updated successfully');
      } else {
        Alert.alert('Error', result.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile changes');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setTempProfile({ ...userProfile });
    setEditMode(false);
  };

  // Password change functionality
  const handlePasswordChange = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordForm;

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New password and confirmation do not match');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters long');
      return;
    }

    try {
      setSaving(true);

      // Use the mobile backend change password endpoint
      const response = await fetch(buildApiUrl('/change-password'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: currentPassword,
          newPassword: newPassword
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        Alert.alert('Error', data.message || 'Failed to change password');
        return;
      }

      Alert.alert(
        'Success',
        'Password changed successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              setPasswordModalVisible(false);
              setPasswordForm({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
              });
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error changing password:', error);
      Alert.alert('Error', 'Failed to change password. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const openPasswordModal = () => {
    setPasswordModalVisible(true);
  };

  const closePasswordModal = () => {
    setPasswordModalVisible(false);
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
  };

  // Theme toggle handler using context
  const handleThemeToggle = async () => {
    try {
      const newTheme = await toggleTheme();
      Alert.alert(
        'Theme Changed',
        `Switched to ${newTheme ? 'Dark' : 'Light'} mode successfully!`
      );
    } catch (error) {
      console.error('Error changing theme:', error);
      Alert.alert('Error', 'Failed to change theme');
    }
  };

  const handleImagePicker = async () => {
    try {
      // Request camera roll permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need camera roll permissions to set your profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        const base64Image = result.assets[0].base64;
        
        // Update the temporary profile with the new image
        setTempProfile({
          ...tempProfile,
          profilePicture: `data:image/jpeg;base64,${base64Image}`,
        });
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image');
    } finally {
      setImagePickerVisible(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need camera permissions to take your profile picture.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        const base64Image = result.assets[0].base64;
        
        // Update the temporary profile with the new image
        setTempProfile({
          ...tempProfile,
          profilePicture: `data:image/jpeg;base64,${base64Image}`,
        });
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    } finally {
      setImagePickerVisible(false);
    }
  };

  const renderProfileImage = () => {
    const imageSource = tempProfile.profilePicture || userProfile.profilePicture;
    
    if (imageSource) {
      return (
        <Image
          source={{ uri: imageSource }}
          style={styles.profileImage}
          resizeMode="cover"
        />
      );
    } else {
      // Placeholder with initials
      const initials = (tempProfile.accountName || userProfile.accountName || 'U')
        .split(' ')
        .map(name => name.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);

      return (
        <View style={styles.profileImagePlaceholder}>
          <Text style={styles.initialsText}>{initials}</Text>
        </View>
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <View style={styles.headerActions}>
          {editMode ? (
            <>
              <TouchableOpacity
                onPress={handleCancelEdit}
                style={[styles.actionButton, styles.cancelButton]}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveProfile}
                style={[styles.actionButton, styles.saveButton]}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              onPress={() => setEditMode(true)}
              style={[styles.actionButton, styles.editButton]}
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Profile Picture Section */}
      <View style={styles.profilePictureSection}>
        <TouchableOpacity
          onPress={() => editMode && setImagePickerVisible(true)}
          style={styles.profileImageContainer}
          disabled={!editMode}
        >
          {renderProfileImage()}
          {editMode && (
            <View style={styles.editImageOverlay}>
              <Text style={styles.editImageText}>📷</Text>
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>
            {userProfile.accountName || 'User Name'}
          </Text>
          <Text style={styles.profileRole}>
            {userProfile.role || 'Role'}
          </Text>
          <Text style={styles.profileJoinDate}>
            Joined {new Date(userProfile.dateJoined).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </Text>
        </View>
      </View>

      {/* Profile Details */}
      <View style={styles.detailsContainer}>
        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Username</Text>
            <TextInput
              style={[styles.fieldInput, !editMode && styles.fieldInputDisabled]}
              value={tempProfile.username}
              editable={false} // Username should not be editable
              placeholder="Username"
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Full Name</Text>
            <TextInput
              style={[styles.fieldInput, !editMode && styles.fieldInputDisabled]}
              value={tempProfile.accountName}
              onChangeText={(text) => setTempProfile({ ...tempProfile, accountName: text })}
              editable={editMode}
              placeholder="Full Name"
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Email Address</Text>
            <TextInput
              style={[styles.fieldInput, !editMode && styles.fieldInputDisabled]}
              value={tempProfile.email}
              onChangeText={(text) => setTempProfile({ ...tempProfile, email: text })}
              editable={editMode}
              placeholder="email@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Role</Text>
            <TextInput
              style={[styles.fieldInput, styles.fieldInputDisabled]}
              value={tempProfile.role}
              editable={false} // Role should not be editable by user
              placeholder="Role"
            />
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Primary Phone</Text>
            <TextInput
              style={[styles.fieldInput, !editMode && styles.fieldInputDisabled]}
              value={tempProfile.phoneNumber}
              onChangeText={(text) => setTempProfile({ ...tempProfile, phoneNumber: text })}
              editable={editMode}
              placeholder="+1 (555) 123-4567"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Secondary Phone</Text>
            <TextInput
              style={[styles.fieldInput, !editMode && styles.fieldInputDisabled]}
              value={tempProfile.secondaryPhone}
              onChangeText={(text) => setTempProfile({ ...tempProfile, secondaryPhone: text })}
              editable={editMode}
              placeholder="+1 (555) 987-6543"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Address</Text>
            <TextInput
              style={[styles.fieldInput, styles.textArea, !editMode && styles.fieldInputDisabled]}
              value={tempProfile.address}
              onChangeText={(text) => setTempProfile({ ...tempProfile, address: text })}
              editable={editMode}
              placeholder="Street address, City, State, ZIP"
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Work Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Work Information</Text>
          
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Employee ID</Text>
            <TextInput
              style={[styles.fieldInput, !editMode && styles.fieldInputDisabled]}
              value={tempProfile.employeeId}
              onChangeText={(text) => setTempProfile({ ...tempProfile, employeeId: text })}
              editable={editMode}
              placeholder="EMP-12345"
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Department</Text>
            <TextInput
              style={[styles.fieldInput, !editMode && styles.fieldInputDisabled]}
              value={tempProfile.department}
              onChangeText={(text) => setTempProfile({ ...tempProfile, department: text })}
              editable={editMode}
              placeholder="Sales, Operations, etc."
            />
          </View>
        </View>

        {/* Emergency Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Contact</Text>
          
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Contact Name</Text>
            <TextInput
              style={[styles.fieldInput, !editMode && styles.fieldInputDisabled]}
              value={tempProfile.emergencyContact}
              onChangeText={(text) => setTempProfile({ ...tempProfile, emergencyContact: text })}
              editable={editMode}
              placeholder="Emergency contact name"
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Contact Phone</Text>
            <TextInput
              style={[styles.fieldInput, !editMode && styles.fieldInputDisabled]}
              value={tempProfile.emergencyPhone}
              onChangeText={(text) => setTempProfile({ ...tempProfile, emergencyPhone: text })}
              editable={editMode}
              placeholder="+1 (555) 000-0000"
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* Bio */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bio</Text>
          
          <View style={styles.fieldContainer}>
            <TextInput
              style={[styles.fieldInput, styles.textArea, !editMode && styles.fieldInputDisabled]}
              value={tempProfile.bio}
              onChangeText={(text) => setTempProfile({ ...tempProfile, bio: text })}
              editable={editMode}
              placeholder="Tell us a bit about yourself..."
              multiline
              numberOfLines={4}
            />
          </View>
        </View>

        {/* Security Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔐 Security & Preferences</Text>
          
          <TouchableOpacity
            style={styles.passwordChangeButton}
            onPress={openPasswordModal}
          >
            <View style={styles.passwordChangeContent}>
              <View style={styles.passwordChangeIcon}>
                <Text style={styles.passwordChangeIconText}>🔑</Text>
              </View>
              <View style={styles.passwordChangeTextContainer}>
                <Text style={styles.passwordChangeTitle}>Change Password</Text>
                <Text style={styles.passwordChangeDescription}>
                  Update your account password for security
                </Text>
              </View>
              <Text style={styles.passwordChangeArrow}>›</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.themeToggleButton}
            onPress={handleThemeToggle}
          >
            <View style={styles.themeToggleContent}>
              <View style={[styles.themeToggleIcon, isDarkMode ? styles.darkModeIcon : styles.lightModeIcon]}>
                <Text style={styles.themeToggleIconText}>
                  {isDarkMode ? '🌙' : '☀️'}
                </Text>
              </View>
              <View style={styles.themeToggleTextContainer}>
                <Text style={styles.themeToggleTitle}>
                  {isDarkMode ? 'Dark Mode' : 'Light Mode'}
                </Text>
                <Text style={styles.themeToggleDescription}>
                  Switch to {isDarkMode ? 'light' : 'dark'} theme
                </Text>
              </View>
              <View style={styles.themeToggleSwitch}>
                <View style={[
                  styles.toggleSwitchTrack,
                  isDarkMode ? styles.toggleSwitchTrackOn : styles.toggleSwitchTrackOff
                ]}>
                  <View style={[
                    styles.toggleSwitchThumb,
                    isDarkMode ? styles.toggleSwitchThumbOn : styles.toggleSwitchThumbOff
                  ]} />
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Password Change Modal */}
      <Modal
        visible={passwordModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={closePasswordModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Change Password</Text>
            <Text style={styles.modalSubtitle}>
              Please enter your current password and choose a new one
            </Text>
            
            <View style={styles.modalInputContainer}>
              <Text style={styles.modalLabel}>Current Password</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter your current password"
                value={passwordForm.currentPassword}
                onChangeText={(text) => setPasswordForm({...passwordForm, currentPassword: text})}
                secureTextEntry={true}
                autoCapitalize="none"
              />
            </View>
            
            <View style={styles.modalInputContainer}>
              <Text style={styles.modalLabel}>New Password</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter new password (min 6 characters)"
                value={passwordForm.newPassword}
                onChangeText={(text) => setPasswordForm({...passwordForm, newPassword: text})}
                secureTextEntry={true}
                autoCapitalize="none"
              />
            </View>
            
            <View style={styles.modalInputContainer}>
              <Text style={styles.modalLabel}>Confirm New Password</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Confirm your new password"
                value={passwordForm.confirmPassword}
                onChangeText={(text) => setPasswordForm({...passwordForm, confirmPassword: text})}
                secureTextEntry={true}
                autoCapitalize="none"
              />
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={closePasswordModal}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={handlePasswordChange}
                disabled={saving}
              >
                <Text style={styles.modalConfirmButtonText}>
                  {saving ? 'Changing...' : 'Change Password'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Image Picker Modal */}
      <Modal
        visible={imagePickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setImagePickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.imagePickerModal}>
            <Text style={styles.modalTitle}>Update Profile Picture</Text>
            
            <TouchableOpacity
              style={styles.imagePickerOption}
              onPress={handleTakePhoto}
            >
              <Text style={styles.imagePickerIcon}>📷</Text>
              <Text style={styles.imagePickerText}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.imagePickerOption}
              onPress={handleImagePicker}
            >
              <Text style={styles.imagePickerIcon}>🖼️</Text>
              <Text style={styles.imagePickerText}>Choose from Gallery</Text>
            </TouchableOpacity>

            {(tempProfile.profilePicture || userProfile.profilePicture) && (
              <TouchableOpacity
                style={[styles.imagePickerOption, styles.removeOption]}
                onPress={() => {
                  setTempProfile({ ...tempProfile, profilePicture: null });
                  setImagePickerVisible(false);
                }}
              >
                <Text style={styles.imagePickerIcon}>🗑️</Text>
                <Text style={styles.imagePickerText}>Remove Picture</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.cancelImagePicker}
              onPress={() => setImagePickerVisible(false)}
            >
              <Text style={styles.cancelImagePickerText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  backButton: {
    padding: 8,
  },
  
  backButtonText: {
    fontSize: 16,
    color: '#CB1E2A',
    fontWeight: '600',
  },
  
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D2D2D',
    flex: 1,
    textAlign: 'center',
  },
  
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minHeight: 36,
    justifyContent: 'center',
  },
  
  editButton: {
    backgroundColor: '#CB1E2A',
  },
  
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  
  cancelButton: {
    backgroundColor: '#6B7280',
  },
  
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  
  saveButton: {
    backgroundColor: '#059669',
  },
  
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  
  profilePictureSection: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 16,
  },
  
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#CB1E2A',
  },
  
  profileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#CB1E2A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#CB1E2A',
  },
  
  initialsText: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '700',
  },
  
  editImageOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2D2D2D',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  
  editImageText: {
    fontSize: 16,
  },
  
  profileInfo: {
    alignItems: 'center',
  },
  
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2D2D2D',
    marginBottom: 4,
  },
  
  profileRole: {
    fontSize: 16,
    color: '#CB1E2A',
    fontWeight: '600',
    marginBottom: 8,
  },
  
  profileJoinDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  
  detailsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D2D2D',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 8,
  },
  
  fieldContainer: {
    marginBottom: 16,
  },
  
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  
  fieldInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#374151',
  },
  
  fieldInputDisabled: {
    backgroundColor: '#F3F4F6',
    color: '#6B7280',
  },
  
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  
  imagePickerModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D2D2D',
    textAlign: 'center',
    marginBottom: 24,
  },
  
  imagePickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
  },
  
  removeOption: {
    backgroundColor: '#FEF2F2',
  },
  
  imagePickerIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  
  imagePickerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  
  cancelImagePicker: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  
  cancelImagePickerText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
  },

  // Password Change Styles
  passwordChangeButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },

  passwordChangeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },

  passwordChangeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  passwordChangeIconText: {
    fontSize: 20,
  },

  passwordChangeTextContainer: {
    flex: 1,
  },

  passwordChangeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },

  passwordChangeDescription: {
    fontSize: 14,
    color: '#6B7280',
  },

  passwordChangeArrow: {
    fontSize: 20,
    color: '#9CA3AF',
    fontWeight: '300',
  },

  // Theme Toggle Styles
  themeToggleButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },

  themeToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },

  themeToggleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  lightModeIcon: {
    backgroundColor: '#FEF3C7',
  },

  darkModeIcon: {
    backgroundColor: '#E5E7EB',
  },

  themeToggleIconText: {
    fontSize: 20,
  },

  themeToggleTextContainer: {
    flex: 1,
  },

  themeToggleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },

  themeToggleDescription: {
    fontSize: 14,
    color: '#6B7280',
  },

  themeToggleSwitch: {
    marginLeft: 12,
  },

  toggleSwitchTrack: {
    width: 50,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    position: 'relative',
  },

  toggleSwitchTrackOff: {
    backgroundColor: '#D1D5DB',
  },

  toggleSwitchTrackOn: {
    backgroundColor: '#CB1E2A',
  },

  toggleSwitchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 3,
  },

  toggleSwitchThumbOff: {
    left: 2,
  },

  toggleSwitchThumbOn: {
    right: 2,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },

  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },

  modalInputContainer: {
    marginBottom: 16,
  },

  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },

  modalInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },

  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 12,
  },

  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },

  modalCancelButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  modalConfirmButton: {
    backgroundColor: '#CB1E2A',
  },

  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },

  modalConfirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
