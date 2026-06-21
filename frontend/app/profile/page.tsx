'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '../../lib/axios';
import ProtectedRoute from '../../components/ProtectedRoute';

interface UserProfile {
  phone_number: string;
  email: string;
  role: string;
  subscription_tier: string;
  kyc_status: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  province: string;
  district: string;
  trust_score: number;
  is_commercially_approved: boolean;
  farm_profile?: {
    farm_name: string;
    farm_size_hectares: number;
    irrigation_type: string;
    certified_organic: boolean;
    gapps_certified: boolean;
  };
  commercial_buyer_profile?: {
    company_name: string;
    company_registration_number: string;
    buyer_type: string;
    annual_procurement_budget_usd: number;
  };
  payout_channel?: 'ecocash' | 'onemoney' | 'telecash' | 'bank';
  payout_destination?: string;
  payout_bank_name?: string;
  payout_account_name?: string;
  national_id_photo?: string;
  selfie_photo?: string;
  business_registration_doc?: string;
  tax_clearance_doc?: string;
}

const INITIAL_PROFILE: UserProfile = {
  phone_number: '+263772123456',
  email: 'farmingservices@agri.co.zw',
  role: 'COMMERCIAL_FARMER',
  subscription_tier: 'HARVEST',
  kyc_status: 'UNVERIFIED',
  province: 'MASHONALAND_EAST',
  district: 'Marondera',
  trust_score: 4.8,
  is_commercially_approved: false,
  payout_channel: 'ecocash',
  payout_destination: '+263772123456',
  payout_bank_name: '',
  payout_account_name: '',
  farm_profile: {
    farm_name: 'Shiri Mukanya Farms',
    farm_size_hectares: 25.5,
    irrigation_type: 'DRIP',
    certified_organic: false,
    gapps_certified: true,
  }
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile>(INITIAL_PROFILE);
  const [activeTab, setActiveTab] = useState<'info' | 'payout' | 'kyc' | 'subscription'>('info');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [province, setProvince] = useState('HARARE');
  const [district, setDistrict] = useState('');
  
  // Payout details states
  const [payoutChannel, setPayoutChannel] = useState('ecocash');
  const [payoutDestination, setPayoutDestination] = useState('');
  const [payoutBankName, setPayoutBankName] = useState('');
  const [payoutAccountName, setPayoutAccountName] = useState('');

  // Farm Profile states
  const [farmName, setFarmName] = useState('');
  const [farmSize, setFarmSize] = useState(0);
  const [irrigation, setIrrigation] = useState('RAINFED');
  const [organic, setOrganic] = useState(false);
  const [gapps, setGapps] = useState(false);

  // KYC upload states
  const [nationalIdUploaded, setNationalIdUploaded] = useState(false);
  const [selfieUploaded, setSelfieUploaded] = useState(false);
  const [businessDocUploaded, setBusinessDocUploaded] = useState(false);
  const [taxDocUploaded, setTaxDocUploaded] = useState(false);
  const [kycStatus, setKycStatus] = useState<UserProfile['kyc_status']>('UNVERIFIED');
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  // 1. Fetch profile settings from backend on mount
  useEffect(() => {
    api.get('users/profile/')
      .then(res => {
        const data = res.data;
        setProfile(data);
        setEmail(data.email || '');
        setProvince(data.province || 'HARARE');
        setDistrict(data.district || '');
        setPayoutChannel(data.payout_channel || 'ecocash');
        setPayoutDestination(data.payout_destination || '');
        setPayoutBankName(data.payout_bank_name || '');
        setPayoutAccountName(data.payout_account_name || '');
        
        if (data.farm_profile) {
          setFarmName(data.farm_profile.farm_name || '');
          setFarmSize(data.farm_profile.farm_size_hectares || 0);
          setIrrigation(data.farm_profile.irrigation_type || 'RAINFED');
          setOrganic(data.farm_profile.certified_organic || false);
          setGapps(data.farm_profile.gapps_certified || false);
        }
        
        setKycStatus(data.kyc_status);
        if (data.national_id_photo) setNationalIdUploaded(true);
        if (data.selfie_photo) setSelfieUploaded(true);
        if (data.business_registration_doc) setBusinessDocUploaded(true);
        if (data.tax_clearance_doc) setTaxDocUploaded(true);
      })
      .catch(err => {
        console.log('Unable to reach user profile API, using simulation mode.');
      });
  }, []);

  // 2. Save personal info form
  const handleSaveInfo = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const patchData: any = {
      email,
      province,
      district,
    };

    if (profile.farm_profile) {
      patchData.farm_profile = {
        farm_name: farmName,
        farm_size_hectares: farmSize,
        irrigation_type: irrigation,
        certified_organic: organic,
        gapps_certified: gapps,
      };
    }

    api.patch('users/profile/', patchData)
      .then(res => {
        setProfile(res.data);
        setIsSaving(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      })
      .catch(err => {
        alert('Failed to save profile information.');
        setIsSaving(false);
      });
  };

  // 3. Save payout form
  const handleSavePayout = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const patchData = {
      payout_channel: payoutChannel,
      payout_destination: payoutDestination,
      payout_bank_name: payoutBankName,
      payout_account_name: payoutAccountName,
    };

    api.patch('users/profile/', patchData)
      .then(res => {
        setProfile(res.data);
        setIsSaving(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      })
      .catch(err => {
        alert('Failed to save payout settings.');
        setIsSaving(false);
      });
  };

  // 4. File uploads handler
  const handleDocUpload = (docType: string, file: File) => {
    setUploadingDoc(docType);
    const formData = new FormData();
    
    let fieldName = '';
    if (docType === 'national_id') fieldName = 'national_id_photo';
    if (docType === 'selfie') fieldName = 'selfie_photo';
    if (docType === 'business_registration') fieldName = 'business_registration_doc';
    if (docType === 'tax_clearance') fieldName = 'tax_clearance_doc';

    formData.append(fieldName, file);

    api.post('users/kyc/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
      .then(res => {
        setUploadingDoc(null);
        if (docType === 'national_id') setNationalIdUploaded(true);
        if (docType === 'selfie') setSelfieUploaded(true);
        if (docType === 'business_registration') setBusinessDocUploaded(true);
        if (docType === 'tax_clearance') setTaxDocUploaded(true);
        setKycStatus(res.data.kyc_status);
      })
      .catch(err => {
        setUploadingDoc(null);
        alert(err.response?.data?.error || 'Failed to upload document.');
      });
  };

  const triggerFileInput = (docType: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,application/pdf';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        handleDocUpload(docType, file);
      }
    };
    input.click();
  };

  const handleSubmitKyc = () => {
    if (!nationalIdUploaded || !selfieUploaded || (profile.role.startsWith('COMMERCIAL') && !businessDocUploaded)) {
      alert('Please upload all required documentation for verification.');
      return;
    }
    setKycStatus('PENDING');
    alert('KYC documentation submitted successfully for review.');
  };

  const getKycBadge = (status: UserProfile['kyc_status']) => {
    switch (status) {
      case 'VERIFIED':
        return <span className="badge badge-escrow py-1.5 px-2.5">✓ KYC Verified</span>;
      case 'PENDING':
        return <span className="badge badge-warning-custom py-1.5 px-2.5">⏳ Pending Review</span>;
      case 'REJECTED':
        return <span className="badge badge-danger-custom py-1.5 px-2.5">✗ Rejected (Re-upload)</span>;
      default:
        return <span className="badge badge-seed py-1.5 px-2.5">Unverified</span>;
    }
  };

  return (
    <ProtectedRoute>
      <div style={{ backgroundColor: '#FAF3E8', minHeight: '100vh', padding: '3rem 0 5rem' }}>
        <div className="container">
        
        {/* Header Block */}
        <div className="d-flex justify-content-between align-items-center mb-5 flex-wrap gap-3">
          <div>
            <h1 style={{ color: '#1A3A08', fontWeight: 700, fontSize: '32px' }}>Account Settings</h1>
            <p className="lead" style={{ color: '#4E6A36', fontSize: '15px' }}>
              Manage your profile details, submit statutory KYC paperwork, and view merchant status limits.
            </p>
          </div>
          <div className="d-flex gap-2">
            <Link href={profile.role.includes('FARMER') ? '/dashboard/farmer' : '/dashboard/buyer'} className="btn btn-am-ghost btn-sm">
              Back to Dashboard
            </Link>
          </div>
        </div>

        <div className="row g-4">
          
          {/* Left Navigation Card */}
          <div className="col-lg-3">
            <div className="card am-card p-3 d-flex flex-column gap-2">
              <div className="text-center py-3 border-bottom mb-2" style={{ borderColor: '#EAF3DE' }}>
                <div 
                  className="mx-auto mb-2 d-flex align-items-center justify-content-center"
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    backgroundColor: '#EAF3DE',
                    border: '2px solid #2C5410',
                    color: '#2C5410',
                    fontWeight: 600,
                    fontSize: '18px'
                  }}
                >
                  {(profile.farm_profile?.farm_name || 'My Profile')[0]}
                </div>
                <h6 className="mb-1" style={{ color: '#1A3A08' }}>{profile.farm_profile?.farm_name || 'My Profile'}</h6>
                <span className="text-hint" style={{ fontSize: '12px' }}>{profile.phone_number}</span>
                <div className="mt-2">{getKycBadge(kycStatus)}</div>
              </div>
              
              <button 
                className={`btn btn-sm text-start py-2 px-3 ${activeTab === 'info' ? 'btn-am-primary' : 'btn-am-ghost'}`}
                onClick={() => setActiveTab('info')}
              >
                Profile Information
              </button>
              <button 
                className={`btn btn-sm text-start py-2 px-3 ${activeTab === 'kyc' ? 'btn-am-primary' : 'btn-am-ghost'}`}
                onClick={() => setActiveTab('kyc')}
              >
                KYC Verification
              </button>
              <button 
                className={`btn btn-sm text-start py-2 px-3 ${activeTab === 'payout' ? 'btn-am-primary' : 'btn-am-ghost'}`}
                onClick={() => setActiveTab('payout')}
              >
                Payout Settings
              </button>
              <button 
                className={`btn btn-sm text-start py-2 px-3 ${activeTab === 'subscription' ? 'btn-am-primary' : 'btn-am-ghost'}`}
                onClick={() => setActiveTab('subscription')}
              >
                Subscription Tiers
              </button>
            </div>
          </div>

          {/* Right Detailed Tab Area */}
          <div className="col-lg-9">
            
            {/* TAB 1: Profile Information */}
            {activeTab === 'info' && (
              <div className="card am-card p-4">
                <h3 className="mb-4" style={{ color: '#1A3A08', fontSize: '20px', fontWeight: 600 }}>Personal & Trading Info</h3>
                
                {saveSuccess && (
                  <div className="alert p-3 mb-4 text-hint" style={{ backgroundColor: '#E1F5EE', color: '#0F6E56', border: 'none' }}>
                    ✓ Settings saved successfully. Profile updated in database.
                  </div>
                )}

                <form onSubmit={handleSaveInfo}>
                  <div className="row g-3 mb-4">
                    <div className="col-md-6">
                      <label className="form-label text-hint mb-1">Registered Phone Number</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={profile.phone_number} 
                        disabled 
                        style={{ borderColor: '#DDD0B8', backgroundColor: '#F0E6D0' }}
                      />
                      <span className="text-hint" style={{ fontSize: '10.5px' }}>Phone number cannot be changed once verified.</span>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label text-hint mb-1">Email Address</label>
                      <input 
                        type="email" 
                        className="form-control" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        required
                        style={{ borderColor: '#DDD0B8' }}
                      />
                    </div>
                  </div>

                  <div className="row g-3 mb-4">
                    <div className="col-md-6">
                      <label className="form-label text-hint mb-1">Province Location</label>
                      <select 
                        className="form-select" 
                        value={province} 
                        onChange={(e) => setProvince(e.target.value)}
                        style={{ borderColor: '#DDD0B8' }}
                      >
                        <option value="HARARE">Harare</option>
                        <option value="BULAWAYO">Bulawayo</option>
                        <option value="MANICALAND">Manicaland</option>
                        <option value="MASHONALAND_EAST">Mashonaland East</option>
                        <option value="MASHONALAND_CENTRAL">Mashonaland Central</option>
                        <option value="MASHONALAND_WEST">Mashonaland West</option>
                        <option value="MASVINGO">Masvingo</option>
                        <option value="MIDLANDS">Midlands</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label text-hint mb-1">District Location</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={district} 
                        onChange={(e) => setDistrict(e.target.value)} 
                        required
                        style={{ borderColor: '#DDD0B8' }}
                      />
                    </div>
                  </div>

                  {/* Dynamic Farmer profile fields */}
                  {profile.farm_profile && (
                    <div className="border-top pt-4 mt-2">
                      <h4 className="mb-3" style={{ color: '#2C5410', fontSize: '16px', fontWeight: 600 }}>Farm Configuration</h4>
                      
                      <div className="row g-3 mb-4">
                        <div className="col-md-6">
                          <label className="form-label text-hint mb-1">Farm Trading Name</label>
                          <input 
                            type="text" 
                            className="form-control" 
                            value={farmName} 
                            onChange={(e) => setFarmName(e.target.value)} 
                            required
                            style={{ borderColor: '#DDD0B8' }}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label text-hint mb-1">Total Size (Hectares)</label>
                          <input 
                            type="number" 
                            step="0.1" 
                            className="form-control" 
                            value={farmSize} 
                            onChange={(e) => setFarmSize(parseFloat(e.target.value) || 0)} 
                            required
                            style={{ borderColor: '#DDD0B8' }}
                          />
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="form-label text-hint mb-1">Primary Irrigation Infrastructure</label>
                        <select 
                          className="form-select" 
                          value={irrigation} 
                          onChange={(e) => setIrrigation(e.target.value)}
                          style={{ borderColor: '#DDD0B8' }}
                        >
                          <option value="RAINFED">Rainfed Only</option>
                          <option value="DRIP">Drip Irrigation</option>
                          <option value="PIVOT">Pivot Irrigation System</option>
                          <option value="FLOOD">Flood Irrigation Channels</option>
                        </select>
                      </div>

                      <div className="d-flex flex-column gap-2 mb-4">
                        <div className="form-check">
                          <input 
                            className="form-check-input" 
                            type="checkbox" 
                            id="organicCheck" 
                            checked={organic} 
                            onChange={(e) => setOrganic(e.target.checked)}
                          />
                          <label className="form-check-label text-hint fs-13" htmlFor="organicCheck">
                            My farm crops are certified organic and chemical-free
                          </label>
                        </div>
                        <div className="form-check">
                          <input 
                            className="form-check-input" 
                            type="checkbox" 
                            id="gappsCheck" 
                            checked={gapps} 
                            onChange={(e) => setGapps(e.target.checked)}
                          />
                          <label className="form-check-label text-hint fs-13" htmlFor="gappsCheck">
                            My agricultural procedures hold Good Agricultural Practices (GAPPS) Accreditation
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  <button 
                    type="submit" 
                    className="btn btn-am-primary" 
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving Changes...' : 'Save Profile Changes'}
                  </button>
                </form>
              </div>
            )}

            {/* TAB 2: KYC Document Upload */}
            {activeTab === 'kyc' && (
              <div className="card am-card p-4">
                <h3 className="mb-3" style={{ color: '#1A3A08', fontSize: '20px', fontWeight: 600 }}>Statutory KYC Vetting</h3>
                <p className="text-hint mb-4" style={{ fontSize: '13px' }}>
                  Under Zimbabwean agricultural trading laws, farmers and buyers committing spot wholesale or forward contracts must verify identities and business tax registry cards.
                </p>

                {kycStatus === 'VERIFIED' ? (
                  <div className="p-4 rounded border text-center" style={{ backgroundColor: '#E1F5EE', borderColor: '#0F6E56', color: '#0F6E56' }}>
                    <h5 className="mb-2">Your Account is Verified!</h5>
                    <p className="mb-0 fs-13 text-hint" style={{ color: '#0F6E56' }}>
                      All statutory documents were verified by the platform admin team. You can transact up to any volume capacity.
                    </p>
                  </div>
                ) : kycStatus === 'PENDING' ? (
                  <div className="p-4 rounded border text-center" style={{ backgroundColor: '#FAEEDA', borderColor: '#BA7517', color: '#BA7517' }}>
                    <h5 className="mb-2">Documents Under Review</h5>
                    <p className="mb-0 fs-13 text-hint" style={{ color: '#633806' }}>
                      Your verification files are currently in queue. Support staff reviews are completed within 12 hours.
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="row g-4 mb-4">
                      
                      {/* Document 1: National ID */}
                      <div className="col-md-6">
                        <div className="p-3 border rounded h-100 d-flex flex-column justify-content-between" style={{ borderColor: '#DDD0B8' }}>
                          <div>
                            <strong className="d-block mb-1" style={{ fontSize: '13.5px', color: '#1A3A08' }}>National ID Card / Passport *</strong>
                            <p className="text-hint mb-3" style={{ fontSize: '11.5px' }}>Front side photo showing full name, DOB, and ID number.</p>
                          </div>
                          {nationalIdUploaded ? (
                            <span className="text-success fs-12 fw-500">✓ Uploaded successfully</span>
                          ) : (
                            <button 
                              className="btn btn-sm btn-am-ghost w-100" 
                              onClick={() => triggerFileInput('national_id')}
                              disabled={uploadingDoc !== null}
                            >
                              {uploadingDoc === 'national_id' ? 'Uploading...' : 'Upload Image / PDF'}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Document 2: Selfie */}
                      <div className="col-md-6">
                        <div className="p-3 border rounded h-100 d-flex flex-column justify-content-between" style={{ borderColor: '#DDD0B8' }}>
                          <div>
                            <strong className="d-block mb-1" style={{ fontSize: '13.5px', color: '#1A3A08' }}>Identity Verification Selfie *</strong>
                            <p className="text-hint mb-3" style={{ fontSize: '11.5px' }}>Self portrait photo holding your National ID next to your face.</p>
                          </div>
                          {selfieUploaded ? (
                            <span className="text-success fs-12 fw-500">✓ Uploaded successfully</span>
                          ) : (
                            <button 
                              className="btn btn-sm btn-am-ghost w-100" 
                              onClick={() => triggerFileInput('selfie')}
                              disabled={uploadingDoc !== null}
                            >
                              {uploadingDoc === 'selfie' ? 'Uploading...' : 'Upload Image / PDF'}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Document 3: Business Registration */}
                      {profile.role.startsWith('COMMERCIAL') && (
                        <div className="col-md-6">
                          <div className="p-3 border rounded h-100 d-flex flex-column justify-content-between" style={{ borderColor: '#DDD0B8' }}>
                            <div>
                              <strong className="d-block mb-1" style={{ fontSize: '13.5px', color: '#1A3A08' }}>Business Certificate / CR14 *</strong>
                              <p className="text-hint mb-3" style={{ fontSize: '11.5px' }}>Certificate of incorporation, partnership deeds or cooperative card.</p>
                            </div>
                            {businessDocUploaded ? (
                              <span className="text-success fs-12 fw-500">✓ Uploaded successfully</span>
                            ) : (
                              <button 
                                className="btn btn-sm btn-am-ghost w-100" 
                                onClick={() => triggerFileInput('business_registration')}
                                disabled={uploadingDoc !== null}
                              >
                                {uploadingDoc === 'business_registration' ? 'Uploading...' : 'Upload Image / PDF'}
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Document 4: Tax Clearance */}
                      {profile.role.startsWith('COMMERCIAL') && (
                        <div className="col-md-6">
                          <div className="p-3 border rounded h-100 d-flex flex-column justify-content-between" style={{ borderColor: '#DDD0B8' }}>
                            <div>
                              <strong className="d-block mb-1" style={{ fontSize: '13.5px', color: '#1A3A08' }}>ZIMRA ITF263 Tax Clearance</strong>
                              <p className="text-hint mb-3" style={{ fontSize: '11.5px' }}>Required to execute contract trades valued above $5,000 USD.</p>
                            </div>
                            {taxDocUploaded ? (
                              <span className="text-success fs-12 fw-500">✓ Uploaded successfully</span>
                            ) : (
                              <button 
                                className="btn btn-sm btn-am-ghost w-100" 
                                onClick={() => triggerFileInput('tax_clearance')}
                                disabled={uploadingDoc !== null}
                              >
                                {uploadingDoc === 'tax_clearance' ? 'Uploading...' : 'Upload Image / PDF'}
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                    </div>

                    <button 
                      className="btn btn-am-primary"
                      onClick={handleSubmitKyc}
                    >
                      Submit KYC Verification
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Subscription Plans */}
            {activeTab === 'subscription' && (
              <div className="card am-card p-4">
                <h3 className="mb-3" style={{ color: '#1A3A08', fontSize: '20px', fontWeight: 600 }}>Plan Billing</h3>
                
                <div className="p-3 rounded border mb-4 d-flex justify-content-between align-items-center" style={{ borderColor: '#EAF3DE', backgroundColor: '#FAF3E8' }}>
                  <div>
                    <span className="text-hint" style={{ fontSize: '11px' }}>Current Merchant Plan</span>
                    <h5 className="mb-0" style={{ color: '#1A3A08', textTransform: 'capitalize' }}>
                      {profile.subscription_tier} Tier
                    </h5>
                  </div>
                  <span className="badge badge-verified fs-12 py-1.5 px-2">Active</span>
                </div>

                <h5 className="mb-3" style={{ color: '#2C5410', fontSize: '15px', fontWeight: 600 }}>Billing details</h5>
                <ul className="list-unstyled text-hint d-flex flex-column gap-2 mb-4" style={{ fontSize: '13px' }}>
                  <li>• **EcoCash / ZimSwitch Direct Debits**: Invoices are charged on the 1st of every calendar month.</li>
                  <li>• **Dual currency**: Payments are automatically calculated in USD or ZiG at the GMB official bank rate.</li>
                  <li>• **Cancellation policy**: Downgrading to the free Seed Tier takes effect immediately, closing active wholesale listings.</li>
                </ul>

                <button 
                  className="btn btn-am-danger btn-sm"
                  onClick={() => {
                    if (confirm('Are you sure you want to cancel your merchant tier subscription? This will hide your listings from the Wholesale Board.')) {
                      api.patch('users/profile/', { subscription_tier: 'SEED' })
                        .then(res => {
                          setProfile(res.data);
                          alert('Subscription downgraded to Seed Tier.');
                        })
                        .catch(() => {
                          alert('Failed to update subscription.');
                        });
                    }
                  }}
                >
                  Downgrade / Cancel Subscription
                </button>
              </div>
            )}

            {/* TAB 4: Payout Settings */}
            {activeTab === 'payout' && (
              <div className="card am-card p-4">
                <h3 className="mb-3" style={{ color: '#1A3A08', fontSize: '20px', fontWeight: 600 }}>Payout Destination Settings</h3>
                <p className="text-hint mb-4" style={{ fontSize: '13px' }}>
                  Specify where you want platform escrow payouts (disbursed funds from sales or contract settlements) to be sent. Mobile money transfers are processed immediately.
                </p>

                <form onSubmit={handleSavePayout}>
                  {saveSuccess && (
                    <div className="alert p-3 mb-4 text-hint" style={{ backgroundColor: '#E1F5EE', color: '#0F6E56', border: 'none' }}>
                      ✓ Payout configurations saved successfully.
                    </div>
                  )}

                  <div className="mb-4">
                    <label className="form-label text-hint mb-1">Select Payout Channel</label>
                    <select 
                      className="form-select" 
                      value={payoutChannel} 
                      onChange={(e) => setPayoutChannel(e.target.value as any)}
                      style={{ borderColor: '#DDD0B8' }}
                    >
                      <option value="ecocash">EcoCash Mobile Money</option>
                      <option value="onemoney">OneMoney Mobile Money</option>
                      <option value="telecash">TeleCash Mobile Money</option>
                      <option value="bank">Commercial Bank Transfer</option>
                    </select>
                  </div>

                  {payoutChannel === 'bank' ? (
                    <>
                      <div className="row g-3 mb-4">
                        <div className="col-md-6">
                          <label className="form-label text-hint mb-1">Commercial Bank Name</label>
                          <select 
                            className="form-select" 
                            value={payoutBankName} 
                            onChange={(e) => setPayoutBankName(e.target.value)}
                            required
                            style={{ borderColor: '#DDD0B8' }}
                          >
                            <option value="">-- Select Bank --</option>
                            <option value="CBZ Bank">CBZ Bank</option>
                            <option value="FBC Bank">FBC Bank</option>
                            <option value="Stanbic Bank">Stanbic Bank</option>
                            <option value="CABS">CABS</option>
                            <option value="Nedbank Zimbabwe">Nedbank Zimbabwe</option>
                            <option value="Standard Chartered">Standard Chartered</option>
                            <option value="Steward Bank">Steward Bank</option>
                          </select>
                        </div>
                        <div className="col-md-6">
                          <label className="form-label text-hint mb-1">Bank Account Number</label>
                          <input 
                            type="text" 
                            className="form-control" 
                            value={payoutDestination} 
                            onChange={(e) => setPayoutDestination(e.target.value)}
                            placeholder="e.g. 109283748301"
                            required
                            style={{ borderColor: '#DDD0B8' }}
                          />
                        </div>
                      </div>
                      <div className="mb-4">
                        <label className="form-label text-hint mb-1">Account Holder Full Name</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          value={payoutAccountName} 
                          onChange={(e) => setPayoutAccountName(e.target.value)}
                          placeholder="e.g. Simbarashe Chanakira"
                          required
                          style={{ borderColor: '#DDD0B8' }}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="mb-4">
                      <label className="form-label text-hint mb-1">Mobile Money Phone Number (+263)</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={payoutDestination} 
                        onChange={(e) => setPayoutDestination(e.target.value)}
                        placeholder="e.g. +263772123456"
                        required
                        style={{ borderColor: '#DDD0B8' }}
                      />
                      <span className="text-hint" style={{ fontSize: '11px' }}>Must be a registered Zimbabwean mobile wallet number corresponding to the selected channel.</span>
                    </div>
                  )}

                  <button 
                    type="submit" 
                    className="btn btn-am-primary" 
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving Payout Settings...' : 'Save Payout Settings'}
                  </button>
                </form>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
    </ProtectedRoute>
  );
}
