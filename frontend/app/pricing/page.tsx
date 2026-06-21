import React from 'react';
import Link from 'next/link';

export default function PricingPage() {
  return (
    <div style={{ backgroundColor: '#FAF3E8', minHeight: '100vh', padding: '4rem 0 6rem' }}>
      <div className="container" style={{ maxWidth: '1100px' }}>
        
        {/* Header Section */}
        <div className="text-center mb-5 pb-3">
          <span className="badge bg-success mb-3 px-3 py-2 text-uppercase letter-spacing-1 fs-12">
            Transparent Pricing
          </span>
          <h1 style={{ color: '#1A3A08', fontWeight: 800, fontSize: '48px', letterSpacing: '-1.5px' }}>
            Scale your agricultural trade.
          </h1>
          <p className="text-hint mx-auto mt-3" style={{ maxWidth: '650px', fontSize: '18px', lineHeight: '1.6' }}>
            Whether you are a smallholder farmer selling surplus tomatoes, or a corporate aggregator moving 500 tonnes of maize, AgriMarket has a tier designed for your volume.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="row g-4 align-items-end mb-5 pb-4">
          
          {/* Seed Tier (Free) */}
          <div className="col-lg-4">
            <div className="card am-card p-4 p-md-5 border-0 shadow-sm" style={{ borderRadius: '24px' }}>
              <div className="mb-4">
                <h3 style={{ color: '#1A3A08', fontWeight: 700 }}>Seed</h3>
                <p className="text-hint fs-14 mb-0">For smallholder farmers & buyers.</p>
              </div>
              <div className="mb-4">
                <span style={{ fontSize: '42px', fontWeight: 800, color: '#1A3A08', letterSpacing: '-1.5px' }}>$0</span>
                <span className="text-hint fw-600"> / forever</span>
              </div>
              <ul className="list-unstyled mb-5 d-flex flex-column gap-3">
                <li className="d-flex align-items-center gap-3">
                  <span className="text-success fs-18">✓</span> <span className="fs-15 fw-500 text-dark">Retail Board Access</span>
                </li>
                <li className="d-flex align-items-center gap-3">
                  <span className="text-success fs-18">✓</span> <span className="fs-15 fw-500 text-dark">Standard 1.5% Escrow Fee</span>
                </li>
                <li className="d-flex align-items-center gap-3">
                  <span className="text-success fs-18">✓</span> <span className="fs-15 fw-500 text-dark">Basic Messaging</span>
                </li>
                <li className="d-flex align-items-center gap-3 opacity-50">
                  <span className="text-muted fs-18">✕</span> <span className="fs-15 fw-500 text-muted text-decoration-line-through">Wholesale Board RFQs</span>
                </li>
                <li className="d-flex align-items-center gap-3 opacity-50">
                  <span className="text-muted fs-18">✕</span> <span className="fs-15 fw-500 text-muted text-decoration-line-through">AI Yield Forecaster</span>
                </li>
              </ul>
              <Link href="/register" className="btn btn-outline-success w-100 py-3 fw-700 rounded-pill">
                Start for Free
              </Link>
            </div>
          </div>

          {/* Sprout Tier ($15) - Highlighted */}
          <div className="col-lg-4">
            <div className="card p-4 p-md-5 border-0 shadow position-relative" style={{ borderRadius: '24px', backgroundColor: '#1A3A08', color: '#fff', zIndex: 2, transform: 'scale(1.02)' }}>
              <div style={{ position: 'absolute', top: '-15px', left: '50%', transform: 'translateX(-50%)' }}>
                <span className="badge bg-success px-4 py-2 text-uppercase letter-spacing-1 shadow-sm">Most Popular</span>
              </div>
              <div className="mb-4 mt-2">
                <h3 style={{ color: '#EAF3DE', fontWeight: 700 }}>Sprout</h3>
                <p className="text-white-50 fs-14 mb-0">For emerging commercial growers.</p>
              </div>
              <div className="mb-4">
                <span style={{ fontSize: '48px', fontWeight: 800, color: '#fff', letterSpacing: '-1.5px' }}>$15</span>
                <span className="text-white-50 fw-600"> / month</span>
              </div>
              <ul className="list-unstyled mb-5 d-flex flex-column gap-3">
                <li className="d-flex align-items-center gap-3">
                  <span className="text-success fs-18">✓</span> <span className="fs-15 fw-500 text-white">Wholesale Board Access</span>
                </li>
                <li className="d-flex align-items-center gap-3">
                  <span className="text-success fs-18">✓</span> <span className="fs-15 fw-500 text-white">Post Forward Contracts</span>
                </li>
                <li className="d-flex align-items-center gap-3">
                  <span className="text-success fs-18">✓</span> <span className="fs-15 fw-500 text-white">Logistics Pooling (Save 40%)</span>
                </li>
                <li className="d-flex align-items-center gap-3">
                  <span className="text-success fs-18">✓</span> <span className="fs-15 fw-500 text-white">Reduced 1.0% Escrow Fee</span>
                </li>
                <li className="d-flex align-items-center gap-3 opacity-50">
                  <span className="text-white-50 fs-18">✕</span> <span className="fs-15 fw-500 text-white-50 text-decoration-line-through">AI Yield Forecaster</span>
                </li>
              </ul>
              <Link href="/register" className="btn btn-am-primary w-100 py-3 fw-800 rounded-pill shadow-sm" style={{ backgroundColor: '#C5E1A5', color: '#1A3A08' }}>
                Upgrade to Sprout
              </Link>
            </div>
          </div>

          {/* Harvest Tier ($45) */}
          <div className="col-lg-4">
            <div className="card am-card p-4 p-md-5 border-0 shadow-sm" style={{ borderRadius: '24px' }}>
              <div className="mb-4">
                <h3 style={{ color: '#1A3A08', fontWeight: 700 }}>Harvest <span className="fs-20 text-success">PRO</span></h3>
                <p className="text-hint fs-14 mb-0">For corporate aggregators & exporters.</p>
              </div>
              <div className="mb-4">
                <span style={{ fontSize: '42px', fontWeight: 800, color: '#1A3A08', letterSpacing: '-1.5px' }}>$45</span>
                <span className="text-hint fw-600"> / month</span>
              </div>
              <ul className="list-unstyled mb-5 d-flex flex-column gap-3">
                <li className="d-flex align-items-center gap-3">
                  <span className="text-success fs-18">✓</span> <span className="fs-15 fw-500 text-dark">Everything in Sprout</span>
                </li>
                <li className="d-flex align-items-center gap-3">
                  <span className="text-success fs-18">✓</span> <span className="fs-15 fw-500 text-dark fw-bold">AI Yield Forecaster Access</span>
                </li>
                <li className="d-flex align-items-center gap-3">
                  <span className="text-success fs-18">✓</span> <span className="fs-15 fw-500 text-dark">Smart Agronomic Weather API</span>
                </li>
                <li className="d-flex align-items-center gap-3">
                  <span className="text-success fs-18">✓</span> <span className="fs-15 fw-500 text-dark">Dedicated AMA Account Mgr</span>
                </li>
                <li className="d-flex align-items-center gap-3">
                  <span className="text-success fs-18">✓</span> <span className="fs-15 fw-500 text-dark">Lowest 0.5% Escrow Fee</span>
                </li>
              </ul>
              <Link href="/register" className="btn btn-outline-success w-100 py-3 fw-700 rounded-pill border-2">
                Unlock Harvest Pro
              </Link>
            </div>
          </div>

        </div>

        {/* Enterprise Trust Section */}
        <div className="text-center mt-5">
          <p className="text-hint fs-14 mb-3 text-uppercase letter-spacing-1 fw-600">Powered By</p>
          <div className="d-flex justify-content-center align-items-center gap-5 opacity-50 flex-wrap">
             <div className="fw-800 fs-24" style={{ fontFamily: 'serif' }}>Paynow.</div>
             <div className="fw-800 fs-20">EcoCash</div>
             <div className="fw-800 fs-20">OneMoney</div>
             <div className="fw-800 fs-20 d-flex align-items-center gap-1"><span style={{ color: '#2C5410' }}>AMA</span> Zimbabwe</div>
          </div>
        </div>

      </div>
    </div>
  );
}
