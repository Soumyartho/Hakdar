import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { ShieldCheck, User, Phone, CreditCard, ArrowRight } from 'lucide-react';
import { isValidAadhaar } from '../utils/aadhaarValidator';
import './CitizenAuth.css';

// Two independent flows share one page: a new citizen registers (identity form -> OTP), a
// returning citizen just logs in (phone -> OTP). Both end the same way - persist citizen_token/
// citizen_profile and redirect to the applications dashboard - kept as separate keys from the
// officer's token/user pair in AdminDashboard.jsx so the two sessions never collide.
export default function CitizenAuth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('register'); // 'register' | 'login'
  const [step, setStep] = useState('form'); // 'form' | 'otp'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [demoOtp, setDemoOtp] = useState('');
  const [otp, setOtp] = useState('');
  const [aadhaarError, setAadhaarError] = useState('');

  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    aadhaar_number: '',
    dob: '',
    gender: 'female',
    address: ''
  });

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (e.target.name === 'aadhaar_number' && aadhaarError) setAadhaarError('');
  };

  const handleAadhaarBlur = () => {
    if (!form.aadhaar_number) return;
    setAadhaarError(isValidAadhaar(form.aadhaar_number) ? '' : 'That doesn\'t look like a valid Aadhaar number - please double-check the digits.');
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (mode === 'register' && !isValidAadhaar(form.aadhaar_number)) {
      setAadhaarError('That doesn\'t look like a valid Aadhaar number - please double-check the digits.');
      return;
    }
    setLoading(true);
    try {
      const endpoint = mode === 'register' ? '/citizens/register/request-otp' : '/citizens/login/request-otp';
      const body = mode === 'register' ? form : { phone: form.phone };
      const res = await api.post(endpoint, body);
      if (res.success) {
        setDemoOtp(res.demoOtp || '');
        setStep('otp');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = mode === 'register' ? '/citizens/register/verify-otp' : '/citizens/login/verify-otp';
      const body = mode === 'register' ? { ...form, otp } : { phone: form.phone, otp };
      const res = await api.post(endpoint, body);
      if (res.success) {
        localStorage.setItem('citizen_token', res.token);
        localStorage.setItem('citizen', JSON.stringify(res.citizen));
        navigate('/account/applications');
      }
    } catch (err) {
      setError(err.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setStep('form');
    setError('');
    setOtp('');
  };

  return (
    <div className="citizen-auth-container">
      <div className="citizen-auth-card glass-panel">
        <div className="citizen-auth-logo">
          <ShieldCheck size={36} className="logo-icon" />
          <h2 className="gradient-text">Citizen Account</h2>
        </div>
        <p className="citizen-auth-subtext">
          Verified identity is required to apply for a welfare scheme, so approvals can be trusted and
          fraudulent claims caught. Your Aadhaar number is never stored - only a one-way verification
          hash and the last 4 digits.
        </p>

        <div className="citizen-auth-tabs">
          <button className={mode === 'register' ? 'active' : ''} onClick={() => switchMode('register')}>Register</button>
          <button className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')}>Log In</button>
        </div>

        {error && <div className="citizen-auth-error">{error}</div>}

        {step === 'form' ? (
          <form onSubmit={handleRequestOtp} className="citizen-auth-form">
            {mode === 'register' && (
              <>
                <div className="form-group">
                  <label className="form-label"><User size={14} /> Full Name</label>
                  <input className="form-input" name="full_name" value={form.full_name} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label"><CreditCard size={14} /> Aadhaar Number</label>
                  <input
                    className={`form-input${aadhaarError ? ' input-invalid' : ''}`}
                    name="aadhaar_number"
                    value={form.aadhaar_number}
                    onChange={handleChange}
                    onBlur={handleAadhaarBlur}
                    placeholder="12-digit Aadhaar number"
                    maxLength={12}
                    required
                  />
                  {aadhaarError && <p className="field-error">{aadhaarError}</p>}
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Date of Birth</label>
                    <input className="form-input" type="date" name="dob" value={form.dob} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Gender</label>
                    <select className="form-input" name="gender" value={form.gender} onChange={handleChange}>
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Address</label>
                  <input className="form-input" name="address" value={form.address} onChange={handleChange} />
                </div>
              </>
            )}

            <div className="form-group">
              <label className="form-label"><Phone size={14} /> Mobile Number</label>
              <input
                className="form-input"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="10-digit mobile number"
                required
              />
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? 'Sending OTP...' : 'Send OTP'} <ArrowRight size={16} />
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="citizen-auth-form">
            {demoOtp && (
              <div className="demo-otp-banner">
                Demo mode - no SMS provider is configured. Your OTP is <strong>{demoOtp}</strong>.
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Enter the 6-digit OTP sent to {form.phone}</label>
              <input
                className="form-input"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                placeholder="000000"
                required
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? 'Verifying...' : mode === 'register' ? 'Verify & Create Account' : 'Verify & Log In'}
            </button>
            <button type="button" className="btn btn-secondary btn-block" onClick={() => setStep('form')}>
              Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
