# Password Reset Functionality - Mobile App

## Overview

The mobile app now includes complete password reset functionality that works with the backend's temporary password system.

## How It Works

### Backend System

The backend (`https://itrack-backend-1.onrender.com`) handles password resets using a temporary password approach:

1. **Request Reset**: User enters their email address
2. **Generate Temporary Password**: Backend creates an 8-character alphanumeric temporary password
3. **Email Notification**: Temporary password is sent to user's email
4. **Login with Temporary Password**: User logs in using the temporary password
5. **Force Password Change**: System prompts user to change password after first login
6. **Expiration**: Temporary password expires after 1 hour

### Mobile Implementation

#### 1. Forgot Password Flow (LoginScreen)

- User taps "Forgot Password?" link
- Enters email address
- Backend sends temporary password to email
- User receives clear instructions about:
  - Checking email for temporary password
  - 1-hour expiration time
  - Mandatory password change after login

#### 2. Reset Password Screen (Future Enhancement)

- For web-based password reset links
- Accepts reset token from URL/deep link
- Validates password requirements (6+ characters, matching confirmation)
- Shows/hides password toggle
- Provides clear feedback on success/failure

## Files Created/Modified

### New Files

1. **`src/screens/auth/ResetPasswordScreen.js`**
   - Standalone password reset screen
   - Token-based password reset
   - Password validation (min 6 chars, matching confirmation)
   - Show/hide password toggles
   - User-friendly error messages

### Modified Files

1. **`src/screens/auth/LoginScreen.js`**

   - Enhanced forgot password alert message
   - Clear instructions about temporary password
   - Information about 1-hour expiration
   - Notice about mandatory password change

2. **`src/navigation/AppNavigator.js`**
   - Added `ResetPasswordScreen` to unauthenticated stack
   - Screen available at: `navigation.navigate('ResetPassword', { token: 'xxx' })`

## Backend Endpoints Used

### 1. Forgot Password (Temporary Password)

```javascript
POST /forgot-password
Body: { username: "user@email.com" }

Response:
{
  success: true,
  message: "Temporary password sent"
}
```

### 2. Login with Temporary Password

```javascript
POST /login
Body: { username: "user@email.com", password: "TEMP1234" }

Response:
{
  success: true,
  user: { email, role, name },
  requirePasswordChange: true  // Forces password change
}
```

### 3. Reset Password (Web Token-Based)

```javascript
POST /api/reset-password/:token
Body: { password: "newPassword123" }

Response:
{
  message: "Password has been reset successfully"
}
```

## User Journey

### Scenario 1: Forgot Password (Primary Flow)

1. User taps "Forgot Password?" on Login screen
2. Enters email address
3. Taps "Reset Password" button
4. Receives alert: "Password Reset Email Sent"
   - Message explains temporary password sent to email
   - Notes 1-hour expiration
   - Mentions mandatory password change
5. User checks email for temporary password (e.g., "AB12cd34")
6. Returns to login screen
7. Enters email + temporary password
8. System logs in and sets `requirePasswordChange: true`
9. App automatically redirects to Change Password screen
10. User creates new permanent password
11. System completes login process

### Scenario 2: Web-Based Reset Link (Future Enhancement)

1. User receives password reset email with link
2. Clicks link on mobile device
3. Deep link opens app and navigates to ResetPasswordScreen with token
4. User enters new password + confirmation
5. Taps "Reset Password" button
6. System validates and updates password
7. User redirected to Login screen
8. User logs in with new password

## Password Requirements

- Minimum 6 characters
- Must match confirmation field (ResetPasswordScreen)
- No special character requirements (matches web version)

## Security Features

1. **Temporary Password Expiration**: 1 hour validity
2. **One-Time Use**: Temporary password deleted after successful use
3. **Forced Password Change**: User must change password after temp login
4. **Email Validation**: Only sends reset to registered emails
5. **Token-Based Reset**: Secure token validation for web links

## Testing Credentials (Admin Account)

```
Email: isuzupasigadmin
Password: Isuzu_Pasig1
```

## Test Procedures

### Test 1: Forgot Password Flow

**Expected Result**: Temporary password sent, user can login and change password

**Steps**:

1. Open app, tap "Forgot Password?"
2. Enter valid email address
3. Tap "Reset Password"
4. Verify alert message displays correctly
5. Check email for temporary password
6. Return to login screen
7. Login with email + temporary password
8. Verify app prompts for password change
9. Set new password
10. Verify successful login with new password

### Test 2: Invalid Email

**Expected Result**: Generic success message (security best practice)

**Steps**:

1. Tap "Forgot Password?"
2. Enter non-existent email
3. Tap "Reset Password"
4. Verify alert still shows success (no info leak)
5. Verify no email received

### Test 3: Empty Email Field

**Expected Result**: Validation error

**Steps**:

1. Tap "Forgot Password?"
2. Leave email field empty
3. Tap "Reset Password"
4. Verify error message shown

### Test 4: Temporary Password Expiration

**Expected Result**: Expired password rejected

**Steps**:

1. Request password reset
2. Receive temporary password
3. Wait 1+ hours
4. Attempt login with temporary password
5. Verify error: "Temporary password expired"

### Test 5: ResetPasswordScreen (Token-Based)

**Expected Result**: Password successfully reset via token

**Steps**:

1. Navigate to ResetPasswordScreen with test token
2. Enter new password (6+ chars)
3. Enter matching confirmation
4. Tap "Reset Password"
5. Verify success message
6. Redirected to Login screen
7. Login with new password

### Test 6: Password Validation

**Expected Result**: Validation errors shown

**Steps**:

1. Open ResetPasswordScreen
2. Test cases:
   - Empty password → Error: "Password cannot be empty"
   - Password < 6 chars → Error: "Password must be at least 6 characters"
   - Passwords don't match → Error: "Passwords do not match"
   - Valid password → Success

## Debugging

### Enable Console Logs

All authentication operations log to console with emoji prefixes:

```javascript
// LoginScreen
🔐 Attempting login for: user@email.com
📥 Login response: {...}
✅ Login successful: user@email.com - Admin
❌ Login failed: Invalid credentials

// Forgot Password
🔑 Requesting password reset for: user@email.com
📥 Forgot password response: {...}

// ResetPasswordScreen
🔑 Reset Password screen opened with token: abc123xyz
📤 Sending password reset request...
📥 Reset password response: {...}
```

### Common Issues

#### Issue 1: "Failed to send reset email"

- **Cause**: Network error or backend unavailable
- **Solution**: Check internet connection, verify backend URL

#### Issue 2: Temporary password not working

- **Possible Causes**:
  - Expired (> 1 hour old)
  - Already used (one-time use)
  - Incorrect email/password combination
- **Solution**: Request new temporary password

#### Issue 3: ResetPasswordScreen not opening

- **Cause**: Deep linking not configured or invalid token
- **Solution**: Verify token parameter passed correctly

## Implementation Notes

### Why Temporary Password System?

The backend uses a temporary password approach instead of magic links because:

1. **Simplicity**: No complex token management or URL handling
2. **Email Compatibility**: Works with all email clients
3. **Security**: Time-limited (1 hour) and one-time use
4. **User Familiar**: Similar to common password reset flows

### Future Enhancements

1. **Deep Linking**: Configure app to handle `itrack://reset-password/:token` URLs
2. **Biometric Login**: Add fingerprint/face ID after first login
3. **Password Strength Meter**: Visual indicator of password strength
4. **Remember Email**: Save last used email (not password)
5. **SMS Verification**: Optional 2FA via SMS
6. **Push Notifications**: Alert user when password reset requested

## Backend Requirements

The mobile app expects these backend endpoints to be available:

1. **POST /forgot-password**

   - Generates temporary password
   - Sends email with temporary password
   - Returns success message

2. **POST /login**

   - Accepts email (as username) + password
   - Checks temporary password first, then regular password
   - Returns `requirePasswordChange: true` if using temporary password

3. **POST /api/reset-password/:token** (Optional for web links)
   - Validates reset token
   - Updates user password
   - Returns success/error message

## Related Files

- **Backend**: `itrack-backend/server.js` (lines 528-792)
  - `/login` endpoint (lines 528-638)
  - `/forgot-password` endpoint (lines 742-792)
- **Authentication Context**: `src/context/AuthContext.js`

  - `login()` function handles requirePasswordChange flag
  - `forgotPassword()` sends reset request

- **API Configuration**: `src/config/api.js`
  - API_BASE_URL (dev/prod switching)
  - API_ENDPOINTS.LOGIN
  - API_ENDPOINTS.FORGOT_PASSWORD

## Contact & Support

For issues or questions about password reset functionality:

1. Check console logs for detailed error messages
2. Verify backend endpoints are responding
3. Test with admin account first
4. Review LOGIN_TEST_GUIDE.md for authentication debugging

---

**Last Updated**: November 21, 2025
**Version**: 1.0.0
**Status**: Production Ready ✅
