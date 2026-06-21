'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/axios';

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Core fields
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('SMALLHOLDER_FARMER');
  const [province, setProvince] = useState('HARARE');
  const [district, setDistrict] = useState('');

  // Farmer profile fields
  const [farmName, setFarmName] = useState('');
  const [farmSize, setFarmSize] = useState('');
  const [irrigationType, setIrrigationType] = useState('RAINFED');
  const [annualYield, setAnnualYield] = useState('');

  // Commercial Buyer fields
  const [companyName, setCompanyName] = useState('');
  const [companyRegNumber, setCompanyRegNumber] = useState('');
  const [buyerType, setBuyerType] = useState('SUPERMARKET');
  const [annualBudget, setAnnualBudget] = useState('');

  const isFarmerRole = role === 'SMALLHOLDER_FARMER' || role === 'COMMERCIAL_FARMER';
  const isCommercialBuyer = role === 'COMMERCIAL_BUYER';

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Normalize phone number
    let formattedPhone = phoneNumber.trim().replace(/\s+/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '+263' + formattedPhone.substring(1);
    }

    // Build payload dynamically based on role
    const payload: any = {
      phone_number: formattedPhone,
      email: email || null,
      role,
      province,
      district,
    };

    if (isFarmerRole) {
      payload.farm_profile = {
        farm_name: farmName,
        farm_size_hectares: parseFloat(farmSize) || 0.0,
        irrigation_type: irrigationType,
        annual_production_tonnes: parseFloat(annualYield) || 0.0,
      };
    } else if (isCommercialBuyer) {
      payload.commercial_buyer_profile = {
        company_name: companyName,
        company_registration_number: companyRegNumber,
        buyer_type: buyerType,
        annual_procurement_budget_usd: parseFloat(annualBudget) || 0.0,
      };
    }

    try {
      await api.post('auth/register/', payload);
      sessionStorage.setItem('verify_phone_number', formattedPhone);
      router.push('/verify');
    } catch (err: any) {
      // Extract specific field errors or general message
      const errData = err.response?.data;
      let errMsg = 'Failed to register account. Please check your inputs.';
      if (errData) {
        if (typeof errData === 'object') {
          errMsg = Object.entries(errData)
            .map(([field, errs]: any) => `${field}: ${Array.isArray(errs) ? errs.join(', ') : errs}`)
            .join(' | ');
        } else {
          errMsg = errData;
        }
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#FAF3E8', minHeight: '90vh', padding: '3rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card am-card" style={{ maxWidth: '600px', width: '100%', border: '0.5px solid #DDD0B8' }}>
        <div className="card-body p-4">
          <div className="text-center mb-4">
            <h2 style={{ color: '#1A3A08', fontWeight: 500 }}>Create Account</h2>
            <p className="text-hint" style={{ fontSize: '13px' }}>Join Zimbabwe's premier digital agricultural trading community.</p>
          </div>

          {error && (
            <div className="alert alert-danger badge-danger-custom py-2 px-3 border-0 mb-4" role="alert" style={{ fontSize: '13px' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleRegister}>
            <h5 className="mb-3 border-bottom pb-2" style={{ color: '#2C5410', fontSize: '15px' }}>1. General Account Details</h5>
            
            <div className="row g-3 mb-4">
              <div className="col-md-6">
                <label className="form-label" style={{ fontSize: '12px', fontWeight: 500, color: '#4E6A36' }}>Phone Number *</label>
                <input
                  type="tel"
                  className="form-control"
                  placeholder="+263771234567"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                />
              </div>
              <div className="col-md-6">
                <label className="form-label" style={{ fontSize: '12px', fontWeight: 500, color: '#4E6A36' }}>Email Address {isFarmerRole && role.startsWith('COMMERCIAL') ? '*' : '(Optional)'}</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="name@company.co.zw"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required={role === 'COMMERCIAL_FARMER' || role === 'COMMERCIAL_BUYER'}
                />
              </div>
              <div className="col-md-12">
                <label className="form-label" style={{ fontSize: '12px', fontWeight: 500, color: '#4E6A36' }}>I want to join as *</label>
                <select className="form-select" value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="SMALLHOLDER_FARMER">Smallholder Farmer (Under 5 Hectares)</option>
                  <option value="COMMERCIAL_FARMER">Commercial Farmer (5+ Hectares)</option>
                  <option value="RETAIL_BUYER">Retail Buyer / Individual Consumer</option>
                  <option value="COMMERCIAL_BUYER">Commercial Buyer / Retailer / Institution</option>
                  <option value="TRANSPORTER">Transporter / Logistics Operator</option>
                </select>
              </div>
            </div>

            <h5 className="mb-3 border-bottom pb-2" style={{ color: '#2C5410', fontSize: '15px' }}>2. Location Details</h5>
            <div className="row g-3 mb-4">
              <div className="col-md-6">
                <label className="form-label" style={{ fontSize: '12px', fontWeight: 500, color: '#4E6A36' }}>Province *</label>
                <select className="form-select" value={province} onChange={(e) => setProvince(e.target.value)}>
                  <option value="HARARE">Harare</option>
                  <option value="BULAWAYO">Bulawayo</option>
                  <option value="MANICALAND">Manicaland</option>
                  <option value="MASHONALAND_CENTRAL">Mashonaland Central</option>
                  <option value="MASHONALAND_EAST">Mashonaland East</option>
                  <option value="MASHONALAND_WEST">Mashonaland West</option>
                  <option value="MASVINGO">Masvingo</option>
                  <option value="MATABELELAND_NORTH">Matabeleland North</option>
                  <option value="MATABELELAND_SOUTH">Matabeleland South</option>
                  <option value="MIDLANDS">Midlands</option>
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label" style={{ fontSize: '12px', fontWeight: 500, color: '#4E6A36' }}>District *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Chipinge, Gokwe"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Farmer Sub-form */}
            {isFarmerRole && (
              <>
                <h5 className="mb-3 border-bottom pb-2" style={{ color: '#2C5410', fontSize: '15px' }}>3. Farm Profile Setup</h5>
                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 500, color: '#4E6A36' }}>Farm Trading Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Shashe Farms"
                      value={farmName}
                      onChange={(e) => setFarmName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 500, color: '#4E6A36' }}>Farm Size (Hectares) *</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-control"
                      placeholder="e.g. 3.5"
                      value={farmSize}
                      onChange={(e) => setFarmSize(e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 500, color: '#4E6A36' }}>Irrigation Type *</label>
                    <select className="form-select" value={irrigationType} onChange={(e) => setIrrigationType(e.target.value)}>
                      <option value="RAINFED">Rainfed</option>
                      <option value="DRIP">Drip Irrigation</option>
                      <option value="PIVOT">Pivot Irrigation</option>
                      <option value="FLOOD">Flood Irrigation</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 500, color: '#4E6A36' }}>Approx Annual Production (Tonnes)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-control"
                      placeholder="e.g. 10.0"
                      value={annualYield}
                      onChange={(e) => setAnnualYield(e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Commercial Buyer Sub-form */}
            {isCommercialBuyer && (
              <>
                <h5 className="mb-3 border-bottom pb-2" style={{ color: '#2C5410', fontSize: '15px' }}>3. Corporate Profile Setup</h5>
                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 500, color: '#4E6A36' }}>Company Registered Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Innscor Africa"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 500, color: '#4E6A36' }}>Company Registration Number *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 12345/2024"
                      value={companyRegNumber}
                      onChange={(e) => setCompanyRegNumber(e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 500, color: '#4E6A36' }}>Buyer Type *</label>
                    <select className="form-select" value={buyerType} onChange={(e) => setBuyerType(e.target.value)}>
                      <option value="SUPERMARKET">Supermarket Chain</option>
                      <option value="FOOD_PROCESSOR">Food Processor</option>
                      <option value="HOTEL_HOSPITALITY">Hotel & Hospitality</option>
                      <option value="SCHOOL_INSTITUTION">School / Institution</option>
                      <option value="EXPORT_AGENT">Export Agent</option>
                      <option value="NGO">NGO / Aid Agency</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 500, color: '#4E6A36' }}>Est. Annual Budget (USD)</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="e.g. 50000"
                      value={annualBudget}
                      onChange={(e) => setAnnualBudget(e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              className="btn btn-am-primary w-100 py-2 mt-2"
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Submit & Request Verification Code'}
            </button>
          </form>

          <div className="text-center mt-4 pt-2 border-top" style={{ borderColor: '#DDD0B8' }}>
            <span className="text-hint" style={{ fontSize: '13px' }}>Already have an account? </span>
            <a href="/login" style={{ color: '#3B6D11', fontWeight: 500, textDecoration: 'none', fontSize: '13px' }}>
              Sign In
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
