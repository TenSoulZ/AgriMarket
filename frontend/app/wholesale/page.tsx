'use client';

import React, { useState, useEffect } from 'react';
import WholesaleListingCard, { WholesaleListing } from '../../components/WholesaleListingCard';
import { api } from '../../lib/axios';
import ProtectedRoute from '../../components/ProtectedRoute';

export default function WholesalePage() {
  const [search, setSearch] = useState('');
  const [contractType, setContractType] = useState('All');
  const [gmbGrade, setGmbGrade] = useState('All');

  const [listings, setListings] = useState<WholesaleListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWholesale = async () => {
      setLoading(true);
      try {
        const res = await api.get('wholesale/');
        const data = res.data.results || res.data;
        setListings(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to fetch wholesale listings:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchWholesale();
  }, []);

  const getGradeDisplay = (gradeStr: string) => {
    const g = gradeStr?.toUpperCase();
    if (g === 'A') return 'Grade A';
    if (g === 'B') return 'Grade B';
    if (g === 'C') return 'Grade C';
    return g || 'Ungraded';
  };

  const filteredListings = listings.filter((item) => {
    const searchLower = search.toLowerCase();
    const sellerName = (item.farmer_detail?.farm_profile?.farm_name || item.farmer_detail?.phone_number || '').toLowerCase();
    
    const matchesSearch =
      item.title?.toLowerCase().includes(searchLower) ||
      item.description?.toLowerCase().includes(searchLower) ||
      sellerName.includes(searchLower);

    // Hardcoded mock values since backend doesn't support them yet
    const itemContractType = 'Spot Wholesale'; 
    const matchesContract = contractType === 'All' || itemContractType === contractType;
    
    const itemGrade = getGradeDisplay(item.quality_grade);
    const matchesGrade = gmbGrade === 'All' || itemGrade === gmbGrade;

    return matchesSearch && matchesContract && matchesGrade;
  });

  const contractTypes = ['All', 'Spot Wholesale', 'Forward Contract', 'Contract Farming'];
  const grades = ['All', 'Grade A', 'Grade B', 'Grade C', 'Ungraded'];

  return (
    <ProtectedRoute allowedRoles={['COMMERCIAL_FARMER', 'COMMERCIAL_BUYER']}>
      <div style={{ backgroundColor: '#FAF3E8', minHeight: '100vh', padding: '2rem 0 5rem' }}>
      <div className="container">

        {/* Page Header */}
        <div className="mb-4">
          <h1 style={{ color: '#1A3A08', fontWeight: 700, fontSize: '32px' }}>Wholesale Board</h1>
          <p className="lead" style={{ color: '#4E6A36', fontSize: '16px' }}>
            Trade bulk agricultural commodities, forward contracts, and pre-negotiate supplier terms with certified commercial farmers.
          </p>
        </div>

        {/* Filters Card */}
        <div className="card am-card mb-4">
          <div className="row g-3">
            {/* Search Input */}
            <div className="col-md-5">
              <label className="form-label text-hint mb-1" style={{ fontSize: '12px' }}>Search Wholesale Board</label>
              <input
                type="text"
                className="form-control"
                placeholder="Search White Maize, GMB Grade, Cooperative..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ borderColor: '#DDD0B8' }}
              />
            </div>

            {/* Contract Type Filter */}
            <div className="col-md-3">
              <label className="form-label text-hint mb-1" style={{ fontSize: '12px' }}>Contract Type</label>
              <select
                className="form-select"
                value={contractType}
                onChange={(e) => setContractType(e.target.value)}
                style={{ borderColor: '#DDD0B8' }}
              >
                {contractTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* GMB Grade Filter */}
            <div className="col-md-4">
              <label className="form-label text-hint mb-1" style={{ fontSize: '12px' }}>GMB Grading</label>
              <select
                className="form-select"
                value={gmbGrade}
                onChange={(e) => setGmbGrade(e.target.value)}
                style={{ borderColor: '#DDD0B8' }}
              >
                {grades.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Info banner for wholesale verification */}
        <div className="alert alert-info border-0 p-3 rounded mb-4" style={{ backgroundColor: '#E1F5EE', color: '#0F6E56' }}>
          <div className="d-flex align-items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span style={{ fontSize: '13.5px' }}>
              <strong>Notice:</strong> High-volume wholesale transactions require AMA registration. Escrow funds must clear before transport dispatch.
            </span>
          </div>
        </div>

        {/* Listings Counter and CTA */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <span className="text-hint" style={{ fontSize: '14px' }}>
            Showing <strong>{filteredListings.length}</strong> bulk listing opportunities
          </span>
          <a href="/contracts" className="btn btn-sm btn-am-outline">
            View Buyer RFQs
          </a>
        </div>

        {/* Wholesale Listings Grid */}
        {loading ? (
          <div className="py-5 text-center">
            <span className="spinner-border text-success" role="status" aria-hidden="true" style={{ width: '3rem', height: '3rem' }}></span>
            <p className="mt-3 text-hint">Fetching wholesale board data...</p>
          </div>
        ) : filteredListings.length > 0 ? (
          <div className="row g-4">
            {filteredListings.map((listing) => (
              <div key={listing.id} className="col-md-6 col-lg-4">
                <WholesaleListingCard listing={listing} />
              </div>
            ))}
          </div>
        ) : (
          <div className="card am-card py-5 text-center">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#7A9460" strokeWidth="1.5" className="mx-auto mb-3">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <h5 className="mb-2" style={{ color: '#1A3A08' }}>No wholesale listings found</h5>
            <p className="text-hint mb-0">
              Try modifying your grade, contract type, or location filters.
            </p>
          </div>
        )}

      </div>
    </div>
    </ProtectedRoute>
  );
}
