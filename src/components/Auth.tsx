import React, { useState } from 'react';
import type { User, ResetRequest } from '../types';
import { getStoredUsers, setStoredUsers, getStoredResets, setStoredResets, setStoredSession, addActivityLog } from '../utils/storage';
import { Pill, Activity, ShieldAlert, KeyRound, Mail, UserPlus, LogIn } from 'lucide-react';

interface AuthProps {
  onLoginSuccess: (user: User) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [isForgot, setIsForgot] = useState<boolean>(false);
  const [role, setRole] = useState<'patient' | 'shop'>('patient');
  
  // Form fields
  const [emailOrPhone, setEmailOrPhone] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  
  const [error, setError] = useState<string>('');
  const [message, setMessage] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (isForgot) {
      handleForgotPasswordSubmit();
      return;
    }

    if (isLogin) {
      handleLoginSubmit();
    } else {
      handleRegisterSubmit();
    }
  };

  const handleLoginSubmit = () => {
    if (!emailOrPhone || !password) {
      setError('Please fill in all fields.');
      return;
    }

    const users = getStoredUsers();
    
    // Check if logging in as Admin
    if (emailOrPhone.toLowerCase() === 'admin@shop.com') {
      const adminUser = users.find(u => u.role === 'admin' && u.emailOrPhone === 'admin@shop.com');
      if (adminUser && adminUser.password === password) {
        setStoredSession(adminUser);
        addActivityLog(`Admin logged in successfully.`, 'info');
        onLoginSuccess(adminUser);
        return;
      }
    }

    // Standard User check
    const user = users.find(
      u => u.emailOrPhone.toLowerCase() === emailOrPhone.toLowerCase() && 
      u.password === password && 
      u.role === role
    );

    if (user) {
      setStoredSession(user);
      addActivityLog(`${user.role === 'patient' ? 'Patient' : 'Shop Staff'} logged in: ${user.name || user.emailOrPhone}`, 'info');
      onLoginSuccess(user);
    } else {
      setError('Invalid email/mobile or password for selected portal.');
    }
  };

  const handleRegisterSubmit = () => {
    if (!emailOrPhone || !password || !confirmPassword || !name || !address) {
      setError('All fields are required.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 5) {
      setError('Password must be at least 5 characters long.');
      return;
    }

    const users = getStoredUsers();
    const userExists = users.some(u => u.emailOrPhone.toLowerCase() === emailOrPhone.toLowerCase() && u.role === role);

    if (userExists) {
      setError('An account with this Email/Phone already exists.');
      return;
    }

    const newUser: User = {
      id: `${role}-${Date.now()}`,
      emailOrPhone,
      password,
      role,
      name,
      address
    };

    const updatedUsers = [...users, newUser];
    setStoredUsers(updatedUsers);
    setStoredSession(newUser);
    
    addActivityLog(`New ${role} registered: ${name} (${emailOrPhone})`, 'success');
    onLoginSuccess(newUser);
  };

  const handleForgotPasswordSubmit = () => {
    if (!emailOrPhone) {
      setError('Please provide your Email or Mobile No.');
      return;
    }

    const users = getStoredUsers();
    const user = users.find(u => u.emailOrPhone.toLowerCase() === emailOrPhone.toLowerCase() && u.role === role);

    if (!user) {
      setError('No registered account found with this Email/Phone for selected portal.');
      return;
    }

    const resets = getStoredResets();
    const alreadyRequested = resets.some(r => r.emailOrPhone.toLowerCase() === emailOrPhone.toLowerCase() && r.status === 'pending');

    if (alreadyRequested) {
      setMessage('A reset request is already pending. The Administrator is reviewing it.');
      return;
    }

    const newRequest: ResetRequest = {
      id: `reset-${Date.now()}`,
      emailOrPhone,
      role,
      status: 'pending',
      requestedAt: new Date().toLocaleString()
    };

    setStoredResets([...resets, newRequest]);
    addActivityLog(`Password reset requested for ${role}: ${emailOrPhone}`, 'warning');
    setMessage('Your reset request has been sent to the Admin portal. Please contact the offline pharmacy to collect your reset password.');
  };

  return (
    <div className="auth-container">
      <div className="glass-panel auth-card auth-card-responsive">
        {/* Logo/Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.2), rgba(79, 172, 254, 0.05))',
            border: '1px solid var(--clr-primary)',
            color: 'var(--clr-primary)',
            marginBottom: '1rem',
            boxShadow: '0 0 15px var(--clr-primary-glow)'
          }}>
            <Pill size={32} />
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }} className="gradient-text">
            MediQuick Pharma
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Offline Shop & Pickup Management Portal
          </p>
        </div>

        {/* System Admin login quick tip */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px dashed var(--border-muted)',
          borderRadius: 'var(--radius-md)',
          padding: '0.75rem',
          fontSize: '0.75rem',
          color: 'var(--text-secondary)',
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'center',
          marginBottom: '1.5rem'
        }}>
          <ShieldAlert size={16} style={{ color: 'var(--clr-primary)' }} />
          <span>Testing Admin? Log in as <strong>admin@shop.com</strong> / <strong>admin123</strong></span>
        </div>

        {/* Form selection Tab */}
        {!isForgot && (
          <div style={{
            display: 'flex',
            background: 'rgba(0,0,0,0.2)',
            borderRadius: 'var(--radius-md)',
            padding: '4px',
            marginBottom: '1.5rem'
          }}>
            <button
              type="button"
              onClick={() => { setIsLogin(true); setError(''); setMessage(''); }}
              style={{
                flex: 1,
                background: isLogin ? 'rgba(255,255,255,0.06)' : 'transparent',
                border: 'none',
                color: isLogin ? 'var(--clr-primary)' : 'var(--text-secondary)',
                padding: '0.6rem',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsLogin(false); setError(''); setMessage(''); }}
              style={{
                flex: 1,
                background: !isLogin ? 'rgba(255,255,255,0.06)' : 'transparent',
                border: 'none',
                color: !isLogin ? 'var(--clr-primary)' : 'var(--text-secondary)',
                padding: '0.6rem',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Register
            </button>
          </div>
        )}

        {/* Portal Role Toggle */}
        <div style={{ marginBottom: '1.5rem' }}>
          <span className="form-label" style={{ display: 'block', marginBottom: '0.5rem' }}>Portal Gateway</span>
          <div className="auth-role-group">
            <label style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              border: `1px solid ${role === 'patient' ? 'var(--clr-primary)' : 'var(--border-muted)'}`,
              background: role === 'patient' ? 'rgba(0, 242, 254, 0.04)' : 'rgba(255,255,255,0.01)',
              color: role === 'patient' ? 'var(--clr-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '0.875rem',
              transition: 'all 0.2s'
            }}>
              <input 
                type="radio" 
                name="role" 
                checked={role === 'patient'} 
                onChange={() => setRole('patient')} 
                style={{ display: 'none' }}
              />
              <Activity size={16} />
              Patient
            </label>
            
            <label style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              border: `1px solid ${role === 'shop' ? 'var(--clr-primary)' : 'var(--border-muted)'}`,
              background: role === 'shop' ? 'rgba(0, 242, 254, 0.04)' : 'rgba(255,255,255,0.01)',
              color: role === 'shop' ? 'var(--clr-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '0.875rem',
              transition: 'all 0.2s'
            }}>
              <input 
                type="radio" 
                name="role" 
                checked={role === 'shop'} 
                onChange={() => setRole('shop')} 
                style={{ display: 'none' }}
              />
              <Pill size={16} />
              Medicine Shop
            </label>
          </div>
        </div>

        {/* Error / Success Alerts */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 1rem',
            color: 'var(--clr-danger)',
            fontSize: '0.85rem',
            marginBottom: '1.25rem',
            lineHeight: 1.4
          }}>
            {error}
          </div>
        )}

        {message && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 1rem',
            color: 'var(--clr-success)',
            fontSize: '0.85rem',
            marginBottom: '1.25rem',
            lineHeight: 1.4
          }}>
            {message}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          {isForgot ? (
            <div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Forgot Password Reset</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', marginBottom: '1.25rem', lineHeight: 1.4 }}>
                Provide the Mobile No. or Email registered to your profile. The Administrator will review and reset it for your pickup visit.
              </p>
              <div className="form-group">
                <label className="form-label">Email or Mobile Number</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    required
                    placeholder="Enter email or 10-digit mobile"
                    value={emailOrPhone}
                    onChange={(e) => setEmailOrPhone(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '38px' }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div>
              {/* Registration Only Fields */}
              {!isLogin && (
                <>
                  <div className="form-group">
                    <label className="form-label">Full Name / Shop Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Doe / Care Pharmacy"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Address / Shop Location</label>
                    <input
                      type="text"
                      required
                      placeholder="Enter street, locality, city"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </>
              )}

              {/* Shared Login/Registration Fields */}
              <div className="form-group">
                <label className="form-label">Email Address or Mobile No.</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    required
                    placeholder="e.g. 9876543210 or user@test.com"
                    value={emailOrPhone}
                    onChange={(e) => setEmailOrPhone(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '38px' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="form-label">Password</label>
                  {isLogin && (
                    <button
                      type="button"
                      onClick={() => { setIsForgot(true); setError(''); setMessage(''); }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--clr-primary)',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        fontWeight: 500
                      }}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <KeyRound size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '38px' }}
                  />
                </div>
              </div>

              {!isLogin && (
                <div className="form-group">
                  <label className="form-label">Confirm Password</label>
                  <div style={{ position: 'relative' }}>
                    <KeyRound size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-muted)' }} />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="form-input"
                      style={{ paddingLeft: '38px' }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ marginTop: '2rem' }}>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.9rem' }}>
              {isForgot ? (
                <>
                  <KeyRound size={18} />
                  Request Password Reset
                </>
              ) : isLogin ? (
                <>
                  <LogIn size={18} />
                  Login to Portal
                </>
              ) : (
                <>
                  <UserPlus size={18} />
                  Create Profile Account
                </>
              )}
            </button>
          </div>

          {/* Cancel Forgot Password */}
          {isForgot && (
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button
                type="button"
                onClick={() => { setIsForgot(false); setError(''); setMessage(''); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Back to Sign In
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
