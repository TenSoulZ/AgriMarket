'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCurrencyStore } from '../../../lib/currencyStore';
import { WholesaleListing } from '../../../components/WholesaleListingCard';
import { api } from '../../../lib/axios';
import ProtectedRoute from '../../../components/ProtectedRoute';

function WholesaleDetailContent({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { formatPrice, currency, conversionRate } = useCurrencyStore();
  
  const [listing, setListing] = useState<WholesaleListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [tonnes, setTonnes] = useState(0);
  const [customPriceCents, setCustomPriceCents] = useState(0);
  const [negotiating, setNegotiating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchListing = async () => {
      try {
        const res = await api.get(`wholesale/${params.id}/`);
        const data = res.data;
        setListing(data);
        setTonnes(Number(data.min_order_quantity_tonnes) || 1);
        setCustomPriceCents(data.price_per_tonne_usd_cents);
      } catch (error) {
        console.error("Failed to load wholesale listing:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchListing();
  }, [params.id]);

  if (loading) {
    return (
      <div className="container py-5 text-center" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div>
          <span className="spinner-border text-success" role="status" aria-hidden="true" style={{ width: '3rem', height: '3rem' }}></span>
          <p className="mt-3 text-hint">Loading wholesale details...</p>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="container py-5 text-center">
        <h3 className="mb-3" style={{ color: '#1A3A08' }}>Bulk Listing Not Found</h3>
        <p className="text-hint mb-4">The bulk listing you requested does not exist or has been archived.</p>
        <Link href="/wholesale" className="btn btn-am-primary">
          Back to Wholesale Board
        </Link>
      </div>
    );
  }

  const minQty = Number(listing.min_order_quantity_tonnes);
  const maxQty = Number(listing.quantity_available_tonnes);

  const handlePropose = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (tonnes < minQty || tonnes > maxQty) {
      setErrorMsg(`Order tonnage must be between ${minQty} and ${maxQty} tonnes.`);
      return;
    }

    setNegotiating(true);
    
    try {
      const res = await api.post('orders/', {
        wholesale_listing: listing.id,
        qty: tonnes,
        total_price_usd_cents: Math.round(customPriceCents * tonnes)
      });
      
      setSuccess(true);
      setTimeout(() => {
        router.push(`/orders?new_id=${res.data.id}&qty=${tonnes}&price=${customPriceCents}`);
      }, 2500);
      
    } catch (error: any) {
      console.error("Contract proposal failed:", error);
      const errMsg = error.response?.data?.non_field_errors?.[0] || 
                     error.response?.data?.detail || 
                     error.response?.data?.[0] || 
                     "Failed to place bulk order. Ensure you are verified and have the required tier.";
      setErrorMsg(errMsg);
    } finally {
      setNegotiating(false);
    }
  };

  const handlePriceInputChange = (val: string) => {
    const floatVal = parseFloat(val) || 0;
    if (currency === 'USD') {
      setCustomPriceCents(Math.round(floatVal * 100));
    } else {
      // ZiG converted back to USD
      setCustomPriceCents(Math.round((floatVal / conversionRate) * 100));
    }
  };

  const currentDisplayUnitPrice = () => {
    if (currency === 'USD') {
      return (customPriceCents / 100).toFixed(2);
    } else {
      return ((customPriceCents / 100) * conversionRate).toFixed(2);
    }
  };

  const totalCostCents = customPriceCents * tonnes;
  const totalCostUsd = totalCostCents / 100;
  const totalCostZwg = totalCostUsd * conversionRate;

  const sellerName = listing.farmer_detail?.farm_profile?.farm_name || listing.farmer_detail?.phone_number || 'Unknown Farmer';
  const sellerTier = listing.farmer_detail?.subscription_tier || 'COMMERCIAL';
  
  // Default values for fields not natively present yet
  const contractType = 'Spot Wholesale';
  const escrowGuaranteed = true;
  const deliveryTerms = 'Ex-Farm';
  const displayLocation = 'Contact Seller';

  // Map backend's 'A', 'B', 'C' to full grade string
  const getGradeDisplay = (gradeStr: string) => {
    const g = gradeStr?.toUpperCase();
    if (g === 'A') return 'Grade A';
    if (g === 'B') return 'Grade B';
    if (g === 'C') return 'Grade C';
    return g || 'Ungraded';
  };

  return (
    <div style={{ backgroundColor: '#FAF3E8', minHeight: '100vh', padding: '3rem 0 5rem' }}>
      <div className="container">

        {/* Back navigation */}
        <div className="mb-4">
          <Link href="/wholesale" className="text-decoration-none d-inline-flex align-items-center gap-1" style={{ color: '#3B6D11', fontWeight: 500 }}>
            ← Back to Wholesale Board
          </Link>
        </div>

        {success ? (
          <div className="card am-card p-5 text-center">
            <div className="mb-3 d-flex justify-content-center">
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2.5px solid #0F6E56' }}>
                <span style={{ fontSize: '28px', color: '#0F6E56', fontWeight: 'bold' }}>✓</span>
              </div>
            </div>
            <h3 className="mb-2" style={{ color: '#1A3A08' }}>Trade Contract Proposed!</h3>
            <p className="text-hint mb-4" style={{ maxWidth: '500px', margin: '0 auto' }}>
              Your contract proposal for <strong>{tonnes} Tonnes</strong> at {formatPrice(customPriceCents)}/Tonne has been sent. Moving you to the Escrow Milestones and order details.
            </p>
            <span className="spinner-border spinner-border-sm text-success" role="status" aria-hidden="true"></span>
          </div>
        ) : (
          <div className="row g-4">
            
            {/* Left Column: Commodity Details */}
            <div className="col-lg-7">
              <div className="card am-card p-4">
                
                {/* Meta details and contract tags */}
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <span className="badge badge-enterprise px-3 py-2 fs-12">{contractType}</span>
                  {escrowGuaranteed && (
                    <span className="badge badge-escrow px-3 py-2 fs-12 d-flex align-items-center gap-1">
                      🛡 Secured Escrow Available
                    </span>
                  )}
                </div>

                <h2 style={{ color: '#1A3A08', fontWeight: 700 }}>{listing.title}</h2>
                
                <span className="text-hint d-block mb-4" style={{ fontSize: '14px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="me-1 align-text-bottom">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  Located in: <strong>{displayLocation}</strong>
                </span>

                <p className="lead mb-4" style={{ color: '#4E6A36', fontSize: '15px', lineHeight: '1.7' }}>
                  {listing.description}
                </p>

                {/* Technical Specs Table */}
                <h5 className="mb-3" style={{ color: '#2C5410', fontSize: '15px', fontWeight: 600 }}>Technical Specifications</h5>
                <div className="row g-3 mb-4">
                  <div className="col-sm-6">
                    <div className="p-3 rounded border" style={{ borderColor: '#EAF3DE', backgroundColor: '#FAF3E8' }}>
                      <span className="text-hint d-block" style={{ fontSize: '11px' }}>Crop Grade</span>
                      <strong style={{ color: '#1A3A08', fontSize: '14px' }}>{getGradeDisplay(listing.quality_grade)} Quality</strong>
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <div className="p-3 rounded border" style={{ borderColor: '#EAF3DE', backgroundColor: '#FAF3E8' }}>
                      <span className="text-hint d-block" style={{ fontSize: '11px' }}>Delivery Terms</span>
                      <strong style={{ color: '#1A3A08', fontSize: '14px' }}>{deliveryTerms}</strong>
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <div className="p-3 rounded border" style={{ borderColor: '#EAF3DE', backgroundColor: '#FAF3E8' }}>
                      <span className="text-hint d-block" style={{ fontSize: '11px' }}>Moisture Standard</span>
                      <strong style={{ color: '#1A3A08', fontSize: '14px' }}>{listing.moisture_content_pct}%</strong>
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <div className="p-3 rounded border" style={{ borderColor: '#EAF3DE', backgroundColor: '#FAF3E8' }}>
                      <span className="text-hint d-block" style={{ fontSize: '11px' }}>Seller Credentials</span>
                      <strong style={{ color: '#1A3A08', fontSize: '14px' }}>{sellerName} ({sellerTier})</strong>
                    </div>
                  </div>
                </div>

                {/* Escrow Disclaimer */}
                <div className="p-3 rounded text-hint" style={{ backgroundColor: '#E1F5EE', color: '#0F6E56', fontSize: '12.5px' }}>
                  <strong>Secure Escrow Flow:</strong> Under ZW regulations, payments for forward/spot orders are secured in our AMA-compliant trust accounts. Releasing is conditional on buyer verification and GMB grade certification.
                </div>

              </div>
            </div>

            {/* Right Column: Negotiation & Checkout Panel */}
            <div className="col-lg-5">
              <div className="card am-card p-4">
                <h4 className="mb-3" style={{ color: '#1A3A08', fontSize: '18px', fontWeight: 600 }}>
                  Propose Bulk Contract
                </h4>

                <div className="mb-4 pb-3 border-bottom text-hint" style={{ borderColor: '#EAF3DE', fontSize: '13px' }}>
                  Original Wholesale Rate: <strong>{formatPrice(listing.price_per_tonne_usd_cents)} / Tonne</strong>
                </div>

                <form onSubmit={handlePropose}>
                  
                  {errorMsg && (
                    <div className="alert alert-danger mb-3" style={{ fontSize: '13px', padding: '10px' }}>
                      {errorMsg}
                    </div>
                  )}

                  {/* Desired Tonnage */}
                  <div className="mb-3">
                    <label className="form-label text-hint mb-1" style={{ fontSize: '12.5px', fontWeight: 500 }}>
                      Requested Quantity (Tonnes)
                    </label>
                    <div className="input-group">
                      <input
                        type="number"
                        min={minQty}
                        max={maxQty}
                        className="form-control"
                        value={tonnes || ''}
                        onChange={(e) => setTonnes(parseInt(e.target.value) || 0)}
                        required
                        style={{ borderColor: '#DDD0B8' }}
                      />
                      <span className="input-group-text" style={{ backgroundColor: '#FAF3E8', borderColor: '#DDD0B8' }}>Tonnes</span>
                    </div>
                    <div className="d-flex justify-content-between mt-1 text-hint" style={{ fontSize: '11px' }}>
                      <span>Min: {minQty} Tonnes</span>
                      <span>Max available: {maxQty} Tonnes</span>
                    </div>
                  </div>

                  {/* Negotiated Price Offer */}
                  <div className="mb-4">
                    <label className="form-label text-hint mb-1" style={{ fontSize: '12.5px', fontWeight: 500 }}>
                      Proposed Rate per Tonne ({currency === 'USD' ? 'USD $' : 'ZiG ZW$'})
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      value={currentDisplayUnitPrice()}
                      onChange={(e) => handlePriceInputChange(e.target.value)}
                      required
                      style={{ borderColor: '#DDD0B8' }}
                    />
                    <span className="text-hint d-block mt-1" style={{ fontSize: '11px' }}>
                      You can propose a slightly different rate depending on volume and transport details.
                    </span>
                  </div>

                  {/* Contract Pricing Sheet */}
                  <div className="p-3 rounded mb-4" style={{ backgroundColor: '#FAF3E8', border: '0.5px solid #DDD0B8' }}>
                    <h6 className="mb-2 text-uppercase" style={{ fontSize: '11px', color: '#7A9460', fontWeight: 600 }}>
                      Escrow Valuation Summary
                    </h6>
                    <div className="d-flex justify-content-between align-items-center mb-1 text-hint" style={{ fontSize: '13px' }}>
                      <span>Volume</span>
                      <strong>{tonnes} Tonnes</strong>
                    </div>
                    <div className="d-flex justify-content-between align-items-center mb-1 text-hint" style={{ fontSize: '13px' }}>
                      <span>Valuation (USD)</span>
                      <strong>${totalCostUsd.toFixed(2)}</strong>
                    </div>
                    <div className="d-flex justify-content-between align-items-center mb-3 text-hint" style={{ fontSize: '13px' }}>
                      <span>Valuation (ZiG)</span>
                      <strong>ZiG {totalCostZwg.toFixed(2)}</strong>
                    </div>
                    <div className="border-top pt-2 d-flex justify-content-between align-items-center">
                      <span className="fw-600" style={{ color: '#1A3A08', fontSize: '13.5px' }}>Total Bid Contract</span>
                      <strong className="text-price" style={{ fontSize: '18px' }}>
                        {currency === 'USD' ? `$${totalCostUsd.toFixed(2)}` : `ZiG ${totalCostZwg.toFixed(2)}`}
                      </strong>
                    </div>
                  </div>

                  {/* Proposals actions */}
                  <button
                    type="submit"
                    className="btn btn-am-primary w-100 mb-3"
                    disabled={negotiating || tonnes < minQty || tonnes > maxQty}
                  >
                    {negotiating ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Registering Proposal...
                      </>
                    ) : 'Create Contract Proposal'}
                  </button>

                  <Link href="/messages" className="btn btn-am-outline w-100 text-center">
                    Message Farmer / Negotiate
                  </Link>

                </form>

              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

export default function WholesaleDetailPage({ params }: { params: { id: string } }) {
  return (
    <ProtectedRoute allowedRoles={['COMMERCIAL_FARMER', 'COMMERCIAL_BUYER']}>
      <WholesaleDetailContent params={params} />
    </ProtectedRoute>
  );
}
