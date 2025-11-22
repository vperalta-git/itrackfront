const nodemailer = require('nodemailer');

// Gmail SMTP Configuration
// To use this, you need to:
// 1. Enable 2-factor authentication on your Gmail account
// 2. Generate an App Password from Google Account settings
// 3. Set environment variables: GMAIL_USER and GMAIL_APP_PASSWORD

const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER, // Your Gmail address
    pass: process.env.GMAIL_APP_PASSWORD, // Your Gmail App Password (not regular password)
  },
});

/**
 * Sends a temporary password reset email
 * @param {string} email - Recipient email address
 * @param {string} temporaryPassword - Temporary password to send
 * @param {string} userName - User's name for personalization
 */
const sendTemporaryPassword = async (email, temporaryPassword, userName = 'User') => {
  try {
    const mailOptions = {
      from: {
        name: 'I-Track Admin',
        address: process.env.GMAIL_USER,
      },
      to: email,
      subject: '🔐 I-Track - Temporary Password Reset',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #CB1E2A, #FF6B6B); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🚚 I-Track</h1>
            <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Fleet Management System</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
            <h2 style="color: #333; margin-top: 0;">Password Reset Request</h2>
            
            <p style="color: #666; font-size: 16px; line-height: 1.5;">
              Hello <strong>${userName}</strong>,
            </p>
            
            <p style="color: #666; font-size: 16px; line-height: 1.5;">
              We received a request to reset your password for your I-Track account. 
              Here is your temporary password:
            </p>
            
            <div style="background: #ffffff; border: 2px solid #CB1E2A; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
              <p style="margin: 0; color: #666; font-size: 14px;">Your Temporary Password:</p>
              <h3 style="margin: 10px 0 0 0; color: #CB1E2A; font-size: 24px; font-family: monospace; letter-spacing: 2px;">
                ${temporaryPassword}
              </h3>
            </div>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #856404; font-size: 14px;">
                <strong>⚠️ Important Security Notice:</strong><br>
                • This temporary password will expire in 24 hours<br>
                • Please change your password immediately after logging in<br>
                • Do not share this password with anyone
              </p>
            </div>
            
            <p style="color: #666; font-size: 16px; line-height: 1.5;">
              To log in:
            </p>
            
            <ol style="color: #666; font-size: 14px; line-height: 1.6;">
              <li>Open the I-Track mobile app</li>
              <li>Use your username and the temporary password above</li>
              <li>Go to your profile settings to set a new permanent password</li>
            </ol>
            
            <p style="color: #666; font-size: 14px; line-height: 1.5; margin-top: 30px;">
              If you did not request this password reset, please contact your system administrator immediately.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e9ecef; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
              This email was sent by I-Track Fleet Management System<br>
              © ${new Date().getFullYear()} I-Track. All rights reserved.
            </p>
          </div>
        </div>
      `,
      text: `
I-Track - Temporary Password Reset

Hello ${userName},

We received a request to reset your password for your I-Track account.

Your Temporary Password: ${temporaryPassword}

IMPORTANT:
- This temporary password expires in 24 hours
- Please change your password immediately after logging in
- Do not share this password with anyone

To log in:
1. Open the I-Track mobile app
2. Use your username and the temporary password above
3. Go to your profile settings to set a new permanent password

If you did not request this password reset, please contact your system administrator immediately.

© ${new Date().getFullYear()} I-Track Fleet Management System
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Temporary password email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending temporary password email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Sends a password change notification email
 * @param {string} email - Recipient email address
 * @param {string} userName - User's name for personalization
 */
const sendPasswordChangeNotification = async (email, userName = 'User') => {
  try {
    const mailOptions = {
      from: {
        name: 'I-Track Admin',
        address: process.env.GMAIL_USER,
      },
      to: email,
      subject: '🔐 I-Track - Password Changed Successfully',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #28a745, #20c997); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🚚 I-Track</h1>
            <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Fleet Management System</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
            <h2 style="color: #333; margin-top: 0;">✅ Password Changed Successfully</h2>
            
            <p style="color: #666; font-size: 16px; line-height: 1.5;">
              Hello <strong>${userName}</strong>,
            </p>
            
            <p style="color: #666; font-size: 16px; line-height: 1.5;">
              This is a confirmation that your I-Track account password has been successfully changed.
            </p>
            
            <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #155724; font-size: 14px;">
                <strong>✅ Security Confirmation:</strong><br>
                Password changed on: ${new Date().toLocaleString()}<br>
                Your account is now secured with the new password.
              </p>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.5;">
              If you did not make this change, please contact your system administrator immediately.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e9ecef; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
              This email was sent by I-Track Fleet Management System<br>
              © ${new Date().getFullYear()} I-Track. All rights reserved.
            </p>
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Password change notification sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending password change notification:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendTemporaryPassword,
  sendPasswordChangeNotification,
};
