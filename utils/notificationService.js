// notificationService.js - Email and SMS notification system for I-Track
// Using official Isuzu Pasig notification templates
import { buildApiUrl } from '../constants/api';

// Email notification service with official Isuzu Pasig templates
export class NotificationService {
  
  // Main notification method using official templates
  static async sendStatusNotification(customerData, vehicleData, status, processDetails = '') {
    try {
      console.log('📧 Sending status notification:', { customerData, vehicleData, status });

      // Validate required data
      if (!customerData?.email || !customerData?.name) {
        throw new Error('Customer email and name are required');
      }

      if (!vehicleData?.unitName && !vehicleData?.model) {
        throw new Error('Vehicle model information is required');
      }
      
      const notificationData = {
        customerEmail: customerData.email,
        customerPhone: customerData.phone, // Used for SMS when available
        customerName: customerData.name,
        vehicleModel: vehicleData.unitName || vehicleData.model || vehicleData.unitId,
        vin: vehicleData.unitId || vehicleData.vin,
        status: status,
        processDetails: processDetails,
        timestamp: new Date().toISOString()
      };

      console.log('📤 Sending notification to backend:', notificationData);

      // Send notification using the new backend endpoint
      const response = await fetch(buildApiUrl('/api/send-notification'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notificationData)
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Notification sent successfully');
        return {
          success: true,
          emailSent: result.emailSent,
          smsSent: result.smsSent,
          message: 'Customer notification sent successfully'
        };
      } else {
        throw new Error(result.message || 'Failed to send notification');
      }
      
    } catch (error) {
      console.error('❌ Notification service error:', error);
      return {
        success: false,
        message: `Failed to send notification: ${error.message}`
      };
    }
  }

  // Legacy method for backward compatibility
  static async sendEmailNotification(customerData, vehicleData, statusUpdate) {
    return this.sendStatusNotification(customerData, vehicleData, statusUpdate);
  }

  // Direct SMS notifications are handled server-side via sendStatusNotification
  static async sendSMSNotification(customerPhone, message) {
    console.warn('📱 Direct SMS sending is handled by the backend. Use sendStatusNotification instead.', { customerPhone, message });
    return {
      success: false,
      message: 'SMS is sent by the backend when a phone number is available. Use sendStatusNotification.',
      smsReady: true,
      currentMethod: 'backend'
    };
  }

  // Status-specific notification helpers using official Isuzu Pasig templates
  static async notifyVehiclePreparation(customerData, vehicleData, process) {
    return this.sendStatusNotification(
      customerData, 
      vehicleData, 
      'Vehicle Preparation', 
      process
    );
  }

  static async notifyDispatchArrival(customerData, vehicleData, driverName = '') {
    return this.sendStatusNotification(
      customerData, 
      vehicleData, 
      'Dispatch & Arrival',
      driverName || ''
    );
  }

  static async notifyReadyForRelease(customerData, vehicleData) {
    return this.sendStatusNotification(
      customerData, 
      vehicleData, 
      'Ready for Release'
    );
  }

  // Process-specific notifications
  static async notifyTinting(customerData, vehicleData) {
    return this.sendStatusNotification(customerData, vehicleData, 'Tinting');
  }

  static async notifyCarWash(customerData, vehicleData) {
    return this.sendStatusNotification(customerData, vehicleData, 'Car Wash');
  }

  static async notifyRustProof(customerData, vehicleData) {
    return this.sendStatusNotification(customerData, vehicleData, 'Rust Proof');
  }

  static async notifyAccessories(customerData, vehicleData) {
    return this.sendStatusNotification(customerData, vehicleData, 'Accessories');
  }

  static async notifyCeramicCoating(customerData, vehicleData) {
    return this.sendStatusNotification(customerData, vehicleData, 'Ceramic Coating');
  }

  // Send notification based on available services (Email first, SMS when available)
  static async sendNotification(customerData, vehicleData, statusUpdate, preferredMethod = 'email') {
    // Use the new unified notification system
    return this.sendStatusNotification(customerData, vehicleData, statusUpdate);
  }

  // Get official Isuzu Pasig notification templates
  static getNotificationTemplate(statusUpdate) {
    const templates = {
      'Vehicle Preparation': {
        subject: 'Vehicle Preparation Update - Isuzu Pasig',
        message: 'Hi [CustomerName], this is Isuzu Pasig. Your vehicle [VIN/Model] is now undergoing: [Process]. Thank you for choosing Isuzu Pasig.'
      },
      'Tinting': {
        subject: 'Vehicle Preparation Update - Isuzu Pasig', 
        message: 'Hi [CustomerName], this is Isuzu Pasig. Your vehicle [VIN/Model] is now undergoing: Tinting. Thank you for choosing Isuzu Pasig.'
      },
      'Car Wash': {
        subject: 'Vehicle Preparation Update - Isuzu Pasig',
        message: 'Hi [CustomerName], this is Isuzu Pasig. Your vehicle [VIN/Model] is now undergoing: Car Wash. Thank you for choosing Isuzu Pasig.'
      },
      'Rust Proof': {
        subject: 'Vehicle Preparation Update - Isuzu Pasig',
        message: 'Hi [CustomerName], this is Isuzu Pasig. Your vehicle [VIN/Model] is now undergoing: Rust Proof. Thank you for choosing Isuzu Pasig.'
      },
      'Accessories': {
        subject: 'Vehicle Preparation Update - Isuzu Pasig',
        message: 'Hi [CustomerName], this is Isuzu Pasig. Your vehicle [VIN/Model] is now undergoing: Accessories. Thank you for choosing Isuzu Pasig.'
      },
      'Ceramic Coating': {
        subject: 'Vehicle Preparation Update - Isuzu Pasig',
        message: 'Hi [CustomerName], this is Isuzu Pasig. Your vehicle [VIN/Model] is now undergoing: Ceramic Coating. Thank you for choosing Isuzu Pasig.'
      },
      'Dispatch & Arrival': {
        subject: 'Vehicle Dispatch Update - Isuzu Pasig',
        message: 'The vehicle [VIN/Model], driven by [Driver] is arriving shortly at Isuzu Pasig.'
      },
      'Ready for Release': {
        subject: 'Vehicle Ready for Release - Isuzu Pasig',
        message: 'Good news! Your vehicle is now ready for release. Please proceed to Isuzu Pasig or contact your sales agent for pickup details. Thank you for choosing Isuzu Pasig.'
      },
      'In Preparation': {
        subject: 'Vehicle Preparation Update - Isuzu Pasig', 
        message: 'Your vehicle is currently being prepared for delivery.'
      },
      'Done': {
        subject: 'Vehicle Delivery Complete - Isuzu Pasig',
        message: 'Your vehicle has been successfully delivered. Thank you for choosing Isuzu Pasig!'
      }
    };

    return templates[statusUpdate] || {
      subject: 'Vehicle Status Update - Isuzu Pasig',
      message: `Your vehicle status has been updated to: ${statusUpdate}. Thank you for choosing Isuzu Pasig.`
    };
  }
}

export default NotificationService;