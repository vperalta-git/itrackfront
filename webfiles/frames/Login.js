//Terminal #1
//cd
//npm start

//Terminal #2
//cd
//cd server
//nodemon server.js

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../css/Login.css';
import Logo from '../icons/I-track logo.png';

const Login = () => {
  const [users, setUsers] = useState([]);
  const [loginInfo, setLoginInfo] = useState({ email: '', password: '' });
  const [errorMessage, setErrorMessage] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {

    axios.get("https://itrack-web-backend.onrender.com/api/getUsers")
    // axios.get("http://localhost:8000/api/getUsers")
      .then((res) => setUsers(res.data))
      .catch((err) => {
        console.log(err);
        setErrorMessage("Failed to fetch user data");
      });
  }, []);

  const handleLogin = () => {
  axios.post("https://itrack-web-backend.onrender.com/api/login", loginInfo, {
    withCredentials: true
  })
  // axios.post("http://localhost:8000/api/login", loginInfo, {
  //   withCredentials: true
  // })
    .then((res) => {
      if (res.data.success) {
        navigate('/dashboard');
      } else {
        setErrorMessage(res.data.message || 'Invalid email or password.');
      }
    })
    .catch((err) => {
      console.error(err);  // ✅ LOG errors for debugging
      setErrorMessage('Invalid email or password.');
    });

    
};

  
  const handleSubmit = (e) => {
    e.preventDefault();
    handleLogin();
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    setForgotMessage('');

    axios.post(`https://itrack-web-backend.onrender.com/api/forgot-password`, { email: forgotEmail })


      .then((res) => {
        setForgotMessage(res.data.message || 'If this email is registered, a reset link has been sent.');
      })
      .catch(() => {
        setForgotMessage('Failed to process request. Please try again.');
      });
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo">
          <div className="logo-title-row">
            <img  className="logo" src={Logo} alt="I-TRACK Logo" />
            <h1>I-TRACK</h1>
          </div>
        </div>
        <div><p className="login-subtitle">Vehicle Service Management System</p></div>
        <form className="login-form" onSubmit={handleSubmit}>
          <label>Email</label>
          <input
            type="text"
            value={loginInfo.email}
            onChange={(e) => setLoginInfo({ ...loginInfo, email: e.target.value })}
          />
          <label>Password</label>
          <input
            type="password"
            value={loginInfo.password}
            onChange={(e) => setLoginInfo({ ...loginInfo, password: e.target.value })}
          />
          <button type="submit">Login</button>
          <p className="login-note">Log in to access your dashboard and manage vehicle services</p>
          {errorMessage && <p className="error-message">{errorMessage}</p>}
        </form>
        <div className="login-footer">
          <p>
            <span className="forgot-link" style={{ color: '#007bff', cursor: 'pointer' }} onClick={() => setShowForgotModal(true)}>
              Forgot password?
            </span> 
          </p>
        </div>
        {showForgotModal && (
  <div className="fp-overlay">
    <div className="fp-card">
      <h2 className="fp-title">Forgot Password</h2>
      <p className="fp-subtext">Enter your registered email to receive a reset link.</p>
      
      <form onSubmit={handleForgotPassword} className="fp-form">
        <input
          type="email"
          className="fp-input"
          placeholder="Enter your email"
          value={forgotEmail}
          onChange={(e) => setForgotEmail(e.target.value)}
          required
        />
        <div className="fp-buttons">
          <button type="submit" className="fp-btn-primary">Send Reset Link</button>
          <button type="button" className="fp-btn-secondary" onClick={() => { setShowForgotModal(false); setForgotMessage(''); }}>Cancel</button>
        </div>
      </form>

      {forgotMessage && <p className="fp-message">{forgotMessage}</p>}
    </div>
  </div>
)}

      </div>
    </div>
  );
};

export default Login;