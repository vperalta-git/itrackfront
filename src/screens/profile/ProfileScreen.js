import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  Modal,
  Switch,
  FlatList,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../constants/theme';
import { apiGet, apiPut, apiPost } from '../../utils/api';

const ProfileScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fullUser, setFullUser] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showTeamProfilesModal, setShowTeamProfilesModal] = useState(false);
  const [teamProfiles, setTeamProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);

  // Edit form states
  const [formData, setFormData] = useState({
    name: '',
    phoneno: '',
    email: '',
    personalDetails: '',
    picture: '',
  });

  // Password change states
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const users = await apiGet('/getUsers');
      const found = users.find(u => u.email === user?.email);
      if (found) {
        setFullUser(found);
        setFormData({
          name: found.name || '',
          phoneno: found.phoneno || found.phoneNumber || '',
          email: found.email || '',
          personalDetails: found.personalDetails || '',
          picture: found.picture || '',
        });
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamProfiles = async () => {
    try {
      const users = await apiGet('/getUsers');
      // Filter out current user
      const otherUsers = users.filter(u => u._id !== fullUser?._id);
      setTeamProfiles(otherUsers);
    } catch (error) {
      console.error('Error fetching team profiles:', error);
      Alert.alert('Error', 'Failed to load team profiles');
    }
  };

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Please allow access to your photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setFormData(prev => ({ ...prev, picture: base64Image }));
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleUpdateProfile = async () => {
    try {
      if (!formData.name || !formData.phoneno) {
        Alert.alert('Validation Error', 'Name and phone number are required');
        return;
      }

      setLoading(true);

      const updatedData = {
        name: formData.name,
        phoneno: formData.phoneno,
        phoneNumber: formData.phoneno, // Some users might have phoneNumber field
        personalDetails: formData.personalDetails,
        picture: formData.picture,
      };

      await apiPut(`/updateUser/${fullUser._id}`, updatedData);

      // Log audit trail
      await apiPost('/api/audit-trail', {
        action: 'Update',
        resource: 'User',
        performedBy: fullUser.name,
        details: { summary: 'Profile updated' },
        timestamp: new Date().toISOString(),
      });

      Alert.alert('Success', 'Profile updated successfully!');
      setIsEditMode(false);
      fetchUserProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    try {
      const { currentPassword, newPassword, confirmPassword } = passwordData;

      if (!currentPassword || !newPassword || !confirmPassword) {
        Alert.alert('Validation Error', 'All fields are required');
        return;
      }

      if (newPassword !== confirmPassword) {
        Alert.alert('Validation Error', 'New passwords do not match');
        return;
      }

      if (newPassword.length < 8) {
        Alert.alert('Validation Error', 'Password must be at least 8 characters');
        return;
      }

      // Check current password
      if (currentPassword !== fullUser.password) {
        Alert.alert('Error', 'Current password is incorrect');
        return;
      }

      setLoading(true);

      await apiPut(`/updateUser/${fullUser._id}`, {
        ...fullUser,
        password: newPassword,
      });

      // Log audit trail
      await apiPost('/api/audit-trail', {
        action: 'Update',
        resource: 'User',
        performedBy: fullUser.name,
        details: { summary: 'Password changed' },
        timestamp: new Date().toISOString(),
      });

      Alert.alert('Success', 'Password changed successfully!');
      setShowPasswordModal(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      console.error('Error changing password:', error);
      Alert.alert('Error', 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleViewTeamProfiles = () => {
    fetchTeamProfiles();
    setShowTeamProfilesModal(true);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  const renderTeamProfileItem = ({ item }) => (
    <TouchableOpacity
      style={styles.teamProfileItem}
      onPress={() => setSelectedProfile(item)}
    >
      <Image
        source={
          item.picture
            ? { uri: item.picture }
            : require('../../../assets/icons/users.png')
        }
        style={styles.teamProfileImage}
      />
      <View style={styles.teamProfileInfo}>
        <Text style={styles.teamProfileName}>{item.name || item.accountName}</Text>
        <Text style={styles.teamProfileRole}>{item.role}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading && !fullUser) {
    return (
      <View style={styles.centerContainer}>
        <Image
          source={require('../../../assets/loading.gif')}
          style={styles.loadingGif}
        />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.profileImageContainer}>
            <Image
              source={
                formData.picture
                  ? { uri: formData.picture }
                  : require('../../../assets/icons/users.png')
              }
              style={styles.profileImage}
            />
            {isEditMode && (
              <TouchableOpacity
                style={styles.cameraButton}
                onPress={handlePickImage}
              >
                <Text style={styles.cameraIcon}>📷</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.profileName}>{fullUser?.name || fullUser?.accountName}</Text>
          <Text style={styles.profileRole}>{fullUser?.role}</Text>
          <Text style={styles.profileEmail}>{fullUser?.email}</Text>
        </View>

        {/* Edit Mode Toggle */}
        {!isEditMode && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setIsEditMode(true)}
            >
              <Text style={styles.editButtonText}>✏️ Edit Profile</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Profile Form */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            {isEditMode ? (
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                placeholder="Enter full name"
              />
            ) : (
              <Text style={styles.value}>{formData.name || 'Not set'}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            {isEditMode ? (
              <TextInput
                style={styles.input}
                value={formData.phoneno}
                onChangeText={(text) => setFormData(prev => ({ ...prev, phoneno: text }))}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.value}>{formData.phoneno || 'Not set'}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{formData.email}</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Role</Text>
            <Text style={styles.value}>{fullUser?.role}</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Other Contact Information</Text>
            {isEditMode ? (
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.personalDetails}
                onChangeText={(text) => setFormData(prev => ({ ...prev, personalDetails: text }))}
                placeholder="Enter personal or work-related details..."
                multiline
                numberOfLines={4}
              />
            ) : (
              <Text style={styles.value}>
                {formData.personalDetails || 'No details added yet'}
              </Text>
            )}
          </View>
        </View>

        {/* Edit Mode Actions */}
        {isEditMode && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleUpdateProfile}
              disabled={loading}
            >
              <Text style={styles.saveButtonText}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setIsEditMode(false);
                setFormData({
                  name: fullUser?.name || '',
                  phoneno: fullUser?.phoneno || fullUser?.phoneNumber || '',
                  email: fullUser?.email || '',
                  personalDetails: fullUser?.personalDetails || '',
                  picture: fullUser?.picture || '',
                });
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Settings Section */}
        {!isEditMode && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Settings</Text>

            {/* Dark Mode Toggle */}
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingIcon}>🌙</Text>
                <Text style={styles.settingText}>Dark Mode</Text>
              </View>
              <Switch
                value={isDarkMode}
                onValueChange={setIsDarkMode}
                trackColor={{ false: '#D1D5DB', true: COLORS.primary }}
                thumbColor={isDarkMode ? COLORS.white : '#F3F4F6'}
              />
            </View>

            {/* Change Password */}
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => setShowPasswordModal(true)}
            >
              <View style={styles.settingLeft}>
                <Text style={styles.settingIcon}>🔒</Text>
                <Text style={styles.settingText}>Change Password</Text>
              </View>
              <Text style={styles.settingArrow}>›</Text>
            </TouchableOpacity>

            {/* View Other Profiles */}
            <TouchableOpacity
              style={styles.settingItem}
              onPress={handleViewTeamProfiles}
            >
              <View style={styles.settingLeft}>
                <Text style={styles.settingIcon}>👥</Text>
                <Text style={styles.settingText}>View Other Profiles</Text>
              </View>
              <Text style={styles.settingArrow}>›</Text>
            </TouchableOpacity>

            {/* Logout */}
            <TouchableOpacity
              style={[styles.settingItem, styles.logoutItem]}
              onPress={handleLogout}
            >
              <View style={styles.settingLeft}>
                <Text style={styles.settingIcon}>🚪</Text>
                <Text style={[styles.settingText, styles.logoutText]}>Logout</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Change Password Modal */}
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Change Password</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Current Password</Text>
              <TextInput
                style={styles.input}
                value={passwordData.currentPassword}
                onChangeText={(text) =>
                  setPasswordData(prev => ({ ...prev, currentPassword: text }))
                }
                placeholder="Enter current password"
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>New Password</Text>
              <TextInput
                style={styles.input}
                value={passwordData.newPassword}
                onChangeText={(text) =>
                  setPasswordData(prev => ({ ...prev, newPassword: text }))
                }
                placeholder="Enter new password"
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm New Password</Text>
              <TextInput
                style={styles.input}
                value={passwordData.confirmPassword}
                onChangeText={(text) =>
                  setPasswordData(prev => ({ ...prev, confirmPassword: text }))
                }
                placeholder="Confirm new password"
                secureTextEntry
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={handleChangePassword}
                disabled={loading}
              >
                <Text style={styles.modalButtonText}>
                  {loading ? 'Changing...' : 'Change Password'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setShowPasswordModal(false);
                  setPasswordData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: '',
                  });
                }}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Team Profiles Modal */}
      <Modal
        visible={showTeamProfilesModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTeamProfilesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Team Profiles</Text>

            <FlatList
              data={teamProfiles}
              renderItem={renderTeamProfileItem}
              keyExtractor={(item) => item._id}
              style={styles.teamProfilesList}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No other profiles found</Text>
              }
            />

            <TouchableOpacity
              style={[styles.modalButton, styles.modalCancelButton]}
              onPress={() => {
                setShowTeamProfilesModal(false);
                setSelectedProfile(null);
              }}
            >
              <Text style={styles.modalCancelButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Selected Profile Detail Modal */}
      {selectedProfile && (
        <Modal
          visible={!!selectedProfile}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedProfile(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.profileDetailContainer}>
              <Text style={styles.profileDetailTitle}>
                {selectedProfile.name || selectedProfile.accountName}'s Profile
              </Text>

              <Text style={styles.profileDetailText}>
                <Text style={styles.profileDetailLabel}>Role:</Text> {selectedProfile.role}
              </Text>
              <Text style={styles.profileDetailText}>
                <Text style={styles.profileDetailLabel}>Email:</Text> {selectedProfile.email}
              </Text>
              <Text style={styles.profileDetailText}>
                <Text style={styles.profileDetailLabel}>Phone:</Text>{' '}
                {selectedProfile.phoneno || selectedProfile.phoneNumber || 'N/A'}
              </Text>
              <Text style={styles.profileDetailText}>
                <Text style={styles.profileDetailLabel}>Other Contact Information:</Text>
                {'\n'}
                {selectedProfile.personalDetails || 'No details available'}
              </Text>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSelectedProfile(null)}
              >
                <Text style={styles.closeButtonText}>CLOSE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingGif: {
    width: 60,
    height: 60,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: COLORS.white,
    padding: SPACING.xl,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: SPACING.md,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F3F4F6',
  },
  cameraButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  cameraIcon: {
    fontSize: 20,
  },
  profileName: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  profileRole: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  profileEmail: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  section: {
    backgroundColor: COLORS.white,
    marginTop: SPACING.md,
    padding: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  value: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  editButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  editButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#6B7280',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    fontSize: 24,
    marginRight: SPACING.md,
  },
  settingText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  settingArrow: {
    fontSize: 24,
    color: COLORS.textSecondary,
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
  logoutText: {
    color: COLORS.error,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  modalActions: {
    marginTop: SPACING.lg,
  },
  modalButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  modalButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  modalCancelButton: {
    backgroundColor: '#6B7280',
  },
  modalCancelButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
  },
  teamProfilesList: {
    maxHeight: 300,
    marginBottom: SPACING.lg,
  },
  teamProfileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  teamProfileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: SPACING.md,
  },
  teamProfileInfo: {
    flex: 1,
  },
  teamProfileName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  teamProfileRole: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.md,
    paddingVertical: SPACING.xl,
  },
  profileDetailContainer: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    width: '90%',
  },
  profileDetailTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  profileDetailText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    marginBottom: SPACING.md,
    lineHeight: 22,
  },
  profileDetailLabel: {
    fontWeight: '600',
    color: COLORS.text,
  },
  closeButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  closeButtonText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
});

export default ProfileScreen;
