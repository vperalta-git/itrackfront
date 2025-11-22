const UserModel = require('../models/User');
const logAudit = require('./logAudit');
const crypto = require('crypto');
const { sendTemporaryPassword, sendPasswordChangeNotification } = require('../utils/sendResetEmail');


const getUsers = (req, res) => {
  UserModel.find()
    .then(users => res.json(users))
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: "Internal Server Error" });
    });
};

const deleteUser = async (req, res) => {
  try {
    const deletedUser = await UserModel.findByIdAndDelete(req.params.id);
    if (deletedUser) {
      await logAudit({
        action: 'delete',
        resource: 'User',
        resourceId: req.params.id,
        performedBy: req.session?.user?.name || 'Unknown',
        details: { deletedUser }
      });
      res.json({ message: "User deleted" });
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const createUser = async (req, res) => {
  try {
    const newUser = new UserModel(req.body);
    const user = await newUser.save();
    await logAudit({
      action: 'create',
      resource: 'User',
      resourceId: user._id,
      performedBy: req.session?.user?.name || 'Unknown',
      details: { newUser: user }
    });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const updateUser = async (req, res) => {
  try {
    const updateData = { ...req.body };
    
    // If password is being changed, send notification email
    let shouldSendPasswordNotification = false;
    if (updateData.password) {
      shouldSendPasswordNotification = true;
    }

    const user = await UserModel.findByIdAndUpdate(req.params.id, updateData, { new: true });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Send password change notification if password was changed
    if (shouldSendPasswordNotification && user.email) {
      try {
        await sendPasswordChangeNotification(
          user.email,
          user.accountName || user.username
        );
        console.log(`✅ Password change notification sent to ${user.email}`);
      } catch (emailError) {
        console.error('❌ Failed to send password change notification:', emailError);
        // Don't fail the password change if email fails
      }
    }

    await logAudit({
      action: 'update',
      resource: 'User',
      resourceId: req.params.id,
      performedBy: req.session?.user?.name || 'Unknown',
      details: { updatedUser: user }
    });
    
    // Don't return sensitive fields in the response
    const { password, temporaryPassword, resetPasswordToken, resetPasswordExpires, temporaryPasswordExpires, ...userResponse } = user.toObject();
    
    res.json(userResponse);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Email is required.' });
  }
  
  try {
    const user = await UserModel.findOne({ email });
    if (!user) {
      // Always respond with success to avoid leaking which emails are registered
      return res.json({ 
        success: true, 
        message: 'If this email is registered, a temporary password has been sent.' 
      });
    }

    // Generate a secure temporary password (8 characters: letters + numbers)
    const temporaryPassword = crypto.randomBytes(4).toString('hex').toUpperCase();
    
    // Set temporary password with 24-hour expiration
    const expires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    user.temporaryPassword = temporaryPassword;
    user.temporaryPasswordExpires = expires;
    
    await user.save();

    // Send temporary password via email
    const emailResult = await sendTemporaryPassword(
      user.email, 
      temporaryPassword, 
      user.accountName || user.username
    );

    if (emailResult.success) {
      console.log(`✅ Temporary password sent to ${user.email}: ${temporaryPassword}`);
      return res.json({ 
        success: true, 
        message: 'If this email is registered, a temporary password has been sent.' 
      });
    } else {
      console.error('❌ Failed to send email:', emailResult.error);
      // Still return success to avoid leaking email existence
      return res.json({ 
        success: true, 
        message: 'If this email is registered, a temporary password has been sent.' 
      });
    }
    
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

const resetPassword = async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ message: 'Token and new password are required.' });
  }
  try {
    const user = await UserModel.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token.' });
    }
    user.password = password; // In production, hash the password!
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    res.json({ message: 'Password has been reset successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

const sendResetLinksToAll = async (req, res) => {
  try {
    const users = await UserModel.find({ email: { $exists: true, $ne: null } });
    let sent = 0, failed = 0;
    for (const user of users) {
      try {
        const token = crypto.randomBytes(32).toString('hex');
        const expires = Date.now() + 3600000; // 1 hour
        user.resetPasswordToken = token;
        user.resetPasswordExpires = expires;
        await user.save();
        const resetLink = `http://localhost:3000/reset-password/${token}`;
        // await sendResetEmail(user.email, resetLink);
        console.log(`Reset link for ${user.email}: ${resetLink}`);
        sent++;
      } catch (err) {
        console.error(`Failed to send to ${user.email}:`, err);
        failed++;
      }
    }
    res.json({ message: `Reset links sent. Success: ${sent}, Failed: ${failed}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// New profile management methods
const getUserProfile = async (req, res) => {
  try {
    const user = await UserModel.findById(req.params.id).populate('assignedTo', 'accountName');
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    // Don't send password in response
    const { password, resetPasswordToken, resetPasswordExpires, ...userProfile } = user.toObject();
    res.json(userProfile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const updateData = { ...req.body };
    delete updateData.password; // Don't allow password updates through this endpoint
    
    const user = await UserModel.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true }
    ).populate('assignedTo', 'accountName');
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    await logAudit({
      action: 'profile_update',
      resource: 'User',
      resourceId: req.params.id,
      performedBy: req.session?.user?.name || user.name,
      details: { updatedFields: Object.keys(updateData) }
    });
    
    // Don't send password in response
    const { password, resetPasswordToken, resetPasswordExpires, ...userProfile } = user.toObject();
    res.json(userProfile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const uploadProfilePicture = async (req, res) => {
  try {
    const { profilePicture } = req.body;
    
    if (!profilePicture) {
      return res.status(400).json({ error: "Profile picture data is required" });
    }
    
    const user = await UserModel.findByIdAndUpdate(
      req.params.id,
      { profilePicture },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    await logAudit({
      action: 'profile_picture_update',
      resource: 'User',
      resourceId: req.params.id,
      performedBy: req.session?.user?.name || user.name,
      details: { message: 'Profile picture updated' }
    });
    
    res.json({ message: "Profile picture updated successfully", profilePicture: user.profilePicture });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getManagers = async (req, res) => {
  try {
    const managers = await UserModel.find({ role: 'Manager' }).select('_id accountName name email');
    res.json(managers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getAgentsByManager = async (req, res) => {
  try {
    const agents = await UserModel.find({ assignedTo: req.params.managerId }).select('_id accountName name email role');
    res.json(agents);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = { 
  getUsers, 
  deleteUser, 
  createUser, 
  updateUser, 
  forgotPassword, 
  resetPassword, 
  sendResetLinksToAll,
  getUserProfile,
  updateUserProfile,
  uploadProfilePicture,
  getManagers,
  getAgentsByManager
};
