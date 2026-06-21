'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/axios';

export default function VerifyPage() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const storedPhone = sessionStorage.getItem('verify_phone_number');
    if (!storedPhone) {
      setError('No verification session found. Please request a code first.');
    } else {
      setPhoneNumber(storedPhone);
    }
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const response = await api.post('auth/otp/verify/', {
        phone_number: phoneNumber,
        otp_code: otpCode.trim(),
      });

      // Save tokens
      const { tokens } = response.data;
      localStorage.setItem('access_token', tokens.access);
      localStorage.setItem('refresh_token', tokens.refresh);
      
      setMessage('Verification successful! Logging you in...');
      
      // Clean verify session
      sessionStorage.removeItem('verify_phone_number');
      
      // Redirect after a short delay
      setTimeout(() => {
        router.push('/');
      }, 1000);

    } catch (err: any) {
      const msg = err.response?.data?.error || 'Verification failed. Please check the code and try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    setMessage('');
    
    if (!phoneNumber) {
      setError('Phone number is missing.');
      return;
    }

    try {
      await api.post('auth/otp/request/', { phone_number: phoneNumber });
      setMessage('A new verification code has been sent to your phone.');
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to resend verification code.';
      setError(msg);
    }
  };

  return (
    <div style={{ backgroundColor: '#FAF3E8', minHeight: '85vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card am-card" style={{ maxWidth: '400px', width: '100%', border: '0.5px solid #DDD0B8' }}>
        <div className="card-body p-4">
          <div className="text-center mb-4">
            <h2 style={{ color: '#1A3A08', fontWeight: 500 }}>Verify Code</h2>
            <p className="text-hint" style={{ fontSize: '13px' }}>
              We sent a 6-digit verification code to <strong style={{ color: '#1A3A08' }}>{phoneNumber || 'your phone'}</strong>.
            </p>
          </div>

          {error && (
            <div className="alert alert-danger badge-danger-custom py-2 px-3 border-0 mb-3" role="alert" style={{ fontSize: '13px' }}>
              {error}
            </div>
          )}

          {message && (
            <div className="alert alert-success badge-escrow py-2 px-3 border-0 mb-3" role="alert" style={{ fontSize: '13px' }}>
              {message}
            </div>
          )}

          <form onSubmit={handleVerify}>
            <div className="mb-4">
              <label htmlFor="otp" className="form-label" style={{ fontSize: '12px', fontWeight: 500, color: '#4E6A36' }}>
                Verification Code
              </label>
              <input
                type="text"
                id="otp"
                className="form-control text-center letter-spacing-lg"
                placeholder="0 0 0 0 0 0"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                required
                style={{
                  borderColor: '#DDD0B8',
                  borderRadius: '0.5rem',
                  padding: '0.6rem 0.8rem',
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  letterSpacing: '0.3em',
                }}
              />
            </div>

            <button
              type="submit"
              className="btn btn-am-primary w-100 py-2 mb-3"
              disabled={loading || !phoneNumber}
            >
              {loading ? 'Verifying...' : 'Verify & Continue'}
            </button>
          </form>

          <div className="text-center">
            <button
              type="button"
              className="btn btn-link text-decoration-none"
              onClick={handleResendOtp}
              disabled={!phoneNumber}
              style={{ color: '#3B6D11', fontSize: '13px', fontWeight: 500 }}
            >
              Resend Code
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
