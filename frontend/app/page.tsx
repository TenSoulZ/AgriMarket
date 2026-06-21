'use client';

import React from 'react';
import Link from 'next/link';
import { useCurrencyStore } from '../lib/currencyStore';

export default function HomePage() {
  const { currency, setCurrency, formatPrice } = useCurrencyStore();

  return (
    <div style={{ backgroundColor: '#FAF3E8', minHeight: '100vh', paddingBottom: '6rem' }}>
      
      {/* Hero Section */}
      <section className="py-5 px-3 position-relative overflow-hidden" style={{ borderBottom: '1px solid rgba(221, 208, 184, 0.6)' }}>
        {/* Abstract background blobs for modern premium design */}
        <div 
          style={{
            position: 'absolute',
            top: '-10%',
            right: '-10%',
            width: '400px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(78,138,24,0.04) 0%, rgba(250,243,232,0) 70%)',
            zIndex: 1,
            pointerEvents: 'none'
          }}
        ></div>

        <div className="container position-relative" style={{ zIndex: 2 }}>
          <div className="row align-items-center g-5">
            
            {/* Left Column: Call to Action & Typography */}
            <div className="col-lg-6 text-start">
              {/* Trust Badges */}
              <div className="d-flex flex-wrap gap-2 mb-4">
                <span 
                  className="badge px-3 py-2"
                  style={{
                    backgroundColor: '#EAF3DE',
                    color: '#2C5410',
                    fontWeight: 600,
                    borderRadius: '50px',
                    fontSize: '12px',
                    border: '0.5px solid rgba(44,84,16,0.2)'
                  }}
                >
                  🇿🇼 Dual-Currency Enabled (USD & ZiG)
                </span>
                <span 
                  className="badge px-3 py-2"
                  style={{
                    backgroundColor: '#FAF3E8',
                    color: '#BA7517',
                    fontWeight: 600,
                    borderRadius: '50px',
                    fontSize: '12px',
                    border: '0.5px solid rgba(186,117,23,0.2)'
                  }}
                >
                  🛡️ Paynow Escrow Secure
                </span>
              </div>

              {/* Headline */}
              <h1 
                className="display-4 mb-3" 
                style={{ 
                  color: '#1A3A08', 
                  fontWeight: 800, 
                  fontFamily: "'Inter', sans-serif",
                  lineHeight: 1.15,
                  letterSpacing: '-1.5px'
                }}
              >
                Empowering Zimbabwe's Agriculture, <span style={{ background: 'linear-gradient(90deg, #4E8A18 0%, #1A3A08 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Digitally.</span>
              </h1>

              {/* Subheading */}
              <p className="lead mb-4" style={{ color: '#4E6A36', fontSize: '1.05rem', lineHeight: '1.7' }}>
                Connecting local smallholders and commercial farm enterprises directly with retail and wholesale buyers. Execute verified trades, automatically pool logistics cargo weight, and settle with Paynow-linked escrows.
              </p>

              {/* CTAs */}
              <div className="d-flex flex-wrap gap-3 mb-4">
                <Link href="/marketplace" className="btn btn-am-primary px-4 py-2.5 shadow-sm transition-all text-decoration-none d-inline-block">
                  Enter Marketplace
                </Link>
                <Link href="/logistics" className="btn btn-am-outline px-4 py-2.5 transition-all text-decoration-none d-inline-block">
                  Explore Load Pooling
                </Link>
              </div>

              {/* Quick stats in Hero */}
              <div className="d-flex gap-4 border-top pt-4" style={{ borderColor: 'rgba(221,208,184,0.6)' }}>
                <div>
                  <h4 className="mb-0" style={{ color: '#1A3A08', fontWeight: 700 }}>12k+</h4>
                  <span className="text-hint" style={{ fontSize: '11.5px' }}>Active Farmers</span>
                </div>
                <div className="border-end" style={{ borderColor: 'rgba(221,208,184,0.6)' }}></div>
                <div>
                  <h4 className="mb-0" style={{ color: '#1A3A08', fontWeight: 700 }}>{formatPrice(2500)}</h4>
                  <span className="text-hint" style={{ fontSize: '11.5px' }}>Avg. Logistics Savings</span>
                </div>
                <div className="border-end" style={{ borderColor: 'rgba(221,208,184,0.6)' }}></div>
                <div>
                  <h4 className="mb-0" style={{ color: '#1A3A08', fontWeight: 700 }}>99.8%</h4>
                  <span className="text-hint" style={{ fontSize: '11.5px' }}>Disbursement Rate</span>
                </div>
              </div>
            </div>

            {/* Right Column: Premium Agritech Graphic */}
            <div className="col-lg-6 position-relative d-flex justify-content-center">
              <div 
                style={{
                  position: 'relative',
                  width: '100%',
                  maxWidth: '500px',
                  borderRadius: '1.5rem',
                  overflow: 'hidden',
                  boxShadow: '0 20px 40px rgba(44, 84, 16, 0.08)',
                  border: '4px solid #FFFFFF',
                  transform: 'rotate(1deg)',
                  transition: 'all 0.4s ease'
                }}
              >
                <img 
                  src="/agritech_hero_banner.png" 
                  alt="AgriMarket Tech Dashboard Mockup" 
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Main Body Containers */}
      <div className="container mt-5">
        
        {/* Interactive Currency Alert Switcher */}
        <div 
          className="card am-card p-3.5 mb-5 d-flex flex-row flex-wrap justify-content-between align-items-center gap-3"
          style={{
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(221, 208, 184, 0.5)'
          }}
        >
          <div>
            <h5 className="mb-1" style={{ color: '#1A3A08', fontSize: '15.5px', fontWeight: 600 }}>Zimbabwe Currency Settings</h5>
            <p className="mb-0 text-hint" style={{ fontSize: '12px' }}>
              Currently viewing local wholesale and retail indices in <strong style={{ color: '#2C5410' }}>{currency}</strong> currency. Toggle to swap.
            </p>
          </div>
          
          <div className="btn-group" role="group" style={{ borderRadius: '0.75rem', overflow: 'hidden' }}>
            <button 
              type="button" 
              className={`btn btn-sm px-3 ${currency === 'USD' ? 'btn-am-primary' : 'btn-am-ghost'}`} 
              onClick={() => setCurrency('USD')}
            >
              USD ($)
            </button>
            <button 
              type="button" 
              className={`btn btn-sm px-3 ${currency === 'ZiG' ? 'btn-am-primary' : 'btn-am-ghost'}`} 
              onClick={() => setCurrency('ZiG')}
            >
              ZiG (1:25)
            </button>
          </div>
        </div>

        {/* Live Market Index Cards */}
        <div className="mb-5">
          <h3 className="mb-4" style={{ color: '#1A3A08', fontSize: '18px', fontWeight: 700 }}>Live Zimbabwe Market Pulse</h3>
          <div className="row g-4">
            
            <div className="col-md-3">
              <div className="am-stat-card border-0 transition-all p-3" style={{ background: '#FFFFFF', borderRadius: '1rem', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                <span className="text-hint d-block mb-1" style={{ fontSize: '11px' }}>Mbare Musika Grains Index</span>
                <span style={{ color: '#1A3A08', fontSize: '24px', fontWeight: 700 }} className="d-block">
                  {formatPrice(32000)} <span style={{ fontSize: '12px', fontWeight: 500, color: '#7A9460' }}>/ ton</span>
                </span>
                <span className="badge badge-verified mt-1 py-1" style={{ fontSize: '10px' }}>↑ +4.2% this week</span>
              </div>
            </div>

            <div className="col-md-3">
              <div className="am-stat-card border-0 transition-all p-3" style={{ background: '#FFFFFF', borderRadius: '1rem', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                <span className="text-hint d-block mb-1" style={{ fontSize: '11px' }}>Average Cotton Rate (Gokwe)</span>
                <span style={{ color: '#1A3A08', fontSize: '24px', fontWeight: 700 }} className="d-block">
                  {formatPrice(48)} <span style={{ fontSize: '12px', fontWeight: 500, color: '#7A9460' }}>/ kg</span>
                </span>
                <span className="badge badge-verified mt-1 py-1" style={{ fontSize: '10px' }}>↑ +2.8% this week</span>
              </div>
            </div>

            <div className="col-md-3">
              <div className="am-stat-card border-0 transition-all p-3" style={{ background: '#FFFFFF', borderRadius: '1rem', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                <span className="text-hint d-block mb-1" style={{ fontSize: '11px' }}>Total Freight Pooled (June)</span>
                <span style={{ color: '#1A3A08', fontSize: '24px', fontWeight: 700 }} className="d-block">
                  8.4 Tonnes
                </span>
                <span className="badge badge-warning-custom mt-1 py-1" style={{ fontSize: '10px' }}>6 Active pool channels</span>
              </div>
            </div>

            <div className="col-md-3">
              <div className="am-stat-card border-0 transition-all p-3" style={{ background: '#FFFFFF', borderRadius: '1rem', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                <span className="text-hint d-block mb-1" style={{ fontSize: '11px' }}>Escrow Guarantee Trust</span>
                <span style={{ color: '#1A3A08', fontSize: '24px', fontWeight: 700 }} className="d-block">
                  {formatPrice(1250000)}
                </span>
                <span className="badge badge-escrow mt-1 py-1" style={{ fontSize: '10px' }}>Sovereign Lock (Paynow)</span>
              </div>
            </div>

          </div>
        </div>

        {/* Core Pillars: What We Do */}
        <div className="mb-5">
          <h3 className="mb-4 text-center" style={{ color: '#1A3A08', fontSize: '22px', fontWeight: 700 }}>Statutory Trading Pillars</h3>
          
          <div className="row g-4">
            {/* Card 1: Marketplace */}
            <div className="col-lg-4">
              <div 
                className="card am-card p-4 h-100 border-0 transition-all"
                style={{
                  background: '#FFFFFF',
                  borderRadius: '1.25rem',
                  boxShadow: '0 6px 24px rgba(44, 84, 16, 0.02)'
                }}
              >
                <div 
                  className="mb-3 d-flex align-items-center justify-content-center"
                  style={{ width: '46px', height: '46px', borderRadius: '12px', backgroundColor: '#EAF3DE', color: '#2C5410' }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="9" cy="21" r="1" />
                    <circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                  </svg>
                </div>
                <h4 style={{ color: '#1A3A08', fontSize: '17px', fontWeight: 700 }} className="mb-2">Direct Marketplace</h4>
                <p className="text-hint mb-4" style={{ fontSize: '12.5px', lineHeight: 1.6 }}>
                  List crops, publish wholesale quantities, and query real-time buyer demands without intermediaries.
                </p>
                <Link href="/marketplace" className="text-decoration-none mt-auto" style={{ color: '#4E8A18', fontWeight: 600, fontSize: '13px' }}>
                  Browse Marketplace Board →
                </Link>
              </div>
            </div>

            {/* Card 2: Escrow */}
            <div className="col-lg-4">
              <div 
                className="card am-card p-4 h-100 border-0 transition-all"
                style={{
                  background: '#FFFFFF',
                  borderRadius: '1.25rem',
                  boxShadow: '0 6px 24px rgba(44, 84, 16, 0.02)'
                }}
              >
                <div 
                  className="mb-3 d-flex align-items-center justify-content-center"
                  style={{ width: '46px', height: '46px', borderRadius: '12px', backgroundColor: '#FAF3E8', color: '#BA7517' }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <h4 style={{ color: '#1A3A08', fontSize: '17px', fontWeight: 700 }} className="mb-2">Paynow-Linked Escrow</h4>
                <p className="text-hint mb-4" style={{ fontSize: '12.5px', lineHeight: 1.6 }}>
                  Buyers secure funds via credit card or mobile money. Settle trades with automatic farmer payouts on delivery release.
                </p>
                <Link href="/profile" className="text-decoration-none mt-auto" style={{ color: '#BA7517', fontWeight: 600, fontSize: '13px' }}>
                  Check Payout Settings →
                </Link>
              </div>
            </div>

            {/* Card 3: Logistics */}
            <div className="col-lg-4">
              <div 
                className="card am-card p-4 h-100 border-0 transition-all"
                style={{
                  background: '#FFFFFF',
                  borderRadius: '1.25rem',
                  boxShadow: '0 6px 24px rgba(44, 84, 16, 0.02)'
                }}
              >
                <div 
                  className="mb-3 d-flex align-items-center justify-content-center"
                  style={{ width: '46px', height: '46px', borderRadius: '12px', backgroundColor: '#E1F5EE', color: '#0F6E56' }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="1" y="3" width="15" height="13" />
                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                    <circle cx="5.5" cy="18.5" r="2.5" />
                    <circle cx="18.5" cy="18.5" r="2.5" />
                  </svg>
                </div>
                <h4 style={{ color: '#1A3A08', fontSize: '17px', fontWeight: 700 }} className="mb-2">Logistics Load Pooling</h4>
                <p className="text-hint mb-4" style={{ fontSize: '12.5px', lineHeight: 1.6 }}>
                  Consolidate cargo weights with smallholders on the same delivery route. Secure vehicle capacity and cut rates by 40%.
                </p>
                <Link href="/logistics" className="text-decoration-none mt-auto" style={{ color: '#0F6E56', fontWeight: 600, fontSize: '13px' }}>
                  Explore Active Pools →
                </Link>
              </div>
            </div>

          </div>
        </div>

        {/* Disintermediation: AgriMarket vs Predatory Middlemen */}
        <div className="mb-5 p-4 rounded-4" style={{ backgroundColor: '#FAF6EE', border: '1.5px solid #DDD0B8' }}>
          <div className="text-center mb-4">
            <span className="badge badge-seed py-1 px-3 mb-2 text-uppercase" style={{ fontSize: '10.5px' }}>Direct Sourcing & Trade</span>
            <h3 style={{ color: '#1A3A08', fontSize: '26px', fontWeight: 800, letterSpacing: '-0.5px' }}>
              Direct Peer-to-Peer Trading (No Middlemen)
            </h3>
            <p className="text-hint mx-auto mt-2" style={{ maxWidth: '650px', fontSize: '14px', lineHeight: '1.5' }}>
              Traditional grain marketing in Zimbabwe is dominated by off-grid middlemen brokers who underpay farmers, inflate prices for buyers, and charge high transaction cuts. AgriMarket completely eliminates them.
            </p>
          </div>

          <div className="row g-4">
            {/* The Predatory Middleman Way */}
            <div className="col-md-6">
              <div className="card h-100 p-4 border-0" style={{ backgroundColor: '#FFF5F5', borderRadius: '1rem', borderLeft: '4px solid #D9534F' }}>
                <h5 className="fw-800 text-danger mb-3 d-flex align-items-center gap-2" style={{ fontSize: '16px' }}>
                  <span>❌</span> Traditional Middlemen & Speculators
                </h5>
                <ul className="list-unstyled d-flex flex-column gap-3 text-hint mb-0" style={{ fontSize: '13px', lineHeight: '1.5' }}>
                  <li className="d-flex align-items-start gap-2">
                    <span style={{ color: '#D9534F' }}>•</span>
                    <div>
                      <strong className="text-dark">High Broker Cuts:</strong> Intermediaries pocket between 15% to 25% of the crop value, depressing farmer incomes and raising buyer food acquisition costs.
                    </div>
                  </li>
                  <li className="d-flex align-items-start gap-2">
                    <span style={{ color: '#D9534F' }}>•</span>
                    <div>
                      <strong className="text-dark">Deferred Payment Risk:</strong> Farmers face credit delays, bounced checks, or speculative payment default when dealers go off-grid.
                    </div>
                  </li>
                  <li className="d-flex align-items-start gap-2">
                    <span style={{ color: '#D9534F' }}>•</span>
                    <div>
                      <strong className="text-dark">Price Exploitation:</strong> Brokers manipulate regional rates by keeping local market indices hidden from remote rural growers.
                    </div>
                  </li>
                </ul>
              </div>
            </div>

            {/* The AgriMarket Direct Way */}
            <div className="col-md-6">
              <div className="card h-100 p-4 border-0" style={{ backgroundColor: '#F4F7F1', borderRadius: '1rem', borderLeft: '4px solid #4E8A18' }}>
                <h5 className="fw-800 text-success mb-3 d-flex align-items-center gap-2" style={{ fontSize: '16px' }}>
                  <span>🟢</span> AgriMarket Direct Peer-to-Peer
                </h5>
                <ul className="list-unstyled d-flex flex-column gap-3 text-dark mb-0" style={{ fontSize: '13px', lineHeight: '1.5' }}>
                  <li className="d-flex align-items-start gap-2">
                    <span style={{ color: '#4E8A18' }}>•</span>
                    <div>
                      <strong className="text-success">Direct Peer-to-Peer Deals:</strong> Settle crop sales directly. AgriMarket charges only a flat 2.5% platform escrow fee to maintain Paynow and trust verification.
                    </div>
                  </li>
                  <li className="d-flex align-items-start gap-2">
                    <span style={{ color: '#4E8A18' }}>•</span>
                    <div>
                      <strong className="text-success">Escrow Guaranteed Payouts:</strong> Buyers commit funds into Paynow escrow upfront. Funds are instantly dispatched to the farmer's mobile money (EcoCash/OneMoney) upon delivery release.
                    </div>
                  </li>
                  <li className="d-flex align-items-start gap-2">
                    <span style={{ color: '#4E8A18' }}>•</span>
                    <div>
                      <strong className="text-success">Transparent Regional Pricing:</strong> Farmers and buyers see the exact same live regional pricing updates from the Harare, Bulawayo, and Gweru hubs.
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing tiers */}
        <div className="mb-5">
          <h3 className="mb-4 text-center" style={{ color: '#1A3A08', fontSize: '22px', fontWeight: 700 }}>Flexible Merchant Plans</h3>
          <div className="row g-4 align-items-stretch">
            
            {/* Plan 1 */}
            <div className="col-lg-4">
              <div className="card am-card p-4 h-100 border-0 d-flex flex-column" style={{ background: '#FFFFFF', borderRadius: '1.25rem' }}>
                <span className="badge badge-seed mb-3 align-self-start py-1.5">Seed Tier (Free)</span>
                <h4 style={{ color: '#1A3A08', fontSize: '22px', fontWeight: 700 }} className="mb-2">
                  $0 <span style={{ fontSize: '12.5px', color: '#7A9460', fontWeight: 400 }}>/ month</span>
                </h4>
                <p className="text-hint mb-4" style={{ fontSize: '12.5px' }}>For smallholder plots & retail buyers starting out on the platform.</p>
                <ul className="list-unstyled mb-5 text-hint d-flex flex-column gap-2" style={{ fontSize: '12.5px' }}>
                  <li>• Max 3 active listings</li>
                  <li>• Read-only chatroom matching</li>
                  <li>• Basic local market pricing index</li>
                </ul>
                <Link href="/register" className="btn btn-am-outline btn-sm w-100 mt-auto text-decoration-none text-center">
                  Register Seed Account
                </Link>
              </div>
            </div>

            {/* Plan 2 */}
            <div className="col-lg-4">
              <div 
                className="card am-card p-4 h-100 d-flex flex-column" 
                style={{ 
                  background: '#FFFFFF', 
                  borderRadius: '1.25rem', 
                  border: '2.5px solid #4E8A18',
                  boxShadow: '0 12px 30px rgba(78, 138, 24, 0.08)'
                }}
              >
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <span className="badge badge-harvest py-1.5">Harvest Tier</span>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 700, color: '#4E8A18' }}>Most Popular</span>
                </div>
                <h4 style={{ color: '#1A3A08', fontSize: '22px', fontWeight: 700 }} className="mb-2">
                  $5 <span style={{ fontSize: '12.5px', color: '#7A9460', fontWeight: 400 }}>/ month</span>
                </h4>
                <p className="text-hint mb-4" style={{ fontSize: '12.5px' }}>Perfect package for active growers, local merchants, and bulk retail partners.</p>
                <ul className="list-unstyled mb-5 d-flex flex-column gap-2" style={{ fontSize: '12.5px', color: '#1A3A08' }}>
                  <li>✓ Unlimited active product listings</li>
                  <li>✓ Paynow integrated escrow protection</li>
                  <li>✓ Logistics load-pooling dashboard</li>
                  <li>✓ Full bidirectional chat & negotiation</li>
                </ul>
                <Link href="/register" className="btn btn-am-primary btn-sm w-100 mt-auto text-decoration-none text-center">
                  Upgrade to Harvest
                </Link>
              </div>
            </div>

            {/* Plan 3 */}
            <div className="col-lg-4">
              <div 
                className="card am-card text-white p-4 h-100 border-0 d-flex flex-column" 
                style={{ 
                  background: '#2C5410', 
                  borderRadius: '1.25rem' 
                }}
              >
                <span className="badge badge-commercial mb-3 align-self-start py-1.5">Commercial Tier</span>
                <h4 style={{ color: '#EAF3DE', fontSize: '22px', fontWeight: 700 }} className="mb-2">
                  $80 <span style={{ fontSize: '12.5px', color: '#C8DFA0', fontWeight: 400 }}>/ month</span>
                </h4>
                <p className="mb-4" style={{ fontSize: '12.5px', color: '#C8DFA0' }}>For corporate farms, agro-processors, food suppliers, and export agencies.</p>
                <ul className="list-unstyled mb-5 d-flex flex-column gap-2" style={{ fontSize: '12.5px', color: '#EAF3DE' }}>
                  <li>✓ Full access to Wholesale Board</li>
                  <li>✓ Bulk contract & RFQ formal negotiation</li>
                  <li>✓ Direct fleet routing & logistics matching</li>
                  <li>✓ Advanced market intelligence indexes</li>
                </ul>
                <Link href="/register" className="btn btn-sm w-100 mt-auto text-decoration-none text-center" style={{ backgroundColor: '#FAF3E8', color: '#2C5410' }}>
                  Onboard Enterprise
                </Link>
              </div>
            </div>

          </div>
        </div>

        {/* Call-to-Action Deep Forest Green Banner */}
        <div 
          className="p-5 rounded-4 text-center text-white"
          style={{
            background: 'linear-gradient(135deg, #1A3A08 0%, #2C5410 100%)',
            boxShadow: '0 15px 35px rgba(26, 58, 8, 0.15)'
          }}
        >
          <h2 style={{ fontWeight: 700, fontSize: '28px' }} className="mb-2">Start Smarter Agricultural Trading Today</h2>
          <p className="mx-auto mb-4" style={{ maxWidth: '580px', color: '#C8DFA0', fontSize: '14.5px', lineHeight: 1.6 }}>
            Submit statutory KYC documentation, set up your EcoCash mobile wallet or commercial bank transfer preference, and lock in your crop orders with secure escrow guarantees.
          </p>
          <div className="d-flex justify-content-center gap-3 flex-wrap">
            <Link href="/register" className="btn px-4 py-2 text-decoration-none font-weight-bold" style={{ backgroundColor: '#FAF3E8', color: '#1A3A08', borderRadius: '0.75rem', fontSize: '14px', fontWeight: 600 }}>
              Create Free Account
            </Link>
            <Link href="/profile" className="btn btn-outline-light px-4 py-2 text-decoration-none font-weight-bold" style={{ borderRadius: '0.75rem', fontSize: '14px', fontWeight: 600 }}>
              Get Verified Now
            </Link>
          </div>
        </div>

      </div>

    </div>
  );
}
