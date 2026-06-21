'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCurrencyStore } from '../../../lib/currencyStore';
import { Listing } from '../../../components/ListingCard';
import { api } from '../../../lib/axios';

export default function ListingDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { formatPrice, currency, conversionRate } = useCurrencyStore();
  
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(0);
  const [ordering, setOrdering] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const fetchListing = async () => {
      try {
        const res = await api.get(`listings/${params.id}/`);
        setListing(res.data);
        // Default to min quantity (1 for retail)
        setQuantity(1);
      } catch (error) {
        console.error("Failed to load listing:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchListing();

    // Fetch user profile to check roles
    api.get('users/profile/')
      .then(res => setCurrentUser(res.data))
      .catch(() => setCurrentUser(null));
  }, [params.id]);

  if (loading) {
    return (
      <div className="container py-5 text-center" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div>
          <span className="spinner-border text-success" role="status" aria-hidden="true" style={{ width: '3rem', height: '3rem' }}></span>
          <p className="mt-3 text-hint">Loading produce details...</p>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="container py-5 text-center">
        <h3 className="mb-3" style={{ color: '#1A3A08' }}>Produce Listing Not Found</h3>
        <p className="text-hint mb-4">The listing you are trying to view does not exist or has been sold.</p>
        <Link href="/marketplace" className="btn btn-am-primary">
          Back to Marketplace
        </Link>
      </div>
    );
  }

  const maxQty = Number(listing.quantity_available_kg);
  const totalPriceCents = listing.price_per_kg_usd_cents * quantity;
  
  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/login');
      return;
    }
    
    if (quantity < 1 || quantity > maxQty) {
      setErrorMsg(`Invalid quantity. Min order is 1 kg, Max available is ${maxQty} kg.`);
      return;
    }

    setOrdering(true);
    
    try {
      const res = await api.post('orders/', {
        listing: listing.id,
        qty: quantity,
        total_price_usd_cents: totalPriceCents
      });
      
      setSuccess(true);
      // Wait a moment before redirecting to the order/escrow page
      setTimeout(() => {
        router.push(`/orders?new_id=${res.data.id}&qty=${quantity}`);
      }, 2000);
      
    } catch (error: any) {
      console.error("Order failed:", error);
      const errMsg = error.response?.data?.non_field_errors?.[0] || 
                     error.response?.data?.detail || 
                     error.response?.data?.[0] || 
                     "Failed to place order. Ensure you are logged in and verified.";
      setErrorMsg(errMsg);
    } finally {
      setOrdering(false);
    }
  };

  const unitPriceFormatted = formatPrice(listing.price_per_kg_usd_cents);
  const usdAmount = totalPriceCents / 100;
  const zwgAmount = usdAmount * conversionRate;

  const sellerName = listing.farmer_detail?.farm_profile?.farm_name || listing.farmer_detail?.phone_number || 'Unknown Farmer';
  const sellerTier = listing.farmer_detail?.subscription_tier || 'SEED';
  const isVerified = listing.farmer_detail?.kyc_status === 'VERIFIED';
  const imageUrl = listing.images && listing.images.length > 0 ? listing.images[0].image : undefined;
  const displayLocation = `${listing.location_district}, ${listing.location_province}`.replace('_', ' ');

  return (
    <div style={{ backgroundColor: '#FAF3E8', minHeight: '100vh', padding: '3rem 0 5rem' }}>
      <div className="container">
        
        {/* Back Link */}
        <div className="mb-4">
          <Link href="/marketplace" className="text-decoration-none d-inline-flex align-items-center gap-1" style={{ color: '#3B6D11', fontWeight: 500 }}>
            ← Back to All Listings
          </Link>
        </div>

        {success ? (
          <div className="card am-card p-5 text-center">
            <div className="mb-3 d-flex justify-content-center">
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#EAF3DE', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2.5px solid #2C5410' }}>
                <span style={{ fontSize: '28px', color: '#2C5410', fontWeight: 'bold' }}>✓</span>
              </div>
            </div>
            <h3 className="mb-2" style={{ color: '#1A3A08' }}>Escrow Order Initiated!</h3>
            <p className="text-hint mb-4" style={{ maxWidth: '500px', margin: '0 auto' }}>
              Your order for <strong>{quantity} kg</strong> of {listing.title} has been logged. We are redirecting you to your Escrow Tracker to complete the secure payment.
            </p>
            <span className="spinner-border spinner-border-sm text-success" role="status" aria-hidden="true"></span>
          </div>
        ) : (
          <div className="row g-4">
            
            {/* Left Column: Media & Description */}
            <div className="col-lg-7">
              <div className="card am-card p-4 h-100">
                {/* Visual Header */}
                <div
                  className="mb-4 d-flex align-items-center justify-content-center overflow-hidden"
                  style={{
                    height: '320px',
                    backgroundColor: '#EAF3DE',
                    borderRadius: '0.75rem',
                    color: '#4E8A18',
                    position: 'relative',
                  }}
                >
                  {imageUrl ? (
                    <img 
                      src={imageUrl} 
                      alt={listing.title} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  ) : (
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                  )}
                  
                  {isVerified && (
                    <span className="badge badge-verified position-absolute" style={{ bottom: '15px', right: '15px', fontSize: '13px' }}>
                      Verified Seller
                    </span>
                  )}
                </div>

                <span className="text-hint text-uppercase font-weight-bold d-block mb-1" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>
                  {listing.category_name || 'Produce'}
                </span>
                
                <h2 className="mb-3" style={{ color: '#1A3A08', fontWeight: 700 }}>{listing.title}</h2>
                
                <p className="lead mb-4" style={{ color: '#4E6A36', fontSize: '16px', lineHeight: '1.6' }}>
                  {listing.description}
                </p>

                {/* Seller Detail Block */}
                <div className="p-3 rounded border" style={{ borderColor: '#EAF3DE', backgroundColor: '#FAF3E8' }}>
                  <h6 className="mb-2" style={{ color: '#2C5410', fontWeight: 600 }}>Farmer / Seller Profile</h6>
                  <div className="row g-2 text-hint" style={{ fontSize: '13px' }}>
                    <div className="col-sm-6">
                      <strong>Name:</strong> {sellerName}
                    </div>
                    <div className="col-sm-6">
                      <strong>Seller Tier:</strong> {sellerTier} Profile
                    </div>
                    <div className="col-sm-6">
                      <strong>Region:</strong> {displayLocation}
                    </div>
                    <div className="col-sm-6">
                      <strong>Trade Status:</strong> Active Listing
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Checkout Widget */}
            <div className="col-lg-5">
              <div className="card am-card p-4">
                <h4 className="mb-4" style={{ color: '#1A3A08', fontSize: '18px', fontWeight: 600 }}>
                  Order Checkout
                </h4>

                {/* Price Display */}
                <div className="mb-4 pb-3 border-bottom" style={{ borderColor: '#EAF3DE' }}>
                  <span className="text-hint d-block mb-1">Price per kg</span>
                  <span className="text-price" style={{ fontSize: '24px', fontWeight: 700 }}>
                    {unitPriceFormatted}
                  </span>
                </div>

                {/* Order Form */}
                {currentUser && !['COMMERCIAL_BUYER', 'RETAIL_BUYER', 'ADMIN'].includes(currentUser.role) ? (
                  <div className="alert alert-warning text-center py-3 px-2 mb-0" style={{ fontSize: '12.5px', border: '1px solid #DDD0B8' }}>
                    <span className="d-block mb-2 fs-18">⚠️</span>
                    <strong>Farmer/Transporter Account:</strong> Only registered Buyers can place escrow orders. Log in as a Buyer to make a purchase.
                  </div>
                ) : (
                  <form onSubmit={handleOrder}>
                    
                    {errorMsg && (
                      <div className="alert alert-danger mb-3" style={{ fontSize: '13px', padding: '10px' }}>
                        {errorMsg}
                      </div>
                    )}

                  {/* Quantity Input */}
                  <div className="mb-4">
                    <label className="form-label text-hint mb-1" style={{ fontSize: '13px', fontWeight: 500 }}>
                      Enter Order Quantity (kg)
                    </label>
                    <div className="input-group">
                      <input
                        type="number"
                        min={1}
                        max={maxQty}
                        className="form-control"
                        value={quantity || ''}
                        onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                        required
                        style={{ borderColor: '#DDD0B8' }}
                      />
                      <span className="input-group-text" style={{ backgroundColor: '#FAF3E8', borderColor: '#DDD0B8', color: '#1A3A08' }}>
                        kg
                      </span>
                    </div>
                    <div className="d-flex justify-content-between mt-1 text-hint" style={{ fontSize: '11px' }}>
                      <span>Min: 1 kg</span>
                      <span>Max Available: {maxQty} kg</span>
                    </div>
                  </div>

                  {/* Pricing Breakdown */}
                  <div className="p-3 rounded mb-4" style={{ backgroundColor: '#FAF3E8', border: '0.5px solid #DDD0B8' }}>
                    <h6 className="mb-3 text-uppercase" style={{ fontSize: '11px', color: '#7A9460', fontWeight: 600, letterSpacing: '0.5px' }}>
                      Pricing Breakdown
                    </h6>
                    <div className="d-flex justify-content-between align-items-center mb-2" style={{ fontSize: '13px' }}>
                      <span className="text-hint">Subtotal (USD)</span>
                      <strong style={{ color: '#1A3A08' }}>${usdAmount.toFixed(2)}</strong>
                    </div>
                    <div className="d-flex justify-content-between align-items-center mb-3" style={{ fontSize: '13px' }}>
                      <span className="text-hint">Subtotal (ZiG)</span>
                      <strong style={{ color: '#1A3A08' }}>ZiG {zwgAmount.toFixed(2)}</strong>
                    </div>
                    <div className="border-top pt-2 d-flex justify-content-between align-items-center" style={{ borderColor: '#DDD0B8' }}>
                      <span className="fw-600" style={{ color: '#1A3A08', fontSize: '14px' }}>Active Quote</span>
                      <strong className="text-price" style={{ fontSize: '18px' }}>
                        {currency === 'USD' ? `$${usdAmount.toFixed(2)}` : `ZiG ${zwgAmount.toFixed(2)}`}
                      </strong>
                    </div>
                  </div>

                  {/* Interactive Button CTA */}
                  <button
                    type="submit"
                    className="btn btn-am-primary w-100 mb-3"
                    disabled={ordering || quantity < 1 || quantity > maxQty}
                  >
                    {ordering ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Holding Escrow...
                      </>
                    ) : (
                      'Purchase via Escrow'
                    )}
                  </button>

                  <Link href="/messages" className="btn btn-am-outline w-100 text-center">
                    Message Farmer
                  </Link>
                </form>
              )}

                {/* Trust Seal */}
                <div className="mt-4 pt-3 border-top text-center" style={{ borderColor: '#EAF3DE' }}>
                  <span className="text-hint" style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    100% Secure Dual-Signature Escrow Protected.
                  </span>
                </div>

              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
