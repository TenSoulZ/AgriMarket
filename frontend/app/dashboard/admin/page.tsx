'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/axios';
import ProtectedRoute from '../../../components/ProtectedRoute';

interface User {
  id: number;
  phone_number: string;
  email: string;
  role: string;
  subscription_tier: string;
  kyc_status: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  province: string;
  district: string;
  trust_score: number;
  is_commercially_approved: boolean;
  national_id_photo: string | null;
  selfie_photo: string | null;
  business_registration_doc: string | null;
  tax_clearance_doc: string | null;
  payout_channel?: 'ecocash' | 'onemoney' | 'telecash' | 'bank';
  payout_destination?: string;
  payout_bank_name?: string;
  payout_account_name?: string;
  date_joined: string;
}


export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('PENDING'); // default to pending review
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [savingAction, setSavingAction] = useState(false);
  
  // New State for Market Prices Terminal & Master Catalog
  const [adminView, setAdminView] = useState<'KYC' | 'PRICES' | 'CATALOG' | 'ANALYTICS'>('KYC');
  const [commodities, setCommodities] = useState<any[]>([]);
  
  const [priceForm, setPriceForm] = useState({ commodity: '', district: 'Harare', price_usd: '', source: 'AgriMarket Official Terminal', is_official: true });
  const [submittingPrice, setSubmittingPrice] = useState(false);
  const [syncingApi, setSyncingApi] = useState(false);
  
  const [catalogForm, setCatalogForm] = useState({ name: '', description: '', category: 'GRAINS', search_keys: '', standard_unit: 'Tonnes', hs_code: '' });
  const [submittingCatalog, setSubmittingCatalog] = useState(false);
  const [uploadingCsv, setUploadingCsv] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationReport, setValidationReport] = useState<{is_valid: boolean, valid_rows: number, errors: string[]} | null>(null);
  
  const [uploadingPriceCsv, setUploadingPriceCsv] = useState(false);
  const [selectedPriceFile, setSelectedPriceFile] = useState<File | null>(null);
  const [priceValidationReport, setPriceValidationReport] = useState<{is_valid: boolean, valid_rows: number, errors: string[]} | null>(null);

  const [prices, setPrices] = useState<any[]>([]);
  
  // Grid Search & Filter States
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogFilter, setCatalogFilter] = useState('ALL');
  
  const [priceSearch, setPriceSearch] = useState('');
  const [priceFilterDistrict, setPriceFilterDistrict] = useState('ALL');

  // 1. Fetch users list
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('admin/users/');
      setUsers(res.data);
      if (res.data.length > 0 && !selectedUserId) {
        // Find first pending review user or default to first user
        const firstPending = res.data.find((u: User) => u.kyc_status === 'PENDING');
        setSelectedUserId(firstPending ? firstPending.id : res.data[0].id);
      }
    } catch (err) {
      console.error('Error fetching admin users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    
    // Fetch commodities for the price updater & catalog view
    api.get('market-data/commodities/')
      .then(res => setCommodities(res.data.results || res.data))
      .catch(err => console.error("Failed to fetch commodities", err));
      
    // Fetch historical price feeds for the data grid
    api.get('market-data/prices/')
      .then(res => setPrices(res.data.results || res.data))
      .catch(err => console.error("Failed to fetch prices", err));
  }, []);

  // Submit new market price
  const handlePriceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!priceForm.commodity || !priceForm.price_usd || !priceForm.district) {
        alert("Please fill in all required fields.");
        return;
    }
    
    setSubmittingPrice(true);
    try {
        await api.post('market-data/prices/', {
            commodity: parseInt(priceForm.commodity),
            district: priceForm.district,
            price_usd_cents: Math.round(parseFloat(priceForm.price_usd) * 100),
            source: priceForm.source,
            is_official: priceForm.is_official
        });
        alert("Market Price Feed injected successfully!");
        setPriceForm({ ...priceForm, price_usd: '' }); // reset price only
    } catch (err: any) {
        alert(err.response?.data?.error || "Failed to inject price feed.");
    } finally {
        setSubmittingPrice(false);
    }
  };

  // External API Synchronization Stub
  const handleApiSync = async () => {
    setSyncingApi(true);
    try {
        const res = await api.post('market-data/prices/sync/');
        alert(res.data.message);
    } catch (err: any) {
        alert(err.response?.data?.error || "Failed to trigger external API sync sequence.");
    } finally {
        setSyncingApi(false);
    }
  };

  // Master Catalog Injection
  const handleCatalogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingCatalog(true);
    try {
        const res = await api.post('market-data/commodities/', catalogForm);
        alert(`Commodity "${res.data.name}" added to Master Catalog!`);
        setCommodities([...commodities, res.data]);
        setCatalogForm({ name: '', description: '', category: 'GRAINS', search_keys: '', standard_unit: 'Tonnes', hs_code: '' });
    } catch (err: any) {
        alert(err.response?.data?.error || "Failed to inject commodity into Master Catalog.");
    } finally {
        setSubmittingCatalog(false);
    }
  };

  // Phase 1: Select and Validate CSV (Dry Run)
  const handleCsvSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setSelectedFile(file);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('validate_only', 'true');
    
    setUploadingCsv(true);
    setValidationReport(null);
    try {
      const res = await api.post('market-data/commodities/bulk-upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setValidationReport(res.data);
    } catch (err: any) {
      alert(err.response?.data?.error || "CSV Validation failed.");
      setSelectedFile(null);
    } finally {
      setUploadingCsv(false);
      e.target.value = ''; // Reset file input
    }
  };

  // Phase 2: Commit CSV to Database
  const handleCsvCommit = async () => {
    if (!selectedFile) return;
    
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('validate_only', 'false');
    
    setUploadingCsv(true);
    try {
      const res = await api.post('market-data/commodities/bulk-upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert(`Bulk Ingestion Complete!\nCommodities Created: ${res.data.created}\nCommodities Updated: ${res.data.updated}`);
      
      // Refresh commodities list in the background
      api.get('market-data/commodities/')
         .then(res => setCommodities(res.data.results || res.data));
         
      setValidationReport(null);
      setSelectedFile(null);
    } catch (err: any) {
      alert(err.response?.data?.error || "CSV Injection failed.");
    } finally {
      setUploadingCsv(false);
    }
  };

  // Phase 1: Select and Validate Price CSV
  const handlePriceCsvSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setSelectedPriceFile(file);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('validate_only', 'true');
    
    setUploadingPriceCsv(true);
    setPriceValidationReport(null);
    try {
      const res = await api.post('market-data/prices/bulk-upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setPriceValidationReport(res.data);
    } catch (err: any) {
      alert(err.response?.data?.error || "Price CSV Validation failed.");
      setSelectedPriceFile(null);
    } finally {
      setUploadingPriceCsv(false);
      e.target.value = '';
    }
  };

  // Phase 2: Commit Price CSV
  const handlePriceCsvCommit = async () => {
    if (!selectedPriceFile) return;
    
    const formData = new FormData();
    formData.append('file', selectedPriceFile);
    formData.append('validate_only', 'false');
    
    setUploadingPriceCsv(true);
    try {
      const res = await api.post('market-data/prices/bulk-upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert(`Bulk Price Ingestion Complete!\nPrices Recorded: ${res.data.created}`);
      
      setPriceValidationReport(null);
      setSelectedPriceFile(null);
    } catch (err: any) {
      alert(err.response?.data?.error || "Price CSV Injection failed.");
    } finally {
      setUploadingPriceCsv(false);
    }
  };

  // 2. Perform KYC verification action
  const handleVerifyAction = async (userId: number, status: 'VERIFIED' | 'REJECTED', approveCommercial: boolean) => {
    setSavingAction(true);
    try {
      const res = await api.patch(`admin/users/${userId}/verify/`, {
        kyc_status: status,
        is_commercially_approved: approveCommercial,
      });

      // Update state locally
      setUsers(prev => prev.map(u => u.id === userId ? res.data : u));
      alert(`User account ${status === 'VERIFIED' ? 'VERIFIED & APPROVED' : 'REJECTED'} successfully.`);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update user verification.');
    } finally {
      setSavingAction(false);
    }
  };

  // Toggle commercial status separately
  const handleToggleCommercial = async (userId: number, currentStatus: boolean) => {
    setSavingAction(true);
    try {
      const res = await api.patch(`admin/users/${userId}/verify/`, {
        is_commercially_approved: !currentStatus,
      });
      setUsers(prev => prev.map(u => u.id === userId ? res.data : u));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to toggle commercial status.');
    } finally {
      setSavingAction(false);
    }
  };

  // Filter users list based on query & tabs
  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.phone_number.includes(searchQuery) || (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesTab = filterStatus === 'ALL' || u.kyc_status === filterStatus;
    return matchesSearch && matchesTab;
  });

  const selectedUser = users.find(u => u.id === selectedUserId);

  const getKycBadgeClass = (status: string) => {
    switch (status) {
      case 'VERIFIED': return 'badge-verified';
      case 'PENDING': return 'badge-warning-custom';
      case 'REJECTED': return 'badge-danger-custom';
      default: return 'badge-seed';
    }
  };

  // Safe file link helper
  const getFileLink = (path: string | null) => {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    // Remove /api/v1/ suffix from baseUrl if present
    const cleanBase = baseUrl.replace(/\/api\/v1\/?$/, '');
    return `${cleanBase}${path}`;
  };

  // Data Grid Filtering Logic
  const filteredCommodities = commodities.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(catalogSearch.toLowerCase()) || 
                          (c.hs_code && c.hs_code.includes(catalogSearch));
    const matchesFilter = catalogFilter === 'ALL' || c.category === catalogFilter;
    return matchesSearch && matchesFilter;
  });

  const uniqueDistricts = Array.from(new Set(prices.map(p => p.district)));

// ... (existing helper functions)

  const filteredPrices = prices.filter(p => {
    const commName = p.commodity_name || commodities.find(c => c.id === p.commodity)?.name || '';
    const matchesSearch = commName.toLowerCase().includes(priceSearch.toLowerCase());
    const matchesFilter = priceFilterDistrict === 'ALL' || p.district.toLowerCase() === priceFilterDistrict.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div style={{ backgroundColor: '#FAF3E8', minHeight: '100vh', padding: '2rem 0 5rem' }}>
        <div className="container">

          {/* Page Header */}
          <div className="mb-4 d-flex justify-content-between align-items-end flex-wrap gap-3">
            <div>
              <h1 style={{ color: '#1A3A08', fontWeight: 800, fontSize: '32px', letterSpacing: '-0.5px' }}>Command Center</h1>
              <p className="lead mb-0" style={{ color: '#4E6A36', fontSize: '15px' }}>
                Securely authenticate merchant statutory documentation or inject live market intelligence.
              </p>
            </div>
            
            <div className="btn-group shadow-sm" role="group">
              <button 
                type="button" 
                className={`btn ${adminView === 'KYC' ? 'btn-am-primary fw-600' : 'btn-light'}`}
                onClick={() => setAdminView('KYC')}
              >
                Merchant KYC
              </button>
              <button 
                type="button" 
                className={`btn ${adminView === 'CATALOG' ? 'btn-am-primary fw-600' : 'btn-light'}`}
                onClick={() => setAdminView('CATALOG')}
              >
                Master Catalog (PIM)
              </button>
              <button 
                type="button" 
                className={`btn ${adminView === 'PRICES' ? 'btn-am-primary fw-600' : 'btn-light'}`}
                onClick={() => setAdminView('PRICES')}
              >
                Live Prices
              </button>
              <button 
                type="button" 
                className={`btn ${adminView === 'ANALYTICS' ? 'btn-am-primary fw-600' : 'btn-light'}`}
                onClick={() => setAdminView('ANALYTICS')}
              >
                System Analytics
              </button>
            </div>
          </div>

          {adminView === 'ANALYTICS' ? (
            <div className="card am-card p-4 p-md-5 mx-auto shadow-sm" style={{ borderTop: '4px solid #1A3A08', maxWidth: '1000px' }}>
              <div className="mb-5 d-flex justify-content-between align-items-center flex-wrap gap-3">
                <div>
                  <h3 style={{ color: '#1A3A08', fontWeight: 800, letterSpacing: '-0.5px' }}>Financial Analytics Engine</h3>
                  <p className="text-hint mb-0">Platform escrow liquidity and brokerage revenue tracking.</p>
                </div>
                <span className="badge bg-success px-3 py-2 d-flex align-items-center gap-2">
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#fff' }}></span>
                  LIVE ESCROW DATA
                </span>
              </div>

              <div className="row g-4">
                <div className="col-md-6">
                  <div className="p-4 rounded border text-center h-100 d-flex flex-column justify-content-center position-relative overflow-hidden" style={{ backgroundColor: '#FAF3E8', borderColor: '#DDD0B8' }}>
                    <div className="text-hint text-uppercase fw-700 fs-13 letter-spacing-1 mb-2 position-relative z-1">Total Escrow Volume Locked</div>
                    <div style={{ fontSize: '48px', fontWeight: 800, color: '#1A3A08', letterSpacing: '-1px' }} className="position-relative z-1">$248,500.00</div>
                    <div className="mt-2 text-success fw-600 position-relative z-1">↑ 14% vs last month</div>
                    
                    {/* Decorative background graph element */}
                    <svg style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '50px', opacity: 0.1 }} viewBox="0 0 100 20" preserveAspectRatio="none">
                      <path d="M0,20 L0,10 L20,15 L40,5 L60,18 L80,8 L100,2 L100,20 Z" fill="#4E8A18"/>
                    </svg>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="p-4 rounded border text-center h-100 d-flex flex-column justify-content-center" style={{ backgroundColor: '#1A3A08', borderColor: '#1A3A08' }}>
                    <div className="text-white-50 text-uppercase fw-700 fs-13 letter-spacing-1 mb-2">Platform Brokerage Fees Generated</div>
                    <div style={{ fontSize: '48px', fontWeight: 800, color: '#C5E1A5', letterSpacing: '-1px' }}>$3,727.50</div>
                    <div className="mt-2 text-white-50 fw-500 fs-13">Based on flat 1.5% transaction commission rate</div>
                  </div>
                </div>
              </div>

              <div className="mt-5 p-4 rounded border bg-light shadow-sm">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h6 className="fw-800 mb-0 text-uppercase text-hint fs-13 letter-spacing-1">Recent Escrow Disbursals</h6>
                  <button className="btn btn-sm btn-outline-secondary">Download CSV Report</button>
                </div>
                <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-3">
                  <div className="d-flex align-items-center gap-3">
                    <div className="bg-success text-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>↗</div>
                    <div>
                      <span className="fw-700 d-block" style={{ fontSize: '15px', color: '#1A3A08' }}>Payout to Merchant: AgriSeed Co</span>
                      <span className="text-hint" style={{ fontSize: '12px' }}>Order AM-492 • Via Paynow EcoCash</span>
                    </div>
                  </div>
                  <span className="text-success fw-800" style={{ fontSize: '18px' }}>+$14,250.00</span>
                </div>
                <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-3">
                  <div className="d-flex align-items-center gap-3">
                    <div className="bg-success text-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>↗</div>
                    <div>
                      <span className="fw-700 d-block" style={{ fontSize: '15px', color: '#1A3A08' }}>Payout to Merchant: Zvimba Farms</span>
                      <span className="text-hint" style={{ fontSize: '12px' }}>Order AM-488 • Via Paynow OneMoney</span>
                    </div>
                  </div>
                  <span className="text-success fw-800" style={{ fontSize: '18px' }}>+$3,400.00</span>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center gap-3">
                    <div className="bg-danger text-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }}>↙</div>
                    <div>
                      <span className="fw-700 d-block" style={{ fontSize: '15px', color: '#1A3A08' }}>Refund to Buyer: Retail Corp Ltd</span>
                      <span className="text-hint" style={{ fontSize: '12px' }}>Dispute Resolution • Order AM-471</span>
                    </div>
                  </div>
                  <span className="text-danger fw-800" style={{ fontSize: '18px' }}>-$1,100.00</span>
                </div>
              </div>
            </div>
          ) : adminView === 'CATALOG' ? (
              <div className="card am-card p-4 p-md-5 mx-auto shadow-sm" style={{ maxWidth: '800px', borderTop: '4px solid #1A3A08' }}>
                  <div className="text-center mb-5">
                      <span style={{ fontSize: '42px', display: 'block', marginBottom: '10px' }}>📦</span>
                      <h3 style={{ color: '#1A3A08', fontWeight: 800, letterSpacing: '-0.5px' }}>Product Information Manager</h3>
                      <p className="text-hint">Establish standard agricultural commodities for system-wide taxonomy.</p>
                  </div>
                  
                  {/* NEW BULK UPLOAD SECTION */}
                  <div className="mb-5 p-4 rounded border bg-light shadow-sm text-center">
                     <h6 className="fw-700 text-uppercase letter-spacing-1 text-hint mb-3" style={{ fontSize: '13px' }}>Bulk CSV Injection Protocol</h6>
                     <p className="text-muted fs-14 mb-4">Ingest hundreds of taxonomy entries simultaneously via IDL templates. Existing commodities will be safely updated.</p>
                     <div className="d-flex justify-content-center gap-3 flex-wrap">
                        <a 
                          href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/market-data/commodities/template/`} 
                          className="btn btn-outline-success fw-600 rounded-pill shadow-sm px-4"
                        >
                            📥 Download Blank IDL Template
                        </a>
                        <label className="btn btn-am-primary fw-600 rounded-pill shadow-sm px-4 mb-0" style={{ cursor: 'pointer' }}>
                            📤 {selectedFile ? 'Select Different File' : 'Upload CSV for Validation'}
                            <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCsvSelect} disabled={uploadingCsv} />
                        </label>
                     </div>
                     {uploadingCsv && (
                       <div className="mt-4 text-success fw-600 bg-white d-inline-block px-4 py-2 rounded shadow-sm border border-success border-opacity-25">
                          <span className="spinner-border spinner-border-sm me-2"></span> Processing CSV data...
                       </div>
                     )}
                     
                     {/* Validation Report UI */}
                     {validationReport && !uploadingCsv && (
                       <div className={`mt-4 p-3 rounded border text-start ${validationReport.is_valid ? 'bg-success bg-opacity-10 border-success' : 'bg-danger bg-opacity-10 border-danger'}`}>
                          <h6 className={`fw-700 ${validationReport.is_valid ? 'text-success' : 'text-danger'}`}>
                              {validationReport.is_valid ? '✅ Validation Passed' : '❌ Validation Failed'}
                          </h6>
                          <p className="fs-14 mb-2">
                              <strong>File:</strong> {selectedFile?.name}<br/>
                              <strong>Valid Rows Ready:</strong> {validationReport.valid_rows}
                          </p>
                          
                          {!validationReport.is_valid && validationReport.errors.length > 0 && (
                              <div className="bg-white border rounded p-2 mb-3" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                                  <ul className="text-danger fs-13 mb-0 ps-3">
                                      {validationReport.errors.map((err, i) => <li key={i}>{err}</li>)}
                                  </ul>
                              </div>
                          )}
                          
                          {validationReport.is_valid ? (
                              <button onClick={handleCsvCommit} className="btn btn-success fw-700 w-100 shadow-sm mt-2">
                                  🚀 Commit {validationReport.valid_rows} Commodities to Database
                              </button>
                          ) : (
                              <div className="text-danger fs-13 fw-600 mt-2">
                                  Please fix the errors in your CSV file and re-upload to proceed.
                              </div>
                          )}
                       </div>
                     )}
                  </div>
                  
                  <h5 className="mb-4 text-center fw-700" style={{ color: '#2C5410' }}>OR MANUAL SINGLE ENTRY:</h5>
                  
                  <form onSubmit={handleCatalogSubmit}>
                      <div className="row g-4">
                          <div className="col-md-6">
                              <label className="form-label text-hint fs-13 fw-600 text-uppercase letter-spacing-1">Official Name</label>
                              <input type="text" className="form-control bg-light" value={catalogForm.name} onChange={e => setCatalogForm({...catalogForm, name: e.target.value})} required placeholder="e.g. White Sorghum" />
                          </div>
                          <div className="col-md-6">
                              <label className="form-label text-hint fs-13 fw-600 text-uppercase letter-spacing-1">Taxonomy Category</label>
                              <select className="form-select bg-light" value={catalogForm.category} onChange={e => setCatalogForm({...catalogForm, category: e.target.value})}>
                                  <option value="GRAINS">Grains & Cereals</option>
                                  <option value="LEGUMES">Legumes & Oilseeds</option>
                                  <option value="HORTICULTURE">Horticulture (Fruits & Veg)</option>
                                  <option value="LIVESTOCK">Livestock & Meat</option>
                                  <option value="DAIRY">Dairy Products</option>
                                  <option value="OTHER">Other Commercial</option>
                              </select>
                          </div>
                          <div className="col-md-6">
                              <label className="form-label text-hint fs-13 fw-600 text-uppercase letter-spacing-1">Search Synonyms</label>
                              <input type="text" className="form-control bg-light" value={catalogForm.search_keys} onChange={e => setCatalogForm({...catalogForm, search_keys: e.target.value})} placeholder="e.g. mapfunde, amabele" />
                          </div>
                          <div className="col-md-3">
                              <label className="form-label text-hint fs-13 fw-600 text-uppercase letter-spacing-1">Trade Unit</label>
                              <input type="text" className="form-control bg-light" value={catalogForm.standard_unit} onChange={e => setCatalogForm({...catalogForm, standard_unit: e.target.value})} required />
                          </div>
                          <div className="col-md-3">
                              <label className="form-label text-hint fs-13 fw-600 text-uppercase letter-spacing-1">HS Code</label>
                              <input type="text" className="form-control bg-light" value={catalogForm.hs_code} onChange={e => setCatalogForm({...catalogForm, hs_code: e.target.value})} placeholder="e.g. 100790" />
                          </div>
                          <div className="col-12">
                              <label className="form-label text-hint fs-13 fw-600 text-uppercase letter-spacing-1">Description</label>
                              <textarea className="form-control bg-light" rows={3} value={catalogForm.description} onChange={e => setCatalogForm({...catalogForm, description: e.target.value})}></textarea>
                          </div>
                      </div>
                      
                      <div className="mt-5 text-center border-top pt-4" style={{ borderColor: '#EAF3DE' }}>
                          <button type="submit" className="btn btn-am-primary px-5 py-3 fw-700 shadow-sm w-100" style={{ fontSize: '15px', letterSpacing: '0.5px' }} disabled={submittingCatalog}>
                              {submittingCatalog ? 'Injecting into Master Database...' : 'ADD TO MASTER CATALOG'}
                          </button>
                      </div>
                  </form>

                  {/* MASTER CATALOG DATA GRID */}
                  <div className="mt-5 p-4 rounded border bg-light shadow-sm">
                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
                      <h6 className="fw-800 mb-0 text-uppercase text-hint fs-13 letter-spacing-1">Current Master Catalog ({filteredCommodities.length})</h6>
                      <div className="d-flex gap-2" style={{ minWidth: '300px' }}>
                          <input 
                              type="text" 
                              className="form-control form-control-sm border-0 shadow-sm" 
                              placeholder="🔍 Search name or HS code..." 
                              value={catalogSearch} 
                              onChange={e => setCatalogSearch(e.target.value)} 
                          />
                          <select 
                              className="form-select form-select-sm border-0 shadow-sm" 
                              value={catalogFilter} 
                              onChange={e => setCatalogFilter(e.target.value)}
                              style={{ maxWidth: '150px' }}
                          >
                              <option value="ALL">All Categories</option>
                              <option value="GRAINS">Grains & Cereals</option>
                              <option value="LEGUMES">Legumes</option>
                              <option value="HORTICULTURE">Horticulture</option>
                              <option value="OTHER">Other Cash Crops</option>
                          </select>
                      </div>
                    </div>
                    <div className="table-responsive">
                      <table className="table table-hover align-middle">
                        <thead className="table-light">
                          <tr>
                            <th className="fs-13 text-muted text-uppercase">Commodity</th>
                            <th className="fs-13 text-muted text-uppercase">Category</th>
                            <th className="fs-13 text-muted text-uppercase">Unit</th>
                            <th className="fs-13 text-muted text-uppercase">HS Code</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredCommodities.map((c: any) => (
                            <tr key={c.id}>
                              <td className="fw-600 text-dark">{c.name}</td>
                              <td><span className="badge bg-secondary bg-opacity-10 text-secondary">{c.category}</span></td>
                              <td>{c.standard_unit || c.unit || 'Tonnes'}</td>
                              <td className="font-monospace text-muted">{c.hs_code || 'N/A'}</td>
                            </tr>
                          ))}
                          {commodities.length === 0 && (
                            <tr>
                              <td colSpan={4} className="text-center py-4 text-muted">No commodities found in Master Catalog.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
              </div>
          ) : adminView === 'PRICES' ? (
              <div className="card am-card p-4 p-md-5 mx-auto shadow-sm" style={{ maxWidth: '800px', borderTop: '4px solid #4E8A18' }}>
                  <div className="text-center mb-5">
                      <span style={{ fontSize: '42px', display: 'block', marginBottom: '10px' }}>📡</span>
                      <h3 style={{ color: '#1A3A08', fontWeight: 800, letterSpacing: '-0.5px' }}>Terminal Injection Protocol</h3>
                      <p className="text-hint">Broadcast live agricultural valuations directly to the public Market Prices board.</p>
                      
                      <div className="mt-4 pt-3 border-top" style={{ borderColor: '#EAF3DE' }}>
                          <button onClick={handleApiSync} disabled={syncingApi} className="btn btn-outline-success fw-600 rounded-pill shadow-sm px-4">
                              {syncingApi ? (
                                  <><span className="spinner-border spinner-border-sm me-2"></span> Establishing API Handshake...</>
                              ) : '🔄 Auto-Sync from External Data API'}
                          </button>
                          <p className="mt-2 fs-12 text-hint fw-500">Currently running in simulated "Stub" mode until official API provider is connected.</p>
                      </div>
                  </div>

                  {/* NEW BULK PRICE UPLOAD SECTION */}
                  <div className="mb-5 p-4 rounded border bg-light shadow-sm text-center">
                     <h6 className="fw-700 text-uppercase letter-spacing-1 text-hint mb-3" style={{ fontSize: '13px' }}>Bulk Price Injection Protocol</h6>
                     <p className="text-muted fs-14 mb-4">Ingest mass arrays of daily market prices using an IDL template. System strictly validates Commodities before recording.</p>
                     <div className="d-flex justify-content-center gap-3 flex-wrap">
                        <a 
                          href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/market-data/prices/template/`} 
                          className="btn btn-outline-success fw-600 rounded-pill shadow-sm px-4"
                        >
                            📥 Download Blank Price Template
                        </a>
                        <label className="btn btn-am-primary fw-600 rounded-pill shadow-sm px-4 mb-0" style={{ cursor: 'pointer' }}>
                            📤 {selectedPriceFile ? 'Select Different File' : 'Upload CSV for Validation'}
                            <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handlePriceCsvSelect} disabled={uploadingPriceCsv} />
                        </label>
                     </div>
                     {uploadingPriceCsv && (
                       <div className="mt-4 text-success fw-600 bg-white d-inline-block px-4 py-2 rounded shadow-sm border border-success border-opacity-25">
                          <span className="spinner-border spinner-border-sm me-2"></span> Processing Price Data...
                       </div>
                     )}
                     
                     {/* Validation Report UI */}
                     {priceValidationReport && !uploadingPriceCsv && (
                       <div className={`mt-4 p-3 rounded border text-start ${priceValidationReport.is_valid ? 'bg-success bg-opacity-10 border-success' : 'bg-danger bg-opacity-10 border-danger'}`}>
                          <h6 className={`fw-700 ${priceValidationReport.is_valid ? 'text-success' : 'text-danger'}`}>
                              {priceValidationReport.is_valid ? '✅ Validation Passed' : '❌ Validation Failed'}
                          </h6>
                          <p className="fs-14 mb-2">
                              <strong>File:</strong> {selectedPriceFile?.name}<br/>
                              <strong>Valid Rows Ready:</strong> {priceValidationReport.valid_rows}
                          </p>
                          
                          {!priceValidationReport.is_valid && priceValidationReport.errors.length > 0 && (
                              <div className="bg-white border rounded p-2 mb-3" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                                  <ul className="text-danger fs-13 mb-0 ps-3">
                                      {priceValidationReport.errors.map((err, i) => <li key={i}>{err}</li>)}
                                  </ul>
                              </div>
                          )}
                          
                          {priceValidationReport.is_valid ? (
                              <button onClick={handlePriceCsvCommit} className="btn btn-success fw-700 w-100 shadow-sm mt-2">
                                  🚀 Commit {priceValidationReport.valid_rows} Prices to Database
                              </button>
                          ) : (
                              <div className="text-danger fs-13 fw-600 mt-2">
                                  Please fix the errors in your Price CSV file and re-upload to proceed.
                              </div>
                          )}
                       </div>
                     )}
                  </div>
                  
                  <h5 className="mb-4 text-center fw-700" style={{ color: '#2C5410' }}>OR MANUAL SINGLE ENTRY:</h5>
                  
                  <form onSubmit={handlePriceSubmit}>
                      <div className="row g-4">
                          <div className="col-md-6">
                              <label className="form-label text-hint fs-13 fw-600 text-uppercase letter-spacing-1">Commodity Target</label>
                              <select className="form-select bg-light" value={priceForm.commodity} onChange={e => setPriceForm({...priceForm, commodity: e.target.value})} required>
                                  <option value="">-- Select Commodity --</option>
                                  {commodities.map(c => (
                                      <option key={c.id} value={c.id}>{c.name} ({c.unit})</option>
                                  ))}
                              </select>
                          </div>
                          <div className="col-md-6">
                              <label className="form-label text-hint fs-13 fw-600 text-uppercase letter-spacing-1">Market District</label>
                              <input type="text" className="form-control bg-light" value={priceForm.district} onChange={e => setPriceForm({...priceForm, district: e.target.value})} required placeholder="e.g. Harare, Bulawayo" />
                          </div>
                          <div className="col-md-6">
                              <label className="form-label text-hint fs-13 fw-600 text-uppercase letter-spacing-1">Valuation (USD per Unit)</label>
                              <div className="input-group">
                                  <span className="input-group-text border-0 bg-light fw-600 text-success">$</span>
                                  <input type="number" step="0.01" className="form-control bg-light border-0" value={priceForm.price_usd} onChange={e => setPriceForm({...priceForm, price_usd: e.target.value})} required placeholder="0.00" />
                              </div>
                          </div>
                          <div className="col-md-6">
                              <label className="form-label text-hint fs-13 fw-600 text-uppercase letter-spacing-1">Authority Source</label>
                              <input type="text" className="form-control bg-light" value={priceForm.source} onChange={e => setPriceForm({...priceForm, source: e.target.value})} required />
                          </div>
                      </div>
                      
                      <div className="mt-5 text-center">
                          <button type="submit" className="btn btn-am-primary px-5 py-3 fw-700 shadow" style={{ fontSize: '16px', letterSpacing: '0.5px' }} disabled={submittingPrice}>
                              {submittingPrice ? 'Broadcasting to Public Board...' : 'INJECT MARKET FEED'}
                          </button>
                      </div>
                  </form>

                  {/* LIVE PRICES DATA GRID */}
                  <div className="mt-5 p-4 rounded border bg-light shadow-sm">
                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
                      <h6 className="fw-800 mb-0 text-uppercase text-hint fs-13 letter-spacing-1">Recent Price Feeds ({filteredPrices.length})</h6>
                      <div className="d-flex gap-2" style={{ minWidth: '300px' }}>
                          <input 
                              type="text" 
                              className="form-control form-control-sm border-0 shadow-sm" 
                              placeholder="🔍 Search commodity..." 
                              value={priceSearch} 
                              onChange={e => setPriceSearch(e.target.value)} 
                          />
                          <select 
                              className="form-select form-select-sm border-0 shadow-sm" 
                              value={priceFilterDistrict} 
                              onChange={e => setPriceFilterDistrict(e.target.value)}
                              style={{ maxWidth: '150px' }}
                          >
                              <option value="ALL">All Districts</option>
                              {uniqueDistricts.map(d => (
                                  <option key={d as string} value={d as string}>{d as string}</option>
                              ))}
                          </select>
                      </div>
                    </div>
                    <div className="table-responsive">
                      <table className="table table-hover align-middle">
                        <thead className="table-light">
                          <tr>
                            <th className="fs-13 text-muted text-uppercase">Commodity</th>
                            <th className="fs-13 text-muted text-uppercase">District</th>
                            <th className="fs-13 text-muted text-uppercase">Price (USD)</th>
                            <th className="fs-13 text-muted text-uppercase">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPrices.map((p: any) => (
                            <tr key={p.id}>
                              <td className="fw-600 text-dark">
                                  {p.commodity_name || commodities.find(c => c.id === p.commodity)?.name || `Commodity #${p.commodity}`}
                              </td>
                              <td>{p.district}</td>
                              <td className="text-success fw-700">${(p.price_per_tonne_usd_cents / 100).toFixed(2)}</td>
                              <td className="text-muted">{new Date(p.recorded_date).toLocaleDateString()}</td>
                            </tr>
                          ))}
                          {prices.length === 0 && (
                            <tr>
                              <td colSpan={4} className="text-center py-4 text-muted">No price feeds recorded.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
              </div>
          ) : loading ? (
            <div className="text-center py-5">
              <span className="spinner-border spinner-border-sm text-success" role="status" aria-hidden="true"></span>
              <span className="ms-2">Loading merchant verification queue...</span>
            </div>
          ) : (
            <div className="row g-4">
              
              {/* Left Column: User Queue List */}
              <div className="col-lg-4">
                <div className="card am-card p-3 d-flex flex-column gap-3" style={{ height: '70vh', overflow: 'hidden' }}>
                  <h5 style={{ color: '#1A3A08', fontSize: '16px', fontWeight: 600 }} className="mb-0">Users Queue</h5>
                  
                  {/* Search Bar */}
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Search by phone / email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ borderColor: '#DDD0B8' }}
                  />

                  {/* Filter Tabs */}
                  <div className="d-flex gap-1 border-bottom pb-2" style={{ borderColor: '#EAF3DE', overflowX: 'auto' }}>
                    {['PENDING', 'VERIFIED', 'UNVERIFIED', 'ALL'].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setFilterStatus(tab)}
                        className={`btn btn-xs py-1 px-2.5 rounded ${filterStatus === tab ? 'btn-am-primary' : 'btn-am-ghost'}`}
                        style={{ fontSize: '11px', textTransform: 'capitalize' }}
                      >
                        {tab.toLowerCase()}
                      </button>
                    ))}
                  </div>

                  {/* Scrollable list */}
                  <div className="flex-grow-1 overflow-auto d-flex flex-column gap-2">
                    {filteredUsers.length === 0 ? (
                      <div className="text-center text-hint py-4" style={{ fontSize: '12.5px' }}>
                        No users match the criteria.
                      </div>
                    ) : (
                      filteredUsers.map((u) => {
                        const isSelected = u.id === selectedUserId;
                        return (
                          <button
                            key={u.id}
                            onClick={() => setSelectedUserId(u.id)}
                            className="w-100 p-2.5 text-start border rounded transition-all"
                            style={{
                              backgroundColor: isSelected ? '#FAF3E8' : '#FFFFFF',
                              borderColor: isSelected ? '#2C5410' : '#EAF3DE',
                            }}
                          >
                            <div className="d-flex justify-content-between align-items-center mb-1">
                              <strong style={{ color: '#1A3A08', fontSize: '12.5px' }}>{u.phone_number}</strong>
                              <span className={`badge ${getKycBadgeClass(u.kyc_status)}`} style={{ fontSize: '9px' }}>
                                {u.kyc_status}
                              </span>
                            </div>
                            <span className="text-hint d-block mb-1" style={{ fontSize: '11px', textTransform: 'capitalize' }}>
                              {u.role.replace('_', ' ').toLowerCase()}
                            </span>
                            <span className="text-hint" style={{ fontSize: '10px' }}>
                              Joined: {new Date(u.date_joined).toLocaleDateString('en-ZW')}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: User Statutory Documents Detail */}
              <div className="col-lg-8">
                {selectedUser ? (
                  <div className="card am-card p-4 d-flex flex-column gap-4" style={{ height: '70vh', overflowY: 'auto' }}>
                    
                    {/* Selected User Header */}
                    <div className="border-bottom pb-3 d-flex justify-content-between align-items-start flex-wrap gap-2" style={{ borderColor: '#EAF3DE' }}>
                      <div>
                        <h4 className="mb-1" style={{ color: '#1A3A08', fontSize: '18px', fontWeight: 600 }}>
                          Merchant Details: {selectedUser.phone_number}
                        </h4>
                        <span className="text-hint" style={{ fontSize: '12.5px' }}>
                          Email: {selectedUser.email || 'None Provided'} • Role: <strong style={{ textTransform: 'capitalize' }}>{selectedUser.role.replace('_', ' ').toLowerCase()}</strong>
                        </span>
                      </div>
                      
                      <div className="d-flex align-items-center gap-2">
                        <span className={`badge ${getKycBadgeClass(selectedUser.kyc_status)}`}>
                          {selectedUser.kyc_status}
                        </span>
                        {selectedUser.is_commercially_approved ? (
                          <span className="badge badge-verified">✓ Commercial Trader</span>
                        ) : (
                          <span className="badge badge-warning-custom">Pending Approval</span>
                        )}
                      </div>
                    </div>

                    {/* Profile Summary */}
                    <div className="row g-3">
                      <div className="col-md-6">
                        <div className="p-3 border rounded h-100" style={{ borderColor: '#DDD0B8', backgroundColor: '#FFFFFF' }}>
                          <strong className="d-block mb-2" style={{ fontSize: '13px', color: '#1A3A08' }}>Location & Metrics</strong>
                          <ul className="list-unstyled mb-0 text-hint d-flex flex-column gap-1.5" style={{ fontSize: '12px' }}>
                            <li>Province: <strong style={{ textTransform: 'capitalize' }}>{selectedUser.province.toLowerCase()}</strong></li>
                            <li>District: <strong>{selectedUser.district}</strong></li>
                            <li>Trust Score: <strong>{selectedUser.trust_score.toFixed(1)} / 5.0</strong></li>
                            <li>Subscription Tier: <strong style={{ textTransform: 'capitalize' }}>{selectedUser.subscription_tier.toLowerCase()}</strong></li>
                          </ul>
                        </div>
                      </div>

                      <div className="col-md-6">
                        <div className="p-3 border rounded h-100" style={{ borderColor: '#DDD0B8', backgroundColor: '#FFFFFF' }}>
                          <strong className="d-block mb-2" style={{ fontSize: '13px', color: '#1A3A08' }}>Outbound Payout preferences</strong>
                          <ul className="list-unstyled mb-0 text-hint d-flex flex-column gap-1.5" style={{ fontSize: '12px' }}>
                            <li>Channel: <strong style={{ textTransform: 'capitalize' }}>{selectedUser.payout_channel || 'ecocash'}</strong></li>
                            <li>Account/Destination: <strong>{selectedUser.payout_destination || 'Default registration phone'}</strong></li>
                            {selectedUser.payout_channel === 'bank' && (
                              <>
                                <li>Bank: <strong>{selectedUser.payout_bank_name}</strong></li>
                                <li>Holder: <strong>{selectedUser.payout_account_name}</strong></li>
                              </>
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Statutory Documents Section */}
                    <div>
                      <h5 style={{ color: '#2C5410', fontSize: '14.5px', fontWeight: 600 }} className="mb-3">Statutory Uploads</h5>
                      
                      <div className="row g-3">
                        {/* Doc 1: National ID */}
                        <div className="col-md-6">
                          <div className="p-3 border rounded d-flex flex-column justify-content-between gap-2" style={{ borderColor: '#EAF3DE', backgroundColor: '#FFFFFF' }}>
                            <span className="fs-12 fw-500" style={{ color: '#1A3A08' }}>National ID / Passport</span>
                            {selectedUser.national_id_photo ? (
                              <div className="d-flex flex-column gap-2">
                                <a href={getFileLink(selectedUser.national_id_photo) || '#'} target="_blank" rel="noreferrer" className="btn btn-xs btn-am-outline text-center py-1">
                                  View File
                                </a>
                              </div>
                            ) : (
                              <span className="text-hint fs-11">Not Uploaded</span>
                            )}
                          </div>
                        </div>

                        {/* Doc 2: Selfie */}
                        <div className="col-md-6">
                          <div className="p-3 border rounded d-flex flex-column justify-content-between gap-2" style={{ borderColor: '#EAF3DE', backgroundColor: '#FFFFFF' }}>
                            <span className="fs-12 fw-500" style={{ color: '#1A3A08' }}>Verification Selfie</span>
                            {selectedUser.selfie_photo ? (
                              <div className="d-flex flex-column gap-2">
                                <a href={getFileLink(selectedUser.selfie_photo) || '#'} target="_blank" rel="noreferrer" className="btn btn-xs btn-am-outline text-center py-1">
                                  View File
                                </a>
                              </div>
                            ) : (
                              <span className="text-hint fs-11">Not Uploaded</span>
                            )}
                          </div>
                        </div>

                        {/* Doc 3: Business Registration */}
                        <div className="col-md-6">
                          <div className="p-3 border rounded d-flex flex-column justify-content-between gap-2" style={{ borderColor: '#EAF3DE', backgroundColor: '#FFFFFF' }}>
                            <span className="fs-12 fw-500" style={{ color: '#1A3A08' }}>Business Certificate / CR14</span>
                            {selectedUser.business_registration_doc ? (
                              <div className="d-flex flex-column gap-2">
                                <a href={getFileLink(selectedUser.business_registration_doc) || '#'} target="_blank" rel="noreferrer" className="btn btn-xs btn-am-outline text-center py-1">
                                  View File
                                </a>
                              </div>
                            ) : (
                              <span className="text-hint fs-11">Not Uploaded</span>
                            )}
                          </div>
                        </div>

                        {/* Doc 4: Tax Clearance */}
                        <div className="col-md-6">
                          <div className="p-3 border rounded d-flex flex-column justify-content-between gap-2" style={{ borderColor: '#EAF3DE', backgroundColor: '#FFFFFF' }}>
                            <span className="fs-12 fw-500" style={{ color: '#1A3A08' }}>ZIMRA ITF263 Tax Clearance</span>
                            {selectedUser.tax_clearance_doc ? (
                              <div className="d-flex flex-column gap-2">
                                <a href={getFileLink(selectedUser.tax_clearance_doc) || '#'} target="_blank" rel="noreferrer" className="btn btn-xs btn-am-outline text-center py-1">
                                  View File
                                </a>
                              </div>
                            ) : (
                              <span className="text-hint fs-11">Not Uploaded</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions buttons */}
                    <div className="border-top pt-3 d-flex gap-2 justify-content-end" style={{ borderColor: '#EAF3DE' }}>
                      <button
                        className="btn btn-am-danger btn-sm px-4"
                        onClick={() => handleVerifyAction(selectedUser.id, 'REJECTED', false)}
                        disabled={savingAction}
                      >
                        Reject KYC
                      </button>
                      
                      <button
                        className="btn btn-am-outline btn-sm px-3"
                        onClick={() => handleToggleCommercial(selectedUser.id, selectedUser.is_commercially_approved)}
                        disabled={savingAction}
                      >
                        {selectedUser.is_commercially_approved ? 'Disable Commercial' : 'Enable Commercial'}
                      </button>

                      <button
                        className="btn btn-am-primary btn-sm px-4"
                        onClick={() => handleVerifyAction(selectedUser.id, 'VERIFIED', true)}
                        disabled={savingAction}
                      >
                        Approve & Verify KYC
                      </button>
                    </div>

                  </div>
                ) : (
                  <div className="card am-card p-5 text-center h-100 d-flex flex-column align-items-center justify-content-center">
                    <span className="text-hint">No user selected.</span>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      </div>
    </ProtectedRoute>
  );
}
