import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css"; // We'll create this file

export default function Login({ setUser }) {
  const [showUserLogin, setShowUserLogin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const navigate = useNavigate();

  const handleUserLogin = () => {
    // Test with your specific email
    if (email === "audrey2023238@gmail.com" && password) {
      const userData = { email, type: 'user' };
      setUser(userData);
      localStorage.setItem('worldmark-user', JSON.stringify(userData)); // Save immediately
      navigate("/dashboard");
    } else if (!email || !password) {
      alert("Please enter both email and password");
    } else {
      alert("Invalid email. Please use audrey2023238@gmail.com for testing.");
    }
  };

  const handleAdminLogin = () => {
    // Simple admin validation
    if (adminEmail && adminPassword) {
      setUser({ email: adminEmail, type: 'admin' });
      navigate("/dashboard"); // You can create a separate admin dashboard later
    } else {
      alert("Please enter both email and password");
    }
  };

  // Landing page with login type selection
  if (!showUserLogin && !showAdminLogin) {
    return (
      <div className="landing-container">
        <div className="landing-content">
          <div className="logo-section">
            <div className="logo-icon">🏖️</div>
            <h1 className="main-title">WorldMark</h1>
            <p className="subtitle">Private Booking Portal for WorldMark Guests</p>
          </div>
          
          <div className="login-options">
            <button 
              className="login-option-btn user-btn"
              onClick={() => setShowUserLogin(true)}
            >
              <div className="btn-icon">👤</div>
              <div className="btn-content">
                <h3>Guest Login</h3>
                <p>Access your bookings and make reservations</p>
              </div>
            </button>
            
            <button 
              className="login-option-btn admin-btn"
              onClick={() => setShowAdminLogin(true)}
            >
              <div className="btn-icon">⚙️</div>
              <div className="btn-content">
                <h3>Admin Login</h3>
                <p>Manage bookings and system settings</p>
              </div>
            </button>
          </div>
          
          <div className="footer-text">
            <p>Secure access to your WorldMark vacation rentals</p>
          </div>
        </div>
      </div>
    );
  }

  // User login form
  if (showUserLogin) {
    return (
      <div className="login-container">
        <div className="login-form">
          <button 
            className="back-btn"
            onClick={() => setShowUserLogin(false)}
          >
            ← Back
          </button>
          
          <div className="login-header">
            <div className="login-icon">👤</div>
            <h2>Guest Login</h2>
            <p>Welcome back! Please sign in to your account.</p>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input 
              id="email"
              type="email"
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="Enter your email"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input 
              id="password"
              type="password"
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Enter your password"
              className="form-input"
            />
          </div>

          <button 
            onClick={handleUserLogin}
            className="login-btn"
          >
            Sign In
          </button>

          <div className="login-footer">
            <p>Don't have an account? <a href="#" className="link">Contact us</a></p>
          </div>
        </div>
      </div>
    );
  }

  // Admin login form
  if (showAdminLogin) {
    return (
      <div className="login-container">
        <div className="login-form">
          <button 
            className="back-btn"
            onClick={() => setShowAdminLogin(false)}
          >
            ← Back
          </button>
          
          <div className="login-header">
            <div className="login-icon">⚙️</div>
            <h2>Admin Login</h2>
            <p>Administrative access to the booking system.</p>
          </div>

          <div className="form-group">
            <label htmlFor="admin-email">Admin Email</label>
            <input 
              id="admin-email"
              type="email"
              value={adminEmail} 
              onChange={(e) => setAdminEmail(e.target.value)} 
              placeholder="Enter admin email"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="admin-password">Admin Password</label>
            <input 
              id="admin-password"
              type="password"
              value={adminPassword} 
              onChange={(e) => setAdminPassword(e.target.value)} 
              placeholder="Enter admin password"
              className="form-input"
            />
          </div>

          <button 
            onClick={handleAdminLogin}
            className="login-btn admin"
          >
            Admin Sign In
          </button>

          <div className="login-footer">
            <p>Need help? <a href="#" className="link">Contact IT Support</a></p>
          </div>
        </div>
      </div>
    );
  }
}
