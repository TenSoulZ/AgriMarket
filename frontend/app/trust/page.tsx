import React from 'react';
import Link from 'next/link';

export default function TrustAndSecurityPage() {
  return (
    <div style={{ backgroundColor: '#FAF3E8', minHeight: '100vh', padding: '4rem 0 6rem' }}>
      <div className="container" style={{ maxWidth: '1000px' }}>
        
        {/* Header Section */}
        <div className="text-center mb-5 pb-4 border-bottom" style={{ borderColor: '#EAF3DE' }}>
          <div style={{ fontSize: '64px', marginBottom: '10px' }}>🛡️</div>
          <h1 style={{ color: '#1A3A08', fontWeight: 800, fontSize: '48px', letterSpacing: '-1.5px' }}>
            Zero-Trust Trade. <br/> 100% Guaranteed Security.
          </h1>
          <p className="text-hint mx-auto mt-4" style={{ maxWidth: '700px', fontSize: '18px', lineHeight: '1.6' }}>
            Agricultural trade carries risk. Buyers fear paying for rejected crop grades. Farmers fear shipping cargo without guaranteed payment. AgriMarket eliminates both risks via our unbreakable Dual-Signature Escrow architecture.
          </p>
        </div>

        {/* 3 Pillars of Trust */}
        <div className="row g-4 mt-2">
          
          <div className="col-md-4">
            <div className="card am-card h-100 p-4 p-md-5 border-0 shadow-sm text-center" style={{ borderRadius: '16px' }}>
              <div style={{ width: '80px', height: '80px', backgroundColor: '#F4F7F1', borderRadius: '50%', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>
                🏦
              </div>
              <h4 style={{ color: '#1A3A08', fontWeight: 700, marginBottom: '15px' }}>Secure Vault Integration</h4>
              <p className="text-hint mb-0" style={{ fontSize: '14.5px', lineHeight: '1.6' }}>
                Buyer funds do not go directly to the farmer. They are held securely in AgriMarket's central vault via our official integration with the Paynow Zimbabwe API.
              </p>
            </div>
          </div>

          <div className="col-md-4">
            <div className="card am-card h-100 p-4 p-md-5 border-0 shadow-sm text-center position-relative overflow-hidden" style={{ borderRadius: '16px', backgroundColor: '#1A3A08', color: '#fff' }}>
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '150px', opacity: 0.05 }}>
                ✍️
              </div>
              <div className="position-relative z-1">
                <div style={{ width: '80px', height: '80px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '50%', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>
                  🤝
                </div>
                <h4 style={{ color: '#EAF3DE', fontWeight: 700, marginBottom: '15px' }}>Dual-Signature Release</h4>
                <p className="text-white-50 mb-0" style={{ fontSize: '14.5px', lineHeight: '1.6' }}>
                  Funds cannot leave the vault until two conditions are met: The Farmer signs that the cargo is shipped, AND the Buyer signs that the cargo has arrived and passed grade inspection.
                </p>
              </div>
            </div>
          </div>

          <div className="col-md-4">
            <div className="card am-card h-100 p-4 p-md-5 border-0 shadow-sm text-center" style={{ borderRadius: '16px' }}>
              <div style={{ width: '80px', height: '80px', backgroundColor: '#FFF0F0', borderRadius: '50%', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>
                ⚖️
              </div>
              <h4 style={{ color: '#1A3A08', fontWeight: 700, marginBottom: '15px' }}>AMA Arbitration</h4>
              <p className="text-hint mb-0" style={{ fontSize: '14.5px', lineHeight: '1.6' }}>
                What happens if the buyer rejects the crop? The funds remain locked, and an official Agricultural Marketing Authority (AMA) certified arbitrator is dispatched to independently inspect the cargo.
              </p>
            </div>
          </div>

        </div>

        {/* KYC Verification Banner */}
        <div className="mt-5 pt-5">
          <div className="card border-0 shadow-sm overflow-hidden" style={{ borderRadius: '24px', backgroundColor: '#FFFFFF' }}>
            <div className="row g-0">
              <div className="col-md-7 p-5">
                <span className="badge badge-verified mb-3 px-3 py-2 text-uppercase letter-spacing-1">Strict Vetting</span>
                <h3 style={{ color: '#1A3A08', fontWeight: 800, fontSize: '32px', letterSpacing: '-0.5px' }}>
                  The Blue Checkmark of Commerce.
                </h3>
                <p className="text-hint mt-3" style={{ fontSize: '16px', lineHeight: '1.7' }}>
                  Not just anyone can post commercial wholesale cargo on AgriMarket. To achieve <strong>Verified Commercial Merchant</strong> status, users must undergo our stringent KYC pipeline. Our administrators manually review statutory documents, farm deeds, and trade licenses before granting wholesale dashboard access.
                </p>
                <div className="mt-4">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <span className="text-success">✓</span> <span className="fw-500">National ID Verification</span>
                  </div>
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <span className="text-success">✓</span> <span className="fw-500">Corporate Certificate of Incorporation</span>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <span className="text-success">✓</span> <span className="fw-500">Tax Clearance Validation</span>
                  </div>
                </div>
              </div>
              <div className="col-md-5 d-none d-md-flex align-items-center justify-content-center" style={{ backgroundColor: '#F4F7F1' }}>
                 <div style={{ textAlign: 'center' }}>
                    <div className="badge-verified d-inline-flex align-items-center justify-content-center" style={{ width: '120px', height: '120px', borderRadius: '50%', fontSize: '48px' }}>
                      ✓
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-5 pt-5">
          <h3 style={{ color: '#1A3A08', fontWeight: 700, marginBottom: '20px' }}>Ready to trade without the risk?</h3>
          <Link href="/register" className="btn btn-am-primary px-5 py-3 fw-700 fs-16 shadow-sm">
            Create Free Account
          </Link>
        </div>

      </div>
    </div>
  );
}
