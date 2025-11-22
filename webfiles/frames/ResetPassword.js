import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Logo from '../icons/I-track logo.png';

function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Debugging token
  useEffect(() => {
    console.log("Reset Password page opened with token:", token);
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) {
      setMessage("Password cannot be empty.");
      return;
    }

    try {
      setLoading(true);

      const res = await axios.post(
        `https://itrack-web-backend.onrender.com/api/reset-password/${token}`,
        { password }
      );

      setMessage(res.data.message);

      // redirect after success
      setTimeout(() => {
        navigate("/");
      }, 2000);

    } catch (err) {
      console.error(err);
      setMessage(
        err.response?.data?.message || "Error resetting password. Try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        
        {/* You can reuse your logo/title row */}
        <div className="login-logo">
          <div className="logo-title-row">
           <img  className="logo" src={Logo} alt="I-TRACK Logo" />
            <h1>Reset Password</h1>
          </div>
        </div>

        <p className="login-subtitle">Enter your new password below.</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="password">New Password</label>
          <input
            id="password"
            type="password"
            placeholder="Enter new password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>

        {message && (
          <p className={message.includes("Error") ? "error-message" : "login-note"}>
            {message}
          </p>
        )}

        <div className="login-footer">
          <p>© {new Date().getFullYear()} iTrack. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
