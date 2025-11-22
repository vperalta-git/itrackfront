import React, { useState } from 'react';
import axios from 'axios';

const SendResetLinks = () => {
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    setLoading(true);
    setStatus('');
    try {
      const res = await axios.post('https://itrack-web-backend.onrender.com/api/send-reset-links');
      setStatus(res.data.message);
    } catch (err) {
      setStatus(err.response?.data?.message || 'Failed to send reset links.');
    }
    setLoading(false);
  };

  return (
    <div style={{ margin: 20 }}>
      <button onClick={handleSend} disabled={loading}>
        {loading ? 'Sending...' : 'Send Reset Links to All Users'}
      </button>
      {status && <p>{status}</p>}
    </div>
  );
};

export default SendResetLinks;
