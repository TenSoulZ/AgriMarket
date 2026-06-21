'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import StatCard from '../../../components/StatCard';
import PriceChart from '../../../components/PriceChart';
import WeatherAdvisoryCard from '../../../components/WeatherAdvisoryCard';
import SubscriptionTierCard, { SubscriptionTier } from '../../../components/SubscriptionTierCard';
import { useCurrencyStore } from '../../../lib/currencyStore';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { api } from '../../../lib/axios';

const SUBSCRIPTION_TIERS: SubscriptionTier[] = [
  {
    id: 'sub-seed',
    name: 'Seed',
    priceMonthlyCents: 0,
    isCustomPrice: false,
    description: 'Perfect for smallholder farming plots starting to digitize their harvest sales.',
    features: ['Max 3 active retail listings', 'Read-only messages', 'Standard pricing charts'],
  },
  {
    id: 'sub-harvest',
    name: 'Harvest',
    priceMonthlyCents: 500, // $5.00
    isCustomPrice: false,
    description: 'Designed for active growers who require complete escrow guarantees and messaging.',
    features: [
      'Unlimited retail listings',
      'Full dual-signature escrow',
      'Logistics load-pooling access',
      'Bidirectional chat messaging',
    ],
    isPopular: true,
  },
  {
    id: 'sub-commercial',
    name: 'Commercial',
    priceMonthlyCents: 8000, // $80.00
    isCustomPrice: false,
    description: 'Designed for high-volume commercial growers and agricultural syndicates.',
    features: [
      'Access to Wholesale Board',
      'Bulk pre-season forward contracts',
      'Logistics fleet-matching system',
      'Export custom data analytics',
    ],
  },
];

export default function FarmerDashboard() {
  const { formatPrice } = useCurrencyStore();
  const [currentTierId, setCurrentTierId] = useState('sub-harvest');

  // Live Database State
  const [myListings, setMyListings] = useState<any[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);

  useEffect(() => {
    // Fetch live inventory listings from the Django backend
    api.get('listings/')
      .then(res => {
        setMyListings(res.data.results || res.data || []);
      })
      .catch(err => console.error("Failed to fetch listings:", err))
      .finally(() => setLoadingListings(false));
  }, []);

  // AI Forecaster State
  const [hectares, setHectares] = useState<number | ''>('');
  const [selectedCrop, setSelectedCrop] = useState<string>('Maize');
  
  const YIELD_DATA: Record<string, { yieldPerHa: number, pricePerTonneCents: number }> = {
    'Maize': { yieldPerHa: 5.5, pricePerTonneCents: 34000 }, // $340.00
    'Wheat': { yieldPerHa: 4.8, pricePerTonneCents: 41000 }, // $410.00
    'Soya Beans': { yieldPerHa: 3.2, pricePerTonneCents: 55000 }, // $550.00
    'Tobacco': { yieldPerHa: 2.1, pricePerTonneCents: 280000 }, // $2800.00
  };

  const CROP_LABELS: Record<string, string> = {
    'Maize': '🌾 White Maize (Chibage / Umbila)',
    'Wheat': '🥖 Winter Wheat (Gorosi)',
    'Soya Beans': '🌱 Soybeans (Soya)',
    'Tobacco': '🍂 Flue-Cured Tobacco (Fodya)',
  };

  const calculatedYield = hectares === '' ? 0 : (hectares as number) * YIELD_DATA[selectedCrop].yieldPerHa;
  const calculatedRevenueCents = calculatedYield * YIELD_DATA[selectedCrop].pricePerTonneCents;

  const handleSelectTier = (tierId: string) => {
    setCurrentTierId(tierId);
    alert(`Subscription plan updated successfully!`);
  };

  return (
    <ProtectedRoute allowedRoles={['COMMERCIAL_FARMER', 'SMALLHOLDER_FARMER']}>
      <div style={{ backgroundColor: '#FAF3E8', minHeight: '100vh', padding: '2rem 0 5rem' }}>
        <div className="container">
          
          <div className="mb-4 d-flex justify-content-between align-items-center flex-wrap gap-3">
          <div>
            <h1 style={{ color: '#1A3A08', fontWeight: 700, fontSize: '32px' }}>Farmer Dashboard</h1>
            <p className="lead mb-0" style={{ color: '#4E6A36', fontSize: '16px' }}>
              Manage your crop listings, view market trends, track escrow payments, and upgrade merchant tools.
            </p>
          </div>
          <a href="/agronomist" className="btn btn-am-primary hover-glow text-decoration-none d-flex align-items-center gap-2" style={{ padding: '12px 24px', borderRadius: '30px' }}>
            <span className="btn-pulse" style={{ width: 8, height: 8, backgroundColor: '#FFFFFF', borderRadius: '50%', display: 'inline-block' }}></span>
            Launch AI Agronomist
          </a>
        </div>

        {/* KPIs row using StatCard */}
        <div className="row g-3 mb-4">
          <div className="col-sm-6 col-md-3">
            <StatCard
              title="Escrow Balance Secured"
              value={formatPrice(125000)} // $1250.00
              trendText="2 orders pending release"
              trendDirection="up"
            />
          </div>
          <div className="col-sm-6 col-md-3">
            <StatCard
              title="Total Sales Completed"
              value={formatPrice(485000)} // $4850.00
              trendText="+15% vs last month"
              trendDirection="up"
            />
          </div>
          <div className="col-sm-6 col-md-3">
            <StatCard
              title="Listed Inventory Volume"
              value="3.25 Tonnes"
              trendText="Across 3 crop profiles"
              trendDirection="flat"
            />
          </div>
          <div className="col-sm-6 col-md-3">
            <StatCard
              title="Profile Integrity Index"
              value="98%"
              trendText="AMA Verified Seller"
              trendDirection="up"
            />
          </div>
        </div>

        {/* Market Graph and Active Listings */}
        <div className="row g-4 mb-5">
          
          {/* Main Dashboard Column: Weather & Price Trends */}
          <div className="col-lg-8">
            <WeatherAdvisoryCard />
            <PriceChart />
          </div>

          {/* Active Listings Sidebar */}
          <div className="col-lg-4 d-flex flex-column gap-4">
            {/* Quick Actions */}
            <div className="card am-card p-4 shadow-sm border-0 h-100">
              <h5 className="mb-4" style={{ color: '#1A3A08', fontWeight: 700 }}>Quick Actions</h5>
              <Link href="/marketplace/create" className="btn btn-am-primary d-block mb-3 fw-600">
                + Create Retail Listing
              </Link>
              <Link href="/wholesale/create" className="btn btn-am-secondary d-block mb-3 fw-600">
                📦 Post Wholesale Freight
              </Link>
              <Link href="/weather" className="btn btn-outline-primary d-block fw-600 mb-2" style={{ border: '2px solid #EAF3DE', color: '#2C5410', backgroundColor: '#F4F7F1' }}>
                ⛅ Smart Weather Advisory
              </Link>
            </div>

            {/* NEW: AI Yield Forecaster Widget */}
            <div className="card am-card p-4 shadow-sm border-0 position-relative overflow-hidden hover-lift transition-all" style={{ backgroundColor: '#1A3A08' }}>
               <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px', borderRadius: '50%', backgroundColor: '#4E8A18', opacity: 0.3, filter: 'blur(20px)' }}></div>
               
               <h5 className="mb-3 position-relative z-1 d-flex align-items-center gap-2" style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '16px' }}>
                  🧠 AI Yield Forecaster
               </h5>
               <p className="text-white-50 fs-13 mb-4 position-relative z-1" style={{ lineHeight: '1.4' }}>
                  Calculate projected harvest tonnage and gross revenue based on live terminal rates.
               </p>

               <div className="position-relative z-1 mb-3">
                  <label className="text-white-50 fs-11 text-uppercase fw-700 letter-spacing-1 mb-2">Target Crop</label>
                  <select 
                    className="form-select form-select-sm border-0 shadow-none fw-600" 
                    value={selectedCrop}
                    onChange={(e) => setSelectedCrop(e.target.value)}
                    style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: '#FFFFFF' }}
                  >
                    {Object.keys(YIELD_DATA).map(crop => (
                       <option key={crop} value={crop} style={{ color: '#1A3A08' }}>
                         {CROP_LABELS[crop] || crop}
                       </option>
                    ))}
                  </select>
               </div>

               <div className="position-relative z-1 mb-4">
                  <label className="text-white-50 fs-11 text-uppercase fw-700 letter-spacing-1 mb-2">Farm Size (Hectares)</label>
                  <input 
                    type="number" 
                    className="form-control form-control-sm border-0 shadow-none fw-600" 
                    placeholder="e.g. 50"
                    value={hectares}
                    onChange={(e) => setHectares(e.target.value ? Number(e.target.value) : '')}
                    style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: '#FFFFFF' }}
                  />
               </div>

               <div className="position-relative z-1 p-3 rounded" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                     <span className="text-white-50 fs-12 fw-600">Est. Yield:</span>
                     <strong className="text-white fs-14 font-monospace">{calculatedYield > 0 ? calculatedYield.toFixed(1) : '0.0'} Tonnes</strong>
                  </div>
                  <div className="d-flex justify-content-between align-items-center">
                     <span className="text-white-50 fs-12 fw-600">Proj. Revenue:</span>
                     <strong className="text-success fs-18 font-monospace fw-800">{formatPrice(calculatedRevenueCents)}</strong>
                  </div>
               </div>
            </div>

            <div className="card am-card h-100">
              <h5 className="mb-3" style={{ color: '#1A3A08', fontSize: '16px', fontWeight: 600 }}>
                My Crop Listings
              </h5>
              
              <div className="d-flex flex-column gap-3 mb-3">
                {loadingListings ? (
                  <div className="text-center py-3">
                    <span className="spinner-border spinner-border-sm text-success"></span>
                  </div>
                ) : myListings.length === 0 ? (
                  <div className="text-center py-3 text-hint fs-12">
                    No active listings found in database.
                  </div>
                ) : (
                  myListings.map((item) => (
                    <div key={item.id} className="p-2.5 rounded border" style={{ borderColor: '#EAF3DE', backgroundColor: '#FAF3E8' }}>
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <strong style={{ color: '#1A3A08', fontSize: '13px' }}>{item.title || item.commodity_name || `Listing #${item.id}`}</strong>
                        <span className="badge badge-verified" style={{ fontSize: '10px' }}>{item.status || 'Active'}</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center text-hint" style={{ fontSize: '11.5px' }}>
                        <span>Stock: {item.qty || item.quantity_available || '0'} {item.unit || 'Tonnes'}</span>
                        <span>Rate: {formatPrice(item.priceCents || item.price_per_unit_cents || 0)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <a href="/marketplace" className="btn btn-sm btn-am-outline w-100 text-center mt-auto">
                + Post New Crop Listing
              </a>
            </div>
          </div>

        </div>

        {/* Merchant Tools / Subscriptions section */}
        <div className="mb-4">
          <div className="d-flex justify-content-between align-items-end mb-1">
            <h3 style={{ color: '#2C5410', fontWeight: 600, fontSize: '20px' }} className="mb-0">Merchant Subscription Tiers</h3>
            <a href="/forecaster" className="btn btn-am-primary px-4 shadow-sm fw-600">
              📊 Launch AI Yield Forecaster
            </a>
          </div>
          <p className="text-hint mb-4" style={{ fontSize: '13.5px' }}>
            Scale up your farm sales capability. Unlock wholesale board listings, forward pricing pre-sales, and logistics pooling features.
          </p>
          
          <div className="row g-4">
            {SUBSCRIPTION_TIERS.map((tier) => (
              <div key={tier.id} className="col-md-4">
                <SubscriptionTierCard
                  tier={tier}
                  currentTierId={currentTierId}
                  onSelectTier={handleSelectTier}
                />
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
    </ProtectedRoute>
  );
}
