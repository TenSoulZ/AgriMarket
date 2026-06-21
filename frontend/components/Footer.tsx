import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer style={{ backgroundColor: '#112A05', color: '#EAF3DE', padding: '4rem 0 2rem', borderTop: '4px solid #3B6D11', marginTop: 'auto' }}>
      <div className="container">
        <div className="row g-4 mb-4">
          
          <div className="col-lg-4 pe-lg-5">
            <h4 style={{ color: '#C5E1A5', fontWeight: 800, letterSpacing: '-0.5px', marginBottom: '20px' }}>AgriMarket ZW</h4>
            <p className="text-white-50 fs-14" style={{ lineHeight: '1.7' }}>
              Zimbabwe's premier agricultural operating system. We provide Dual-Signature Escrow, Logistics Pooling, and AI Yield Forecasting to commercial growers and corporate aggregators.
            </p>
          </div>

          <div className="col-lg-2 col-md-4">
            <h6 className="text-uppercase fw-700 mb-3" style={{ color: '#fff', letterSpacing: '1px', fontSize: '13px' }}>Platform</h6>
            <ul className="list-unstyled d-flex flex-column gap-2 fs-14">
              <li><Link href="/marketplace" className="text-white-50 text-decoration-none hover-white">Retail Board</Link></li>
              <li><Link href="/wholesale" className="text-white-50 text-decoration-none hover-white">Wholesale RFQs</Link></li>
              <li><Link href="/prices" className="text-white-50 text-decoration-none hover-white">Live Market Prices</Link></li>
              <li><Link href="/logistics" className="text-white-50 text-decoration-none hover-white">Logistics Pooling</Link></li>
            </ul>
          </div>

          <div className="col-lg-2 col-md-4">
            <h6 className="text-uppercase fw-700 mb-3" style={{ color: '#fff', letterSpacing: '1px', fontSize: '13px' }}>Learn</h6>
            <ul className="list-unstyled d-flex flex-column gap-2 fs-14">
              <li><Link href="/how-it-works" className="text-white-50 text-decoration-none hover-white">How It Works</Link></li>
              <li><Link href="/trust" className="text-white-50 text-decoration-none hover-white">Trust & Security</Link></li>
              <li><Link href="/pricing" className="text-white-50 text-decoration-none hover-white">Merchant Pricing</Link></li>
            </ul>
          </div>

          <div className="col-lg-4 col-md-4 text-lg-end">
            <h6 className="text-uppercase fw-700 mb-3" style={{ color: '#fff', letterSpacing: '1px', fontSize: '13px' }}>Secure Processing</h6>
            <div className="d-flex align-items-center justify-content-lg-end gap-3 opacity-75 flex-wrap">
              <span className="badge bg-light text-dark fw-700 px-2 py-1">Paynow.</span>
              <span className="badge bg-success text-white fw-700 px-2 py-1">EcoCash</span>
              <span className="badge bg-warning text-dark fw-700 px-2 py-1">OneMoney</span>
            </div>
            <div className="mt-3 fs-12 text-white-50 d-flex align-items-center justify-content-lg-end gap-2">
              <span style={{ fontSize: '16px' }}>🛡️</span> Protected by AMA Arbitration
            </div>
          </div>

        </div>

        <div className="border-top pt-3 d-flex flex-wrap justify-content-between align-items-center" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <p className="mb-0 fs-13 text-white-50">
            © {new Date().getFullYear()} AgriMarket Zimbabwe. All rights reserved.
          </p>
          <div className="d-flex gap-3 fs-13">
            <a href="#" className="text-white-50 text-decoration-none">Terms of Service</a>
            <a href="#" className="text-white-50 text-decoration-none">Privacy Policy</a>
          </div>
        </div>

      </div>
    </footer>
  );
}
