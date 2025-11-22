# Profile Screen Guide

## Overview
The Profile Screen provides a comprehensive user profile management interface matching the web design. Users can view and edit their profile information, change password, view team members, and manage settings.

## Features

### 1. Profile Display
- **Profile Picture**: Displays user's profile picture or default avatar
- **Name**: User's full name (from `name` or `accountName` field)
- **Role**: User's role (Admin, Manager, Driver, Sales Agent, etc.)
- **Email**: User's email address

### 2. Edit Profile
- **Edit Mode Toggle**: Tap "✏️ Edit Profile" button to enter edit mode
- **Editable Fields**:
  - Full Name
  - Phone Number
  - Other Contact Information (multiline text area)
- **Profile Picture Update**: Tap camera icon to select new photo from gallery
- **Save Changes**: Updates profile in database and logs audit trail
- **Cancel**: Reverts changes and exits edit mode

### 3. Change Password
- **Current Password**: Validates against existing password
- **New Password**: Must be at least 8 characters
- **Confirm Password**: Must match new password
- **Security**: Validates current password before allowing change
- **Audit Logging**: Logs password change action

### 4. View Other Profiles (Team Profiles)
- **Team List**: Shows all users except current user
- **Profile Cards**: Display name, role, and profile picture
- **Detail View**: Tap on any profile to view full details
- **Information Shown**:
  - Role
  - Email
  - Phone number
  - Other contact information

### 5. Settings
- **Dark Mode Toggle**: Enable/disable dark mode (UI only, functionality pending)
- **Change Password**: Opens password change modal
- **View Other Profiles**: Opens team profiles modal
- **Logout**: Confirms and logs user out

### 6. Information Display
All profile fields from database:
- **Full Name**: `name` or `accountName`
- **Phone Number**: `phoneno` or `phoneNumber`
- **Email**: `email` (read-only)
- **Role**: `role` (read-only)
- **Other Contact Information**: `personalDetails`
- **Profile Picture**: `picture` (base64 encoded image)

## Database Schema

### User Object Fields
```json
{
  "_id": "68c0efaaa0508e15ccb5f9f3",
  "name": "Vionne Peralta",
  "email": "vionneulrichp@gmail.com",
  "password": "pass",
  "role": "Admin",
  "phoneno": "09478516430",
  "phoneNumber": "09478516430",
  "accountName": "Vionne Peralta",
  "username": "vionneulrichp",
  "picture": "data:image/jpeg;base64,...",
  "personalDetails": "",
  "isActive": true,
  "currentLocation": {},
  "lastLogin": "2025-11-21T13:46:08.753+00:00",
  "createdBy": "System",
  "updatedBy": "System",
  "createdAt": "2025-11-21T00:00:00.000+00:00",
  "updatedAt": "2025-11-21T13:46:08.780+00:00",
  "assignedTo": null,
  "__v": 0
}
```

### Required Fields
- `name` or `accountName`: User's full name
- `email`: User's email (unique identifier)
- `password`: User's password (plain text in DB)
- `role`: User's role (Admin, Manager, Driver, etc.)

### Optional Fields
- `phoneno` or `phoneNumber`: Contact number
- `picture`: Base64 encoded profile picture
- `personalDetails`: Additional contact information
- `username`: Unique username
- `isActive`: Account status
- `lastLogin`: Last login timestamp

## API Endpoints Used

### Get Users
```
GET /getUsers
```
Returns array of all users in the system.

### Update User
```
PUT /updateUser/:id
```
Updates user profile with provided data.

**Request Body:**
```json
{
  "name": "Updated Name",
  "phoneno": "1234567890",
  "phoneNumber": "1234567890",
  "personalDetails": "Additional details",
  "picture": "data:image/jpeg;base64,...",
  "password": "newpassword" // Only when changing password
}
```

### Audit Trail
```
POST /api/audit-trail
```
Logs user actions for audit purposes.

**Request Body:**
```json
{
  "action": "Update",
  "resource": "User",
  "performedBy": "User Name",
  "details": { "summary": "Profile updated" },
  "timestamp": "2025-11-21T13:46:08.753+00:00"
}
```

## Component Structure

```
ProfileScreen
├── ScrollView
│   ├── Profile Header
│   │   ├── Profile Image (with camera button in edit mode)
│   │   ├── Name
│   │   ├── Role
│   │   └── Email
│   ├── Edit Button (when not in edit mode)
│   ├── Personal Information Section
│   │   ├── Full Name (editable)
│   │   ├── Phone Number (editable)
│   │   ├── Email (read-only)
│   │   ├── Role (read-only)
│   │   └── Other Contact Info (editable)
│   ├── Edit Mode Actions (when in edit mode)
│   │   ├── Save Changes Button
│   │   └── Cancel Button
│   └── Settings Section (when not in edit mode)
│       ├── Dark Mode Toggle
│       ├── Change Password
│       ├── View Other Profiles
│       └── Logout
├── Change Password Modal
│   ├── Current Password Input
│   ├── New Password Input
│   ├── Confirm Password Input
│   ├── Change Password Button
│   └── Cancel Button
├── Team Profiles Modal
│   ├── Profile List (FlatList)
│   └── Close Button
└── Profile Detail Modal
    ├── Profile Details
    └── Close Button
```

## State Management

### Local States
```javascript
const [loading, setLoading] = useState(false);
const [fullUser, setFullUser] = useState(null);
const [isEditMode, setIsEditMode] = useState(false);
const [isDarkMode, setIsDarkMode] = useState(false);
const [showPasswordModal, setShowPasswordModal] = useState(false);
const [showTeamProfilesModal, setShowTeamProfilesModal] = useState(false);
const [teamProfiles, setTeamProfiles] = useState([]);
const [selectedProfile, setSelectedProfile] = useState(null);

const [formData, setFormData] = useState({
  name: '',
  phoneno: '',
  email: '',
  personalDetails: '',
  picture: '',
});

const [passwordData, setPasswordData] = useState({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
});
```

### Context
Uses `useAuth()` context for:
- `user`: Current authenticated user
- `logout`: Logout function

## Data Flow

### Profile Load
1. Component mounts
2. `fetchUserProfile()` called
3. GET /getUsers fetches all users
4. Find user matching authenticated user's email
5. Set `fullUser` and `formData` states
6. UI renders with user data

### Profile Update
1. User enters edit mode
2. Modifies fields (name, phone, personalDetails, picture)
3. Taps "Save Changes"
4. Validates required fields (name, phoneno)
5. PUT /updateUser/:id with updated data
6. POST /api/audit-trail logs action
7. Fetches fresh profile data
8. Exits edit mode
9. Shows success alert

### Password Change
1. User taps "Change Password" in settings
2. Modal opens with 3 input fields
3. User enters current, new, and confirm passwords
4. Validates:
   - All fields filled
   - New passwords match
   - New password >= 8 characters
   - Current password matches database
5. PUT /updateUser/:id with new password
6. POST /api/audit-trail logs action
7. Clears password form
8. Closes modal
9. Shows success alert

### View Team Profiles
1. User taps "View Other Profiles"
2. Fetches all users from GET /getUsers
3. Filters out current user
4. Displays list in modal
5. User taps on profile
6. Shows detail modal with full info
7. User closes detail modal
8. Returns to team list

### Image Upload
1. User taps camera icon (edit mode)
2. Requests media library permissions
3. Opens image picker
4. User selects image
5. Image converted to base64
6. Sets formData.picture
7. Displays new image in UI
8. Saved when user taps "Save Changes"

## Validation Rules

### Profile Update
- **Name**: Required, cannot be empty
- **Phone Number**: Required, cannot be empty
- **Email**: Read-only, cannot be changed
- **Role**: Read-only, cannot be changed
- **Personal Details**: Optional
- **Picture**: Optional, base64 encoded

### Password Change
- **Current Password**: Required, must match database
- **New Password**: Required, minimum 8 characters
- **Confirm Password**: Required, must match new password

## Permissions

### Image Picker
Requires media library access:
```javascript
const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
```

Shows alert if permission denied.

## Error Handling

### API Errors
All API calls wrapped in try-catch:
```javascript
try {
  await apiPut(`/updateUser/${fullUser._id}`, updatedData);
  Alert.alert('Success', 'Profile updated successfully!');
} catch (error) {
  console.error('Error updating profile:', error);
  Alert.alert('Error', 'Failed to update profile');
}
```

### Validation Errors
Shows alerts for:
- Empty required fields
- Password mismatch
- Password too short
- Incorrect current password

## Styling

### Colors
- Background: #F3F4F6 (light gray)
- Sections: #FFFFFF (white)
- Primary: COLORS.primary (#DC2626 red)
- Text: COLORS.text (#000000)
- Secondary Text: COLORS.textSecondary (#6B7280)
- Error: COLORS.error (red)

### Layout
- **Profile Image**: 120x120 circular
- **Camera Button**: 40x40 circular, positioned bottom-right
- **Section Padding**: SPACING.lg
- **Input Padding**: SPACING.md
- **Border Radius**: BORDER_RADIUS.md (8px)

### Modals
- **Overlay**: rgba(0, 0, 0, 0.5)
- **Container**: White background, rounded corners
- **Width**: 90% of screen width
- **Max Height**: 80% of screen height

## Testing Guide

### Test 1: Profile Display
1. Login as any user
2. Navigate to Profile from drawer
3. **Expected**: Profile loads with user's information
4. **Expected**: Profile picture, name, role, email displayed
5. **Expected**: All fields show correct data

### Test 2: Edit Profile
1. On Profile screen, tap "✏️ Edit Profile"
2. **Expected**: Edit mode activates
3. **Expected**: Camera icon appears on profile picture
4. **Expected**: Name and Phone inputs become editable
5. Modify name and phone number
6. Tap "Save Changes"
7. **Expected**: Success alert shown
8. **Expected**: Changes saved and displayed
9. **Expected**: Edit mode exits

### Test 3: Profile Picture Update
1. Enter edit mode
2. Tap camera icon on profile picture
3. **Expected**: Image picker opens
4. Select an image
5. **Expected**: New image displays immediately
6. Tap "Save Changes"
7. **Expected**: Image saved to database
8. Exit and re-enter profile
9. **Expected**: New image persists

### Test 4: Cancel Edit
1. Enter edit mode
2. Modify name and phone
3. Tap "Cancel"
4. **Expected**: Changes discarded
5. **Expected**: Original values restored
6. **Expected**: Edit mode exits

### Test 5: Change Password
1. Tap "Change Password" in settings
2. **Expected**: Modal opens
3. Enter incorrect current password
4. Tap "Change Password"
5. **Expected**: Error alert "Current password is incorrect"
6. Enter correct current password
7. Enter new password (less than 8 chars)
8. **Expected**: Error alert "Password must be at least 8 characters"
9. Enter valid new password
10. Enter different confirm password
11. **Expected**: Error alert "New passwords do not match"
12. Enter matching passwords (>=8 chars)
13. Tap "Change Password"
14. **Expected**: Success alert
15. **Expected**: Modal closes
16. Logout and login with new password
17. **Expected**: Login succeeds

### Test 6: View Team Profiles
1. Tap "View Other Profiles"
2. **Expected**: Modal shows list of other users
3. **Expected**: Current user not in list
4. Tap on a profile
5. **Expected**: Detail modal shows with full info
6. **Expected**: Role, email, phone, contact info displayed
7. Tap "CLOSE"
8. **Expected**: Returns to team list
9. Tap "Close" on team list
10. **Expected**: Returns to profile screen

### Test 7: Dark Mode Toggle
1. Toggle Dark Mode switch
2. **Expected**: Switch changes state
3. **Note**: UI change not yet implemented (planned feature)

### Test 8: Logout
1. Tap "Logout" in settings
2. **Expected**: Confirmation alert appears
3. Tap "Cancel"
4. **Expected**: Alert dismisses, no logout
5. Tap "Logout" again
6. Tap "Logout" in alert
7. **Expected**: User logged out
8. **Expected**: Navigates to login screen

### Test 9: Validation
1. Enter edit mode
2. Clear name field
3. Tap "Save Changes"
4. **Expected**: Error alert "Name and phone number are required"
5. Enter name, clear phone
6. Tap "Save Changes"
7. **Expected**: Same error alert
8. Enter both fields
9. Tap "Save Changes"
10. **Expected**: Success

### Test 10: Personal Details
1. Enter edit mode
2. Enter multi-line text in "Other Contact Information"
3. Save changes
4. **Expected**: Text saved with line breaks
5. View in read mode
6. **Expected**: Line breaks preserved

## Troubleshooting

### Profile Not Loading
**Symptom**: Loading screen persists indefinitely
**Causes**:
- API endpoint unreachable
- User email not found in database
- Network error

**Solutions**:
1. Check backend server status
2. Verify user's email in database
3. Check console for error logs
4. Verify API_BASE_URL in config

### Image Not Uploading
**Symptom**: Selected image doesn't display or save
**Causes**:
- Permissions not granted
- Image too large
- Base64 conversion failed

**Solutions**:
1. Check media library permissions
2. Reduce image quality in picker options
3. Verify base64 string format: `data:image/jpeg;base64,...`
4. Check image size limit (usually 1MB recommended)

### Password Change Fails
**Symptom**: Password change shows error even with correct input
**Causes**:
- Current password doesn't match database
- Password not updating in database
- API error

**Solutions**:
1. Verify current password in database
2. Check PUT /updateUser/:id response
3. Ensure password field included in update
4. Check for password hashing (DB stores plain text currently)

### Team Profiles Empty
**Symptom**: "No other profiles found" when users exist
**Causes**:
- GET /getUsers returning empty array
- All users filtered out
- API error

**Solutions**:
1. Verify GET /getUsers endpoint working
2. Check filter logic: `users.filter(u => u._id !== fullUser?._id)`
3. Ensure fullUser._id is set correctly
4. Check console for errors

### Audit Trail Not Logging
**Symptom**: Actions not appearing in audit trail
**Causes**:
- POST /api/audit-trail endpoint failing
- Audit trail API silent error

**Solutions**:
1. Check backend audit trail endpoint
2. Verify request body format matches backend schema
3. Check backend logs for errors
4. Ensure audit trail feature enabled in backend

## Performance Considerations

### Image Optimization
- **Quality**: Set to 0.5 in ImagePicker for faster upload
- **Size**: Images compressed automatically
- **Format**: Convert all images to JPEG for consistency

### Data Fetching
- **Initial Load**: Single GET /getUsers call
- **Caching**: Consider caching user data for 5 minutes
- **Refresh**: Only fetch when needed (profile load, after update)

### State Management
- **Local State**: All profile data in component state
- **Context**: Only user authentication data in context
- **No Redux**: Simple state management sufficient

## Future Enhancements

### Planned Features
1. **Dark Mode Implementation**: Apply dark theme across app
2. **Image Cropping**: Allow users to crop profile pictures
3. **Email Change**: Add ability to change email with verification
4. **Two-Factor Authentication**: Add 2FA setup in settings
5. **Activity Log**: Show user's recent actions
6. **Export Profile**: Download profile data as PDF
7. **Account Deletion**: Self-service account deletion
8. **Profile Completion**: Show percentage of profile completion

### Additional Settings
- **Notification Preferences**: Email/push notification toggles
- **Language Selection**: Multi-language support
- **Time Zone**: Set preferred time zone
- **Privacy Settings**: Control profile visibility

## Dependencies

### Required Packages
```json
{
  "expo-image-picker": "~15.1.0",
  "@react-native-async-storage/async-storage": "1.23.1",
  "axios": "^1.10.0"
}
```

### Permissions (iOS)
Add to `app.json`:
```json
{
  "expo": {
    "plugins": [
      [
        "expo-image-picker",
        {
          "photosPermission": "Allow I-Track to access your photos to update profile picture"
        }
      ]
    ]
  }
}
```

## API Response Examples

### Get Users Response
```json
[
  {
    "_id": "68c0efaaa0508e15ccb5f9f3",
    "name": "Vionne Peralta",
    "email": "vionneulrichp@gmail.com",
    "password": "pass",
    "role": "Admin",
    "phoneno": "09478516430",
    "picture": "data:image/jpeg;base64,...",
    "personalDetails": "",
    "isActive": true
  }
]
```

### Update User Request
```json
{
  "name": "Updated Name",
  "phoneno": "09123456789",
  "phoneNumber": "09123456789",
  "personalDetails": "Additional contact info",
  "picture": "data:image/jpeg;base64,..."
}
```

### Audit Trail Request
```json
{
  "action": "Update",
  "resource": "User",
  "performedBy": "Vionne Peralta",
  "details": {
    "summary": "Profile updated"
  },
  "timestamp": "2025-11-21T13:46:08.753+00:00"
}
```

---

**Last Updated**: November 21, 2025
**Version**: 1.0.0
**Author**: I-Track Development Team
