// src/pages/LoginPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { parseApiError } from '../lib/api';
import { useToast } from '../contexts/ToastContext';

const DEMO_USERS = [
  { label: 'Alice Chen (Employee)', email: 'alice@demo.com', idText: '100041' },
  { label: 'Bob Martinez (Employee)', email: 'bob@demo.com', idText: '100052' },
  { label: 'Marcus Sterling (Manager)', email: 'manager@demo.com', idText: '100030' },
  { label: 'Helena Vance (HR)', email: 'hr@demo.com', idText: '100020' },
  { label: 'Alex Rivera (Admin)', email: 'admin@demo.com', idText: '100010' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [username, setUsername] = useState('alice@demo.com');
  const [password, setPassword] = useState('Demo@123');
  const [captchaInput, setCaptchaInput] = useState('I5AKIW');
  const [captchaCode, setCaptchaCode] = useState('I5AKIW');
  const [loading, setLoading] = useState(false);
  const [fontSizeOffset, setFontSizeOffset] = useState(0);

  const handleRefreshCaptcha = () => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaCode(code);
    setCaptchaInput(code);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      toast('Please enter your Username or Attendance ID', 'error');
      return;
    }
    if (!password) {
      toast('Please enter your password', 'error');
      return;
    }
    if (captchaInput.trim().toUpperCase() !== captchaCode.toUpperCase()) {
      toast('Invalid captcha code entered. Please re-enter.', 'error');
      return;
    }

    setLoading(true);
    try {
      // Map attendance ID to email if ID was entered
      let loginEmail = username.trim();
      const matched = DEMO_USERS.find((u) => u.idText === loginEmail);
      if (matched) loginEmail = matched.email;

      await login(loginEmail, password);
      toast('Authentication successful. Welcome to LeaveMa / AEBAS portal.', 'success');
      navigate('/');
    } catch (err) {
      toast(parseApiError(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSelect = (email: string, idText: string) => {
    setUsername(email);
    setPassword('Demo@123');
    setCaptchaInput(captchaCode);
  };

  return (
    <div className="attendance-login-container" style={{ fontSize: `${14 + fontSizeOffset}px` }}>
      {/* ── Top Header Bar (Gov Style) ── */}
      <header className="gov-top-header">
        <div className="gov-logo-box">
          Attendance
        </div>
        <div className="gov-navbar">
          <div className="gov-nav-left">
            <button type="button" className="gov-btn-tool" title="Menu Toggle">☰</button>
            <button type="button" className="gov-btn-tool" title="Accessibility">♿</button>
            <button type="button" className="gov-btn-tool" onClick={() => setFontSizeOffset(-1)}>A-</button>
            <button type="button" className="gov-btn-tool" onClick={() => setFontSizeOffset(0)}>A</button>
            <button type="button" className="gov-btn-tool" onClick={() => setFontSizeOffset(1)}>A+</button>
          </div>

          <div className="gov-ticker-container">
            <span className="gov-ticker-text">
              LeaveMa Biometric Attendance & Leave System has been upgraded. Real-time leave feasibility and AI workload optimization active.
            </span>
          </div>

          <div className="gov-nav-right">
            <div className="gov-lang-select">
              English <span>▼</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Canvas ── */}
      <main className="attendance-login-content">
        <div className="attendance-page-heading">
          <h2>Login to Biometric Attendance System (BAS) - Central Platform</h2>
          <div className="breadcrumb">
            <span>⌂</span>
            <a href="/login">home</a>
            <span>&gt;</span>
            <span>Login to AEBAS</span>
          </div>
        </div>

        <div className="attendance-login-grid">
          {/* ── Left Column: Login Form ── */}
          <div className="attendance-card">
            <form onSubmit={handleSubmit} id="attendance-login-form">
              <div className="form-group">
                <input
                  type="text"
                  className="attendance-input"
                  placeholder="Username / Attendance ID"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  id="login-username"
                  required
                />
              </div>

              <div className="form-group">
                <input
                  type="password"
                  className="attendance-input"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  id="login-password"
                  required
                />
              </div>

              {/* Captcha Section */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, fontSize: '13px', color: '#444' }}>
                  <span>Enter the code exactly as it appears:</span>
                  <span className="captcha-code">{captchaCode}</span>
                  <button
                    type="button"
                    onClick={handleRefreshCaptcha}
                    className="captcha-refresh"
                    style={{ background: 'none', border: 'none' }}
                  >
                    Change text
                  </button>
                </div>
                <input
                  type="text"
                  className="attendance-input"
                  placeholder="Confirmation Code"
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value)}
                  id="login-captcha"
                  required
                />
              </div>

              {/* Sub-links */}
              <div className="attendance-links">
                <a href="#forgot" onClick={(e) => { e.preventDefault(); toast('Password reset link sent to registered email.', 'info'); }}>
                  Forgot Password
                </a>
                <a href="#nodal" onClick={(e) => { e.preventDefault(); toast('Nodal officer updates are submitted via HR settings.', 'info'); }}>
                  Request nodal update
                </a>
                <a href="#register" onClick={(e) => { e.preventDefault(); toast('New registrations are processed by HR.', 'info'); }}>
                  Don't have an account? Click here
                </a>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                className="btn-sign-me-in"
                disabled={loading}
                id="btn-sign-in"
              >
                {loading ? 'Authenticating...' : 'Sign me in'}
              </button>

              {/* Quick Demo Fill Box */}
              <div className="demo-credentials-box">
                <div className="demo-credentials-title">
                  Quick Demo Access (Select Role to Fill)
                </div>
                <div className="demo-buttons-list">
                  {DEMO_USERS.map((u) => (
                    <button
                      key={u.email}
                      type="button"
                      className="btn btn-default btn-sm"
                      onClick={() => handleDemoSelect(u.email, u.idText)}
                      id={`demo-login-${u.email.split('@')[0]}`}
                    >
                      {u.label}
                    </button>
                  ))}
                </div>
              </div>
            </form>
          </div>

          {/* ── Right Column: Official Instructions ── */}
          <div className="attendance-card-instructions">
            <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#333', marginBottom: 14 }}>
              Instructions for using Login:
            </h4>
            <div style={{ fontSize: '13px', color: '#444', lineHeight: 1.7 }}>
              <p style={{ marginBottom: 12 }}>
                <strong>1.</strong> To access the Employee corner, you can login using the 6 digit Attendance/Registration ID or registered email.
              </p>
              <p style={{ marginBottom: 8 }}>
                <strong>2.</strong> Please follow the below process to get an account:
              </p>
              <ol style={{ paddingLeft: 20, marginBottom: 14 }}>
                <li>Click on the <em>Do not have an account? Click Here</em>.</li>
                <li>Enter the 6 digit Attendance/Registration ID.</li>
                <li>Enter Captcha code as displayed in image.</li>
                <li>Generate OTP to sign in to employee corner.</li>
              </ol>
              <p style={{ marginBottom: 12 }}>
                <strong>3.</strong> Once you create your account you can setup a password for regular usage, in case you forget the password you try to reset the password using the Forgot password link.
              </p>
              <p style={{ marginBottom: 14 }}>
                <strong>4.</strong> Nodal & Reporting officers can also login from here, and the system would welcome you to the Employee corner and you can switch the view to the management console.
              </p>

              <div style={{ background: '#fcf8e3', border: '1px solid #fbeed5', padding: '10px 14px', borderRadius: 3, marginTop: 16 }}>
                <p style={{ fontWeight: 700, color: '#c09853', marginBottom: 4 }}>Note:</p>
                <p style={{ fontSize: '12px', color: '#8a6d3b', marginBottom: 6 }}>
                  a. If you have already generated an OTP which is valid, This OTP is now your password for login to BAS.
                </p>
                <p style={{ fontSize: '12px', color: '#8a6d3b' }}>
                  b. For any other assistance please get in touch with us at <strong>https://servicedesk.nic.in</strong> or <strong>Contact - Toll Free No. - 1800 111 555</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Gov Footer ── */}
      <footer className="gov-footer">
        <div className="gov-footer-content">
          <div>
            <div className="gov-footer-links">
              <a href="https://servicedesk.nic.in" target="_blank" rel="noreferrer">
                👤 https://servicedesk.nic.in
              </a>
              <span>|</span>
              <span>📞 Toll Free No. - 1800 111 555</span>
              <span>|</span>
              <span>© 2014 - 2026 Attendance.gov.in. All rights reserved.</span>
            </div>
            <div className="gov-footer-credits">
              © Site is designed and hosted by National Informatics Centre (NIC), Government of India.
            </div>
          </div>

          <div className="gov-footer-emblem">
            <div style={{ fontSize: '20px' }}>🏛</div>
            <div className="gov-emblem-text">
              NATIONAL<br />INFORMATICS<br />CENTRE
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
