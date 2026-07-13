'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/axios';

export default function LoginPage() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Normalize phone number (handle leading 0 to +263)
    let formattedPhone = phoneNumber.trim().replace(/\s+/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '+263' + formattedPhone.substring(1);
    }

    try {
      // Use the newly added TokenObtainPairView endpoint
      const res = await api.post('auth/login/', { 
        phone_number: formattedPhone,
        password: password 
      });
      
      // Store JWT tokens securely in local storage
      localStorage.setItem('access_token', res.data.access);
      if (res.data.refresh) {
        localStorage.setItem('refresh_token', res.data.refresh);
      }
      
      // Redirect to marketplace upon successful authentication
      router.push('/marketplace');
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.response?.data?.error || 'Invalid phone number or password. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#FAF3E8', minHeight: '85vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card am-card" style={{ maxWidth: '400px', width: '100%', border: '0.5px solid #DDD0B8' }}>
        <div className="card-body p-4">
          <div className="text-center mb-4">
            <h2 style={{ color: '#1A3A08', fontWeight: 500 }}>Sign In</h2>
            <p className="text-hint" style={{ fontSize: '13px' }}>Enter your credentials to access your account.</p>
          </div>

          {error && (
            <div className="alert alert-danger badge-danger-custom py-2 px-3 border-0 mb-3" role="alert" style={{ fontSize: '13px' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="mb-3">
              <label htmlFor="phone" className="form-label" style={{ fontSize: '12px', fontWeight: 500, color: '#4E6A36' }}>
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                className="form-control"
                placeholder="e.g. +263771234567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
                autoComplete="username"
                style={{
                  borderColor: '#DDD0B8',
                  borderRadius: '0.5rem',
                  padding: '0.6rem 0.8rem',
                }}
              />
              <span className="text-hint mt-1 d-block" style={{ fontSize: '11px' }}>
                Format: +263 77X / 71X / 73X
              </span>
            </div>

            <div className="mb-4">
              <label htmlFor="password" className="form-label" style={{ fontSize: '12px', fontWeight: 500, color: '#4E6A36' }}>
                Password
              </label>
              <input
                type="password"
                id="password"
                className="form-control"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{
                  borderColor: '#DDD0B8',
                  borderRadius: '0.5rem',
                  padding: '0.6rem 0.8rem',
                }}
              />
            </div>

            <button
              type="submit"
              className="btn btn-am-primary w-100 py-2"
              disabled={loading}
            >
              {loading ? 'Authenticating...' : 'Sign In securely'}
            </button>
          </form>

          <div className="text-center mt-4 pt-2 border-top" style={{ borderColor: '#DDD0B8' }}>
            <span className="text-hint" style={{ fontSize: '13px' }}>New to AgriMarket? </span>
            <a href="/register" style={{ color: '#3B6D11', fontWeight: 500, textDecoration: 'none', fontSize: '13px' }}>
              Create an Account
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
