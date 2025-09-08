const axios = require('axios');
require('dotenv').config();

const sendSMS = async (recipient, message) => {
  // Fallback behavior if API keys are missing or not verified yet
  if (
    !process.env.ITEXMO_APICODE ||
    !process.env.ITEXMO_EMAIL ||
    !process.env.ITEXMO_PASSWORD
  ) {
    console.warn('⚠️ iTexMo credentials not set or Sender ID not ready');
    return {
      success: true,
      info: `Simulated SMS to ${recipient}: "${message}"`,
    };
  }

  const payload = {
    ApiCode: process.env.ITEXMO_APICODE,
    Email: process.env.ITEXMO_EMAIL,
    Password: process.env.ITEXMO_PASSWORD,
    Recipients: [recipient],
    Message: message,
    SenderId: 'ITM.TEST3', // Trial Sender ID
  };

  try {
    const response = await axios.post('https://api.itexmo.com/api/broadcast', payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.data.Error) {
      return { success: true, referenceId: response.data.ReferenceId };
    } else {
      console.error('❌ iTexMo Error:', response.data);
      return { success: false, error: response.data };
    }
  } catch (err) {
    console.error('❌ Request Error:', err.message);
    return {
      success: false,
      error: err.response?.data || err.message || 'SMS failed',
    };
  }
};

module.exports = sendSMS;
